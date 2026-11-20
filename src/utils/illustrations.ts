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
  'developpe couche': ['bench press', 'barbell bench press'],
  'developpe militaire': ['military press', 'overhead press'],
  'rowing penche': ['bent over row', 'barbell row'],
  'hip thrust': ['hip thrust'],
  'pull apart': ['band pull apart', 'pull apart'],
  'pullapart': ['band pull apart', 'pull apart'],
  'extensions mollets': ['calf raise'],
  'mollets': ['calf raise'],
  'kickback': ['triceps kickback', 'tricep dumbbell kickback', 'kickback'],
  'hammer preacher curl': ['hammer curl', 'preacher curl', 'preacher hammer'],
  'bird dogs': ['bird dog', 'superman'],
  'bird dog': ['bird dog', 'superman'],
  'marches du fermier': ["farmer's walk", 'farmer walk', 'farmers walk'],
  'marche du fermier': ["farmer's walk", 'farmer walk', 'farmers walk'],
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

/** Test-only: inject a fixture DB (or null to reset). */
export function __setExerciseDbForTests(db: ExerciseDbEntry[] | null): void {
  exerciseDb = db;
  dbFetchPromise = db ? Promise.resolve() : null;
}

export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve a free-text (FR or EN) query into English search keywords,
 * reusing the FR→EN map with longest-prefix / partial key matching.
 */
export function resolveSearchKeywords(query: string): string[] {
  const normalized = normalizeExerciseName(query);
  if (!normalized) return [];

  const keywords = new Set<string>();
  const add = (values: string | string[]) => {
    for (const value of Array.isArray(values) ? values : [values]) {
      const v = value.trim().toLowerCase();
      if (v) keywords.add(v);
    }
  };

  add(normalized);
  for (const token of normalized.split(' ')) {
    if (token.length >= 2) add(token);
  }

  if (FR_TO_EN_KEYWORDS[normalized]) {
    add(FR_TO_EN_KEYWORDS[normalized]);
    return [...keywords];
  }

  let bestKey = '';
  for (const key of Object.keys(FR_TO_EN_KEYWORDS)) {
    const isPrefix = normalized.startsWith(key + ' ') || normalized === key;
    const keyCoversQuery = key.startsWith(normalized) && normalized.length >= 4;
    const contained = normalized.includes(key) && key.length >= 4;
    if (isPrefix || keyCoversQuery || contained) {
      if (key.length > bestKey.length) bestKey = key;
    }
  }

  if (bestKey) {
    add(FR_TO_EN_KEYWORDS[bestKey]);
  } else {
    // Partial FR key overlap (e.g. shared tokens)
    for (const [key, mapped] of Object.entries(FR_TO_EN_KEYWORDS)) {
      const keyWords = key.split(' ');
      const matched = keyWords.filter((w) => normalized.includes(w));
      if (matched.length > 0 && matched.length >= Math.ceil(keyWords.length / 2)) {
        add(mapped);
      }
    }
  }

  return [...keywords];
}

function scoreEntryAgainstKeywords(entryName: string, keywords: string[]): number {
  const entryNameNorm = entryName.toLowerCase();
  let bestScore = 0;

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    if (!keywordLower) continue;

    let score = 0;

    if (entryNameNorm === keywordLower) {
      score = 100;
    } else if (entryNameNorm.includes(keywordLower)) {
      score = 80 + Math.min(10, keywordLower.length);
    } else {
      const words = keywordLower.split(/\s+/).filter(Boolean);
      if (words.length > 0 && words.every((word) => entryNameNorm.includes(word))) {
        score = 60 + words.length * 2;
      } else {
        const matchedWords = words.filter((word) => entryNameNorm.includes(word));
        if (matchedWords.length > 0) {
          score = (matchedWords.length / words.length) * 45;
        } else if (keywordLower.length >= 3) {
          // Partial English token: "kick" → "kickback", "bench" → "bench press"
          const entryTokens = entryNameNorm.split(/[^a-z0-9]+/).filter(Boolean);
          const partialHits = entryTokens.filter(
            (token) =>
              token.startsWith(keywordLower) ||
              keywordLower.startsWith(token) ||
              token.includes(keywordLower)
          );
          if (partialHits.length > 0) {
            score = 35 + Math.min(10, keywordLower.length);
          }
        }
      }
    }

    if (score > bestScore) bestScore = score;
  }

  return bestScore;
}

function toIllustration(entry: ExerciseDbEntry): ExerciseIllustration {
  return {
    exerciseId: entry.id,
    imageUrls: entry.images.map(
      (img) => `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${img}`
    ),
    name: entry.name,
    chosenAt: Date.now(),
  };
}

export function findExercise(exerciseName: string): ExerciseIllustration | null {
  if (!exerciseDb || exerciseDb.length === 0) return null;

  const keywords = resolveSearchKeywords(exerciseName);
  if (keywords.length === 0) return null;

  let bestMatch: ExerciseDbEntry | null = null;
  let bestScore = 0;

  for (const entry of exerciseDb) {
    const score = scoreEntryAgainstKeywords(entry.name, keywords);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore > 30) {
    return toIllustration(bestMatch);
  }

  return null;
}

export function searchExercises(query: string, limit: number = 6): ExerciseIllustration[] {
  if (!exerciseDb || exerciseDb.length === 0) return [];

  const trimmed = query.trim();
  const keywords = trimmed ? resolveSearchKeywords(trimmed) : [];

  // Empty / unknown query → still show suggestions
  if (!trimmed || keywords.length === 0) {
    return exerciseDb.slice(0, limit).map(toIllustration);
  }

  const results: Array<{ entry: ExerciseDbEntry; score: number }> = [];

  for (const entry of exerciseDb) {
    const score = scoreEntryAgainstKeywords(entry.name, keywords);
    if (score > 0) {
      results.push({ entry, score });
    }
  }

  results.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));

  if (results.length === 0) {
    return exerciseDb.slice(0, limit).map(toIllustration);
  }

  return results.slice(0, limit).map((r) => toIllustration(r.entry));
}

/** Preferred English search seed for the picker input. */
export function getPreferredSearchQuery(exerciseName: string): string {
  const normalized = normalizeExerciseName(exerciseName);
  if (!normalized) return exerciseName;

  if (FR_TO_EN_KEYWORDS[normalized]?.[0]) {
    return FR_TO_EN_KEYWORDS[normalized][0];
  }

  let bestKey = '';
  for (const key of Object.keys(FR_TO_EN_KEYWORDS)) {
    if (normalized === key || normalized.startsWith(key + ' ') || normalized.includes(key)) {
      if (key.length > bestKey.length) bestKey = key;
    }
  }

  if (bestKey && FR_TO_EN_KEYWORDS[bestKey]?.[0]) {
    return FR_TO_EN_KEYWORDS[bestKey][0];
  }

  return exerciseName;
}

export async function seedIllustrations(): Promise<IllustrationHistory> {
  try {
    const response = await fetch('/timer-entrainement/illustrations.json');
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}
