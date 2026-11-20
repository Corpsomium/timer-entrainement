import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from '../hooks/useSession';

// Mock audio functions
vi.mock('../utils/audio', () => ({
  beepEnd: vi.fn(),
  beepCountdown: vi.fn(),
  ensureAudio: vi.fn(),
}));

describe('Timer Auto-Advance', () => {
  beforeEach(() => {
    // Use fake timers with system time control
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should auto-advance from work phase to rest when timer reaches 0', async () => {
    const { result } = renderHook(() => useSession());

    // Setup: load a simple workout
    act(() => {
      result.current.setState({
        exercises: [
          {
            name: 'Test Exercise',
            sets: 1,
            reps: 10,
            durationSec: 2, // 2 second work timer for faster test
            restSec: 5,
          },
        ],
        restSec: 5,
        screen: 'overview',
        phase: 'ready',
        stepIndex: 0,
        completedSets: 0,
        endsAt: null,
      });
    });

    // Start session
    act(() => {
      result.current.startSession(false);
    });

    expect(result.current.state.screen).toBe('session');
    expect(result.current.state.phase).toBe('ready');

    // Start work timer
    act(() => {
      result.current.startWorkTimer();
    });

    expect(result.current.state.phase).toBe('work');

    // Fast-forward to timer end (should trigger auto-advance to rest)
    await act(async () => {
      vi.advanceTimersByTime(2200); // Work duration + buffer
      await vi.runAllTimersAsync(); // Run all pending timers
    });

    expect(result.current.state.phase).toBe('rest');
    expect(result.current.state.stepIndex).toBe(1); // Moved to rest step
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
            restSec: 3, // 3 second rest
          },
          {
            name: 'Exercise 2',
            sets: 1,
            reps: 10,
            restSec: 10,
          },
        ],
        restSec: 3,
        screen: 'session',
        phase: 'rest',
        stepIndex: 1, // On rest step after exercise 1
        completedSets: 1,
        endsAt: Date.now() + 3000, // 3 seconds from now
        timerStartedAt: Date.now(),
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
            restSec: 10,
          },
        ],
        restSec: 10,
        screen: 'session',
        phase: 'work',
        stepIndex: 0,
        completedSets: 0,
        endsAt: Date.now() + 2000,
        timerStartedAt: Date.now(),
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
            restSec: 2,
          },
          {
            name: 'Exercise 2',
            sets: 1,
            reps: 10,
            restSec: 10,
          },
        ],
        restSec: 2,
        screen: 'session',
        phase: 'rest',
        stepIndex: 1,
        completedSets: 1,
        endsAt: Date.now() + 2000,
        timerStartedAt: Date.now(),
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

  it('should transition to done screen after last rest timer', async () => {
    const { result } = renderHook(() => useSession());

    // Setup: Single exercise, single set
    act(() => {
      result.current.setState({
        exercises: [
          {
            name: 'Only Exercise',
            sets: 1,
            reps: 10,
            durationSec: 1,
            restSec: 2,
          },
        ],
        restSec: 2,
        screen: 'overview',
        phase: 'ready',
        stepIndex: 0,
        completedSets: 0,
        endsAt: null,
      });
    });

    // Start session
    act(() => {
      result.current.startSession(false);
    });

    // Start work timer
    act(() => {
      result.current.startWorkTimer();
    });

    // Fast-forward work timer to completion (1 second + buffer)
    await act(async () => {
      vi.advanceTimersByTime(1200);
      await vi.runAllTimersAsync();
    });

    expect(result.current.state.phase).toBe('rest');
    expect(result.current.state.completedSets).toBe(1);

    // Fast-forward rest timer to completion (2 seconds + buffer)
    await act(async () => {
      vi.advanceTimersByTime(2200);
      await vi.runAllTimersAsync();
    });

    // Should transition to done screen (no more exercises)
    expect(result.current.state.screen).toBe('done');
  });
});
