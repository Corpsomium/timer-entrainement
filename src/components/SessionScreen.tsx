import { useState, useEffect, type ReactNode } from 'react';
import type { SessionState, SequenceStep, ExerciseIllustration, Exercise } from '../types';
import { formatDuration, formatExerciseEffort } from '../utils/formatters';
import { withViewTransition } from '../utils/viewTransition';
import { Lightbox } from './Lightbox';
import { ImagePicker } from './ImagePicker';

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
  updateExerciseIllustration: (exerciseName: string, illustration: ExerciseIllustration) => void;
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
  updateExerciseIllustration,
}: SessionScreenProps) {
  const [lightbox, setLightbox] = useState<{ images: string[]; name: string } | null>(null);
  const [pickerExercise, setPickerExercise] = useState<Exercise | null>(null);
  const totalSets = state.exercises.reduce((n, ex) => n + ex.sets, 0);
  const pct = totalSets ? Math.round((state.completedSets / totalSets) * 100) : 0;

  const handleSelectIllustration = (illustration: ExerciseIllustration) => {
    if (pickerExercise) {
      updateExerciseIllustration(pickerExercise.name, illustration);
      setPickerExercise(null);
    }
  };

  const handleRemoveIllustration = () => {
    if (pickerExercise) {
      const emptyIllustration: ExerciseIllustration = {
        exerciseId: '',
        imageUrls: [],
        name: pickerExercise.name,
        chosenAt: Date.now(),
        manual: true,
      };
      updateExerciseIllustration(pickerExercise.name, emptyIllustration);
      setPickerExercise(null);
    }
  };

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

  const goOverview = () => setState((prev) => ({ ...prev, screen: 'overview' }));
  const resetSession = () => {
    if (confirm('Réinitialiser la séance en cours ?')) {
      onReset();
    }
  };

  const isRest = currentStep.type === 'rest';
  const isWork = !isRest && state.phase === 'work';
  const readyExercise =
    !isRest && !isWork ? state.exercises[currentStep.exerciseIndex!] : null;

  let primaryActions: ReactNode = null;
  if (isRest) {
    primaryActions = (
      <div className="adj session-sticky-adj">
        <button type="button" className="btn btn-ghost" onClick={() => onAdjustTimer(-15)}>
          −15 s
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => withViewTransition(() => onSkipRest())}
        >
          Passer
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => onAdjustTimer(15)}>
          +15 s
        </button>
      </div>
    );
  } else if (isWork) {
    primaryActions = (
      <div className="actions session-sticky-primary">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => withViewTransition(() => onCompleteSet())}
        >
          Terminer la série
        </button>
      </div>
    );
  } else if (readyExercise) {
    const isTimed = readyExercise.durationSec != null;
    primaryActions = (
      <div className="actions session-sticky-primary">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            withViewTransition(() => {
              if (isTimed) onStartWork();
              else onCompleteSet();
            })
          }
        >
          {isTimed ? 'Démarrer' : 'Série terminée'}
        </button>
      </div>
    );
  }

  return (
    <div className="session-screen">
      <div className="topbar" style={{ viewTransitionName: 'progress-bar' } as React.CSSProperties}>
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

      <div className="session-scroll">
        {isRest ? (
          <RestPhase state={state} nextExercise={currentStep.nextExercise} />
        ) : isWork ? (
          <WorkPhase
            state={state}
            currentStep={currentStep}
            onAdjustTimer={onAdjustTimer}
            getIllustration={getIllustration}
            setLightbox={setLightbox}
          />
        ) : (
          <ReadyPhase
            state={state}
            currentStep={currentStep}
            getIllustration={getIllustration}
            setLightbox={setLightbox}
            setPickerExercise={setPickerExercise}
          />
        )}
        {/* Reserves space so scroll content never sits under the sticky footer */}
        <div className="actions-sticky-spacer" aria-hidden />
      </div>

      <div
        className="session-sticky actions-sticky"
        style={{ viewTransitionName: 'action-area' } as React.CSSProperties}
      >
        {primaryActions}
        <div className="actions duo session-sticky-secondary">
          <button type="button" className="btn btn-ghost btn-compact" onClick={goOverview}>
            Aperçu
          </button>
          <button type="button" className="btn btn-danger btn-compact" onClick={resetSession}>
            Réinitialiser
          </button>
        </div>
      </div>

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          labels={['départ', 'fin']}
          exerciseName={lightbox.name}
          onClose={() => setLightbox(null)}
        />
      )}

      {pickerExercise && (
        <ImagePicker
          exerciseName={pickerExercise.name}
          currentIllustration={getIllustration(pickerExercise.name)}
          onSelect={handleSelectIllustration}
          onRemove={handleRemoveIllustration}
          onClose={() => setPickerExercise(null)}
        />
      )}
    </div>
  );
}

function SetInfoBlock({
  name,
  setNum,
  totalSets,
  reps,
  durationSec,
  weight,
  kicker,
  editControl,
  className,
}: {
  name: string;
  setNum: number;
  totalSets: number;
  reps: number | null;
  durationSec: number | null;
  weight: string;
  kicker?: string;
  editControl?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`hero-ex${className ? ` ${className}` : ''}`}>
      {kicker ? <div className="kicker">{kicker}</div> : null}
      <h2>{name}</h2>
      {editControl}
      <div className="set-badge">
        Série {setNum}/{totalSets}
      </div>
      <div className="meta-line">
        <span className="meta-primary">{formatExerciseEffort({ reps, durationSec })}</span>
        {weight ? (
          <>
            <span className="meta-sep" aria-hidden>
              ·
            </span>
            <span className="meta-primary">{weight}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function RestPhase({
  state,
  nextExercise,
}: {
  state: SessionState;
  nextExercise?: SequenceStep['nextExercise'];
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
    <div className="session-phase session-phase--rest">
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

      {nextExercise && (
        <div
          className="next-preview"
          style={{ viewTransitionName: 'next-preview' } as React.CSSProperties}
        >
          <SetInfoBlock
            name={nextExercise.name}
            setNum={nextExercise.setIndex + 1}
            totalSets={nextExercise.totalSets}
            reps={nextExercise.reps}
            durationSec={nextExercise.durationSec}
            weight={nextExercise.weight}
            kicker="Prochain"
          />
        </div>
      )}
    </div>
  );
}

function SessionDualFrame({
  imageUrls,
  exerciseName,
  transitionKey,
  onOpen,
}: {
  imageUrls: string[];
  exerciseName: string;
  transitionKey: number;
  onOpen: () => void;
}) {
  if (imageUrls.length === 0) return null;
  return (
    <div className="session-images">
      <div
        className="dual-frame"
        style={{ viewTransitionName: `exercise-image-${transitionKey}`, cursor: 'pointer' } as React.CSSProperties}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Agrandir les images"
      >
        <div className="frame-item">
          <img src={imageUrls[0]} alt={`${exerciseName} - départ`} className="ex-img-dual" />
          {imageUrls.length > 1 && <div className="frame-label">départ</div>}
        </div>
        {imageUrls.length > 1 && (
          <>
            <div className="frame-arrow" aria-hidden>
              ↓
            </div>
            <div className="frame-item">
              <img src={imageUrls[1]} alt={`${exerciseName} - fin`} className="ex-img-dual" />
              <div className="frame-label">fin</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WorkPhase({
  state,
  currentStep,
  onAdjustTimer,
  getIllustration,
  setLightbox,
}: {
  state: SessionState;
  currentStep: SequenceStep;
  onAdjustTimer: (deltaSec: number) => void;
  getIllustration: (name: string) => ExerciseIllustration | null;
  setLightbox: (lightbox: { images: string[]; name: string } | null) => void;
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
  const ex = state.exercises[currentStep.exerciseIndex!];
  const setNum = (currentStep.setIndex ?? 0) + 1;
  const illustration = getIllustration(ex.name);
  const imageUrls = illustration?.imageUrls?.filter(Boolean) ?? [];
  const currentExIndex = state.exercises.findIndex((e) => e === ex);

  return (
    <div className={`session-layout session-layout--work${imageUrls.length ? '' : ' session-layout--solo'}`}>
      <SessionDualFrame
        imageUrls={imageUrls}
        exerciseName={ex.name}
        transitionKey={currentExIndex}
        onOpen={() => setLightbox({ images: imageUrls, name: ex.name })}
      />

      <div className="session-info-actions">
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

        <SetInfoBlock
          className="hero-ex--work"
          name={ex.name}
          setNum={setNum}
          totalSets={ex.sets}
          reps={ex.reps}
          durationSec={ex.durationSec}
          weight={ex.weight}
        />

        <div className="adj session-inline-adj" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button type="button" className="btn btn-ghost" onClick={() => onAdjustTimer(-15)}>
            −15 s
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onAdjustTimer(15)}>
            +15 s
          </button>
        </div>
      </div>
    </div>
  );
}

function ReadyPhase({
  state,
  currentStep,
  getIllustration,
  setLightbox,
  setPickerExercise,
}: {
  state: SessionState;
  currentStep: SequenceStep;
  getIllustration: (name: string) => ExerciseIllustration | null;
  setLightbox: (lightbox: { images: string[]; name: string } | null) => void;
  setPickerExercise: (exercise: Exercise | null) => void;
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

  const imageUrls = illustration?.imageUrls?.filter(Boolean) ?? [];
  const hasImages = imageUrls.length > 0;

  return (
    <div className={`session-layout${hasImages ? '' : ' session-layout--solo'}`}>
      <SessionDualFrame
        imageUrls={imageUrls}
        exerciseName={ex.name}
        transitionKey={currentExIndex}
        onOpen={() => setLightbox({ images: imageUrls, name: ex.name })}
      />

      <div className="session-info-actions">
        <div style={{ viewTransitionName: 'exercise-header', position: 'relative' } as React.CSSProperties}>
          <SetInfoBlock
            name={ex.name}
            setNum={setNum}
            totalSets={totalSets}
            reps={ex.reps}
            durationSec={ex.durationSec}
            weight={ex.weight}
            kicker={kicker}
            editControl={
              <button
                className="btn-edit-image"
                type="button"
                onClick={() => setPickerExercise(ex)}
                title="Changer l'image"
                aria-label="Changer l'image"
              >
                ✎
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}
