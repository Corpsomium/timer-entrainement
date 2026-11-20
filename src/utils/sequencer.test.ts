import { describe, it, expect } from 'vitest';
import { parseWorkout } from './parser';
import { buildSequence } from './sequencer';

describe('Superset sequencer', () => {
  it('should build correct sequence for superset example', () => {
    const block = `Fentes arrière : 3x10 (2x10kg)
Pull-apart : 3x15 (bande20) setA
Extensions mollets : 3x15 (20kg) setA
Kickback : 3x10 (7.5kg) setB
Hammer preacher curl 45° : 3x10 (10kg) setB
Bird dogs : 2x12
Marches du fermier : 3x30s (2x15kg)`;

    const { exercises } = parseWorkout(block);
    const sequence = buildSequence(exercises, 60);

    expect(exercises[0].name).toBe('Fentes arrière');
    expect(exercises[1].name).toBe('Pull-apart');
    expect(exercises[1].supersetTag).toBe('A');
    expect(exercises[2].name).toBe('Extensions mollets');
    expect(exercises[2].supersetTag).toBe('A');
    expect(exercises[3].name).toBe('Kickback');
    expect(exercises[3].supersetTag).toBe('B');
    expect(exercises[4].name).toBe('Hammer preacher curl 45°');
    expect(exercises[4].supersetTag).toBe('B');
    expect(exercises[5].name).toBe('Bird dogs');
    expect(exercises[6].name).toBe('Marches du fermier');

    const seqNames = sequence
      .filter((s) => s.type === 'exercise')
      .map((s) => exercises[s.exerciseIndex!].name);

    expect(seqNames[0]).toBe('Fentes arrière');
    expect(seqNames[1]).toBe('Fentes arrière');
    expect(seqNames[2]).toBe('Fentes arrière');

    const findExerciseInSequence = (name: string): number[] => {
      return sequence
        .map((s, i) => 
          s.type === 'exercise' && exercises[s.exerciseIndex!].name === name ? i : -1
        )
        .filter((i) => i !== -1);
    };

    const pullapartIndices = findExerciseInSequence('Pull-apart');
    expect(pullapartIndices.length).toBe(3);

    const molletsIndices = findExerciseInSequence('Extensions mollets');
    expect(molletsIndices.length).toBe(3);

    for (let i = 0; i < 3; i++) {
      const pullapartIdx = pullapartIndices[i];
      const molletsIdx = molletsIndices[i];
      expect(molletsIdx).toBe(pullapartIdx + 1);

      const nextStep = sequence[molletsIdx + 1];
      expect(nextStep?.type).toBe('rest');
    }

    const kickbackIndices = findExerciseInSequence('Kickback');
    expect(kickbackIndices.length).toBe(3);

    const hammerIndices = findExerciseInSequence('Hammer preacher curl 45°');
    expect(hammerIndices.length).toBe(3);

    for (let i = 0; i < 3; i++) {
      const kickbackIdx = kickbackIndices[i];
      const hammerIdx = hammerIndices[i];
      expect(hammerIdx).toBe(kickbackIdx + 1);
    }

    const birddogIndices = findExerciseInSequence('Bird dogs');
    expect(birddogIndices.length).toBe(2);

    const marcheIndices = findExerciseInSequence('Marches du fermier');
    expect(marcheIndices.length).toBe(3);

    const firstPullapart = pullapartIndices[0];
    const firstFentes = findExerciseInSequence('Fentes arrière')[0];
    expect(firstPullapart).toBeGreaterThan(firstFentes);

    const firstKickback = kickbackIndices[0];
    const lastMollets = molletsIndices[molletsIndices.length - 1];
    expect(firstKickback).toBeGreaterThan(lastMollets);
  });

  it('should handle exercises with different set counts in superset', () => {
    const block = `Ex1 : 3x10 setA
Ex2 : 2x10 setA`;

    const { exercises } = parseWorkout(block);
    const sequence = buildSequence(exercises, 60);

    const exerciseSteps = sequence.filter((s) => s.type === 'exercise');
    const exNames = exerciseSteps.map((s) => exercises[s.exerciseIndex!].name);

    expect(exNames[0]).toBe('Ex1');
    expect(exNames[1]).toBe('Ex2');
    expect(exNames[2]).toBe('Ex1');
    expect(exNames[3]).toBe('Ex2');
    expect(exNames[4]).toBe('Ex1');
  });

  it('should not add rest after the last set', () => {
    const block = `Ex1 : 2x10`;

    const { exercises } = parseWorkout(block);
    const sequence = buildSequence(exercises, 60);

    const lastStep = sequence[sequence.length - 1];
    expect(lastStep.type).toBe('exercise');
  });

  it('should handle zero rest time', () => {
    const block = `Ex1 : 2x10
Ex2 : 2x10`;

    const { exercises } = parseWorkout(block);
    const sequence = buildSequence(exercises, 0);

    const restSteps = sequence.filter((s) => s.type === 'rest');
    expect(restSteps.length).toBe(0);
  });
});
