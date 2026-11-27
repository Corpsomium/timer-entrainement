import type { Exercise, ParseResult } from '../types';
import type { ExerciseEquipmentType } from '../types/equipment';
import { deduceEquipmentType } from './deduceEquipmentType';
import { normalizeExerciseKey, type EquipmentTypeOverrides } from './storage';

export function parseWorkout(
  text: string,
  typeOverrides: EquipmentTypeOverrides = {}
): ParseResult {
  const exercises: Exercise[] = [];
  const warnings: { line: number; text: string; reason: string }[] = [];
  const lines = String(text == null ? '' : text).split(/\r?\n/);
  const re =
    /^(.+?)\s*[:：]\s*(\d+)\s*[x×X]\s*(\d+(?:[.,]\d+)?)\s*(s|sec|secs|seconde|secondes)?\s*(?:\((.+)\))?\s*(?:set\s*([A-Za-z])|([A-Za-z]))?$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const m = line.match(re);
    if (!m) {
      warnings.push({ line: i + 1, text: line, reason: 'Ligne non reconnue' });
      continue;
    }
    const name = m[1].trim();
    const sets = parseInt(m[2], 10);
    const repsNum = parseFloat(String(m[3]).replace(',', '.'));
    const isDuration = Boolean(m[4]);
    const weight = m[5] ? m[5].trim() : '';
    const supersetTag = m[6] || m[7];

    if (
      !name ||
      !Number.isFinite(sets) ||
      sets < 1 ||
      !Number.isFinite(repsNum) ||
      repsNum <= 0
    ) {
      warnings.push({ line: i + 1, text: line, reason: 'Valeurs invalides' });
      continue;
    }

    const key = normalizeExerciseKey(name);
    const override = typeOverrides[key];
    const deduced = deduceEquipmentType(name, weight);
    const equipmentType: ExerciseEquipmentType =
      override !== undefined ? override : deduced;

    exercises.push({
      name: name,
      sets: sets,
      reps: isDuration ? null : Math.round(repsNum),
      durationSec: isDuration ? repsNum : null,
      weight: weight,
      equipmentType: equipmentType || undefined,
      supersetTag: supersetTag ? supersetTag.toUpperCase() : undefined,
    });
  }

  return { exercises, warnings };
}
