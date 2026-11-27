import { describe, expect, it } from 'vitest';
import type { SessionState } from '../types';
import { clearedExerciseBlockState } from './clearExerciseBlock';

function baseState(over: Partial<SessionState> = {}): SessionState {
  return {
    screen: 'overview',
    block: 'Fentes : 3x10\nRowing : 3x12',
    restSec: 90,
    exercises: [
      {
        name: 'Fentes',
        sets: 3,
        reps: 10,
        durationSec: null,
        weight: '2x10kg',
        equipmentType: 'haltères',
      },
    ],
    warnings: [{ line: 2, text: 'bad', reason: 'format' }],
    stepIndex: 4,
    phase: 'rest',
    endsAt: 1_700_000_000_000,
    timerStartedAt: 1_699_999_900_000,
    completedSets: 3,
    startedAt: 1_699_999_000_000,
    finishedAt: null,
    skipped: { 0: 1 },
    ...over,
  };
}

describe('clearedExerciseBlockState', () => {
  it('empties the block text and exercise list', () => {
    const next = clearedExerciseBlockState(baseState());
    expect(next.block).toBe('');
    expect(next.exercises).toEqual([]);
    expect(next.warnings).toEqual([]);
  });

  it('resets session progress fields', () => {
    const next = clearedExerciseBlockState(baseState({ screen: 'session', finishedAt: 99 }));
    expect(next.stepIndex).toBe(0);
    expect(next.phase).toBe('ready');
    expect(next.endsAt).toBeNull();
    expect(next.timerStartedAt).toBeNull();
    expect(next.completedSets).toBe(0);
    expect(next.startedAt).toBeNull();
    expect(next.finishedAt).toBeNull();
    expect(next.skipped).toEqual({});
  });

  it('returns to the input screen', () => {
    expect(clearedExerciseBlockState(baseState({ screen: 'done' })).screen).toBe('input');
  });

  it('preserves rest duration', () => {
    expect(clearedExerciseBlockState(baseState({ restSec: 75 })).restSec).toBe(75);
  });

  it('does not carry exercise equipmentType into cleared state', () => {
    const next = clearedExerciseBlockState(baseState());
    expect(next.exercises).toHaveLength(0);
  });
});
