import type { SessionState, IllustrationHistory } from '../types';

const LS_BLOCK = 'muscu-timer-block';
const LS_REST = 'muscu-timer-rest';
const LS_SESSION = 'muscu-timer-session';
const LS_ILLUSTRATIONS = 'muscu-timer-illustrations';

export function loadBlock(): string | null {
  try {
    return localStorage.getItem(LS_BLOCK);
  } catch (e) {
    return null;
  }
}

export function saveBlock(block: string): void {
  try {
    localStorage.setItem(LS_BLOCK, block);
  } catch (e) {}
}

export function loadRest(): number {
  try {
    const rest = parseInt(localStorage.getItem(LS_REST) || '60', 10);
    if (Number.isFinite(rest) && rest >= 0) return rest;
  } catch (e) {}
  return 60;
}

export function saveRest(restSec: number): void {
  try {
    localStorage.setItem(LS_REST, String(restSec));
  } catch (e) {}
}

export function loadSession(): Partial<SessionState> | null {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.exercises || !s.exercises.length) return null;
    return s;
  } catch (e) {
    return null;
  }
}

export function saveSession(state: Partial<SessionState>): void {
  try {
    if (state.screen === 'input' || !state.exercises || !state.exercises.length) {
      localStorage.removeItem(LS_SESSION);
      return;
    }
    localStorage.setItem(LS_SESSION, JSON.stringify(state));
  } catch (e) {}
}

export function clearSession(): void {
  try {
    localStorage.removeItem(LS_SESSION);
  } catch (e) {}
}

export function loadIllustrations(): IllustrationHistory {
  try {
    const raw = localStorage.getItem(LS_ILLUSTRATIONS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

export function saveIllustrations(history: IllustrationHistory): void {
  try {
    localStorage.setItem(LS_ILLUSTRATIONS, JSON.stringify(history));
  } catch (e) {}
}

export function decodeHashBlock(): string | null {
  if (!location.hash || location.hash.length <= 1) return null;
  let raw = location.hash.slice(1);
  try {
    raw = decodeURIComponent(raw);
  } catch (e) {}
  if (raw.slice(0, 2) === 'w=') {
    raw = raw.slice(2);
    try {
      raw = decodeURIComponent(raw);
    } catch (e) {}
  }
  raw = raw.trim() ? raw : '';
  return raw || null;
}

export function updateHashBlock(block: string): void {
  try {
    const path = (location.pathname || '') + (location.search || '') + '#' + encodeURIComponent(block);
    if (location.protocol === 'file:') location.hash = encodeURIComponent(block);
    else history.replaceState(null, '', path);
  } catch (e) {}
}

export function shareUrl(block: string): string {
  const base =
    location.origin && location.origin !== 'null'
      ? location.origin + location.pathname + location.search
      : location.pathname || 'index.html';
  return base + '#' + encodeURIComponent(block);
}
