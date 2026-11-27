import type {
  Bar,
  BarKind,
  EquipmentInventory,
  ExerciseEquipmentType,
  ImplementLoadout,
  LoadoutSuggestion,
  Plate,
  SideLoad,
} from '../types/equipment';
import { parseWeightPrescription } from './parseWeight';

const EPS = 1e-6;

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS;
}

function roundKg(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function plateThickness(p: Plate): number | null {
  return p.thicknessCm == null || Number.isNaN(p.thicknessCm) ? null : p.thicknessCm;
}

/** Stock map weightKg → remaining count (merged identical weights). */
function buildPlateStock(plates: Plate[]): Map<number, { qty: number; thickness: number | null }> {
  const map = new Map<number, { qty: number; thickness: number | null }>();
  for (const p of plates) {
    const w = roundKg(p.weightKg);
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

function cloneStock(
  stock: Map<number, { qty: number; thickness: number | null }>
): Map<number, { qty: number; thickness: number | null }> {
  const next = new Map<number, { qty: number; thickness: number | null }>();
  for (const [k, v] of stock) next.set(k, { ...v });
  return next;
}

/**
 * Greedy: fill one side target with heaviest plates first.
 * Returns side plates (outer→inner order as stacked from collar outward: lightest outer often,
 * but we keep greedy order heaviest-first from collar — display will reverse for outer visual).
 * Convention: array is collar → outer (first = closest to handle).
 */
function greedySide(
  targetPerSide: number,
  stock: Map<number, { qty: number; thickness: number | null }>,
  sleeveCm: number | null | undefined,
  implementCount: number
): SideLoad | null {
  const weights = [...stock.keys()].sort((a, b) => b - a);
  const side: SideLoad = [];
  let remaining = targetPerSide;
  let usedLength = 0;

  for (const w of weights) {
    const entry = stock.get(w)!;
    // Each plate on one side needs `implementCount` copies × 2 sides = 2 * implementCount from stock
    // while building one side we reserve 2 * implementCount per plate added
    while (remaining + EPS >= w) {
      const need = 2 * implementCount;
      if (entry.qty < need) break;
      if (sleeveCm != null && entry.thickness != null) {
        if (usedLength + entry.thickness > sleeveCm + EPS) break;
      } else if (sleeveCm != null && entry.thickness == null) {
        // sleeve known but thickness unknown — allow
      }
      side.push(w);
      remaining = roundKg(remaining - w);
      entry.qty -= need;
      if (entry.thickness != null) usedLength += entry.thickness;
      if (remaining <= EPS) break;
    }
    if (remaining <= EPS) break;
  }

  return remaining <= EPS ? side : null;
}

/**
 * Exhaustive search for one side (mirrored both sides, stock for all implements).
 * Small search space — plate types are few.
 */
function searchSide(
  targetPerSide: number,
  stock: Map<number, { qty: number; thickness: number | null }>,
  sleeveCm: number | null | undefined,
  implementCount: number
): SideLoad | null {
  const weights = [...stock.keys()].sort((a, b) => b - a);
  let best: SideLoad | null = null;

  function dfs(
    idx: number,
    remaining: number,
    usedLength: number,
    current: SideLoad,
    live: Map<number, { qty: number; thickness: number | null }>
  ): boolean {
    if (remaining <= EPS) {
      best = [...current];
      return true;
    }
    if (idx >= weights.length) return false;

    const w = weights[idx];
    const entry = live.get(w)!;
    const maxByStock = Math.floor(entry.qty / (2 * implementCount));
    let maxBySleeve = maxByStock;
    if (sleeveCm != null && entry.thickness != null && entry.thickness > 0) {
      maxBySleeve = Math.min(
        maxByStock,
        Math.floor((sleeveCm - usedLength + EPS) / entry.thickness)
      );
    }
    const maxByWeight = Math.floor((remaining + EPS) / w);
    const max = Math.max(0, Math.min(maxBySleeve, maxByWeight));

    // Try more plates first (greedy bias), then fewer
    for (let n = max; n >= 0; n--) {
      const next = live;
      const qtyCost = n * 2 * implementCount;
      next.get(w)!.qty -= qtyCost;
      for (let i = 0; i < n; i++) current.push(w);
      const lenAdd = entry.thickness != null ? n * entry.thickness : 0;
      if (
        dfs(
          idx + 1,
          roundKg(remaining - n * w),
          usedLength + lenAdd,
          current,
          next
        )
      ) {
        return true;
      }
      for (let i = 0; i < n; i++) current.pop();
      next.get(w)!.qty += qtyCost;
    }
    return false;
  }

  dfs(0, targetPerSide, 0, [], cloneStock(stock));
  return best;
}

function solveSide(
  targetPerSide: number,
  stock: Map<number, { qty: number; thickness: number | null }>,
  sleeveCm: number | null | undefined,
  implementCount: number
): SideLoad | null {
  if (targetPerSide <= EPS) return [];

  const greedyStock = cloneStock(stock);
  const greedy = greedySide(targetPerSide, greedyStock, sleeveCm, implementCount);
  if (greedy) {
    // Commit greedy consumption onto original stock
    for (const w of greedy) {
      const e = stock.get(w)!;
      e.qty -= 2 * implementCount;
    }
    return greedy;
  }

  const found = searchSide(targetPerSide, stock, sleeveCm, implementCount);
  if (!found) return null;
  for (const w of found) {
    const e = stock.get(w)!;
    e.qty -= 2 * implementCount;
  }
  return found;
}

function mirrorSide(side: SideLoad): SideLoad {
  return [...side].reverse();
}

function sideSum(side: SideLoad): number {
  return roundKg(side.reduce((a, b) => a + b, 0));
}

function pickBars(inventory: EquipmentInventory, kind: BarKind, count: number): Bar | null {
  const candidates = inventory.bars.filter((b) => b.kind === kind && b.quantity >= count);
  if (!candidates.length) {
    // allow using one bar type with enough total quantity across entries
    const same = inventory.bars.filter((b) => b.kind === kind);
    const total = same.reduce((n, b) => n + b.quantity, 0);
    if (total < count || !same.length) return null;
    // Prefer lightest handle that has sleeve info
    return [...same].sort((a, b) => a.weightKg - b.weightKg)[0];
  }
  return [...candidates].sort((a, b) => a.weightKg - b.weightKg)[0];
}

function barKindForExercise(type: ExerciseEquipmentType): BarKind | null {
  if (type === 'haltères') return 'haltère';
  if (type === 'barre_droite') return 'barre_droite';
  if (type === 'barre_ez') return 'barre_ez';
  return null;
}

function buildImplement(bar: Bar, side: SideLoad): ImplementLoadout {
  const left = [...side];
  const right = mirrorSide(side);
  const total = roundKg(bar.weightKg + sideSum(left) + sideSum(right));
  return {
    barWeightKg: bar.weightKg,
    left,
    right,
    totalKg: total,
  };
}

function tryPlateLoadout(
  inventory: EquipmentInventory,
  barKind: BarKind,
  implementCount: number,
  targetKg: number
): LoadoutSuggestion | null {
  const bar = pickBars(inventory, barKind, implementCount);
  if (!bar) return null;

  const platesNeeded = roundKg(targetKg - bar.weightKg);
  if (platesNeeded < -EPS) return null; // bar heavier than target
  if (platesNeeded <= EPS) {
    return {
      kind: 'plates',
      exact: true,
      label: labelForBar(barKind),
      implements: Array.from({ length: implementCount }, () => buildImplement(bar, [])),
      targetKg,
      implementCount,
    };
  }

  if (platesNeeded % 2 !== 0 && Math.abs((platesNeeded * 2) % 2) > EPS) {
    // per-side must be half — allow .625 etc.
  }
  const perSide = roundKg(platesNeeded / 2);
  // Must be achievable with plate denominations — check 2*perSide ≈ platesNeeded
  if (!nearlyEqual(perSide * 2, platesNeeded)) {
    // floating; still try
  }

  const stock = buildPlateStock(inventory.plates);
  // Also verify we have enough bars in stock count
  const barQty = inventory.bars
    .filter((b) => b.kind === barKind)
    .reduce((n, b) => n + b.quantity, 0);
  if (barQty < implementCount) return null;

  const side = solveSide(perSide, stock, bar.sleeveCm, implementCount);
  if (!side) return null;

  const impl = buildImplement(bar, side);
  if (!nearlyEqual(impl.totalKg, targetKg)) return null;

  return {
    kind: 'plates',
    exact: true,
    label: labelForBar(barKind),
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

/** All totals achievable with given bar + plate stock for `implementCount` mirrors. */
function enumerateAchievableTotals(
  inventory: EquipmentInventory,
  barKind: BarKind,
  implementCount: number,
  maxTarget: number
): number[] {
  const bar = pickBars(inventory, barKind, implementCount);
  if (!bar) return [];
  const stock = buildPlateStock(inventory.plates);
  const weights = [...stock.keys()].sort((a, b) => b - a);
  const totals = new Set<number>();
  totals.add(roundKg(bar.weightKg));

  function dfs(
    idx: number,
    perSide: number,
    usedLength: number,
    live: Map<number, { qty: number; thickness: number | null }>
  ) {
    const total = roundKg(bar!.weightKg + perSide * 2);
    if (total > maxTarget + 40) return;
    totals.add(total);
    if (idx >= weights.length) return;
    const w = weights[idx];
    const entry = live.get(w)!;
    const maxByStock = Math.floor(entry.qty / (2 * implementCount));
    let max = maxByStock;
    if (bar!.sleeveCm != null && entry.thickness != null && entry.thickness > 0) {
      max = Math.min(max, Math.floor((bar!.sleeveCm - usedLength + EPS) / entry.thickness));
    }
    // Cap plates per side to keep search small
    max = Math.min(max, 8);
    for (let n = 0; n <= max; n++) {
      const qtyCost = n * 2 * implementCount;
      entry.qty -= qtyCost;
      const lenAdd = entry.thickness != null ? n * entry.thickness : 0;
      dfs(idx + 1, roundKg(perSide + n * w), usedLength + lenAdd, live);
      entry.qty += qtyCost;
    }
  }

  dfs(0, 0, 0, cloneStock(stock));
  return [...totals].sort((a, b) => a - b);
}

function nearestAlternatives(
  inventory: EquipmentInventory,
  barKind: BarKind,
  implementCount: number,
  targetKg: number
): { below: LoadoutSuggestion | null; above: LoadoutSuggestion | null } {
  const totals = enumerateAchievableTotals(inventory, barKind, implementCount, targetKg);
  let belowKg: number | null = null;
  let aboveKg: number | null = null;
  for (const t of totals) {
    if (t < targetKg - EPS) belowKg = t;
    else if (t > targetKg + EPS) {
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
  const map = new Map<number, number>();
  for (const k of inventory.kettlebells) {
    const w = roundKg(k.weightKg);
    map.set(w, (map.get(w) || 0) + k.quantity);
  }
  for (const [kg, qty] of map) {
    if (qty >= implementCount) available.push({ kg, qty });
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

  let best = available[0];
  let bestDist = Math.abs(best.kg - targetKg);
  for (const a of available) {
    const d = Math.abs(a.kg - targetKg);
    if (d < bestDist - EPS || (nearlyEqual(d, bestDist) && a.kg < best.kg)) {
      best = a;
      bestDist = d;
    }
  }

  const exact = nearlyEqual(best.kg, targetKg);
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
    !equipmentType ||
    equipmentType === 'bande' ||
    equipmentType === 'poids_du_corps' ||
    equipmentType === 'autre'
  ) {
    return null;
  }

  const rx = parseWeightPrescription(weightRaw);
  if (!rx) return null;

  if (equipmentType === 'kettlebell') {
    return suggestKettlebell(inventory, rx.count, rx.kg);
  }

  const barKind = barKindForExercise(equipmentType);
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
  const r = roundKg(n);
  return String(r).replace('.', ',');
}
