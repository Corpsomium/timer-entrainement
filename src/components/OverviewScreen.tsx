import type { SessionState, Exercise, ExerciseIllustration } from '../types';
import { formatLoad } from '../utils/formatters';

interface OverviewScreenProps {
  state: SessionState;
  setState: React.Dispatch<React.SetStateAction<SessionState>>;
  onStart: () => void;
  onResume: () => void;
  onShare: () => void;
  getIllustration: (name: string) => ExerciseIllustration | null;
}

export function OverviewScreen({
  state,
  setState,
  onStart,
  onResume,
  onShare,
  getIllustration,
}: OverviewScreenProps) {
  const totalSets = state.exercises.reduce((n, ex) => n + ex.sets, 0);
  const midSession = state.startedAt && state.completedSets < totalSets && !state.finishedAt;

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
        <div className="stat">
          <b>{state.restSec} s</b>
          <span>repos</span>
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
                />
              ))}
            </div>
          ) : (
            <ExerciseCard
              key={group.exercises[0].index}
              exercise={group.exercises[0].exercise}
              index={group.exercises[0].index}
              illustration={getIllustration(group.exercises[0].exercise.name)}
            />
          )
        )}
      </div>

      <label className="field" htmlFor="rest">
        Repos entre les séries
      </label>
      <div className="row">
        <input
          id="rest"
          type="number"
          min="0"
          max="600"
          step="5"
          value={state.restSec}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              restSec: Math.min(600, Math.max(0, parseInt(e.target.value, 10) || 60)),
            }))
          }
        />{' '}
        <span className="hint" style={{ margin: 0 }}>
          secondes
        </span>
      </div>

      <div className="actions">
        {midSession ? (
          <>
            <button className="btn btn-primary" onClick={onResume}>
              Reprendre la séance
            </button>
            <button className="btn btn-ghost" onClick={onStart}>
              Recommencer
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={onStart}>
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
    </>
  );
}

function ExerciseCard({
  exercise,
  index,
  illustration,
}: {
  exercise: Exercise;
  index: number;
  illustration: ExerciseIllustration | null;
}) {
  // Use primaryFrame if set, otherwise use frame 0
  const frameIndex = illustration?.primaryFrame ?? 0;
  const thumbnailImage = illustration?.imageUrls?.[frameIndex];

  return (
    <div className="card ex-card">
      {thumbnailImage ? (
        <img src={thumbnailImage} alt={exercise.name} className="ex-thumbnail" />
      ) : (
        <div className="ex-num">{index + 1}</div>
      )}
      <div>
        <h3>{exercise.name}</h3>
        <p>{formatLoad(exercise)}</p>
      </div>
      <div className="pill">{exercise.sets} sér.</div>
    </div>
  );
}
