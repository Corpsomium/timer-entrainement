import { useEffect, useState } from 'react';
import { getAudioDebugInfo, type AudioDebugInfo } from '../utils/audio';
import { getBuildHash } from '../utils/buildInfo';

export function shouldShowAudioDebug(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('debug') === '1') return true;
    if (sessionStorage.getItem('seance-audio-debug') === '1') return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function enableAudioDebug(): void {
  try {
    sessionStorage.setItem('seance-audio-debug', '1');
  } catch {
    /* ignore */
  }
}

export function AudioDebugPanel() {
  const [info, setInfo] = useState<AudioDebugInfo | null>(null);

  useEffect(() => {
    const tick = () => setInfo(getAudioDebugInfo());
    tick();
    const id = window.setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  if (!info) return null;

  return (
    <aside className="audio-debug" aria-label="Audio debug">
      <strong>Audio debug</strong>
      <div>build: {getBuildHash()}</div>
      <div>audioSession: {info.audioSessionSupported ? `yes (${info.audioSessionType})` : 'no'}</div>
      <div>AudioContext: {info.audioContextState ?? 'null'}</div>
      <div>preferred: {info.preferredPath}</div>
      <div>last method: {info.lastBeepMethod ?? '—'}</div>
      <div>html primed: {info.htmlPrimed ? 'yes' : 'no'}</div>
      <div>silent loop: {info.silentLoopPlaying ? 'yes' : 'no'}</div>
      <div>last error: {info.lastPlayError ?? '—'}</div>
      <div className="audio-debug-ua">{info.userAgent}</div>
    </aside>
  );
}
