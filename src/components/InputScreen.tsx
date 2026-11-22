import { useRef } from 'react';
import type { SessionState, ParseWarning } from '../types';
import { getBuildLabel } from '../utils/buildInfo';

interface InputScreenProps {
  state: SessionState;
  setState: React.Dispatch<React.SetStateAction<SessionState>>;
  onLoad: () => void;
  onShare: () => void;
  onDebugGesture?: () => void;
}

export function InputScreen({ state, setState, onLoad, onShare, onDebugGesture }: InputScreenProps) {
  const longPressTimer = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = () => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      onDebugGesture?.();
    }, 800);
  };

  return (
    <>
      <div className="wordmark">
        <h1
          onPointerDown={startLongPress}
          onPointerUp={clearLongPress}
          onPointerLeave={clearLongPress}
          onPointerCancel={clearLongPress}
          title="Appui long : debug audio"
        >
          Séance<span>.</span>
        </h1>
        <button className="icon-btn" onClick={onShare} title="Partager">
          ↗
        </button>
      </div>

      <p className="hint">
        Collez un bloc d'exercices, une ligne par mouvement : <em>Nom : 3x10 (20kg)</em>. Les durées
        du type <em>3x30s</em> lancent un timer d'effort. Ajoutez <em>setA</em> ou <em>setB</em> pour
        créer des supersets.
      </p>

      <label className="field" htmlFor="block">
        Votre bloc
      </label>
      <textarea
        id="block"
        spellCheck={false}
        value={state.block}
        onChange={(e) => setState((prev) => ({ ...prev, block: e.target.value }))}
      />

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
          secondes (60 par défaut)
        </span>
      </div>

      {state.warnings.length > 0 && state.exercises.length === 0 && (
        <Warnings warnings={state.warnings} />
      )}

      <div className="actions">
        <button className="btn btn-primary" onClick={onLoad}>
          Charger la séance
        </button>
      </div>

      {state.exercises.length > 0 && (
        <div className="actions">
          <button
            className="btn btn-ghost"
            onClick={() => setState((prev) => ({ ...prev, screen: 'overview' }))}
          >
            Retour à l'aperçu
          </button>
        </div>
      )}

      <p className="foot">Fonctionne hors ligne, sans compte. La séance est mémorisée sur cet appareil.</p>
      <p className="build-label" aria-label="Version déployée">
        {getBuildLabel()}
      </p>
    </>
  );
}

function Warnings({ warnings }: { warnings: ParseWarning[] }) {
  return (
    <div className="warn">
      <strong>Lignes ignorées</strong>
      {warnings.map((w) => (
        <div key={w.line}>
          L.{w.line} — {w.text} ({w.reason})
        </div>
      ))}
    </div>
  );
}
