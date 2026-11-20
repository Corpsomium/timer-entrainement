import { useState, useEffect, useMemo } from 'react';
import type { ExerciseIllustration } from '../types';
import { searchExercises, getPreferredSearchQuery } from '../utils/illustrations';

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
  const initialQuery = getPreferredSearchQuery(exerciseName);

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ExerciseIllustration[]>([]);
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
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
    // Empty / unknown queries still yield suggestions via searchExercises
    const searchResults = searchExercises(query.trim(), 12);
    setResults(searchResults);
    setFailedIds(new Set());
  }, [query]);

  const visibleResults = useMemo(
    () => results.filter((r) => !failedIds.has(r.exerciseId)),
    [results, failedIds]
  );

  const markFailed = (exerciseId: string) => {
    setFailedIds((prev) => {
      if (prev.has(exerciseId)) return prev;
      const next = new Set(prev);
      next.add(exerciseId);
      return next;
    });
  };

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

  const currentThumb =
    currentIllustration?.imageUrls?.[currentIllustration.primaryFrame ?? 0] ??
    currentIllustration?.imageUrls?.[0];

  const hasCurrentImage = Boolean(currentIllustration && currentThumb);

  return (
    <div className="image-picker-backdrop" onClick={handleBackdropClick}>
      <div className="image-picker-sheet" role="dialog" aria-modal="true" aria-label="Choisir une illustration">
        <div className="image-picker-header">
          <h3>Choisir une illustration</h3>
          <button
            className="image-picker-close"
            onClick={onClose}
            aria-label="Fermer"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="image-picker-exercise">
          <strong>{exerciseName}</strong>
        </div>

        <div className="image-picker-search">
          <input
            type="search"
            placeholder="Rechercher un exercice..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="image-picker-search-input"
            autoFocus
            aria-label="Rechercher un exercice"
          />
        </div>

        {hasCurrentImage && (
          <div className="image-picker-current">
            <div className="image-picker-current-left">
              <img
                src={currentThumb}
                alt=""
                className="image-picker-current-thumb"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
              <span>Image actuelle</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onRemove} type="button">
              Retirer l'image
            </button>
          </div>
        )}

        {visibleResults.length === 0 ? (
          <div className="image-picker-empty">
            {query.trim()
              ? `Aucun résultat pour « ${query} »`
              : 'Aucune suggestion disponible'}
          </div>
        ) : (
          <div className="image-picker-grid">
            {visibleResults.map((illustration) => {
              const isSelected = selectedId === illustration.exerciseId;
              const frames = illustration.imageUrls.slice(0, 2);
              return (
                <div
                  key={illustration.exerciseId}
                  className={`image-picker-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(illustration)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(illustration);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                >
                  <div className="image-picker-tile" data-frames={frames.length}>
                    {frames.map((url, idx) => (
                      <div key={idx} className="image-picker-tile-frame">
                        <img
                          src={url}
                          alt=""
                          className="image-picker-thumbnail"
                          loading="lazy"
                          onError={() => markFailed(illustration.exerciseId)}
                        />
                        {frames.length > 1 && (
                          <span className="image-picker-tile-label">
                            {idx === 0 ? 'départ' : 'fin'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="image-picker-card-name">{illustration.name}</div>
                  {isSelected && illustration.imageUrls.length > 1 && (
                    <div className="image-picker-frames">
                      <span className="image-picker-frames-label">Frame principale :</span>
                      <div className="image-picker-frames-buttons">
                        {illustration.imageUrls.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`btn-frame ${primaryFrame === idx ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrimaryFrame(idx);
                            }}
                            aria-label={`Frame ${idx + 1}`}
                          >
                            <img
                              src={url}
                              alt=""
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
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
            <button className="btn btn-ghost" onClick={onClose} type="button">
              Annuler
            </button>
            <button className="btn btn-primary" onClick={handleConfirm} type="button">
              Confirmer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
