import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  __setExerciseDbForTests,
  normalizeExerciseName,
  resolveSearchKeywords,
  searchExercises,
  findExercise,
} from './illustrations';

const FIXTURE = [
  {
    id: 'Dumbbell_Lunges',
    name: 'Dumbbell Lunges',
    images: ['Dumbbell_Lunges/0.jpg', 'Dumbbell_Lunges/1.jpg'],
  },
  {
    id: 'Crossover_Reverse_Lunge',
    name: 'Crossover Reverse Lunge',
    images: ['Crossover_Reverse_Lunge/0.jpg', 'Crossover_Reverse_Lunge/1.jpg'],
  },
  {
    id: 'Incline_Dumbbell_Press',
    name: 'Incline Dumbbell Press',
    images: ['Incline_Dumbbell_Press/0.jpg', 'Incline_Dumbbell_Press/1.jpg'],
  },
  {
    id: 'Barbell_Bench_Press_Medium_Grip',
    name: 'Barbell Bench Press - Medium Grip',
    images: [
      'Barbell_Bench_Press_-_Medium_Grip/0.jpg',
      'Barbell_Bench_Press_-_Medium_Grip/1.jpg',
    ],
  },
  {
    id: 'Bent_Over_Barbell_Row',
    name: 'Bent Over Barbell Row',
    images: ['Bent_Over_Barbell_Row/0.jpg', 'Bent_Over_Barbell_Row/1.jpg'],
  },
  {
    id: 'Barbell_Hip_Thrust',
    name: 'Barbell Hip Thrust',
    images: ['Barbell_Hip_Thrust/0.jpg', 'Barbell_Hip_Thrust/1.jpg'],
  },
  {
    id: 'Band_Pull_Apart',
    name: 'Band Pull Apart',
    images: ['Band_Pull_Apart/0.jpg', 'Band_Pull_Apart/1.jpg'],
  },
  {
    id: 'Standing_Calf_Raises',
    name: 'Standing Calf Raises',
    images: ['Standing_Calf_Raises/0.jpg', 'Standing_Calf_Raises/1.jpg'],
  },
  {
    id: 'Tricep_Dumbbell_Kickback',
    name: 'Tricep Dumbbell Kickback',
    images: ['Tricep_Dumbbell_Kickback/0.jpg', 'Tricep_Dumbbell_Kickback/1.jpg'],
  },
  {
    id: 'Hammer_Curls',
    name: 'Hammer Curls',
    images: ['Hammer_Curls/0.jpg', 'Hammer_Curls/1.jpg'],
  },
  {
    id: 'Preacher_Hammer_Dumbbell_Curl',
    name: 'Preacher Hammer Dumbbell Curl',
    images: ['Preacher_Hammer_Dumbbell_Curl/0.jpg', 'Preacher_Hammer_Dumbbell_Curl/1.jpg'],
  },
  {
    id: 'Superman',
    name: 'Superman',
    images: ['Superman/0.jpg', 'Superman/1.jpg'],
  },
  {
    id: 'Farmers_Walk',
    name: "Farmer's Walk",
    images: ['Farmers_Walk/0.jpg', 'Farmers_Walk/1.jpg'],
  },
];

describe('illustrations search', () => {
  beforeAll(() => {
    __setExerciseDbForTests(FIXTURE);
  });

  afterAll(() => {
    __setExerciseDbForTests(null);
  });

  it('normalizes hyphens and accents into spaced tokens', () => {
    expect(normalizeExerciseName('Pull-apart')).toBe('pull apart');
    expect(normalizeExerciseName('Développé couché barre')).toBe('developpe couche barre');
    expect(normalizeExerciseName('Hammer preacher curl 45°')).toBe('hammer preacher curl 45');
  });

  it('resolves French names to English keywords via FR→EN map', () => {
    const keywords = resolveSearchKeywords('Développé couché barre');
    expect(keywords.some((k) => k.includes('bench'))).toBe(true);
  });

  it.each([
    'Fentes arrière',
    'Développé incliné',
    'Rowing penché',
    'Hip thrust',
    'Pull-apart',
    'Extensions mollets',
    'Kickback',
    'Hammer preacher curl',
    'Bird dogs',
    'Marches du fermier',
    'Développé couché barre',
  ])('searchExercises(%s) returns at least one result', (query) => {
    const results = searchExercises(query, 12);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('matches partial English tokens', () => {
    const results = searchExercises('kick', 12);
    expect(results.some((r) => r.name.toLowerCase().includes('kickback'))).toBe(true);
  });

  it('returns suggestions for empty query', () => {
    expect(searchExercises('', 6).length).toBeGreaterThanOrEqual(1);
  });

  it('returns suggestions for unknown query', () => {
    expect(searchExercises('zzzz-unknown-exercise-xyz', 6).length).toBeGreaterThanOrEqual(1);
  });

  it('findExercise maps Développé couché barre to a bench press', () => {
    const found = findExercise('Développé couché barre');
    expect(found).not.toBeNull();
    expect(found!.name.toLowerCase()).toContain('bench');
  });
});
