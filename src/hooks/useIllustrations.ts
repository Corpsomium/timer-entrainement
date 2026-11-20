import { useState, useEffect } from 'react';
import type { Exercise, IllustrationHistory, ExerciseIllustration } from '../types';
import {
  fetchExerciseDb,
  findExercise,
  normalizeExerciseName,
  seedIllustrations,
} from '../utils/illustrations';
import { loadIllustrations, saveIllustrations } from '../utils/storage';

export function useIllustrations(exercises: Exercise[]) {
  const [history, setHistory] = useState<IllustrationHistory>(() => loadIllustrations());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await fetchExerciseDb();
        const seeded = await seedIllustrations();
        setHistory((prev) => {
          const merged = { ...seeded, ...prev };
          saveIllustrations(merged);
          return merged;
        });
      } catch (e) {
        console.error('Failed to initialize illustrations:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading || exercises.length === 0) return;

    let updated = false;
    const newHistory = { ...history };

    for (const ex of exercises) {
      const normalized = normalizeExerciseName(ex.name);
      const existing = newHistory[normalized];
      // Keep manual choices; only auto-fill missing / empty slots
      if (existing?.manual) continue;
      if (existing?.imageUrls?.length) continue;

      const found = findExercise(ex.name);
      if (found) {
        newHistory[normalized] = found;
        updated = true;
      }
    }

    if (updated) {
      setHistory(newHistory);
      saveIllustrations(newHistory);
    }
  }, [exercises, loading, history]);

  const updateExerciseIllustration = (exerciseName: string, illustration: ExerciseIllustration) => {
    const normalized = normalizeExerciseName(exerciseName);
    const newHistory = {
      ...history,
      [normalized]: { ...illustration, manual: true, chosenAt: Date.now() },
    };
    setHistory(newHistory);
    saveIllustrations(newHistory);
  };

  const exportHistory = () => {
    return JSON.stringify(history, null, 2);
  };

  const importHistory = (json: string) => {
    try {
      const imported = JSON.parse(json);
      setHistory(imported);
      saveIllustrations(imported);
      return true;
    } catch (e) {
      return false;
    }
  };

  const getIllustration = (exerciseName: string): ExerciseIllustration | null => {
    const normalized = normalizeExerciseName(exerciseName);
    return history[normalized] || null;
  };

  return {
    history,
    loading,
    getIllustration,
    updateExerciseIllustration,
    exportHistory,
    importHistory,
  };
}
