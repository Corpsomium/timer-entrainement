import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from '../hooks/useSession';

// Mock audio functions
vi.mock('../utils/audio', () => ({
  beepEnd: vi.fn(),
  beepCountdown: vi.fn(),
  ensureAudio: vi.fn(),
  unlockAudio: vi.fn(),
  startSilentKeepalive: vi.fn(),
  stopSilentKeepalive: vi.fn(),
  getAudioMuteHint: () => '',
  getAudioDebugInfo: () => ({}),
}));

describe('Timer Auto-Advance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should transition from work to rest when finishSet is called', () => {
    const { result } = renderHook(() => useSession());

    // Setup: load a simple workout with 2 exercises
    act(() => {
      result.current.setState({
        exercises: [
          {
            name: 'Exercise 1',
            sets: 1,
            reps: 10,
            durationSec: null,
            weight: '',
          },
          {
            name: 'Exercise 2',
            sets: 1,
            reps: 10,
            durationSec: null,
            weight: '',
          },
        ],
        block: '',
        warnings: [],
        restSec: 5,
        screen: 'session',
        phase: 'ready',
        stepIndex: 0, // First exercise
        completedSets: 0,
        endsAt: null,
        timerStartedAt: null,
        startedAt: null,
        finishedAt: null,
        skipped: {},
      });
    });

    expect(result.current.state.phase).toBe('ready');

    // Complete the set (simulates what happens when work timer reaches 0)
    act(() => {
      result.current.finishSet();
    });

    // Should advance to rest phase
    expect(result.current.state.phase).toBe('rest');
    expect(result.current.state.stepIndex).toBe(1); // Moved to rest step
    expect(result.current.state.completedSets).toBe(1);
    expect(result.current.state.endsAt).toBeGreaterThan(Date.now()); // Rest timer started
  });

  it('should auto-advance from rest phase to next exercise when timer reaches 0', async () => {
    const { result } = renderHook(() => useSession());

    // Setup: session with multiple exercises
    act(() => {
      result.current.setState({
        exercises: [
          {
            name: 'Exercise 1',
            sets: 1,
            reps: 10,
            durationSec: null,
            weight: '',
          },
          {
            name: 'Exercise 2',
            sets: 1,
            reps: 10,
            durationSec: null,
            weight: '',
          },
        ],
        block: '',
        warnings: [],
        restSec: 3,
        screen: 'session',
        phase: 'rest',
        stepIndex: 1, // On rest step after exercise 1
        completedSets: 1,
        endsAt: Date.now() + 3000, // 3 seconds from now
        timerStartedAt: Date.now(),
        startedAt: Date.now(),
        finishedAt: null,
        skipped: {},
      });
    });

    expect(result.current.state.phase).toBe('rest');

    // Fast-forward through rest timer
    await act(async () => {
      vi.advanceTimersByTime(3100); // 3.1 seconds
      await Promise.resolve();
    });

    expect(result.current.state.phase).toBe('ready');
    expect(result.current.state.stepIndex).toBe(2); // Next exercise (step 0: ex1, step 1: rest, step 2: ex2)
  });

  it('should call beepEnd when work timer reaches 0', async () => {
    const { beepEnd } = await import('../utils/audio');
    const { result } = renderHook(() => useSession());

    // Setup work phase
    act(() => {
      result.current.setState({
        exercises: [
          {
            name: 'Test Exercise',
            sets: 1,
            reps: 10,
            durationSec: 2,
            weight: '',
          },
        ],
        block: '',
        warnings: [],
        restSec: 10,
        screen: 'session',
        phase: 'work',
        stepIndex: 0,
        completedSets: 0,
        endsAt: Date.now() + 2000,
        timerStartedAt: Date.now(),
        startedAt: Date.now(),
        finishedAt: null,
        skipped: {},
      });
    });

    expect(result.current.state.phase).toBe('work');

    // Clear any previous calls
    vi.clearAllMocks();

    // Fast-forward to timer end
    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
    });

    expect(beepEnd).toHaveBeenCalled();
  });

  it('should call beepEnd when rest timer reaches 0', async () => {
    const { beepEnd } = await import('../utils/audio');
    const { result } = renderHook(() => useSession());

    // Setup rest phase
    act(() => {
      result.current.setState({
        exercises: [
          {
            name: 'Exercise 1',
            sets: 1,
            reps: 10,
            durationSec: null,
            weight: '',
          },
          {
            name: 'Exercise 2',
            sets: 1,
            reps: 10,
            durationSec: null,
            weight: '',
          },
        ],
        block: '',
        warnings: [],
        restSec: 2,
        screen: 'session',
        phase: 'rest',
        stepIndex: 1,
        completedSets: 1,
        endsAt: Date.now() + 2000,
        timerStartedAt: Date.now(),
        startedAt: Date.now(),
        finishedAt: null,
        skipped: {},
      });
    });

    expect(result.current.state.phase).toBe('rest');

    // Clear previous calls
    vi.clearAllMocks();

    // Fast-forward to timer end
    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
    });

    expect(beepEnd).toHaveBeenCalled();
  });

  it('should transition to next exercise when finishRest is called', () => {
    const { result } = renderHook(() => useSession());

    // Setup: 2 exercises, after completing first exercise (in rest)
    act(() => {
      result.current.setState({
        exercises: [
          {
            name: 'Exercise 1',
            sets: 1,
            reps: 10,
            durationSec: null,
            weight: '',
          },
          {
            name: 'Exercise 2',
            sets: 1,
            reps: 10,
            durationSec: null,
            weight: '',
          },
        ],
        block: '',
        warnings: [],
        restSec: 5,
        screen: 'session',
        phase: 'rest',
        stepIndex: 1, // On rest step after exercise 1
        completedSets: 1, // Completed 1 set
        endsAt: Date.now() + 5000, // Rest timer running
        timerStartedAt: Date.now(),
        startedAt: Date.now(),
        finishedAt: null,
        skipped: {},
      });
    });

    expect(result.current.state.phase).toBe('rest');
    expect(result.current.state.stepIndex).toBe(1);

    // Finish rest (simulates what happens when rest timer reaches 0)
    act(() => {
      result.current.finishRest();
    });

    // Should transition to next exercise
    expect(result.current.state.phase).toBe('ready');
    expect(result.current.state.stepIndex).toBe(2); // Moved to exercise 2
  });
});
