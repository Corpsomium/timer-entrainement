import type {
  Bar,
  BarKind,
  EquipmentInventory,
  ExerciseEquipmentType,
  ImplementLoadout,
  LoadoutSuggestion,
  Plate,
} from '../types/equipment';
import { parseWeightPrescription } from './parseWeight';

/** Work in integer centièmes de kg (1 = 0,01 kg) to avoid float drift. */
export type Centi = number;

export function kgToCenti(kg: number): Centi {
  return Math.round(kg * 100);
}

export function centiToKg(c: Centi): number {
  return c / 100;
}

/** Thickness in integer dixièmes de mm (1 = 0,01 cm) — same scale as cm*100. */
export type Thick = number;

export function cmToThick(cm: number): Thick {
  return Math.round(cm * 100);
}

type StockEntry = { qty: number; thickness: Thick | null };
type Stock = Map<Centi, StockEntry>;

function plateThickness(p: Plate): Thick | null {
  if (p.thicknessCm == null || Number.isNaN(p.thicknessCm)) return null;
  return cmToThick(p.thicknessCm);
}

function buildPlateStock(plates: Plate[]): Stock {
  const map: Stock = new Map();
  for (const p of plates) {
    const w = kgToCenti(p.weightKg);
    const prev = map.get(w);
    if (prev) {
      prev.qty += p.quantity;
      if (prev.thickness == null) prev.thickness = plateThickness(p);
    } else {
      map.set(w, { qty: p.quantity, thickness: plateThickness(p) });
    }
  }
  return map;
}

function cloneStock(stock: Stock): Stock {
  const next: Stock = new Map();
  for (const [k, v] of stock) next.set(k, { ...v });
  return next;
}

/**
 * Greedy: heaviest plates first. Side order = collar → outer.
 * Stock reservation per plate: 2 sides × implementCount.
 */
function greedySide(
  targetPerSide: Centi,
  stock: Stock,
  sleeve: Thick | null,
  implementCount: number
): Centi[] | null {
  const weights = [...stock.keys()].sort((a, b) => b - a);
  const side: Centi[] = [];
  let remaining = targetPerSide;
  let usedLength = 0;

  for (const w of weights) {
    const entry = stock.get(w)!;
    while (remaining >= w) {
      const need = 2 * implementCount;
      if (entry.qty < need) break;
      if (sleeve != null && entry.thickness != null) {
        if (usedLength + entry.thickness > sleeve) break;
      }
      side.push(w);
      remaining -= w;
      entry.qty -= need;
      if (entry.thickness != null) usedLength += entry.thickness;
      if (remaining === 0) break;
    }
    if (remaining === 0) break;
  }

  return remaining === 0 ? side : null;
}

/** Exhaustive search when greedy fails (small plate-type space). */
function searchSide(
  targetPerSide: Centi,
  stock: Stock,
  sleeve: Thick | null,
  implementCount: number
): Centi[] | null {
  const weights = [...stock.keys()].sort((a, b) => b - a);
  let best: Centi[] | null = null;

  function dfs(
    idx: number,
    remaining: Centi,
    usedLength: Thick,
    current: Centi[],
    live: Stock
  ): boolean {
    if (remaining === 0) {
      best = [...current];
      return true;
    }
    if (idx >= weights.length) return false;

    const w = weights[idx];
    const entry = live.get(w)!;
    const maxByStock = Math.floor(entry.qty / (2 * implementCount));
    let maxBySleeve = maxByStock;
    if (sleeve != null && entry.thickness != null && entry.thickness > 0) {
      maxBySleeve = Math.min(maxByStock, Math.floor((sleeve - usedLength) / entry.thickness));
    }
    const maxByWeight = Math.floor(remaining / w);
    const max = Math.max(0, Math.min(maxBySleeve, maxByWeight));

    for (let n = max; n >= 0; n--) {
      const qtyCost = n * 2 * implementCount;
      entry.qty -= qtyCost;
      for (let i = 0; i < n; i++) current.push(w);
      const lenAdd = entry.thickness != null ? n * entry.thickness : 0;
      if (dfs(idx + 1, remaining - n * w, usedLength + lenAdd, current, live)) {
        return true;
      }
      for (let i = 0; i < n; i++) current.pop();
      entry.qty += qtyCost;
    }
    return false;
  }

  dfs(0, targetPerSide, 0, [], cloneStock(stock));
  return best;
}

function solveSide(
  targetPerSide: Centi,
  stock: Stock,
  sleeve: Thick | null,
  implementCount: number
): Centi[] | null {
  if (targetPerSide === 0) return [];

  const greedyStock = cloneStock(stock);
  const greedy = greedySide(targetPerSide, greedyStock, sleeve, implementCount);
  if (greedy) {
    for (const w of greedy) {
      stock.get(w)!.qty -= 2 * implementCount;
    }
    return greedy;
  }

  const found = searchSide(targetPerSide, stock, sleeve, implementCount);
  if (!found) return null;
  for (const w of found) {
    stock.get(w)!.qty -= 2 * implementCount;
  }
  return found;
}

function mirrorSide(side: Centi[]): Centi[] {
  return [...side].reverse();
}

function sideSum(side: Centi[]): Centi {
  return side.reduce((a, b) => a + b, 0);
}

function pickBars(inventory: EquipmentInventory, kind: BarKind, count: number): Bar | null {
  const candidates = inventory.bars.filter((b) => b.kind === kind && b.quantity >= count);
  if (candidates.length) {
    return [...candidates].sort((a, b) => a.weightKg - b.weightKg)[0];
  }
  const same = inventory.bars.filter((b) => b.kind === kind);
  const total = same.reduce((n, b) => n + b.quantity, 0);
  if (total < count || !same.length) return null;
  return [...same].sort((a, b) => a.weightKg - b.weightKg)[0];
}

function barQty(inventory: EquipmentInventory, kind: BarKind): number {
  return inventory.bars.filter((b) => b.kind === kind).reduce((n, b) => n + b.quantity, 0);
}

/**
 * Resolve which bar kind to use. If the requested kind has no stock,
 * fall back to another available plate-loading bar (haltère preferred).
 */
function resolveBarKind(
  inventory: EquipmentInventory,
  preferred: BarKind,
  implementCount: number
): BarKind | null {
  if (barQty(inventory, preferred) >= implementCount) return preferred;
  const order: BarKind[] = ['haltère', 'barre_droite', 'barre_ez'];
  for (const k of order) {
    if (k !== preferred && barQty(inventory, k) >= implementCount) return k;
  }
  // Allow split quantity across entries of same kind already handled in pickBars;
  // if preferred has any bars totaling enough via pickBars path:
  if (pickBars(inventory, preferred, implementCount)) return preferred;
  for (const k of order) {
    if (pickBars(inventory, k, implementCount)) return k;
  }
  return null;
}

function barKindForExercise(type: ExerciseEquipmentType): BarKind | null {
  if (type === 'haltères') return 'haltère';
  if (type === 'barre_droite') return 'barre_droite';
  if (type === 'barre_ez') return 'barre_ez';
  return null;
}

function buildImplement(bar: Bar, sideCenti: Centi[]): ImplementLoadout {
  const left = sideCenti.map(centiToKg);
  const right = mirrorSide(sideCenti).map(centiToKg);
  const barC = kgToCenti(bar.weightKg);
  const total = centiToKg(barC + sideSum(sideCenti) * 2);
  return {
    barWeightKg: bar.weightKg,
    left,
    right,
    totalKg: total,
  };
}

function sleeveOf(bar: Bar): Thick | null {
  if (bar.sleeveCm == null || Number.isNaN(bar.sleeveCm)) return null;
  return cmToThick(bar.sleeveCm);
}

function tryPlateLoadout(
  inventory: EquipmentInventory,
  barKind: BarKind,
  implementCount: number,
  targetKg: number
): LoadoutSuggestion | null {
  const resolved = resolveBarKind(inventory, barKind, implementCount);
  if (!resolved) return null;
  const bar = pickBars(inventory, resolved, implementCount);
  if (!bar) return null;

  const targetC = kgToCenti(targetKg);
  const barC = kgToCenti(bar.weightKg);
  const platesNeeded = targetC - barC;
  if (platesNeeded < 0) return null;
  if (platesNeeded === 0) {
    return {
      kind: 'plates',
      exact: true,
      label: labelForBar(resolved),
      implements: Array.from({ length: implementCount }, () => buildImplement(bar, [])),
      targetKg,
      implementCount,
    };
  }

  // Per side must be exact half (mirrored plates)
  if (platesNeeded % 2 !== 0) return null;
  const perSide = platesNeeded / 2;

  const stock = buildPlateStock(inventory.plates);
  const side = solveSide(perSide, stock, sleeveOf(bar), implementCount);
  if (!side) return null;

  const impl = buildImplement(bar, side);
  if (kgToCenti(impl.totalKg) !== targetC) return null;

  return {
    kind: 'plates',
    exact: true,
    label: labelForBar(resolved),
    implements: Array.from({ length: implementCount }, () => ({
      ...impl,
      left: [...impl.left],
      right: [...impl.right],
    })),
    targetKg,
    implementCount,
  };
}

function labelForBar(kind: BarKind): string {
  if (kind === 'haltère') return 'Par haltère';
  if (kind === 'barre_ez') return 'Barre EZ';
  return 'Barre';
}

/**
 * All totals achievable with bar + plate stock for `implementCount` mirrored implements.
 * Exported for parametric tests.
 */
export function enumerateAchievableTotals(
  inventory: EquipmentInventory,
  barKind: BarKind,
  implementCount: number,
  maxTargetKg = 80
): number[] {
  const resolved = resolveBarKind(inventory, barKind, implementCount);
  if (!resolved) return [];
  const bar = pickBars(inventory, resolved, implementCount);
  if (!bar) return [];

  const stock = buildPlateStock(inventory.plates);
  const weights = [...stock.keys()].sort((a, b) => b - a);
  const sleeve = sleeveOf(bar);
  const barC = kgToCenti(bar.weightKg);
  const maxTargetC = kgToCenti(maxTargetKg);
  const totals = new Set<Centi>();
  totals.add(barC);

  function dfs(idx: number, perSide: Centi, usedLength: Thick, live: Stock) {
    const total = barC + perSide * 2;
    if (total > maxTargetC + kgToCenti(40)) return;
    totals.add(total);
    if (idx >= weights.length) return;
    const w = weights[idx];
    const entry = live.get(w)!;
    let max = Math.floor(entry.qty / (2 * implementCount));
    if (sleeve != null && entry.thickness != null && entry.thickness > 0) {
      max = Math.min(max, Math.floor((sleeve - usedLength) / entry.thickness));
    }
    max = Math.min(max, 10);
    for (let n = 0; n <= max; n++) {
      const qtyCost = n * 2 * implementCount;
      entry.qty -= qtyCost;
      const lenAdd = entry.thickness != null ? n * entry.thickness : 0;
      dfs(idx + 1, perSide + n * w, usedLength + lenAdd, live);
      entry.qty += qtyCost;
    }
  }

  dfs(0, 0, 0, cloneStock(stock));
  return [...totals].map(centiToKg).sort((a, b) => a - b);
}

function nearestAlternatives(
  inventory: EquipmentInventory,
  barKind: BarKind,
  implementCount: number,
  targetKg: number
): { below: LoadoutSuggestion | null; above: LoadoutSuggestion | null } {
  const totals = enumerateAchievableTotals(inventory, barKind, implementCount, targetKg);
  const targetC = kgToCenti(targetKg);
  let belowKg: number | null = null;
  let aboveKg: number | null = null;
  for (const t of totals) {
    const c = kgToCenti(t);
    if (c < targetC) belowKg = t;
    else if (c > targetC) {
      aboveKg = t;
      break;
    }
  }
  return {
    below: belowKg != null ? tryPlateLoadout(inventory, barKind, implementCount, belowKg) : null,
    above: aboveKg != null ? tryPlateLoadout(inventory, barKind, implementCount, aboveKg) : null,
  };
}

function suggestKettlebell(
  inventory: EquipmentInventory,
  implementCount: number,
  targetKg: number
): LoadoutSuggestion {
  const available: { kg: number; qty: number }[] = [];
  const map = new Map<Centi, number>();
  for (const k of inventory.kettlebells) {
    const w = kgToCenti(k.weightKg);
    map.set(w, (map.get(w) || 0) + k.quantity);
  }
  for (const [c, qty] of map) {
    if (qty >= implementCount) available.push({ kg: centiToKg(c), qty });
  }
  available.sort((a, b) => a.kg - b.kg);

  if (!available.length) {
    return {
      kind: 'none',
      exact: false,
      label: 'Kettlebell',
      implements: [],
      message: 'Aucune kettlebell disponible',
      targetKg,
      implementCount,
    };
  }

  const targetC = kgToCenti(targetKg);
  let best = available[0];
  let bestDist = Math.abs(kgToCenti(best.kg) - targetC);
  for (const a of available) {
    const d = Math.abs(kgToCenti(a.kg) - targetC);
    if (d < bestDist || (d === bestDist && a.kg < best.kg)) {
      best = a;
      bestDist = d;
    }
  }

  const exact = kgToCenti(best.kg) === targetC;
  return {
    kind: 'kettlebell',
    exact,
    label: implementCount > 1 ? 'Par kettlebell' : 'Kettlebell',
    implements: [],
    kettlebellKg: best.kg,
    message: exact ? undefined : 'charge exacte impossible',
    targetKg,
    implementCount,
  };
}

/**
 * Suggest how to load the prescribed weight given inventory + equipment type.
 */
export function suggestLoadout(
  inventory: EquipmentInventory,
  equipmentType: ExerciseEquipmentType,
  weightRaw: string
): LoadoutSuggestion | null {
  if (
    equipmentType === 'bande' ||
    equipmentType === 'poids_du_corps' ||
    equipmentType === 'autre'
  ) {
    return null;
  }

  const rx = parseWeightPrescription(weightRaw);
  if (!rx) return null;

  // Empty / ambiguous type: prefer haltères when handles exist (common for "20kg").
  const effectiveType: ExerciseEquipmentType =
    equipmentType ||
    (barQty(inventory, 'haltère') >= rx.count
      ? 'haltères'
      : barQty(inventory, 'barre_droite') >= rx.count
        ? 'barre_droite'
        : barQty(inventory, 'barre_ez') >= rx.count
          ? 'barre_ez'
          : '');

  if (!effectiveType) return null;

  if (effectiveType === 'kettlebell') {
    return suggestKettlebell(inventory, rx.count, rx.kg);
  }

  const barKind = barKindForExercise(effectiveType);
  if (!barKind) return null;

  const exact = tryPlateLoadout(inventory, barKind, rx.count, rx.kg);
  if (exact) return exact;

  const { below, above } = nearestAlternatives(inventory, barKind, rx.count, rx.kg);
  if (!below && !above) {
    return {
      kind: 'none',
      exact: false,
      label: labelForBar(barKind),
      implements: [],
      message: 'charge exacte impossible',
      targetKg: rx.kg,
      implementCount: rx.count,
    };
  }

  return {
    kind: 'plates',
    exact: false,
    label: labelForBar(barKind),
    implements: [],
    message: 'charge exacte impossible',
    below: below || undefined,
    above: above || undefined,
    targetKg: rx.kg,
    implementCount: rx.count,
  };
}

/** Compact text helper for tests / a11y. */
export function formatLoadoutText(suggestion: LoadoutSuggestion): string {
  if (suggestion.kind === 'kettlebell') {
    const kb = suggestion.kettlebellKg;
    return `${suggestion.label} : ${formatKg(kb ?? 0)}`;
  }
  if (suggestion.kind === 'none' || !suggestion.implements.length) {
    return suggestion.message || 'Impossible';
  }
  const impl = suggestion.implements[0];
  const left = impl.left.map((w) => `[${formatKg(w)}]`).join('');
  const right = impl.right.map((w) => `[${formatKg(w)}]`).join('');
  const plates =
    impl.left.length || impl.right.length
      ? `manche ${formatKg(impl.barWeightKg)} + ${left || '∅'} | ${right || '∅'}`
      : `manche ${formatKg(impl.barWeightKg)}`;
  return `${suggestion.label} : ${plates}`;
}

export function formatKg(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  const c = kgToCenti(n);
  const kg = centiToKg(c);
  return String(kg).replace('.', ',');
}
