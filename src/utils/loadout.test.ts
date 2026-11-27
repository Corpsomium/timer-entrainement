import { describe, expect, it } from 'vitest';
import type { EquipmentInventory } from '../types/equipment';
import { createDefaultInventory } from './equipmentDefaults';
import { formatLoadoutText, suggestLoadout } from './loadout';
import { parseWeightPrescription } from './parseWeight';

function inventory(overrides?: Partial<EquipmentInventory>): EquipmentInventory {
  const base = createDefaultInventory();
  return {
    bars: overrides?.bars ?? base.bars,
    plates: overrides?.plates ?? base.plates,
    kettlebells: overrides?.kettlebells ?? base.kettlebells,
  };
}

describe('parseWeightPrescription', () => {
  it('parses 2x15kg', () => {
    expect(parseWeightPrescription('2x15kg')).toEqual({ count: 2, kg: 15, raw: '2x15kg' });
  });
  it('parses 7,5kg', () => {
    expect(parseWeightPrescription('7,5kg')).toEqual({ count: 1, kg: 7.5, raw: '7,5kg' });
  });
  it('ignores bande', () => {
    expect(parseWeightPrescription('bande20')).toBeNull();
  });
});

describe('suggestLoadout — default kit', () => {
  const kit = inventory();

  it('2x15kg → manche 2,5 + 5 + 1,25 per side', () => {
    const s = suggestLoadout(kit, 'haltères', '2x15kg');
    expect(s?.exact).toBe(true);
    expect(s?.implements[0].barWeightKg).toBe(2.5);
    expect(s?.implements[0].left).toEqual([5, 1.25]);
    expect(s?.implements[0].right).toEqual([1.25, 5]);
    expect(s?.implements[0].totalKg).toBe(15);
    expect(formatLoadoutText(s!)).toContain('manche 2,5');
    expect(formatLoadoutText(s!)).toContain('[5]');
    expect(formatLoadoutText(s!)).toContain('[1,25]');
  });

  it('7,5kg → manche 2,5 + 2,5 per side', () => {
    const s = suggestLoadout(kit, 'haltères', '7,5kg');
    expect(s?.exact).toBe(true);
    expect(s?.implements[0].left).toEqual([2.5]);
    expect(s?.implements[0].right).toEqual([2.5]);
    expect(s?.implements[0].totalKg).toBe(7.5);
  });

  it('returns null for bande / bodyweight types', () => {
    expect(suggestLoadout(kit, 'bande', 'bande20')).toBeNull();
    expect(suggestLoadout(kit, 'poids_du_corps', '')).toBeNull();
  });
});

describe('suggestLoadout — stock insuffisant', () => {
  it('fails exact 2x20kg when not enough 5kg plates for both dumbbells', () => {
    // 20 = 2.5 + 2×(5+2.5+1.25) → needs 4×5 for two implements; only 2 available
    const kit = inventory({
      plates: [
        { id: 'a', weightKg: 1.25, quantity: 4, thicknessCm: 2 },
        { id: 'b', weightKg: 2.5, quantity: 8, thicknessCm: 2.3 },
        { id: 'c', weightKg: 5, quantity: 2, thicknessCm: 2.8 },
      ],
    });
    const s = suggestLoadout(kit, 'haltères', '2x20kg');
    expect(s?.exact).toBe(false);
    expect(s?.message).toMatch(/charge exacte impossible/i);
  });
});

describe('suggestLoadout — place insuffisante', () => {
  it('rejects load when sleeve is too short for plate stack', () => {
    const kit = inventory({
      bars: [
        {
          id: 'b',
          name: 'Court',
          kind: 'haltère',
          weightKg: 2.5,
          sleeveCm: 3,
          quantity: 2,
        },
      ],
    });
    // 5 (2.8) + 1.25 (2) = 4.8 > 3 cm sleeve
    const s = suggestLoadout(kit, 'haltères', '2x15kg');
    expect(s?.exact).toBe(false);
    expect(s?.message).toMatch(/charge exacte impossible/i);
  });
});

describe('suggestLoadout — charge impossible + nearest', () => {
  it('proposes nearest below/above when exact is impossible', () => {
    const kit = inventory();
    // 16 kg per dumbbell is not makeable with 1.25/2.5/5 + 2.5 bar
    const s = suggestLoadout(kit, 'haltères', '2x16kg');
    expect(s?.exact).toBe(false);
    expect(s?.message).toMatch(/charge exacte impossible/i);
    expect(s?.below?.implements[0].totalKg).toBeLessThan(16);
    expect(s?.above?.implements[0].totalKg).toBeGreaterThan(16);
  });
});

describe('suggestLoadout — kettlebell', () => {
  it('picks closest available kettlebell', () => {
    const kit = inventory({
      kettlebells: [
        { id: '1', weightKg: 12, quantity: 1 },
        { id: '2', weightKg: 16, quantity: 2 },
        { id: '3', weightKg: 20, quantity: 1 },
      ],
    });
    const s = suggestLoadout(kit, 'kettlebell', '15kg');
    expect(s?.kind).toBe('kettlebell');
    expect(s?.kettlebellKg).toBe(16);
    expect(s?.exact).toBe(false);
  });
});
