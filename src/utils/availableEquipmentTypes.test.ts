import { describe, expect, it } from 'vitest';
import type { EquipmentInventory } from '../types/equipment';
import { createDefaultInventory } from './equipmentDefaults';
import {
  availableEquipmentTypeOptions,
  coerceEquipmentType,
} from './availableEquipmentTypes';
import { applyEquipmentTypeToExercises } from './equipmentTypePersistence';
import { suggestLoadout } from './loadout';
import { loadEquipmentTypeOverrides } from './storage';

describe('availableEquipmentTypeOptions', () => {
  it('only offers haltères from default kit (+ hide options)', () => {
    const opts = availableEquipmentTypeOptions(createDefaultInventory());
    const values = opts.map((o) => o.value);
    expect(values).toContain('haltères');
    expect(values).not.toContain('barre_droite');
    expect(values).not.toContain('barre_ez');
    expect(values).not.toContain('kettlebell');
    expect(values).toEqual(
      expect.arrayContaining(['poids_du_corps', 'bande', 'autre'])
    );
  });

  it('includes kettlebell and bars when present in inventory', () => {
    const inv: EquipmentInventory = {
      bars: [
        {
          id: '1',
          name: 'Olympique',
          kind: 'barre_droite',
          weightKg: 20,
          quantity: 1,
        },
        {
          id: '2',
          name: 'EZ',
          kind: 'barre_ez',
          weightKg: 10,
          quantity: 1,
        },
      ],
      plates: [],
      kettlebells: [{ id: 'k', weightKg: 16, quantity: 2 }],
    };
    const values = availableEquipmentTypeOptions(inv).map((o) => o.value);
    expect(values).toEqual(
      expect.arrayContaining(['barre_droite', 'barre_ez', 'kettlebell'])
    );
    expect(values).not.toContain('haltères');
  });
});

describe('coerceEquipmentType', () => {
  const kit = createDefaultInventory();

  it('keeps haltères when available', () => {
    expect(coerceEquipmentType(kit, 'haltères')).toBe('haltères');
  });

  it('falls back when preferred bar kind is missing', () => {
    expect(coerceEquipmentType(kit, 'barre_droite')).toBe('haltères');
  });

  it('keeps hide options', () => {
    expect(coerceEquipmentType(kit, 'bande')).toBe('bande');
    expect(coerceEquipmentType(kit, 'autre')).toBe('autre');
  });
});

describe('equipment type persistence + recalc', () => {
  it('persists override in localStorage and updates exercises', () => {
    localStorage.clear();
    const exercises = [
      {
        name: 'Développé incliné',
        sets: 3,
        reps: 12,
        durationSec: null,
        weight: '2x15kg',
        equipmentType: 'haltères' as const,
      },
      {
        name: 'Rowing',
        sets: 3,
        reps: 10,
        durationSec: null,
        weight: '2x15kg',
        equipmentType: 'haltères' as const,
      },
    ];

    const next = applyEquipmentTypeToExercises(exercises, 'Développé incliné', 'bande');
    expect(next[0].equipmentType).toBe('bande');
    expect(next[1].equipmentType).toBe('haltères');
    expect(loadEquipmentTypeOverrides()['développé incliné']).toBe('bande');
  });

  it('recalculates loadout when type changes; hide types clear suggestion', () => {
    const kit = createDefaultInventory();
    const exact = suggestLoadout(kit, 'haltères', '2x15kg');
    expect(exact?.exact).toBe(true);

    const hidden = suggestLoadout(kit, 'bande', '2x15kg');
    expect(hidden).toBeNull();

    const none = suggestLoadout(kit, 'autre', '2x15kg');
    expect(none).toBeNull();

    const corps = suggestLoadout(kit, 'poids_du_corps', '2x15kg');
    expect(corps).toBeNull();
  });
});
