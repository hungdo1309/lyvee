const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  const code = currency.toUpperCase();
  const cached = currencyFormatters.get(code);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  currencyFormatters.set(code, formatter);
  return formatter;
}

export function formatExpenseMoney(amountCents: number, currency: string = 'USD'): string {
  return getCurrencyFormatter(currency).format(amountCents / 100);
}

/** Format cents as a plain decimal string for expense input fields. */
export function formatExpenseAmountInput(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

/** Parse a user-entered decimal amount into cents. Returns null when invalid. */
export function parseExpenseAmountToCents(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, '');
  if (!normalized) return null;

  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(normalized);
  if (!match) return null;

  const dollars = Number(match[1]);
  const fraction = (match[2] ?? '').padEnd(2, '0').slice(0, 2);
  const cents = Number(fraction);

  if (!Number.isFinite(dollars) || !Number.isFinite(cents)) return null;
  if (dollars > 999_999_999) return null;

  return dollars * 100 + cents;
}

/** Normalize a typed decimal amount to two fractional digits for display. */
export function normalizeExpenseAmountInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const amountCents = parseExpenseAmountToCents(trimmed);
  if (amountCents == null) return trimmed;

  return formatExpenseAmountInput(amountCents);
}

export function getSettlementAmountError(
  amountCents: number | null,
  maxAmountCents: number
): string | null {
  if (amountCents == null) return 'Enter an amount';
  if (amountCents <= 0) return 'Amount must be greater than zero';
  if (amountCents > maxAmountCents) return 'Amount exceeds remaining balance';
  return null;
}
