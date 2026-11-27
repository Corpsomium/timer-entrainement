import type { ExerciseEquipmentType } from '../types/equipment';
import { parseWeightPrescription } from './parseWeight';

const HALT_RE =
  /\b(haltère|halteres|haltères|dumbbell|db)\b|curls?\b|kickback|élévations?\s+lat|elevations?\s+lat|fentes|lunges?|marches?\s+du\s+fermier|farmer/i;
const KB_RE = /\b(kettlebell|kb|goblet)\b/i;
const EZ_RE = /\b(ez|curl\s+ez|barre\s+ez)\b/i;
const BAR_RE =
  /\b(barre|squat|soulevé|deadlift|développé\s+couché|bench|hip\s*thrust|rowing\s+barr|row\s+barr|ohp|military)\b/i;
const BAND_RE = /\b(bande|band|pull[\s-]?apart|elastique|élastique)\b/i;
const BODY_RE =
  /\b(poids\s+du\s+corps|bodyweight|bw|planche|plank|bird\s*dogs?|pompes?|push[\s-]?ups?|tractions?|chin[\s-]?ups?|crunch|abdos?)\b/i;

/**
 * Best-effort deduction from exercise name + weight string.
 * Returns '' when ambiguous.
 */
export function deduceEquipmentType(
  name: string,
  weight: string
): ExerciseEquipmentType {
  const n = name || '';
  const w = (weight || '').toLowerCase();

  if (BAND_RE.test(n) || /^bande/.test(w)) return 'bande';
  if (BODY_RE.test(n) && !parseWeightPrescription(weight)) return 'poids_du_corps';
  if (KB_RE.test(n)) return 'kettlebell';
  if (EZ_RE.test(n)) return 'barre_ez';

  const rx = parseWeightPrescription(weight);
  if (rx && rx.count >= 2) {
    if (HALT_RE.test(n) || !BAR_RE.test(n)) return 'haltères';
  }

  if (HALT_RE.test(n)) return 'haltères';
  if (BAR_RE.test(n)) return 'barre_droite';

  if (rx && rx.count >= 2) return 'haltères';
  if (rx && rx.count === 1 && rx.kg >= 20) return 'barre_droite';

  return '';
}
