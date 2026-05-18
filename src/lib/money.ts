// Constitution VI: all money is integer paise; conversion happens only at the display boundary

/** Convert rupee amount to integer paise (e.g. 12.50 → 1250) */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Convert integer paise to rupees (e.g. 1250 → 12.5) */
export function toRupees(paise: number): number {
  return paise / 100;
}

/**
 * Format integer paise as an INR display string.
 * Uses en-IN locale for Indian number formatting (e.g. ₹1,23,456.00).
 */
export function formatRupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(toRupees(paise));
}

/** Sum an array of paise values safely (never use reduce with float) */
export function sumPaise(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}