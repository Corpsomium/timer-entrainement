import type { EquipmentInventory, ExerciseEquipmentType } from '../types/equipment';

export type EquipmentTypeOption = {
  value: ExerciseEquipmentType;
  label: string;
  /** Short label for chip UI. */
  shortLabel: string;
  /** Whether this option drives a loadout calculation. */
  calculates: boolean;
};

const HIDE_OPTIONS: EquipmentTypeOption[] = [
  { value: 'poids_du_corps', label: 'Poids du corps', shortLabel: 'Corps', calculates: false },
  { value: 'bande', label: 'Bande', shortLabel: 'Bande', calculates: false },
  { value: 'autre', label: 'Aucun', shortLabel: 'Aucun', calculates: false },
];

/**
 * Equipment types the user can pick during a session:
 * only bar/KB kinds present in inventory, plus hide options.
 */
export function availableEquipmentTypeOptions(
  inventory: EquipmentInventory
): EquipmentTypeOption[] {
  const options: EquipmentTypeOption[] = [];

  const hasHalt = inventory.bars.some((b) => b.kind === 'haltère' && b.quantity > 0);
  const hasDroite = inventory.bars.some((b) => b.kind === 'barre_droite' && b.quantity > 0);
  const hasEz = inventory.bars.some((b) => b.kind === 'barre_ez' && b.quantity > 0);
  const hasKb = inventory.kettlebells.some((k) => k.quantity > 0);

  if (hasHalt) {
    options.push({
      value: 'haltères',
      label: 'Haltères',
      shortLabel: 'Halt.',
      calculates: true,
    });
  }
  if (hasDroite) {
    options.push({
      value: 'barre_droite',
      label: 'Barre droite',
      shortLabel: 'Barre',
      calculates: true,
    });
  }
  if (hasEz) {
    options.push({
      value: 'barre_ez',
      label: 'Barre EZ',
      shortLabel: 'EZ',
      calculates: true,
    });
  }
  if (hasKb) {
    options.push({
      value: 'kettlebell',
      label: 'Kettlebell',
      shortLabel: 'KB',
      calculates: true,
    });
  }

  return [...options, ...HIDE_OPTIONS];
}

/** Clamp a stored/deduced type to something the inventory can offer. */
export function coerceEquipmentType(
  inventory: EquipmentInventory,
  preferred: ExerciseEquipmentType | undefined
): ExerciseEquipmentType {
  const options = availableEquipmentTypeOptions(inventory);
  const values = new Set(options.map((o) => o.value));
  if (preferred && values.has(preferred)) return preferred;
  // Prefer first calculating option (usually haltères)
  const calc = options.find((o) => o.calculates);
  return calc?.value ?? 'autre';
}
