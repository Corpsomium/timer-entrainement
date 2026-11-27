import type { SessionState } from '../types';

/**
 * Empty the workout block and wipe in-progress session fields.
 * Keeps restSec; does not touch equipment inventory or type overrides
 * (those live outside SessionState).
 */
export function clearedExerciseBlockState(prev: SessionState): SessionState {
  return {
    ...prev,
    screen: 'input',
    block: '',
    exercises: [],
    warnings: [],
    stepIndex: 0,
    phase: 'ready',
    endsAt: null,
    timerStartedAt: null,
    completedSets: 0,
    startedAt: null,
    finishedAt: null,
    skipped: {},
  };
}
