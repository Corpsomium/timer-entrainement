import { describe, expect, it } from 'vitest';
import type { EquipmentInventory } from '../types/equipment';
import { createDefaultInventory } from './equipmentDefaults';
import { deduceEquipmentType } from './deduceEquipmentType';
import {
  enumerateAchievableTotals,
  formatLoadoutText,
  kgToCenti,
  suggestLoadout,
} from './loadout';
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
  it('parses 20 kg with space', () => {
    expect(parseWeightPrescription('20 kg')).toEqual({ count: 1, kg: 20, raw: '20 kg' });
  });
  it('parses 2x20kg', () => {
    expect(parseWeightPrescription('2x20kg')).toEqual({ count: 2, kg: 20, raw: '2x20kg' });
  });
  it('ignores bande', () => {
    expect(parseWeightPrescription('bande20')).toBeNull();
  });
});

describe('deduceEquipmentType', () => {
  it('does not force barre_droite for a lone 20kg', () => {
    expect(deduceEquipmentType('Extensions mollets', '20kg')).toBe('');
  });
  it('deduces haltères for 2x20kg', () => {
    expect(deduceEquipmentType('Curl', '2x20kg')).toBe('haltères');
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

  it('20kg haltères → 5 + 2,5 + 1,25 per side', () => {
    const s = suggestLoadout(kit, 'haltères', '20kg');
    expect(s?.exact).toBe(true);
    expect(s?.implements[0].left).toEqual([5, 2.5, 1.25]);
    expect(s?.implements[0].right).toEqual([1.25, 2.5, 5]);
    expect(s?.implements[0].totalKg).toBe(20);
  });

  it('2x20kg → same stack, stock OK', () => {
    const s = suggestLoadout(kit, 'haltères', '2x20kg');
    expect(s?.exact).toBe(true);
    expect(s?.implements[0].left).toEqual([5, 2.5, 1.25]);
    expect(s?.implements[0].totalKg).toBe(20);
  });

  it('falls back to haltère when type is barre_droite but only dumbbell handles exist', () => {
    const s = suggestLoadout(kit, 'barre_droite', '20kg');
    expect(s?.exact).toBe(true);
    expect(s?.implements[0].totalKg).toBe(20);
    expect(s?.label).toMatch(/haltère/i);
  });

  it('returns null for bande / bodyweight types', () => {
    expect(suggestLoadout(kit, 'bande', 'bande20')).toBeNull();
    expect(suggestLoadout(kit, 'poids_du_corps', '')).toBeNull();
  });
});

describe('suggestLoadout — stock insuffisant', () => {
  it('fails exact 2x20kg when not enough 5kg plates for both dumbbells', () => {
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
    const s = suggestLoadout(kit, 'haltères', '2x15kg');
    expect(s?.exact).toBe(false);
    expect(s?.message).toMatch(/charge exacte impossible/i);
  });
});

describe('suggestLoadout — charge impossible + nearest', () => {
  it('proposes nearest below/above when exact is impossible', () => {
    const kit = inventory();
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

describe('suggestLoadout — parametric 5→30 step 1,25', () => {
  const kit = inventory();
  const steps: number[] = [];
  for (let c = kgToCenti(5); c <= kgToCenti(30); c += kgToCenti(1.25)) {
    steps.push(c / 100);
  }

  for (const count of [1, 2] as const) {
    const achievable = new Set(
      enumerateAchievableTotals(kit, 'haltère', count, 40).map((t) => kgToCenti(t))
    );

    it.each(steps)(
      `${count === 2 ? '2x' : ''}%s kg — matches exhaustive feasibility`,
      (kg) => {
        const raw = count === 2 ? `2x${String(kg).replace('.', ',')}kg` : `${String(kg).replace('.', ',')}kg`;
        // Also exercise the "X kg" / "2xXkg" latin forms
        const rawAlt = count === 2 ? `2x${kg}kg` : `${kg}kg`;
        const feasible = achievable.has(kgToCenti(kg));
        const s = suggestLoadout(kit, 'haltères', raw);
        const sAlt = suggestLoadout(kit, 'haltères', rawAlt);

        if (feasible) {
          expect(s?.exact, raw).toBe(true);
          expect(s?.implements[0].totalKg).toBe(kg);
          expect(sAlt?.exact, rawAlt).toBe(true);
          expect(sAlt?.implements[0].totalKg).toBe(kg);
        } else {
          expect(s?.exact ?? false, raw).toBe(false);
        }
      }
    );
  }
});
