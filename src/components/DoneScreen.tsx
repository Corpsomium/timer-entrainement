import type { SessionState } from '../types';
import { formatClock, formatLoad } from '../utils/formatters';

interface DoneScreenProps {
  state: SessionState;
  setState: React.Dispatch<React.SetStateAction<SessionState>>;
  onRestart: () => void;
  onShare: () => void;
}

export function DoneScreen({ state, setState, onRestart, onShare }: DoneScreenProps) {
  const duration = (state.finishedAt || Date.now()) - (state.startedAt || state.finishedAt || Date.now());
  const totalSets = state.exercises.reduce((n, ex) => n + ex.sets, 0);

  return (
    <div className="done">
      <div className="done-mark">✓</div>
      <h2>Séance terminée</h2>
      <p className="lead">
        {state.completedSets} série{state.completedSets > 1 ? 's' : ''} réalisée
        {state.completedSets > 1 ? 's' : ''} sur {totalSets} · {formatClock(duration)}
      </p>

      <div className="done-list">
        {state.exercises.map((ex, i) => {
          const skipped = state.skipped[i] || 0;
          const done = ex.sets - skipped;
          return (
            <div className="done-item" key={i}>
              <b>{ex.name}</b>
              <span>
                {done}/{ex.sets} · {formatLoad(ex)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={onRestart}>
          Nouvelle séance
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setState((prev) => ({ ...prev, screen: 'input' }))}
        >
          Modifier le bloc
        </button>
        <button className="btn btn-ghost" onClick={onShare}>
          Partager le lien
        </button>
      </div>
    </div>
  );
}
