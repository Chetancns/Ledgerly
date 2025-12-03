export type CurrencyFormatOptions = {
  compact?: boolean;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  locale?: string; // default: browser/Node default
};

function normalizeAmount(input: number | string | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') {
    if (Number.isFinite(input)) return input;
    return 0;
  }
  // string: remove common formatting artifacts
  const cleaned = String(input)
    .replace(/[,\s]/g, '') // commas and spaces
    .replace(/[A-Za-z$€£¥₹₽₩₪₫₴₦₱₺₡₲₵₸₭฿₥₦₳₢₣₤₧₨₩₫]/g, '');
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string,
  opts: CurrencyFormatOptions = {}
): string {
  const value = normalizeAmount(amount);
  const {
    compact = false,
    maximumFractionDigits,
    minimumFractionDigits,
    locale,
  } = opts;

  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
  };
  if (maximumFractionDigits !== undefined) options.maximumFractionDigits = maximumFractionDigits;
  if (minimumFractionDigits !== undefined) options.minimumFractionDigits = minimumFractionDigits;

  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    // Fallback to USD if invalid currency passed
    return new Intl.NumberFormat(locale, { ...options, currency: 'USD' }).format(value);
  }
}

export function formatCurrencyCompact(
  amount: number | string | null | undefined,
  currency: string,
  opts: Omit<CurrencyFormatOptions, 'compact'> = {}
): string {
  return formatCurrency(amount, currency, { ...opts, compact: true });
}
