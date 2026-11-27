import type { Exercise, SequenceStep } from '../types';

interface SupersetGroup {
  tag: string;
  exercises: { index: number; exercise: Exercise }[];
  position: number;
}

export function buildSequence(exercises: Exercise[], restSec: number): SequenceStep[] {
  const sequence: SequenceStep[] = [];
  const groups: SupersetGroup[] = [];
  const processedIndices = new Set<number>();

  exercises.forEach((ex, index) => {
    if (processedIndices.has(index)) return;

    if (ex.supersetTag) {
      const existingGroup = groups.find((g) => g.tag === ex.supersetTag);
      if (existingGroup) {
        existingGroup.exercises.push({ index, exercise: ex });
      } else {
        groups.push({
          tag: ex.supersetTag,
          exercises: [{ index, exercise: ex }],
          position: index,
        });
      }
      processedIndices.add(index);
    }
  });

  const items: Array<{ type: 'single'; index: number } | { type: 'group'; group: SupersetGroup }> =
    [];

  exercises.forEach((_, index) => {
    if (processedIndices.has(index)) return;
    items.push({ type: 'single', index });
  });

  groups.forEach((group) => {
    items.push({ type: 'group', group });
  });

  items.sort((a, b) => {
    const posA = a.type === 'single' ? a.index : a.group.position;
    const posB = b.type === 'single' ? b.index : b.group.position;
    return posA - posB;
  });

  items.forEach((item, itemIdx) => {
    if (item.type === 'single') {
      const ex = exercises[item.index];
      for (let setIdx = 0; setIdx < ex.sets; setIdx++) {
        sequence.push({
          type: 'exercise',
          exerciseIndex: item.index,
          setIndex: setIdx,
        });

        const isLastSetOfExercise = setIdx === ex.sets - 1;
        const isLastItem = itemIdx === items.length - 1;
        const needsRest = !isLastSetOfExercise || !isLastItem;

        if (needsRest && restSec > 0) {
          const nextItem = isLastSetOfExercise ? items[itemIdx + 1] : null;
          let nextExercise = undefined;

          if (nextItem) {
            if (nextItem.type === 'single') {
              nextExercise = previewExercise(exercises[nextItem.index], 0);
            } else if (nextItem.type === 'group') {
              nextExercise = previewExercise(nextItem.group.exercises[0].exercise, 0);
            }
          } else if (!isLastSetOfExercise) {
            nextExercise = previewExercise(ex, setIdx + 1);
          }

          sequence.push({
            type: 'rest',
            nextExercise,
          });
        }
      }
    } else {
      const group = item.group;
      const maxSets = Math.max(...group.exercises.map((e) => e.exercise.sets));

      for (let round = 0; round < maxSets; round++) {
        const activeExercises = group.exercises.filter(
          (e) => round < e.exercise.sets
        );

        activeExercises.forEach((exItem, exIdx) => {
          sequence.push({
            type: 'exercise',
            exerciseIndex: exItem.index,
            setIndex: round,
            supersetRound: round + 1,
            supersetTotal: maxSets,
            supersetTag: group.tag,
          });

          const isLastInRound = exIdx === activeExercises.length - 1;
          const isLastRound = round === maxSets - 1;
          const isLastItem = itemIdx === items.length - 1;

          if (isLastInRound && !isLastRound && restSec > 0) {
            const nextRoundExercises = group.exercises.filter(
              (e) => round + 1 < e.exercise.sets
            );
            const nextEx = nextRoundExercises[0]?.exercise;
            const nextExercise = nextEx ? previewExercise(nextEx, round + 1) : undefined;

            sequence.push({
              type: 'rest',
              nextExercise,
            });
          } else if (isLastInRound && isLastRound && !isLastItem && restSec > 0) {
            const nextItem = items[itemIdx + 1];
            let nextExercise = undefined;

            if (nextItem.type === 'single') {
              nextExercise = previewExercise(exercises[nextItem.index], 0);
            } else if (nextItem.type === 'group') {
              nextExercise = previewExercise(nextItem.group.exercises[0].exercise, 0);
            }

            sequence.push({
              type: 'rest',
              nextExercise,
            });
          }
        });
      }
    }
  });

  return sequence;
}

function previewExercise(ex: Exercise, setIndex: number) {
  return {
    name: ex.name,
    setIndex,
    totalSets: ex.sets,
    reps: ex.reps,
    durationSec: ex.durationSec,
    weight: ex.weight,
    equipmentType: ex.equipmentType,
  };
}
