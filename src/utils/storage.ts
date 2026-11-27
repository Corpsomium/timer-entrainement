import type { SessionState, IllustrationHistory } from '../types';
import type { EquipmentInventory, ExerciseEquipmentType } from '../types/equipment';
import { createDefaultInventory } from './equipmentDefaults';

const LS_BLOCK = 'muscu-timer-block';
const LS_REST = 'muscu-timer-rest';
const LS_SESSION = 'muscu-timer-session';
const LS_ILLUSTRATIONS = 'muscu-timer-illustrations';
const LS_EQUIPMENT = 'muscu-timer-equipment';
const LS_EQUIPMENT_TYPES = 'muscu-timer-equipment-types';

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
    // Don't persist the equipment editor as the resume screen
    const toSave =
      state.screen === 'equipment' ? { ...state, screen: 'overview' as const } : state;
    localStorage.setItem(LS_SESSION, JSON.stringify(toSave));
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

function isInventory(v: unknown): v is EquipmentInventory {
  if (!v || typeof v !== 'object') return false;
  const o = v as EquipmentInventory;
  return Array.isArray(o.bars) && Array.isArray(o.plates) && Array.isArray(o.kettlebells);
}

export function loadEquipment(): EquipmentInventory {
  try {
    const raw = localStorage.getItem(LS_EQUIPMENT);
    if (!raw) return createDefaultInventory();
    const parsed = JSON.parse(raw);
    if (!isInventory(parsed)) return createDefaultInventory();
    return parsed;
  } catch (e) {
    return createDefaultInventory();
  }
}

export function saveEquipment(inventory: EquipmentInventory): void {
  try {
    localStorage.setItem(LS_EQUIPMENT, JSON.stringify(inventory));
  } catch (e) {}
}

/** Manual overrides of exercise equipment type, keyed by normalized name. */
export type EquipmentTypeOverrides = Record<string, ExerciseEquipmentType>;

export function loadEquipmentTypeOverrides(): EquipmentTypeOverrides {
  try {
    const raw = localStorage.getItem(LS_EQUIPMENT_TYPES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

export function saveEquipmentTypeOverrides(map: EquipmentTypeOverrides): void {
  try {
    localStorage.setItem(LS_EQUIPMENT_TYPES, JSON.stringify(map));
  } catch (e) {}
}

export function normalizeExerciseKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
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
