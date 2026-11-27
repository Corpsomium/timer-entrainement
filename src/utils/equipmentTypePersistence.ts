import type { Exercise, SessionState } from '../types';
import type { ExerciseEquipmentType } from '../types/equipment';
import {
  loadEquipmentTypeOverrides,
  normalizeExerciseKey,
  saveEquipmentTypeOverrides,
} from './storage';

/** Persist override + return exercises with updated type for matching names. */
export function applyEquipmentTypeToExercises(
  exercises: Exercise[],
  exerciseName: string,
  type: ExerciseEquipmentType
): Exercise[] {
  const key = normalizeExerciseKey(exerciseName);
  const map = loadEquipmentTypeOverrides();
  map[key] = type;
  saveEquipmentTypeOverrides(map);

  return exercises.map((ex) =>
    normalizeExerciseKey(ex.name) === key
      ? { ...ex, equipmentType: type || undefined }
      : ex
  );
}

export function updateSessionEquipmentType(
  prev: SessionState,
  exerciseName: string,
  type: ExerciseEquipmentType
): SessionState {
  return {
    ...prev,
    exercises: applyEquipmentTypeToExercises(prev.exercises, exerciseName, type),
  };
}
