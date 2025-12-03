import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatCurrencyCompact } from '@/utils/currency';

export function useCurrencyFormatter() {
  const { user } = useAuth();
  const currency = user?.currency || 'USD';

  return useMemo(() => ({
    currency,
    format: (amount: number | string | null | undefined, opts?: Parameters<typeof formatCurrency>[2]) =>
      formatCurrency(amount, currency, opts),
    formatCompact: (amount: number | string | null | undefined, opts?: Parameters<typeof formatCurrencyCompact>[2]) =>
      formatCurrencyCompact(amount, currency, opts),
  }), [currency]);
}
