import { useState, useEffect, useCallback, useRef } from 'react';
import type { SessionState, SequenceStep } from '../types';
import { parseWorkout } from '../utils/parser';
import { buildSequence } from '../utils/sequencer';
import { withViewTransition } from '../utils/viewTransition';
import {
  loadBlock,
  saveBlock,
  loadRest,
  saveRest,
  loadSession,
  saveSession,
  clearSession,
  decodeHashBlock,
  updateHashBlock,
} from '../utils/storage';
import { requestWakeLock, releaseWakeLock } from '../utils/wakeLock';
import { beepCountdown, beepEnd, unlockAudio } from '../utils/audio';

const DEFAULT_BLOCK = `Fentes arrière : 3x10 (2x10kg)
Développé incliné : 3x12 (2x15kg)
Rowing penché : 3x12 (2x15kg)
Hip thrust : 3x15 (20kg)
Pull-apart : 3x15 (bande20) setA
Extensions mollets : 3x15 (20kg) setA
Kickback : 3x10 (7.5kg) setB
Hammer preacher curl 45° : 3x10 (10kg) setB
Bird dogs : 2x12
Marches du fermier : 3x30s (2x15kg)`;

export function useSession() {
  const [state, setState] = useState<SessionState>(() => {
    const hashBlock = decodeHashBlock();
    const savedBlock = loadBlock();
    const savedRest = loadRest();
    const savedSession = loadSession();

    const initialBlock = hashBlock || savedBlock || DEFAULT_BLOCK;

    if (savedSession && savedSession.exercises && savedSession.exercises.length > 0) {
      if (!hashBlock || (savedSession.block && hashBlock.trim() === savedSession.block.trim())) {
        return {
          screen: savedSession.screen || 'overview',
          block: savedSession.block || initialBlock,
          restSec: savedSession.restSec ?? savedRest,
          exercises: savedSession.exercises,
          warnings: savedSession.warnings || [],
          stepIndex: savedSession.stepIndex || 0,
          phase: savedSession.phase || 'ready',
          endsAt: savedSession.endsAt || null,
          timerStartedAt: savedSession.timerStartedAt || null,
          completedSets: savedSession.completedSets || 0,
          startedAt: savedSession.startedAt || null,
          finishedAt: savedSession.finishedAt || null,
          skipped: savedSession.skipped || {},
        };
      }
    }

    return {
      screen: 'input',
      block: initialBlock,
      restSec: savedRest,
      exercises: [],
      warnings: [],
      stepIndex: 0,
      phase: 'ready',
      endsAt: null,
      timerStartedAt: null,
      completedSets: 0,
      startedAt: null,
      finishedAt: null,
      skipped: {},
    };
  });

  const [sequence, setSequence] = useState<SequenceStep[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const beepFlagsRef = useRef({ 3: false, 2: false, 1: false, 0: false });

  const persist = useCallback(() => {
    saveBlock(state.block);
    saveRest(state.restSec);
    saveSession(state);
  }, [state]);

  useEffect(() => {
    persist();
  }, [persist]);

  useEffect(() => {
    if (state.exercises.length > 0) {
      const seq = buildSequence(state.exercises, state.restSec);
      setSequence(seq);
    }
  }, [state.exercises, state.restSec]);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (state.phase !== 'work' && state.phase !== 'rest') {
      stopTimer();
      return;
    }

    const checkTimer = () => {
      const remaining = (state.endsAt || 0) - Date.now();
      
      if (remaining <= 0) {
        if (!beepFlagsRef.current[0]) {
          beepFlagsRef.current[0] = true;
          stopTimer();
          beepEnd();
          
          if (state.phase === 'work') {
            const currentStep = sequence[state.stepIndex];
            if (!currentStep || currentStep.type !== 'exercise') return;

            const nextStepIndex = state.stepIndex + 1;
            const nextStep = sequence[nextStepIndex];

            if (!nextStep) {
              withViewTransition(() => {
                setState((prev) => ({
                  ...prev,
                  screen: 'done',
                  phase: 'ready',
                  finishedAt: Date.now(),
                  endsAt: null,
                  timerStartedAt: null,
                }));
              });
              releaseWakeLock();
              return;
            }

            if (nextStep.type === 'rest') {
              withViewTransition(() => {
                setState((prev) => ({
                  ...prev,
                  completedSets: prev.completedSets + 1,
                  stepIndex: nextStepIndex,
                  phase: 'rest',
                  timerStartedAt: Date.now(),
                  endsAt: Date.now() + state.restSec * 1000,
                }));
              });
              beepFlagsRef.current = { 3: false, 2: false, 1: false, 0: false };
            } else {
              withViewTransition(() => {
                setState((prev) => ({
                  ...prev,
                  completedSets: prev.completedSets + 1,
                  stepIndex: nextStepIndex,
                  phase: 'ready',
                  endsAt: null,
                  timerStartedAt: null,
                }));
              });
            }
          } else {
            const nextStepIndex = state.stepIndex + 1;
            withViewTransition(() => {
              setState((prev) => ({
                ...prev,
                stepIndex: nextStepIndex,
                phase: 'ready',
                endsAt: null,
                timerStartedAt: null,
              }));
            });
          }
        }
        return;
      }

      const sec = Math.ceil(remaining / 1000);
      if (sec >= 1 && sec <= 3 && !beepFlagsRef.current[sec as 1 | 2 | 3]) {
        beepFlagsRef.current[sec as 1 | 2 | 3] = true;
        beepCountdown();
        if (navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch (e) {}
        }
      }
    };

    const intervalId = window.setInterval(checkTimer, 200);
    timerIntervalRef.current = intervalId;

    return () => {
      clearInterval(intervalId);
      timerIntervalRef.current = null;
    };
  }, [state.phase, state.endsAt, state.stepIndex, state.restSec, sequence, stopTimer]);

  useEffect(() => {
    if (state.screen === 'session') {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [state.screen]);

  const loadWorkout = useCallback(() => {
    const parsed = parseWorkout(state.block);
    if (parsed.exercises.length === 0) {
      return;
    }

    setState((prev) => ({
      ...prev,
      exercises: parsed.exercises,
      warnings: parsed.warnings,
      screen: 'overview',
      stepIndex: 0,
      phase: 'ready',
      endsAt: null,
      timerStartedAt: null,
      completedSets: 0,
      startedAt: null,
      finishedAt: null,
      skipped: {},
    }));

    updateHashBlock(state.block);
  }, [state.block]);

  const startSession = useCallback(
    (resume: boolean) => {
      if (state.exercises.length === 0) return;

      setState((prev) => ({
        ...prev,
        screen: 'session',
        stepIndex: resume ? prev.stepIndex : 0,
        phase: resume ? prev.phase : 'ready',
        completedSets: resume ? prev.completedSets : 0,
        startedAt: resume && prev.startedAt ? prev.startedAt : Date.now(),
        endsAt: resume ? prev.endsAt : null,
        timerStartedAt: resume ? prev.timerStartedAt : null,
        skipped: resume ? prev.skipped : {},
      }));

      requestWakeLock();
      unlockAudio();
    },
    [state.exercises.length]
  );

  const finishSet = useCallback(() => {
    stopTimer();
    const currentStep = sequence[state.stepIndex];
    if (!currentStep || currentStep.type !== 'exercise') return;

    const nextStepIndex = state.stepIndex + 1;
    const nextStep = sequence[nextStepIndex];

    if (!nextStep) {
      setState((prev) => ({
        ...prev,
        screen: 'done',
        phase: 'ready',
        finishedAt: Date.now(),
        endsAt: null,
        timerStartedAt: null,
      }));
      releaseWakeLock();
      return;
    }

    if (nextStep.type === 'rest') {
      const now = Date.now();
      setState((prev) => ({
        ...prev,
        completedSets: prev.completedSets + 1,
        stepIndex: nextStepIndex,
        phase: 'rest',
        timerStartedAt: now,
        endsAt: now + state.restSec * 1000,
      }));
      beepFlagsRef.current = { 3: false, 2: false, 1: false, 0: false };
    } else {
      setState((prev) => ({
        ...prev,
        completedSets: prev.completedSets + 1,
        stepIndex: nextStepIndex,
        phase: 'ready',
        endsAt: null,
        timerStartedAt: null,
      }));
    }
  }, [state.stepIndex, state.restSec, sequence, stopTimer]);

  const finishRest = useCallback(() => {
    stopTimer();
    const nextStepIndex = state.stepIndex + 1;

    setState((prev) => ({
      ...prev,
      stepIndex: nextStepIndex,
      phase: 'ready',
      endsAt: null,
      timerStartedAt: null,
    }));
  }, [state.stepIndex, stopTimer]);

  const startWorkTimer = useCallback(() => {
    const currentStep = sequence[state.stepIndex];
    if (!currentStep || currentStep.type !== 'exercise') return;

    const ex = state.exercises[currentStep.exerciseIndex!];
    if (!ex || ex.durationSec == null) return;

    unlockAudio();

    const now = Date.now();
    const duration = ex.durationSec;
    setState((prev) => ({
      ...prev,
      phase: 'work',
      timerStartedAt: now,
      endsAt: now + duration * 1000,
    }));
    beepFlagsRef.current = { 3: false, 2: false, 1: false, 0: false };
  }, [state.stepIndex, state.exercises, sequence]);

  const adjustTimer = useCallback(
    (deltaSec: number) => {
      if (state.phase !== 'rest' && state.phase !== 'work') return;

      const newEndsAt = (state.endsAt || Date.now()) + deltaSec * 1000;
      if (newEndsAt <= Date.now()) {
        finishSet();
        return;
      }

      const remaining = newEndsAt - Date.now();
      const sec = Math.ceil(remaining / 1000);
      if (sec > 3) {
        beepFlagsRef.current[3] = false;
        beepFlagsRef.current[2] = false;
        beepFlagsRef.current[1] = false;
      } else if (sec > 2) {
        beepFlagsRef.current[2] = false;
        beepFlagsRef.current[1] = false;
      } else if (sec > 1) {
        beepFlagsRef.current[1] = false;
      }

      setState((prev) => ({ ...prev, endsAt: newEndsAt }));
    },
    [state.phase, state.endsAt, finishSet]
  );

  const goBack = useCallback(() => {
    if (state.screen !== 'session') return;

    if (state.phase === 'work') {
      stopTimer();
      setState((prev) => ({
        ...prev,
        phase: 'ready',
        endsAt: null,
        timerStartedAt: null,
      }));
      return;
    }

    if (state.phase === 'rest') {
      stopTimer();
      setState((prev) => ({
        ...prev,
        phase: 'ready',
        endsAt: null,
        timerStartedAt: null,
        completedSets: Math.max(0, prev.completedSets - 1),
      }));
      return;
    }

    if (state.stepIndex === 0) return;

    let prevStepIndex = state.stepIndex - 1;
    while (prevStepIndex >= 0 && sequence[prevStepIndex].type === 'rest') {
      prevStepIndex--;
    }

    if (prevStepIndex < 0) return;

    setState((prev) => ({
      ...prev,
      stepIndex: prevStepIndex,
      completedSets: Math.max(0, prev.completedSets - 1),
    }));
  }, [state.screen, state.phase, state.stepIndex, sequence, stopTimer]);

  const skipExercise = useCallback(() => {
    if (state.screen !== 'session') return;

    stopTimer();
    const currentStep = sequence[state.stepIndex];
    if (!currentStep || currentStep.type !== 'exercise') return;

    const currentExIndex = currentStep.exerciseIndex!;
    let nextStepIndex = state.stepIndex;

    while (
      nextStepIndex < sequence.length &&
      sequence[nextStepIndex].type === 'exercise' &&
      sequence[nextStepIndex].exerciseIndex === currentExIndex
    ) {
      nextStepIndex++;
    }

    while (nextStepIndex < sequence.length && sequence[nextStepIndex].type === 'rest') {
      nextStepIndex++;
    }

    if (nextStepIndex >= sequence.length) {
      setState((prev) => ({
        ...prev,
        screen: 'done',
        phase: 'ready',
        finishedAt: Date.now(),
        endsAt: null,
        timerStartedAt: null,
      }));
      releaseWakeLock();
      return;
    }

    setState((prev) => ({
      ...prev,
      stepIndex: nextStepIndex,
      phase: 'ready',
      endsAt: null,
      timerStartedAt: null,
    }));
  }, [state.screen, state.stepIndex, sequence, stopTimer]);

  const resetSession = useCallback(() => {
    stopTimer();
    clearSession();
    setState((prev) => ({
      ...prev,
      screen: 'overview',
      stepIndex: 0,
      phase: 'ready',
      endsAt: null,
      timerStartedAt: null,
      completedSets: 0,
      startedAt: null,
      finishedAt: null,
      skipped: {},
    }));
    releaseWakeLock();
  }, [stopTimer]);

  return {
    state,
    setState,
    sequence,
    loadWorkout,
    startSession,
    finishSet,
    finishRest,
    startWorkTimer,
    adjustTimer,
    goBack,
    skipExercise,
    resetSession,
  };
}
