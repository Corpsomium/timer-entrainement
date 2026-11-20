import { useState, useEffect } from 'react';
import type { ExerciseIllustration } from '../types';
import { searchExercises, normalizeExerciseName } from '../utils/illustrations';

const FR_TO_EN_SIMPLE: Record<string, string> = {
  'fentes arriere': 'reverse lunge',
  'fentes': 'lunge',
  'developpe incline': 'incline press',
  'developpe couche': 'bench press',
  'developpe militaire': 'military press',
  'rowing penche': 'bent over row',
  'hip thrust': 'hip thrust',
  'pull apart': 'band pull apart',
  'pull-apart': 'band pull apart',
  'extensions mollets': 'calf raise',
  'mollets': 'calf raise',
  'kickback': 'triceps kickback',
  'hammer preacher curl': 'hammer curl',
  'bird dogs': 'bird dog',
  'bird dog': 'bird dog',
  'marches du fermier': "farmer's walk",
  'marche du fermier': "farmer's walk",
  'squat': 'squat',
  'souleve de terre': 'deadlift',
  'tractions': 'pull up',
  'pompes': 'push up',
  'gainage': 'plank',
  'planche': 'plank',
  'curl': 'curl',
  'dips': 'dips',
  'crunch': 'crunch',
};

interface ImagePickerProps {
  exerciseName: string;
  currentIllustration: ExerciseIllustration | null;
  onSelect: (illustration: ExerciseIllustration) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function ImagePicker({
  exerciseName,
  currentIllustration,
  onSelect,
  onRemove,
  onClose,
}: ImagePickerProps) {
  const normalized = normalizeExerciseName(exerciseName);
  const initialQuery = FR_TO_EN_SIMPLE[normalized] || exerciseName;
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ExerciseIllustration[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [primaryFrame, setPrimaryFrame] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchExercises(query.trim(), 12);
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSelect = (illustration: ExerciseIllustration) => {
    setSelectedId(illustration.exerciseId);
    setPrimaryFrame(illustration.primaryFrame ?? 0);
  };

  const handleConfirm = () => {
    const selected = results.find((r) => r.exerciseId === selectedId);
    if (selected) {
      onSelect({ ...selected, primaryFrame });
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="image-picker-backdrop" onClick={handleBackdropClick}>
      <div className="image-picker-sheet">
        <div className="image-picker-header">
          <h3>Choisir une illustration</h3>
          <button
            className="image-picker-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="image-picker-exercise">
          <strong>{exerciseName}</strong>
        </div>

        <div className="image-picker-search">
          <input
            type="text"
            placeholder="Rechercher un exercice..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="image-picker-search-input"
            autoFocus
          />
        </div>

        {currentIllustration && (
          <div className="image-picker-current">
            <span>Image actuelle :</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onRemove}
            >
              Retirer l'image
            </button>
          </div>
        )}

        {results.length === 0 && query.trim() ? (
          <div className="image-picker-empty">
            Aucun résultat pour « {query} »
          </div>
        ) : (
          <div className="image-picker-grid">
            {results.map((illustration) => {
              const isSelected = selectedId === illustration.exerciseId;
              return (
                <div
                  key={illustration.exerciseId}
                  className={`image-picker-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(illustration)}
                >
                  <img
                    src={illustration.imageUrls[0]}
                    alt={illustration.name}
                    className="image-picker-thumbnail"
                  />
                  <div className="image-picker-card-name">{illustration.name}</div>
                  {isSelected && illustration.imageUrls.length > 1 && (
                    <div className="image-picker-frames">
                      <span className="image-picker-frames-label">Frame principale :</span>
                      <div className="image-picker-frames-buttons">
                        {illustration.imageUrls.map((url, idx) => (
                          <button
                            key={idx}
                            className={`btn-frame ${primaryFrame === idx ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrimaryFrame(idx);
                            }}
                          >
                            <img src={url} alt={`Frame ${idx + 1}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedId && (
          <div className="image-picker-actions">
            <button className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={handleConfirm}>
              Confirmer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
