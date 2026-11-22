import { useState } from 'react';
import type { SessionState, Exercise, ExerciseIllustration } from '../types';
import { formatLoad } from '../utils/formatters';
import { saveRest } from '../utils/storage';
import { getAudioMuteHint, unlockAudio } from '../utils/audio';
import { Lightbox } from './Lightbox';
import { ImagePicker } from './ImagePicker';

interface OverviewScreenProps {
  state: SessionState;
  setState: React.Dispatch<React.SetStateAction<SessionState>>;
  onStart: () => void;
  onResume: () => void;
  onShare: () => void;
  getIllustration: (name: string) => ExerciseIllustration | null;
  updateExerciseIllustration: (exerciseName: string, illustration: ExerciseIllustration) => void;
}

export function OverviewScreen({
  state,
  setState,
  onStart,
  onResume,
  onShare,
  getIllustration,
  updateExerciseIllustration,
}: OverviewScreenProps) {
  const [pickerExercise, setPickerExercise] = useState<Exercise | null>(null);
  const totalSets = state.exercises.reduce((n, ex) => n + ex.sets, 0);
  const midSession = state.startedAt && state.completedSets < totalSets && !state.finishedAt;

  const adjustRest = (delta: number) => {
    const newRest = Math.max(15, Math.min(600, state.restSec + delta));
    setState((prev) => ({ ...prev, restSec: newRest }));
    saveRest(newRest);
  };

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

  const groups: Array<{ tag?: string; exercises: Array<{ index: number; exercise: Exercise }> }> =
    [];
  const processedIndices = new Set<number>();

  state.exercises.forEach((ex, index) => {
    if (processedIndices.has(index)) return;

    if (ex.supersetTag) {
      const existingGroup = groups.find(
        (g) => g.tag && g.tag === ex.supersetTag
      );
      if (existingGroup) {
        existingGroup.exercises.push({ index, exercise: ex });
      } else {
        groups.push({
          tag: ex.supersetTag,
          exercises: [{ index, exercise: ex }],
        });
      }
      processedIndices.add(index);
    }
  });

  state.exercises.forEach((ex, index) => {
    if (processedIndices.has(index)) return;
    groups.push({
      exercises: [{ index, exercise: ex }],
    });
  });

  groups.sort((a, b) => {
    const posA = a.exercises[0].index;
    const posB = b.exercises[0].index;
    return posA - posB;
  });

  return (
    <>
      <div className="wordmark">
        <h1>
          Séance<span>.</span>
        </h1>
        <button className="icon-btn" onClick={onShare} title="Partager">
          ↗
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <b>{state.exercises.length}</b>
          <span>exercices</span>
        </div>
        <div className="stat">
          <b>{totalSets}</b>
          <span>séries au total</span>
        </div>
        <div className="stat stat-editable">
          <div className="stat-edit-group">
            <button
              className="btn-stepper"
              onClick={() => adjustRest(-15)}
              disabled={state.restSec <= 15}
              aria-label="Réduire repos de 15s"
            >
              −
            </button>
            <div className="stat-value-editable">
              <b>{state.restSec} s</b>
              <span>repos</span>
            </div>
            <button
              className="btn-stepper"
              onClick={() => adjustRest(+15)}
              disabled={state.restSec >= 600}
              aria-label="Augmenter repos de 15s"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {state.warnings.length > 0 && (
        <div className="warn">
          <strong>Lignes ignorées</strong>
          {state.warnings.map((w) => (
            <div key={w.line}>
              L.{w.line} — {w.text} ({w.reason})
            </div>
          ))}
        </div>
      )}

      <div className="ex-list">
        {groups.map((group, groupIdx) =>
          group.tag ? (
            <div key={`group-${groupIdx}`} className="superset-group">
              <div className="superset-header">Superset {group.tag}</div>
              {group.exercises.map((item) => (
                <ExerciseCard
                  key={item.index}
                  exercise={item.exercise}
                  index={item.index}
                  illustration={getIllustration(item.exercise.name)}
                  onImageChange={setPickerExercise}
                />
              ))}
            </div>
          ) : (
            <ExerciseCard
              key={group.exercises[0].index}
              exercise={group.exercises[0].exercise}
              index={group.exercises[0].index}
              illustration={getIllustration(group.exercises[0].exercise.name)}
              onImageChange={setPickerExercise}
            />
          )
        )}
      </div>

      <p className="hint audio-hint">{getAudioMuteHint()}</p>

      <div className="actions-sticky-spacer overview-sticky-spacer" aria-hidden />
      <div className="actions actions-sticky">
        {midSession ? (
          <>
            <button
              className="btn btn-primary"
              onClick={() => {
                unlockAudio();
                onResume();
              }}
            >
              Reprendre la séance
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                unlockAudio();
                onStart();
              }}
            >
              Recommencer
            </button>
          </>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => {
              unlockAudio();
              onStart();
            }}
          >
            Commencer
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => setState((prev) => ({ ...prev, screen: 'input' }))}
        >
          Modifier le bloc
        </button>
      </div>

      {pickerExercise && (
        <ImagePicker
          exerciseName={pickerExercise.name}
          currentIllustration={getIllustration(pickerExercise.name)}
          onSelect={handleSelectIllustration}
          onRemove={handleRemoveIllustration}
          onClose={() => setPickerExercise(null)}
        />
      )}
    </>
  );
}

function ExerciseCard({
  exercise,
  index,
  illustration,
  onImageChange,
}: {
  exercise: Exercise;
  index: number;
  illustration: ExerciseIllustration | null;
  onImageChange: (exercise: Exercise) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; name: string } | null>(null);
  
  const frameIndex = illustration?.primaryFrame ?? 0;
  const thumbnailImage = illustration?.imageUrls?.[frameIndex];

  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (illustration?.imageUrls && illustration.imageUrls.length > 0) {
      setLightbox({ images: illustration.imageUrls, name: exercise.name });
    }
  };

  return (
    <>
      <div 
        className={`card ex-card ${expanded ? 'ex-card-expanded' : ''}`}
        onClick={handleToggle}
        style={{ cursor: 'pointer' }}
      >
        <div className="ex-card-header">
          {thumbnailImage ? (
            <img 
              src={thumbnailImage} 
              alt={exercise.name} 
              className="ex-thumbnail"
              onClick={handleImageClick}
            />
          ) : (
            <div className="ex-num">{index + 1}</div>
          )}
          <div className="ex-card-info">
            <h3>{exercise.name}</h3>
            <p>{formatLoad(exercise)}</p>
          </div>
          <div className="pill">{exercise.sets} sér.</div>
          <button 
            className="expand-icon"
            aria-label={expanded ? 'Réduire' : 'Développer'}
            aria-expanded={expanded}
          >
            {expanded ? '−' : '+'}
          </button>
        </div>

        {expanded && (
          <div className="ex-card-details">
            {illustration?.imageUrls && illustration.imageUrls.length > 0 && (
              <div className="ex-expanded-images">
                {illustration.imageUrls.map((url, i) => (
                  <div key={i} className="ex-expanded-image-wrapper">
                    <img
                      src={url}
                      alt={`${exercise.name} - ${i === 0 ? 'départ' : 'fin'}`}
                      className="ex-expanded-image"
                      onClick={handleImageClick}
                    />
                    <div className="ex-frame-label">
                      {i === 0 ? 'départ' : 'fin'}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="ex-expanded-info">
              <div className="ex-detail-row">
                <span className="ex-detail-label">Séries</span>
                <span className="ex-detail-value">{exercise.sets}</span>
              </div>
              <div className="ex-detail-row">
                <span className="ex-detail-label">Répétitions</span>
                <span className="ex-detail-value">{exercise.reps}</span>
              </div>
              {exercise.weight && (
                <div className="ex-detail-row">
                  <span className="ex-detail-label">Charge</span>
                  <span className="ex-detail-value">{exercise.weight}</span>
                </div>
              )}
              {exercise.supersetTag && (
                <div className="superset-tag-pill">
                  Superset {exercise.supersetTag}
                </div>
              )}
            </div>

            <button 
              className="btn btn-ghost btn-change-image"
              onClick={(e) => {
                e.stopPropagation();
                onImageChange(exercise);
              }}
            >
              Changer l'image
            </button>
          </div>
        )}
      </div>

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          labels={['départ', 'fin']}
          exerciseName={lightbox.name}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
