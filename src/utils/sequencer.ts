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
              const nextEx = exercises[nextItem.index];
              nextExercise = {
                name: nextEx.name,
                setIndex: 0,
                totalSets: nextEx.sets,
                load: formatLoad(nextEx),
              };
            } else if (nextItem.type === 'group') {
              const firstEx = nextItem.group.exercises[0].exercise;
              nextExercise = {
                name: firstEx.name,
                setIndex: 0,
                totalSets: firstEx.sets,
                load: formatLoad(firstEx),
              };
            }
          } else if (!isLastSetOfExercise) {
            nextExercise = {
              name: ex.name,
              setIndex: setIdx + 1,
              totalSets: ex.sets,
              load: formatLoad(ex),
            };
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
            const nextExercise = nextEx
              ? {
                  name: nextEx.name,
                  setIndex: round + 1,
                  totalSets: nextEx.sets,
                  load: formatLoad(nextEx),
                }
              : undefined;

            sequence.push({
              type: 'rest',
              nextExercise,
            });
          } else if (isLastInRound && isLastRound && !isLastItem && restSec > 0) {
            const nextItem = items[itemIdx + 1];
            let nextExercise = undefined;

            if (nextItem.type === 'single') {
              const nextEx = exercises[nextItem.index];
              nextExercise = {
                name: nextEx.name,
                setIndex: 0,
                totalSets: nextEx.sets,
                load: formatLoad(nextEx),
              };
            } else if (nextItem.type === 'group') {
              const firstEx = nextItem.group.exercises[0].exercise;
              nextExercise = {
                name: firstEx.name,
                setIndex: 0,
                totalSets: firstEx.sets,
                load: formatLoad(firstEx),
              };
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

function formatLoad(ex: Exercise): string {
  const rx = ex.durationSec != null ? formatDurationLabel(ex.durationSec) : String(ex.reps);
  const base = `${ex.sets} × ${rx}`;
  return ex.weight ? `${base} · ${ex.weight}` : base;
}

function formatDurationLabel(sec: number): string {
  if (sec % 1 !== 0) return String(sec).replace('.', ',') + ' s';
  return sec + ' s';
}
