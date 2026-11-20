import type { Exercise } from '../types';

export function formatReps(ex: Exercise): string {
  if (!ex) return '';
  if (ex.durationSec != null) return formatDuration(ex.durationSec * 1000) + " d'effort";
  return ex.reps + ' reps';
}

export function formatLoad(ex: Exercise): string {
  if (!ex) return '';
  const rx = ex.durationSec != null ? formatDurationLabel(ex.durationSec) : String(ex.reps);
  const base = ex.sets + ' × ' + rx;
  return ex.weight ? base + ' · ' + ex.weight : base;
}

export function formatDurationLabel(sec: number): string {
  if (sec % 1 !== 0) return String(sec).replace('.', ',') + ' s';
  return sec + ' s';
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return h + ' h ' + m + ' min';
  if (m) return m + ' min ' + s + ' s';
  return s + ' s';
}
