/**
 * Parse human-entered amount strings like "2,104.24", "$5,000", or " 1 234 ".
 * Returns 0 if invalid.
 */
export function parseSafeAmount(input: any): number {
  if (typeof input === 'number') return input;
  if (typeof input !== 'string') return 0;

  // Remove commas, spaces, currency symbols
  const cleaned = input.replace(/[^\d.-]/g, '');
  const value = Number(cleaned);

  if (isNaN(value) || !isFinite(value)) return 0;
  return Math.round(value * 100) / 100; // 2 decimal places
}
