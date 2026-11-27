import { useState } from 'react';
import type { Bar, BarKind, EquipmentInventory, Kettlebell, Plate } from '../types/equipment';
import { BAR_KIND_OPTIONS } from '../types/equipment';
import { formatKg } from '../utils/loadout';

type Editor =
  | { kind: 'bar'; value: Partial<Bar> & { kind: BarKind } }
  | { kind: 'plate'; value: Partial<Plate> }
  | { kind: 'kb'; value: Partial<Kettlebell> }
  | null;

interface EquipmentScreenProps {
  inventory: EquipmentInventory;
  onBack: () => void;
  onUpsertBar: (bar: Omit<Bar, 'id'> & { id?: string }) => void;
  onRemoveBar: (id: string) => void;
  onUpsertPlate: (plate: Omit<Plate, 'id'> & { id?: string }) => void;
  onRemovePlate: (id: string) => void;
  onUpsertKettlebell: (kb: Omit<Kettlebell, 'id'> & { id?: string }) => void;
  onRemoveKettlebell: (id: string) => void;
  onReset: () => void;
}

export function EquipmentScreen({
  inventory,
  onBack,
  onUpsertBar,
  onRemoveBar,
  onUpsertPlate,
  onRemovePlate,
  onUpsertKettlebell,
  onRemoveKettlebell,
  onReset,
}: EquipmentScreenProps) {
  const [editor, setEditor] = useState<Editor>(null);

  return (
    <div className="equipment-screen">
      <div className="wordmark">
        <button type="button" className="icon-btn" onClick={onBack} title="Retour" aria-label="Retour">
          ←
        </button>
        <h1>
          Matériel<span>.</span>
        </h1>
        <button
          type="button"
          className="btn btn-ghost btn-compact"
          onClick={() => {
            if (confirm('Remettre le kit par défaut ?')) onReset();
          }}
        >
          Défaut
        </button>
      </div>

      <p className="hint equipment-lead">
        Barres, disques et kettlebells utilisés pour proposer le chargement des poids.
      </p>

      <section className="equipment-section">
        <div className="equipment-section-head">
          <h2>Barres / manches</h2>
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            onClick={() =>
              setEditor({
                kind: 'bar',
                value: {
                  name: 'Manche haltère',
                  kind: 'haltère',
                  weightKg: 2.5,
                  sleeveCm: 8.3,
                  quantity: 1,
                },
              })
            }
          >
            + Ajouter
          </button>
        </div>
        <div className="equipment-list">
          {inventory.bars.length === 0 && <p className="hint">Aucune barre.</p>}
          {inventory.bars.map((b) => (
            <button
              type="button"
              key={b.id}
              className="card equipment-row"
              onClick={() => setEditor({ kind: 'bar', value: { ...b } })}
            >
              <div>
                <strong>{b.name}</strong>
                <p>
                  {BAR_KIND_OPTIONS.find((o) => o.value === b.kind)?.label} · {formatKg(b.weightKg)}{' '}
                  kg
                  {b.sleeveCm != null ? ` · ${formatKg(b.sleeveCm)} cm/côté` : ''}
                </p>
              </div>
              <span className="pill">×{b.quantity}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="equipment-section">
        <div className="equipment-section-head">
          <h2>Disques</h2>
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            onClick={() =>
              setEditor({
                kind: 'plate',
                value: { weightKg: 1.25, quantity: 2, thicknessCm: 2 },
              })
            }
          >
            + Ajouter
          </button>
        </div>
        <div className="equipment-list">
          {inventory.plates.length === 0 && <p className="hint">Aucun disque.</p>}
          {inventory.plates.map((p) => (
            <button
              type="button"
              key={p.id}
              className="card equipment-row"
              onClick={() => setEditor({ kind: 'plate', value: { ...p } })}
            >
              <div>
                <strong>{formatKg(p.weightKg)} kg</strong>
                <p>
                  {p.thicknessCm != null ? `épaisseur ${formatKg(p.thicknessCm)} cm` : 'épaisseur —'}
                </p>
              </div>
              <span className="pill">×{p.quantity}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="equipment-section">
        <div className="equipment-section-head">
          <h2>Kettlebells</h2>
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            onClick={() => setEditor({ kind: 'kb', value: { weightKg: 16, quantity: 1 } })}
          >
            + Ajouter
          </button>
        </div>
        <div className="equipment-list">
          {inventory.kettlebells.length === 0 && (
            <p className="hint">Aucune kettlebell — ajoute-en si besoin.</p>
          )}
          {inventory.kettlebells.map((k) => (
            <button
              type="button"
              key={k.id}
              className="card equipment-row"
              onClick={() => setEditor({ kind: 'kb', value: { ...k } })}
            >
              <div>
                <strong>{formatKg(k.weightKg)} kg</strong>
              </div>
              <span className="pill">×{k.quantity}</span>
            </button>
          ))}
        </div>
      </section>

      {editor && (
        <EquipmentEditor
          editor={editor}
          onClose={() => setEditor(null)}
          onSave={(next) => {
            if (next.kind === 'bar') {
              onUpsertBar({
                id: next.value.id,
                name: next.value.name || 'Barre',
                kind: next.value.kind,
                weightKg: Number(next.value.weightKg) || 0,
                sleeveCm:
                  next.value.sleeveCm == null || Number.isNaN(Number(next.value.sleeveCm))
                    ? null
                    : Number(next.value.sleeveCm),
                quantity: Math.max(1, Number(next.value.quantity) || 1),
              });
            } else if (next.kind === 'plate') {
              onUpsertPlate({
                id: next.value.id,
                weightKg: Number(next.value.weightKg) || 0,
                quantity: Math.max(0, Number(next.value.quantity) || 0),
                thicknessCm:
                  next.value.thicknessCm == null || Number.isNaN(Number(next.value.thicknessCm))
                    ? null
                    : Number(next.value.thicknessCm),
              });
            } else {
              onUpsertKettlebell({
                id: next.value.id,
                weightKg: Number(next.value.weightKg) || 0,
                quantity: Math.max(1, Number(next.value.quantity) || 1),
              });
            }
            setEditor(null);
          }}
          onDelete={() => {
            if (!editor.value.id) {
              setEditor(null);
              return;
            }
            if (!confirm('Supprimer cet élément ?')) return;
            if (editor.kind === 'bar') onRemoveBar(editor.value.id);
            else if (editor.kind === 'plate') onRemovePlate(editor.value.id);
            else onRemoveKettlebell(editor.value.id);
            setEditor(null);
          }}
        />
      )}
    </div>
  );
}

function EquipmentEditor({
  editor,
  onClose,
  onSave,
  onDelete,
}: {
  editor: Exclude<Editor, null>;
  onClose: () => void;
  onSave: (editor: Exclude<Editor, null>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(editor);

  const title =
    draft.kind === 'bar' ? 'Barre / manche' : draft.kind === 'plate' ? 'Disque' : 'Kettlebell';

  return (
    <div className="equipment-editor-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="equipment-editor card">
        <div className="equipment-editor-head">
          <h2>{draft.value.id ? `Modifier · ${title}` : `Ajouter · ${title}`}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        {draft.kind === 'bar' && (
          <div className="equipment-form">
            <label>
              Nom
              <input
                value={draft.value.name || ''}
                onChange={(e) =>
                  setDraft({ ...draft, value: { ...draft.value, name: e.target.value } })
                }
              />
            </label>
            <label>
              Type
              <select
                value={draft.value.kind}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: { ...draft.value, kind: e.target.value as BarKind },
                  })
                }
              >
                {BAR_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Poids (kg)
              <input
                type="number"
                step="0.1"
                min="0"
                value={draft.value.weightKg ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: { ...draft.value, weightKg: parseFloat(e.target.value) },
                  })
                }
              />
            </label>
            <label>
              Place utile / côté (cm)
              <input
                type="number"
                step="0.1"
                min="0"
                value={draft.value.sleeveCm ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: {
                      ...draft.value,
                      sleeveCm: e.target.value === '' ? null : parseFloat(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label>
              Quantité
              <input
                type="number"
                min="1"
                step="1"
                value={draft.value.quantity ?? 1}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: { ...draft.value, quantity: parseInt(e.target.value, 10) },
                  })
                }
              />
            </label>
          </div>
        )}

        {draft.kind === 'plate' && (
          <div className="equipment-form">
            <label>
              Poids unitaire (kg)
              <input
                type="number"
                step="0.05"
                min="0"
                value={draft.value.weightKg ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: { ...draft.value, weightKg: parseFloat(e.target.value) },
                  })
                }
              />
            </label>
            <label>
              Quantité totale
              <input
                type="number"
                min="0"
                step="1"
                value={draft.value.quantity ?? 0}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: { ...draft.value, quantity: parseInt(e.target.value, 10) },
                  })
                }
              />
            </label>
            <label>
              Épaisseur (cm)
              <input
                type="number"
                step="0.1"
                min="0"
                value={draft.value.thicknessCm ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: {
                      ...draft.value,
                      thicknessCm: e.target.value === '' ? null : parseFloat(e.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
        )}

        {draft.kind === 'kb' && (
          <div className="equipment-form">
            <label>
              Poids (kg)
              <input
                type="number"
                step="0.5"
                min="0"
                value={draft.value.weightKg ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: { ...draft.value, weightKg: parseFloat(e.target.value) },
                  })
                }
              />
            </label>
            <label>
              Quantité
              <input
                type="number"
                min="1"
                step="1"
                value={draft.value.quantity ?? 1}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    value: { ...draft.value, quantity: parseInt(e.target.value, 10) },
                  })
                }
              />
            </label>
          </div>
        )}

        <div className="actions equipment-editor-actions">
          <button type="button" className="btn btn-primary" onClick={() => onSave(draft)}>
            Enregistrer
          </button>
          {draft.value.id ? (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Supprimer
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
