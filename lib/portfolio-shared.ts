// Presentation rules for the portfolio's headline numbers. Pure, so the
// rounding is tested rather than trusted.

export interface Capacity {
  value: number;
  unit: "kWp" | "MWp";
}

/**
 * A capacity figure in the unit a person would actually say out loud.
 *
 * An EPC says "we have installed eleven megawatts", not "eleven thousand and
 * forty kilowatt peak". Below a megawatt the kW figure is the natural one and
 * switching early would throw away precision that still matters on a single
 * roof, so the crossover is exactly 1000 kWp.
 *
 * MWp carries one decimal: two would be false precision on a number this large,
 * and none would make a 1.4 MW year look identical to a 1.9 MW one.
 */
export function formatCapacity(kwp: number): Capacity {
  if (kwp >= 1000) {
    return { value: Math.round((kwp / 1000) * 10) / 10, unit: "MWp" };
  }
  return { value: Math.round(kwp), unit: "kWp" };
}
