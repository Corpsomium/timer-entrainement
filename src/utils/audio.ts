let audioCtx: AudioContext | null = null;

export function ensureAudio(): AudioContext | null {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function beep(
  freq: number,
  duration: number,
  wave: OscillatorType = 'sine',
  gainVal: number = 0.18
): void {
  const ctx = ensureAudio();
  if (!ctx) return;
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

export function beepCountdown(): void {
  beep(880, 0.11, 'square', 0.14);
}

export function beepEnd(): void {
  beep(523.25, 0.14, 'sine', 0.2);
  setTimeout(() => beep(659.25, 0.14, 'sine', 0.2), 150);
  setTimeout(() => beep(783.99, 0.28, 'sine', 0.22), 300);
  if (navigator.vibrate) {
    try {
      navigator.vibrate([200, 80, 200, 80, 350]);
    } catch (e) {}
  }
}
