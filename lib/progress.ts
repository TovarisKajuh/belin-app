// Weighted, computed, never estimated: the founding progress principle.
// Percent complete = sum(weight_i * completion_i) / sum(weight_i) * 100,
// where completion_i = min(1, installed / target). Items with zero target
// are excluded (they cannot express completion). Result rounded to 0.1.

export interface ScopeProgressInput {
  targetQty: number;
  weight: number;
  installedQty: number;
}

export function projectProgress(items: ScopeProgressInput[]): number {
  const usable = items.filter((i) => i.targetQty > 0 && i.weight > 0);
  const totalWeight = usable.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = usable.reduce(
    (sum, i) => sum + i.weight * Math.min(1, i.installedQty / i.targetQty),
    0
  );
  return Math.round((weighted / totalWeight) * 1000) / 10;
}
