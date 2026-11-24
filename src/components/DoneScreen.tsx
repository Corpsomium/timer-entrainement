import type { SessionState } from '../types';
import { formatClock, formatLoad } from '../utils/formatters';
import { StickyActionsBar, StickyActionsSpacer } from './StickyActionsBar';

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

      <StickyActionsSpacer className="overview-sticky-spacer" />
      <StickyActionsBar
        className="done-actions"
        primary={
          <div className="actions session-sticky-primary">
            <button type="button" className="btn btn-primary" onClick={onRestart}>
              Nouvelle séance
            </button>
          </div>
        }
        secondary={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              onClick={() => setState((prev) => ({ ...prev, screen: 'input' }))}
            >
              Modifier le bloc
            </button>
            <button type="button" className="btn btn-ghost btn-compact" onClick={onShare}>
              Partager le lien
            </button>
          </>
        }
      />
    </div>
  );
}
