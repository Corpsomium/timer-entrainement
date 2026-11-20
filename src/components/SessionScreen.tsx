import { useState, useEffect, startTransition, ViewTransition } from 'react';
import type { SessionState, SequenceStep, ExerciseIllustration } from '../types';
import { formatDuration, formatDurationLabel } from '../utils/formatters';

interface SessionScreenProps {
  state: SessionState;
  setState: React.Dispatch<React.SetStateAction<SessionState>>;
  sequence: SequenceStep[];
  onCompleteSet: () => void;
  onStartWork: () => void;
  onSkipRest: () => void;
  onAdjustTimer: (deltaSec: number) => void;
  onBack: () => void;
  onSkipExercise: () => void;
  onReset: () => void;
  getIllustration: (name: string) => ExerciseIllustration | null;
}

const CIRC = 2 * Math.PI * 48;

export function SessionScreen({
  state,
  setState,
  sequence,
  onCompleteSet,
  onStartWork,
  onSkipRest,
  onAdjustTimer,
  onBack,
  onSkipExercise,
  onReset,
  getIllustration,
}: SessionScreenProps) {
  const totalSets = state.exercises.reduce((n, ex) => n + ex.sets, 0);
  const pct = totalSets ? Math.round((state.completedSets / totalSets) * 100) : 0;

  const currentStep = sequence[state.stepIndex];
  if (!currentStep) {
    return (
      <>
        <p>Erreur: aucune étape trouvée</p>
        <button
          className="btn btn-ghost"
          onClick={() => setState((prev) => ({ ...prev, screen: 'overview' }))}
        >
          Retour à l'aperçu
        </button>
      </>
    );
  }

  const canGoBack =
    state.phase === 'work' ||
    state.phase === 'rest' ||
    state.stepIndex > 0;

  return (
    <>
      <ViewTransition name="progress-bar" share="morph" default="none">
        <div className="topbar">
          <button className="icon-btn" onClick={onBack} disabled={!canGoBack} title="Revenir en arrière">
            ←
          </button>
          <div className="progress-wrap">
            <div className="progress-meta">
              <span>{state.completedSets} / {totalSets} séries</span>
              <span>{pct}%</span>
            </div>
            <div className="bar">
              <i style={{ width: `${pct}%` }}></i>
            </div>
          </div>
          <button className="icon-btn" onClick={onSkipExercise} title="Passer l'exercice">
            ⏭
          </button>
        </div>
      </ViewTransition>

      {currentStep.type === 'rest' ? (
        <RestPhase
          state={state}
          nextExercise={currentStep.nextExercise}
          onSkipRest={onSkipRest}
          onAdjustTimer={onAdjustTimer}
        />
      ) : state.phase === 'work' ? (
        <WorkPhase
          state={state}
          onCompleteSet={onCompleteSet}
          onAdjustTimer={onAdjustTimer}
        />
      ) : (
        <ReadyPhase
          state={state}
          currentStep={currentStep}
          onCompleteSet={onCompleteSet}
          onStartWork={onStartWork}
          getIllustration={getIllustration}
        />
      )}

      <div className="actions duo" style={{ marginTop: '8px' }}>
        <button
          className="btn btn-ghost"
          onClick={() => setState((prev) => ({ ...prev, screen: 'overview' }))}
        >
          Aperçu
        </button>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm('Réinitialiser la séance en cours ?')) {
              onReset();
            }
          }}
        >
          Réinitialiser
        </button>
      </div>
    </>
  );
}

function RestPhase({
  state,
  nextExercise,
  onSkipRest,
  onAdjustTimer,
}: {
  state: SessionState;
  nextExercise?: { name: string; setIndex: number; totalSets: number; load: string };
  onSkipRest: () => void;
  onAdjustTimer: (deltaSec: number) => void;
}) {
  const [remaining, setRemaining] = useState(Math.max(0, (state.endsAt || 0) - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, (state.endsAt || 0) - Date.now()));
    }, 50);
    return () => clearInterval(interval);
  }, [state.endsAt]);

  const total = Math.max(1, (state.endsAt || 0) - (state.timerStartedAt || 0));
  const p = Math.min(1, Math.max(0, remaining / total));
  const offset = CIRC * (1 - p);

  return (
    <>
      <ViewTransition name="action-area" share="morph" default="none">
        <div className="timer-box">
          <div className="ring-wrap rest">
            <svg viewBox="0 0 108 108" aria-hidden="true">
              <circle className="ring-track" cx="54" cy="54" r="48"></circle>
              <circle
                className="ring-val"
                cx="54"
                cy="54"
                r="48"
                style={{ strokeDasharray: CIRC, strokeDashoffset: offset }}
              ></circle>
            </svg>
            <div className="ring-center">
              <div className="time">{formatDuration(remaining)}</div>
              <div className="sub">Repos</div>
            </div>
          </div>
        </div>
      </ViewTransition>

      {nextExercise && (
        <ViewTransition enter="slide-up" exit="slide-down" default="none">
          <div className="next-preview">
            <div className="kicker">Prochain</div>
            <b>{nextExercise.name}</b>
            <span>
              Série {nextExercise.setIndex + 1}/{nextExercise.totalSets} · {nextExercise.load}
            </span>
          </div>
        </ViewTransition>
      )}

      <div className="adj">
        <button className="btn btn-ghost" onClick={() => onAdjustTimer(-15)}>
          −15 s
        </button>
        <button className="btn btn-orange" onClick={() => startTransition(() => onSkipRest())}>
          Passer
        </button>
        <button className="btn btn-ghost" onClick={() => onAdjustTimer(15)}>
          +15 s
        </button>
      </div>
    </>
  );
}

function WorkPhase({
  state,
  onCompleteSet,
  onAdjustTimer,
}: {
  state: SessionState;
  onCompleteSet: () => void;
  onAdjustTimer: (deltaSec: number) => void;
}) {
  const [remaining, setRemaining] = useState(Math.max(0, (state.endsAt || 0) - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, (state.endsAt || 0) - Date.now()));
    }, 50);
    return () => clearInterval(interval);
  }, [state.endsAt]);

  const total = Math.max(1, (state.endsAt || 0) - (state.timerStartedAt || 0));
  const p = Math.min(1, Math.max(0, remaining / total));
  const offset = CIRC * (1 - p);

  return (
    <>
      <ViewTransition name="action-area" share="morph" default="none">
        <div className="timer-box">
          <div className="ring-wrap">
            <svg viewBox="0 0 108 108" aria-hidden="true">
              <circle className="ring-track" cx="54" cy="54" r="48"></circle>
              <circle
                className="ring-val"
                cx="54"
                cy="54"
                r="48"
                style={{ strokeDasharray: CIRC, strokeDashoffset: offset }}
              ></circle>
            </svg>
            <div className="ring-center">
              <div className="time">{formatDuration(remaining)}</div>
              <div className="sub">Effort</div>
            </div>
          </div>
        </div>
      </ViewTransition>

      <div className="adj" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button className="btn btn-ghost" onClick={() => onAdjustTimer(-15)}>
          −15 s
        </button>
        <button className="btn btn-ghost" onClick={() => onAdjustTimer(15)}>
          +15 s
        </button>
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={() => startTransition(() => onCompleteSet())}>
          Terminer la série
        </button>
      </div>
    </>
  );
}

function ReadyPhase({
  state,
  currentStep,
  onCompleteSet,
  onStartWork,
  getIllustration,
}: {
  state: SessionState;
  currentStep: SequenceStep;
  onCompleteSet: () => void;
  onStartWork: () => void;
  getIllustration: (name: string) => ExerciseIllustration | null;
}) {
  const ex = state.exercises[currentStep.exerciseIndex!];
  const illustration = getIllustration(ex.name);
  const currentExIndex = state.exercises.findIndex((e) => e === ex);
  const totalExercises = state.exercises.length;

  const setNum = currentStep.setIndex! + 1;
  const totalSets = ex.sets;

  let kicker = `Exercice ${currentExIndex + 1} / ${totalExercises}`;
  if (currentStep.supersetTag) {
    kicker = `Superset ${currentStep.supersetTag} · tour ${currentStep.supersetRound}/${currentStep.supersetTotal}`;
  }

  return (
    <>
      <ViewTransition name="exercise-header" share="morph" default="none">
        <div className="hero-ex">
          <div className="kicker">{kicker}</div>
          <h2>{ex.name}</h2>
          <div className="set-badge">
            Série {setNum}/{totalSets}
          </div>
          <div className="meta-line">
            <strong>
              {ex.durationSec != null ? formatDurationLabel(ex.durationSec) : `${ex.reps} reps`}
            </strong>
            {ex.weight && ` · ${ex.weight}`}
          </div>
        </div>
      </ViewTransition>

      {illustration && illustration.imageUrls.length >= 2 && (
        <ViewTransition name={`exercise-image-${currentExIndex}`} share="morph" default="none">
          <div className="dual-frame">
            <div className="frame-item">
              <img
                src={illustration.imageUrls[0]}
                alt={`${ex.name} - départ`}
                className="ex-img-dual"
              />
              <div className="frame-label">départ</div>
            </div>
            <div className="frame-arrow">→</div>
            <div className="frame-item">
              <img
                src={illustration.imageUrls[1]}
                alt={`${ex.name} - fin`}
                className="ex-img-dual"
              />
              <div className="frame-label">fin</div>
            </div>
          </div>
        </ViewTransition>
      )}

      {ex.durationSec != null ? (
        <ViewTransition name="action-area" share="morph" default="none">
          <div className="actions">
            <button className="btn btn-primary" onClick={() => startTransition(() => onStartWork())}>
              Démarrer
            </button>
          </div>
        </ViewTransition>
      ) : (
        <ViewTransition name="action-area" share="morph" default="none">
          <div className="actions">
            <button className="btn btn-primary" onClick={() => startTransition(() => onCompleteSet())}>
              Série terminée
            </button>
          </div>
        </ViewTransition>
      )}
    </>
  );
}
