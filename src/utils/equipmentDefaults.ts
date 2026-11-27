import type { EquipmentInventory } from '../types/equipment';

/** SD's default kit — no kettlebells / straight / EZ bars. */
export function createDefaultInventory(): EquipmentInventory {
  return {
    bars: [
      {
        id: 'bar-halt-default',
        name: 'Manche haltère',
        kind: 'haltère',
        weightKg: 2.5,
        sleeveCm: 8.3,
        quantity: 2,
      },
    ],
    plates: [
      { id: 'plate-1.25', weightKg: 1.25, quantity: 4, thicknessCm: 2 },
      { id: 'plate-2.5', weightKg: 2.5, quantity: 8, thicknessCm: 2.3 },
      { id: 'plate-5', weightKg: 5, quantity: 6, thicknessCm: 2.8 },
    ],
    kettlebells: [],
  };
}
