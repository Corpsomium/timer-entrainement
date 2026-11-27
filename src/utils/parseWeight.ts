import type { WeightPrescription } from '../types/equipment';

/**
 * Parse load strings like "2x15kg", "2×15", "15kg", "7,5kg", "2x15 kg".
 * Returns null when no numeric load is found (band, bodyweight, empty…).
 */
export function parseWeightPrescription(raw: string): WeightPrescription | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!s) return null;

  // Ignore pure band / bodyweight markers without kg
  if (/^bande/.test(s) || s === 'bw' || s === 'pdc') return null;

  // 2x15kg / 2×15 / 2x15
  const pair = s.match(/^(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:kg)?$/i);
  if (pair) {
    const count = parseInt(pair[1], 10);
    const kg = parseFloat(pair[2].replace(',', '.'));
    if (count >= 1 && Number.isFinite(kg) && kg > 0) {
      return { count, kg, raw };
    }
  }

  // 15kg / 7,5kg / 15
  const single = s.match(/^(\d+(?:[.,]\d+)?)\s*(?:kg)?$/i);
  if (single) {
    const kg = parseFloat(single[1].replace(',', '.'));
    if (Number.isFinite(kg) && kg > 0) {
      return { count: 1, kg, raw };
    }
  }

  return null;
}
