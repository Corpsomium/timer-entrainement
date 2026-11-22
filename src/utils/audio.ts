/**
 * Timer beeps for mobile WebKit / Brave iOS (WKWebView).
 *
 * Hypotheses when Spotify is playing and beeps are silent:
 * 1. `navigator.audioSession` is often ABSENT in Brave WKWebView — the host
 *    app owns AVAudioSession; ambient mode from PR #13 never applies.
 * 2. Web Audio stays suspended/interrupted while another app holds the route.
 * 3. Creating a new Audio(data URI) per beep is unreliable on iOS — elements
 *    must be primed with a real file URL during a user gesture and reused.
 * 4. Without an active media element, WKWebView may not keep the audio route
 *    open for short one-shots. A near-silent loop can keep the route alive
 *    (tradeoff: may duck/pause Spotify depending on host session category).
 *
 * Strategy: HTMLAudioElement pool primed on unlock is the primary path.
 * Web Audio only when context.state === 'running'. Optional silent keep-alive
 * during a session. Debug snapshot via getAudioDebugInfo().
 */

type BeepWave = OscillatorType;
type BeepMethod = 'webaudio' | 'html' | 'none';

interface AudioSessionNavigator {
  audioSession?: { type: string };
}

export interface AudioDebugInfo {
  audioSessionSupported: boolean;
  audioSessionType: string | null;
  audioContextState: string | null;
  lastBeepMethod: BeepMethod | null;
  lastPlayError: string | null;
  htmlPrimed: boolean;
  silentLoopPlaying: boolean;
  preferredPath: 'html' | 'webaudio';
  userAgent: string;
}

const BASE = import.meta.env.BASE_URL || '/';
const SOUND = {
  countdown: `${BASE}sounds/countdown.wav`,
  end1: `${BASE}sounds/end-1.wav`,
  end2: `${BASE}sounds/end-2.wav`,
  end3: `${BASE}sounds/end-3.wav`,
  silent: `${BASE}sounds/silent-loop.wav`,
} as const;

let audioCtx: AudioContext | null = null;
let sessionConfigured = false;
let listenersBound = false;
let htmlPrimed = false;
let silentLoopPlaying = false;
let lastBeepMethod: BeepMethod | null = null;
let lastPlayError: string | null = null;
let preferredPath: 'html' | 'webaudio' = 'html';

let elCountdown: HTMLAudioElement | null = null;
let elEnd1: HTMLAudioElement | null = null;
let elEnd2: HTMLAudioElement | null = null;
let elEnd3: HTMLAudioElement | null = null;
let elSilent: HTMLAudioElement | null = null;

/** Single reusable element for generic beep() HTML path (src swapped only after prime). */
let elShared: HTMLAudioElement | null = null;

const MUTE_HINT =
  'Les bips utilisent le haut-parleur du navigateur et peuvent suivre le mute. Sur Brave iOS, lancez la séance avec « Commencer » pendant que la musique joue.';

export function getAudioMuteHint(): string {
  return MUTE_HINT;
}

export function getAudioDebugInfo(): AudioDebugInfo {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & AudioSessionNavigator) : null;
  const supported = Boolean(nav?.audioSession);
  let type: string | null = null;
  if (supported && nav?.audioSession) {
    try {
      type = String(nav.audioSession.type);
    } catch {
      type = 'error-reading';
    }
  }
  return {
    audioSessionSupported: supported,
    audioSessionType: type,
    audioContextState: audioCtx ? String(audioCtx.state) : null,
    lastBeepMethod,
    lastPlayError,
    htmlPrimed,
    silentLoopPlaying,
    preferredPath,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

function configureAudioSession(): void {
  if (sessionConfigured || typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & AudioSessionNavigator;
  if (!nav.audioSession) return;
  try {
    nav.audioSession.type = 'ambient';
    sessionConfigured = true;
  } catch {
    try {
      nav.audioSession.type = 'transient';
      sessionConfigured = true;
    } catch {
      /* Brave WKWebView often has no audioSession */
    }
  }
}

function getAudioContextConstructor(): (typeof AudioContext) | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

function bindContextListeners(ctx: AudioContext): void {
  if (listenersBound) return;
  listenersBound = true;
  ctx.addEventListener('statechange', () => {
    if ((ctx.state as string) === 'closed') {
      audioCtx = null;
      listenersBound = false;
    }
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void ensureAudio();
        if (silentLoopPlaying) void restartSilentLoop();
      }
    });
  }
}

function isUnusable(ctx: AudioContext | null): boolean {
  if (!ctx) return true;
  return (ctx.state as string) === 'closed';
}

export function ensureAudio(): AudioContext | null {
  configureAudioSession();
  const AC = getAudioContextConstructor();
  if (!AC) return null;
  if (isUnusable(audioCtx)) {
    try {
      audioCtx = new AC();
      listenersBound = false;
      bindContextListeners(audioCtx);
    } catch (e) {
      lastPlayError = `AudioContext create: ${String(e)}`;
      audioCtx = null;
      return null;
    }
  }
  const ctx = audioCtx!;
  const state = ctx.state as string;
  if (state === 'suspended' || state === 'interrupted') {
    void ctx.resume().catch((e) => {
      lastPlayError = `AudioContext resume: ${String(e)}`;
    });
  }
  return ctx;
}

function makeAudio(src: string): HTMLAudioElement {
  const a = new Audio();
  a.preload = 'auto';
  a.src = src;
  a.setAttribute('playsinline', 'true');
  a.setAttribute('webkit-playsinline', 'true');
  return a;
}

async function mutePlayPause(el: HTMLAudioElement): Promise<void> {
  const prev = el.volume;
  el.muted = true;
  el.volume = 0;
  try {
    el.currentTime = 0;
    await el.play();
    el.pause();
    el.currentTime = 0;
  } finally {
    el.muted = false;
    el.volume = prev || 1;
  }
}

/**
 * Prime HTMLAudio elements with real file URLs during a user gesture.
 * Must run from Commencer / Démarrer tap.
 */
export async function primeHtmlAudio(): Promise<boolean> {
  if (typeof Audio === 'undefined') return false;
  try {
    elCountdown = elCountdown || makeAudio(SOUND.countdown);
    elEnd1 = elEnd1 || makeAudio(SOUND.end1);
    elEnd2 = elEnd2 || makeAudio(SOUND.end2);
    elEnd3 = elEnd3 || makeAudio(SOUND.end3);
    elSilent = elSilent || makeAudio(SOUND.silent);
    elShared = elShared || makeAudio(SOUND.countdown);

    elSilent.loop = true;
    elSilent.volume = 0.001;

    elCountdown.volume = 1;
    elEnd1.volume = 1;
    elEnd2.volume = 1;
    elEnd3.volume = 1;
    elShared.volume = 1;

    // Load + unlock each element under the gesture
    await Promise.all([
      mutePlayPause(elCountdown),
      mutePlayPause(elEnd1),
      mutePlayPause(elEnd2),
      mutePlayPause(elEnd3),
      mutePlayPause(elShared),
      mutePlayPause(elSilent),
    ]);

    htmlPrimed = true;
    lastPlayError = null;
    return true;
  } catch (e) {
    lastPlayError = `primeHtmlAudio: ${String(e)}`;
    htmlPrimed = false;
    return false;
  }
}

async function restartSilentLoop(): Promise<void> {
  if (!elSilent) return;
  try {
    elSilent.loop = true;
    elSilent.volume = 0.001;
    elSilent.currentTime = 0;
    await elSilent.play();
    silentLoopPlaying = true;
  } catch (e) {
    silentLoopPlaying = false;
    lastPlayError = `silentLoop: ${String(e)}`;
  }
}

/** Keep audio route alive during a session (may duck/pause Spotify in some hosts). */
export function startSilentKeepalive(): void {
  if (!elSilent) {
    elSilent = typeof Audio !== 'undefined' ? makeAudio(SOUND.silent) : null;
  }
  if (!elSilent) return;
  void restartSilentLoop();
}

export function stopSilentKeepalive(): void {
  silentLoopPlaying = false;
  if (!elSilent) return;
  try {
    elSilent.pause();
    elSilent.currentTime = 0;
  } catch {
    /* ignore */
  }
}

/**
 * Unlock audio on a user gesture. Creates and primes HTMLAudio elements
 * synchronously from the call stack so WKWebView treats play() as gestured.
 */
export function unlockAudio(): AudioContext | null {
  configureAudioSession();
  const ctx = ensureAudio();

  if (typeof Audio !== 'undefined') {
    try {
      elCountdown = elCountdown || makeAudio(SOUND.countdown);
      elEnd1 = elEnd1 || makeAudio(SOUND.end1);
      elEnd2 = elEnd2 || makeAudio(SOUND.end2);
      elEnd3 = elEnd3 || makeAudio(SOUND.end3);
      elSilent = elSilent || makeAudio(SOUND.silent);
      elShared = elShared || makeAudio(SOUND.countdown);

      elSilent.loop = true;
      elSilent.volume = 0.001;
      elCountdown.volume = 1;
      elEnd1.volume = 1;
      elEnd2.volume = 1;
      elEnd3.volume = 1;
      elShared.volume = 1;

      // Kick unlock plays in the same gesture turn (do not await here)
      void mutePlayPause(elCountdown);
      void mutePlayPause(elEnd1);
      void mutePlayPause(elEnd2);
      void mutePlayPause(elEnd3);
      void mutePlayPause(elShared);
      void mutePlayPause(elSilent);

      htmlPrimed = true;
      preferredPath = 'html';
      lastPlayError = null;
    } catch (e) {
      lastPlayError = `unlockAudio: ${String(e)}`;
      htmlPrimed = false;
    }
  }

  if (ctx && (ctx.state as string) !== 'running') {
    void ctx.resume().catch((e) => {
      lastPlayError = `AudioContext resume: ${String(e)}`;
    });
  }
  return ctx;
}

function playPrimed(el: HTMLAudioElement | null, label: string): boolean {
  if (!el) {
    lastPlayError = `html missing element: ${label}`;
    return false;
  }
  try {
    el.pause();
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        lastBeepMethod = 'html';
        lastPlayError = null;
      }).catch((e) => {
        lastPlayError = `html play(${label}): ${String(e)}`;
        lastBeepMethod = 'none';
      });
    } else {
      lastBeepMethod = 'html';
    }
    return true;
  } catch (e) {
    lastPlayError = `html play(${label}): ${String(e)}`;
    lastBeepMethod = 'none';
    return false;
  }
}

function webAudioIsVerifiedRunning(): AudioContext | null {
  const ctx = audioCtx;
  if (!ctx) return null;
  if ((ctx.state as string) === 'running') return ctx;
  return null;
}

function playWebBeep(
  ctx: AudioContext,
  freq: number,
  duration: number,
  wave: BeepWave,
  gainVal: number
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  const now = ctx.currentTime;
  g.gain.setValueAtTime(gainVal, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
  lastBeepMethod = 'webaudio';
}

/**
 * Generic tone. Prefers primed HTMLAudio; Web Audio only if verified running.
 * Kept for API compatibility / tests — session uses beepCountdown / beepEnd.
 */
export function beep(
  freq: number,
  duration: number,
  wave: BeepWave = 'sine',
  gainVal: number = 0.18
): void {
  configureAudioSession();
  ensureAudio();

  const ctx = webAudioIsVerifiedRunning();
  if (ctx && preferredPath === 'webaudio') {
    try {
      playWebBeep(ctx, freq, duration, wave, gainVal);
      return;
    } catch (e) {
      lastPlayError = `webaudio: ${String(e)}`;
    }
  }

  // HTML primary: reuse shared primed element with countdown file
  // (pitch variety comes from dedicated end elements in beepEnd)
  if (htmlPrimed && elShared) {
    if (playPrimed(elShared, 'shared')) return;
  }

  // Last resort: if Web Audio became running, use it
  const ctx2 = webAudioIsVerifiedRunning();
  if (ctx2) {
    try {
      playWebBeep(ctx2, freq, duration, wave, gainVal);
      return;
    } catch (e) {
      lastPlayError = `webaudio fallback: ${String(e)}`;
    }
  }

  lastBeepMethod = 'none';
}

export function beepCountdown(): void {
  configureAudioSession();
  ensureAudio();

  // HTML first for WKWebView reliability
  if (htmlPrimed && playPrimed(elCountdown || elShared, 'countdown')) {
    return;
  }

  const ctx = webAudioIsVerifiedRunning();
  if (ctx) {
    try {
      playWebBeep(ctx, 880, 0.11, 'square', 0.14);
      return;
    } catch (e) {
      lastPlayError = `webaudio countdown: ${String(e)}`;
    }
  }

  // Try prime+play shared if not primed (may fail outside gesture)
  if (elCountdown || elShared) {
    playPrimed(elCountdown || elShared, 'countdown-late');
    return;
  }

  lastBeepMethod = 'none';
  lastPlayError = lastPlayError || 'beepCountdown: no path';
}

export function beepEnd(): void {
  configureAudioSession();
  ensureAudio();

  const playChordHtml = (): boolean => {
    if (!htmlPrimed) return false;
    const ok1 = playPrimed(elEnd1, 'end-1');
    setTimeout(() => playPrimed(elEnd2, 'end-2'), 150);
    setTimeout(() => playPrimed(elEnd3, 'end-3'), 300);
    return ok1;
  };

  if (playChordHtml()) {
    /* html path */
  } else {
    const ctx = webAudioIsVerifiedRunning();
    if (ctx) {
      try {
        playWebBeep(ctx, 523.25, 0.14, 'sine', 0.2);
        setTimeout(() => {
          const c = webAudioIsVerifiedRunning();
          if (c) playWebBeep(c, 659.25, 0.14, 'sine', 0.2);
        }, 150);
        setTimeout(() => {
          const c = webAudioIsVerifiedRunning();
          if (c) playWebBeep(c, 783.99, 0.28, 'sine', 0.22);
        }, 300);
      } catch (e) {
        lastPlayError = `webaudio end: ${String(e)}`;
        lastBeepMethod = 'none';
      }
    } else {
      lastBeepMethod = 'none';
      lastPlayError = lastPlayError || 'beepEnd: no path';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([200, 80, 200, 80, 350]);
    } catch {
      /* iOS has no vibrate */
    }
  }
}

/** Test helper / legacy export — builds in-memory WAV data URI. */
export function buildBeepDataUri(
  freq: number,
  durationSec: number,
  wave: BeepWave = 'sine',
  gainVal: number = 0.18,
  sampleRate: number = 22050
): string {
  const n = Math.max(1, Math.floor(durationSec * sampleRate));
  const dataSize = n * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-3.5 * (t / Math.max(durationSec, 0.001)));
    const phase = 2 * Math.PI * freq * t;
    const sample = wave === 'square' ? (Math.sin(phase) >= 0 ? 1 : -1) : Math.sin(phase);
    const clamped = Math.max(-1, Math.min(1, sample * gainVal * env * 4));
    view.setInt16(44 + i * 2, (clamped * 0x7fff) | 0, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}
