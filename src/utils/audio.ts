/**
 * Timer beeps via Web Audio, with iOS/WebKit-friendly ambient mixing.
 *
 * Root cause of silent beeps over Spotify on iPhone (Brave/WebKit):
 * the default audio session competes with background music and the
 * AudioContext often stays suspended / interrupted. We set
 * `navigator.audioSession.type = 'ambient'` (iOS 17+) so beeps mix
 * with other audio, resume/recreate the context as needed, and fall
 * back to a short HTMLAudioElement WAV if Web Audio stays blocked.
 *
 * Ambient mode follows the hardware mute switch — document that for users.
 */

type BeepWave = OscillatorType;

interface AudioSessionNavigator {
  audioSession?: { type: string };
}

let audioCtx: AudioContext | null = null;
let sessionConfigured = false;
let listenersBound = false;
let htmlUnlocked = false;
const htmlFallbackCache = new Map<string, string>();

const MUTE_HINT =
  'Les bips se mélangent à la musique en cours et suivent le mute du téléphone.';

export function getAudioMuteHint(): string {
  return MUTE_HINT;
}

function configureAudioSession(): void {
  if (sessionConfigured || typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & AudioSessionNavigator;
  if (!nav.audioSession) return;
  try {
    // ambient: mixes with Spotify/etc. and respects the silent switch
    // (prefer over transient-solo / playback which can duck or interrupt)
    nav.audioSession.type = 'ambient';
    sessionConfigured = true;
  } catch {
    try {
      nav.audioSession.type = 'transient';
      sessionConfigured = true;
    } catch {
      /* older WebKit — ignore */
    }
  }
}

function getAudioContextConstructor(): (typeof AudioContext) | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || null;
}

function bindContextListeners(ctx: AudioContext): void {
  if (listenersBound) return;
  listenersBound = true;

  const onStateChange = () => {
    const state = ctx.state as string;
    if (state === 'closed') {
      audioCtx = null;
      listenersBound = false;
    }
  };

  ctx.addEventListener('statechange', onStateChange);

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void ensureAudio();
      }
    });
  }
}

function isUnusable(ctx: AudioContext | null): boolean {
  if (!ctx) return true;
  const state = ctx.state as string;
  return state === 'closed';
}

/**
 * Create / resume the shared AudioContext. Safe to call from a user gesture
 * (Commencer / Démarrer) and again before every beep.
 */
export function ensureAudio(): AudioContext | null {
  configureAudioSession();

  const AC = getAudioContextConstructor();
  if (!AC) return null;

  if (isUnusable(audioCtx)) {
    try {
      audioCtx = new AC();
      listenersBound = false;
      bindContextListeners(audioCtx);
    } catch {
      audioCtx = null;
      return null;
    }
  }

  const ctx = audioCtx!;
  const state = ctx.state as string;
  if (state === 'suspended' || state === 'interrupted') {
    void ctx.resume().catch(() => {
      /* will retry / fall back on next beep */
    });
  }

  return ctx;
}

/** Alias kept for call sites that want an explicit unlock on gesture. */
export function unlockAudio(): AudioContext | null {
  const ctx = ensureAudio();
  unlockHtmlAudio();
  return ctx;
}

function unlockHtmlAudio(): void {
  if (htmlUnlocked || typeof Audio === 'undefined') return;
  try {
    const silent = new Audio(
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
    );
    silent.volume = 0.01;
    const p = silent.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        htmlUnlocked = true;
        silent.pause();
      }).catch(() => {
        /* gesture may still unlock later */
      });
    } else {
      htmlUnlocked = true;
    }
  } catch {
    /* ignore */
  }
}

async function resumeBeforeBeep(ctx: AudioContext): Promise<boolean> {
  const state = ctx.state as string;
  if (state === 'running') return true;
  if (state === 'closed') return false;
  try {
    await ctx.resume();
  } catch {
    return false;
  }
  const after = ctx.state as string;
  if (after === 'running') return true;
  if (after === 'interrupted' || after === 'suspended') {
    // Recreate once — WebKit sometimes leaves the old context dead
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
    audioCtx = null;
    listenersBound = false;
    const fresh = ensureAudio();
    if (!fresh) return false;
    try {
      await fresh.resume();
    } catch {
      return false;
    }
    return (fresh.state as string) === 'running';
  }
  return false;
}

/** Build a mono 16-bit PCM WAV data URI for a short tone (HTMLAudio fallback). */
export function buildBeepDataUri(
  freq: number,
  durationSec: number,
  wave: BeepWave = 'sine',
  gainVal: number = 0.18,
  sampleRate: number = 22050
): string {
  const key = `${freq}|${durationSec}|${wave}|${gainVal}|${sampleRate}`;
  const cached = htmlFallbackCache.get(key);
  if (cached) return cached;

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
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-3.5 * (t / Math.max(durationSec, 0.001))); // rough decay
    let sample = 0;
    const phase = 2 * Math.PI * freq * t;
    if (wave === 'square') {
      sample = Math.sin(phase) >= 0 ? 1 : -1;
    } else if (wave === 'triangle') {
      sample = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1;
    } else if (wave === 'sawtooth') {
      sample = 2 * ((freq * t) % 1) - 1;
    } else {
      sample = Math.sin(phase);
    }
    const clamped = Math.max(-1, Math.min(1, sample * gainVal * env * 4));
    view.setInt16(44 + i * 2, (clamped * 0x7fff) | 0, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const uri = `data:audio/wav;base64,${btoa(binary)}`;
  htmlFallbackCache.set(key, uri);
  return uri;
}

function playHtmlBeep(
  freq: number,
  duration: number,
  wave: BeepWave,
  gainVal: number
): void {
  if (typeof Audio === 'undefined') return;
  try {
    const uri = buildBeepDataUri(freq, duration, wave, gainVal);
    const audio = new Audio(uri);
    audio.volume = Math.min(1, Math.max(0.05, gainVal * 3));
    void audio.play().catch(() => {
      /* still blocked — nothing more we can do without a gesture */
    });
  } catch {
    /* ignore */
  }
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
}

/**
 * Schedule a single tone. Timing (when this is called) is owned by the session
 * timer — we only play immediately when invoked.
 */
export function beep(
  freq: number,
  duration: number,
  wave: BeepWave = 'sine',
  gainVal: number = 0.18
): void {
  configureAudioSession();
  const ctx = ensureAudio();

  if (!ctx) {
    playHtmlBeep(freq, duration, wave, gainVal);
    return;
  }

  const state = ctx.state as string;
  if (state === 'running') {
    try {
      playWebBeep(ctx, freq, duration, wave, gainVal);
      return;
    } catch {
      playHtmlBeep(freq, duration, wave, gainVal);
      return;
    }
  }

  // suspended / interrupted — resume then play, with HTML fallback
  void resumeBeforeBeep(ctx).then((ok) => {
    if (ok && audioCtx && (audioCtx.state as string) === 'running') {
      try {
        playWebBeep(audioCtx, freq, duration, wave, gainVal);
        return;
      } catch {
        /* fall through */
      }
    }
    playHtmlBeep(freq, duration, wave, gainVal);
  });
}

export function beepCountdown(): void {
  beep(880, 0.11, 'square', 0.14);
}

export function beepEnd(): void {
  beep(523.25, 0.14, 'sine', 0.2);
  setTimeout(() => beep(659.25, 0.14, 'sine', 0.2), 150);
  setTimeout(() => beep(783.99, 0.28, 'sine', 0.22), 300);
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([200, 80, 200, 80, 350]);
    } catch {
      /* iOS has no vibrate */
    }
  }
}
