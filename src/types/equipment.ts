/** Bar / handle kinds that accept plates. */
export type BarKind = 'haltère' | 'barre_droite' | 'barre_ez';

/** How an exercise is loaded — drives loadout suggestions. */
export type ExerciseEquipmentType =
  | 'haltères'
  | 'kettlebell'
  | 'barre_droite'
  | 'barre_ez'
  | 'bande'
  | 'poids_du_corps'
  | 'autre'
  | '';

export interface Bar {
  id: string;
  name: string;
  kind: BarKind;
  /** Handle / bar weight in kg. */
  weightKg: number;
  /** Usable sleeve length per side in cm (optional). */
  sleeveCm?: number | null;
  /** How many identical bars/handles. */
  quantity: number;
}

export interface Plate {
  id: string;
  /** Unit weight in kg. */
  weightKg: number;
  /** Total plates of this weight. */
  quantity: number;
  /** Thickness in cm (optional, for sleeve fit). */
  thicknessCm?: number | null;
}

export interface Kettlebell {
  id: string;
  weightKg: number;
  quantity: number;
}

export interface EquipmentInventory {
  bars: Bar[];
  plates: Plate[];
  kettlebells: Kettlebell[];
}

/** Parsed prescription like "2x15kg" → count 2, kg 15. */
export interface WeightPrescription {
  count: number;
  kg: number;
  raw: string;
}

/** Plates on one side of one implement (outer → inner or inner → outer). */
export type SideLoad = number[];

export interface ImplementLoadout {
  barWeightKg: number;
  /** Plates left of the handle (outer → collar). */
  left: SideLoad;
  /** Plates right of the handle (collar → outer), mirrored. */
  right: SideLoad;
  totalKg: number;
}

export interface LoadoutSuggestion {
  kind: 'plates' | 'kettlebell' | 'none';
  /** Exact match or nearest alternatives. */
  exact: boolean;
  /** Human label e.g. "Par haltère". */
  label: string;
  implements: ImplementLoadout[];
  /** When exact is false. */
  message?: string;
  /** Nearest below / above when exact impossible. */
  below?: LoadoutSuggestion;
  above?: LoadoutSuggestion;
  /** For kettlebell: chosen weight. */
  kettlebellKg?: number;
  /** Requested target per implement. */
  targetKg: number;
  implementCount: number;
}

export const EXERCISE_EQUIPMENT_OPTIONS: { value: ExerciseEquipmentType; label: string }[] = [
  { value: '', label: '—' },
  { value: 'haltères', label: 'Haltères' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'barre_droite', label: 'Barre droite' },
  { value: 'barre_ez', label: 'Barre EZ' },
  { value: 'bande', label: 'Bande' },
  { value: 'poids_du_corps', label: 'Poids du corps' },
  { value: 'autre', label: 'Autre' },
];

export const BAR_KIND_OPTIONS: { value: BarKind; label: string }[] = [
  { value: 'haltère', label: 'Haltère' },
  { value: 'barre_droite', label: 'Barre droite' },
  { value: 'barre_ez', label: 'Barre EZ' },
];
