import type { LoadoutSuggestion } from '../types/equipment';
import { formatKg, formatLoadoutText } from '../utils/loadout';

/** Discrete colors for common plate weights (kg). */
const PLATE_COLORS: Record<string, string> = {
  '1.25': '#6ea8fe',
  '2.5': '#7dff9a',
  '5': '#ff8a65',
  '10': '#ffcc33',
  '15': '#d6ff3f',
  '20': '#ff5a5a',
  '25': '#c4b5fd',
};

function plateColor(kg: number): string {
  const key = String(kg);
  if (PLATE_COLORS[key]) return PLATE_COLORS[key];
  // Fallback: hash hue
  const hue = Math.abs(Math.round(kg * 40)) % 360;
  return `hsl(${hue} 55% 55%)`;
}

function PlatePill({ kg }: { kg: number }) {
  return (
    <span
      className="plate-pill"
      style={{ background: plateColor(kg), color: '#111' }}
      title={`${formatKg(kg)} kg`}
    >
      {formatKg(kg)}
    </span>
  );
}

function ImplementLine({ suggestion }: { suggestion: LoadoutSuggestion }) {
  if (suggestion.kind === 'kettlebell') {
    return (
      <div className="loadout-line">
        <span className="loadout-label">{suggestion.label}</span>
        <span className="loadout-sep">:</span>
        <span className="loadout-bar">{formatKg(suggestion.kettlebellKg)} kg</span>
      </div>
    );
  }

  const impl = suggestion.implements[0];
  if (!impl) return null;

  return (
    <div className="loadout-line">
      <span className="loadout-label">{suggestion.label}</span>
      <span className="loadout-sep">:</span>
      <span className="loadout-bar">manche {formatKg(impl.barWeightKg)}</span>
      {(impl.left.length > 0 || impl.right.length > 0) && (
        <>
          <span className="loadout-plus">+</span>
          <span className="loadout-side" aria-label="côté gauche">
            {impl.left.map((w, i) => (
              <PlatePill key={`l-${i}-${w}`} kg={w} />
            ))}
          </span>
          <span className="loadout-pipe" aria-hidden>
            |
          </span>
          <span className="loadout-side" aria-label="côté droit">
            {impl.right.map((w, i) => (
              <PlatePill key={`r-${i}-${w}`} kg={w} />
            ))}
          </span>
        </>
      )}
    </div>
  );
}

export function LoadoutSuggestionView({
  suggestion,
  compact = true,
}: {
  suggestion: LoadoutSuggestion | null | undefined;
  compact?: boolean;
}) {
  if (!suggestion) return null;

  if (suggestion.kind === 'none' && !suggestion.below && !suggestion.above) {
    return (
      <div className={`loadout-suggest${compact ? ' loadout-suggest--compact' : ''}`}>
        <div className="loadout-msg">{suggestion.message || 'Charge impossible'}</div>
      </div>
    );
  }

  if (!suggestion.exact) {
    return (
      <div className={`loadout-suggest${compact ? ' loadout-suggest--compact' : ''}`}>
        <div className="loadout-msg">{suggestion.message || 'charge exacte impossible'}</div>
        {suggestion.below && (
          <div className="loadout-alt">
            <span className="loadout-alt-tag">↓ {formatKg(suggestion.below.targetKg)} kg</span>
            <ImplementLine suggestion={suggestion.below} />
          </div>
        )}
        {suggestion.above && (
          <div className="loadout-alt">
            <span className="loadout-alt-tag">↑ {formatKg(suggestion.above.targetKg)} kg</span>
            <ImplementLine suggestion={suggestion.above} />
          </div>
        )}
        {suggestion.kind === 'kettlebell' && (
          <ImplementLine suggestion={suggestion} />
        )}
      </div>
    );
  }

  return (
    <div
      className={`loadout-suggest${compact ? ' loadout-suggest--compact' : ''}`}
      title={formatLoadoutText(suggestion)}
    >
      <ImplementLine suggestion={suggestion} />
    </div>
  );
}
