import type { ExerciseIllustration, IllustrationHistory } from '../types';

interface ExerciseDbEntry {
  id: string;
  name: string;
  images: string[];
  category?: string;
  primaryMuscles?: string[];
}

const FR_TO_EN_KEYWORDS: Record<string, string[]> = {
  'fentes arriere': ['reverse lunge', 'lunge'],
  'fentes': ['lunge'],
  'developpe incline': ['incline dumbbell press', 'incline press'],
  'developpe couche': ['bench press'],
  'developpe militaire': ['military press', 'overhead press'],
  'rowing penche': ['bent over row', 'barbell row'],
  'hip thrust': ['hip thrust'],
  'pull apart': ['band pull apart', 'band'],
  'pull-apart': ['band pull apart', 'band'],
  'extensions mollets': ['calf raise'],
  'mollets': ['calf raise'],
  'kickback': ['triceps kickback', 'kickback'],
  'hammer preacher curl': ['hammer curl', 'preacher curl'],
  'bird dogs': ['bird dog'],
  'bird dog': ['bird dog'],
  'marches du fermier': ["farmer's walk", 'farmer walk'],
  'marche du fermier': ["farmer's walk", 'farmer walk'],
  'squat': ['squat'],
  'souleve de terre': ['deadlift'],
  'tractions': ['pull up', 'chin up'],
  'pompes': ['push up', 'pushup'],
  'gainage': ['plank'],
  'planche': ['plank'],
  'curl': ['curl'],
  'dips': ['dips', 'dip'],
  'crunch': ['crunch'],
};

let exerciseDb: ExerciseDbEntry[] | null = null;
let dbFetchPromise: Promise<void> | null = null;

export async function fetchExerciseDb(): Promise<void> {
  if (exerciseDb) return;
  if (dbFetchPromise) return dbFetchPromise;

  dbFetchPromise = (async () => {
    try {
      const response = await fetch(
        'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json'
      );
      if (!response.ok) throw new Error('Failed to fetch exercises');
      exerciseDb = await response.json();
    } catch (error) {
      console.error('Failed to load exercise database:', error);
      exerciseDb = [];
    }
  })();

  return dbFetchPromise;
}

export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export function findExercise(exerciseName: string): ExerciseIllustration | null {
  if (!exerciseDb || exerciseDb.length === 0) return null;

  const normalized = normalizeExerciseName(exerciseName);
  const keywords = FR_TO_EN_KEYWORDS[normalized] || [normalized];

  let bestMatch: ExerciseDbEntry | null = null;
  let bestScore = 0;

  for (const entry of exerciseDb) {
    const entryNameNorm = entry.name.toLowerCase();

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      let score = 0;

      if (entryNameNorm === keywordLower) {
        score = 100;
      } else if (entryNameNorm.includes(keywordLower)) {
        score = 80;
      } else if (keywordLower.split(' ').every((word) => entryNameNorm.includes(word))) {
        score = 60;
      } else {
        const words = keywordLower.split(' ');
        const matchedWords = words.filter((word) => entryNameNorm.includes(word));
        if (matchedWords.length > 0) {
          score = (matchedWords.length / words.length) * 40;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }
  }

  if (bestMatch && bestScore > 30) {
    const imageUrls = bestMatch.images.map(
      (img) =>
        `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${img}`
    );

    return {
      exerciseId: bestMatch.id,
      imageUrls,
      name: bestMatch.name,
      chosenAt: Date.now(),
    };
  }

  return null;
}

export function searchExercises(query: string, limit: number = 6): ExerciseIllustration[] {
  if (!exerciseDb || exerciseDb.length === 0) return [];

  const queryLower = query.toLowerCase();
  const results: Array<{ entry: ExerciseDbEntry; score: number }> = [];

  for (const entry of exerciseDb) {
    const entryNameLower = entry.name.toLowerCase();
    let score = 0;

    if (entryNameLower === queryLower) {
      score = 100;
    } else if (entryNameLower.includes(queryLower)) {
      score = 80;
    } else {
      const queryWords = queryLower.split(' ');
      const matchedWords = queryWords.filter((word) => entryNameLower.includes(word));
      if (matchedWords.length > 0) {
        score = (matchedWords.length / queryWords.length) * 50;
      }
    }

    if (score > 0) {
      results.push({ entry, score });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit).map((r) => ({
    exerciseId: r.entry.id,
    imageUrls: r.entry.images.map(
      (img) =>
        `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${img}`
    ),
    name: r.entry.name,
    chosenAt: Date.now(),
  }));
}

export async function seedIllustrations(): Promise<IllustrationHistory> {
  try {
    const response = await fetch('/timer-entrainement/illustrations.json');
    if (!response.ok) return {};
    return await response.json();
  } catch (e) {
    return {};
  }
}
