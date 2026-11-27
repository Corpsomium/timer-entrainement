import type { ExerciseEquipmentType } from './types/equipment';

export type { ExerciseEquipmentType };

export interface Exercise {
  name: string;
  sets: number;
  reps: number | null;
  durationSec: number | null;
  weight: string;
  /** How the load is realized — drives loadout suggestions. */
  equipmentType?: ExerciseEquipmentType;
  supersetTag?: string;
}

export interface ParseWarning {
  line: number;
  text: string;
  reason: string;
}

export interface ParseResult {
  exercises: Exercise[];
  warnings: ParseWarning[];
}

export interface SequenceStep {
  type: 'exercise' | 'rest';
  exerciseIndex?: number;
  setIndex?: number;
  supersetRound?: number;
  supersetTotal?: number;
  supersetTag?: string;
  nextExercise?: {
    name: string;
    setIndex: number;
    totalSets: number;
    reps: number | null;
    durationSec: number | null;
    weight: string;
    equipmentType?: ExerciseEquipmentType;
  };
}

export interface SessionState {
  screen: 'input' | 'overview' | 'session' | 'done' | 'equipment';
  block: string;
  restSec: number;
  exercises: Exercise[];
  warnings: ParseWarning[];
  stepIndex: number;
  phase: 'ready' | 'work' | 'rest';
  endsAt: number | null;
  timerStartedAt: number | null;
  completedSets: number;
  startedAt: number | null;
  finishedAt: number | null;
  skipped: Record<number, number>;
}

export interface ExerciseIllustration {
  exerciseId: string;
  imageUrls: string[];
  name: string;
  primaryFrame?: number; // Index of the most expressive frame (0 or 1), used for overview thumbnails
  chosenAt: number;
  manual?: boolean;
}

export interface IllustrationHistory {
  [normalizedName: string]: ExerciseIllustration;
}
