// Fallback exchange rates relative to USD (used when live rates unavailable)
export const FALLBACK_RATES = {
  USD: 1.00,
  EUR: 0.92,
  GBP: 0.79,
  ILS: 3.62,
  CAD: 1.36,
  AUD: 1.55,
  JPY: 150.2,
  CNY: 7.24,
  INR: 83.1,
  CHF: 0.88,
  SEK: 10.45,
  NOK: 10.62,
  DKK: 6.88,
  NZD: 1.67,
  MXN: 17.15,
  BRL: 4.97,
  KRW: 1325,
  SGD: 1.34,
  HKD: 7.82,
  PLN: 4.02,
  CZK: 22.8,
  TRY: 30.5,
  ZAR: 18.9
};

export const SUPPORTED_CURRENCIES = Object.keys(FALLBACK_RATES);

/**
 * Convert an amount from one currency to another.
 * @param {number} amount
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {Object} [rates] - Rates object keyed by currency code (values relative to USD). Falls back to FALLBACK_RATES.
 * Returns the converted amount rounded to 2 decimal places, or null if unsupported.
 */
export function convertCurrency(amount, fromCurrency, toCurrency, rates) {
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();

  if (from === to) return amount;

  const ratesMap = rates || FALLBACK_RATES;
  const fromRate = ratesMap[from];
  const toRate = ratesMap[to];

  if (fromRate == null || toRate == null) {
    return null; // unsupported currency
  }

  // Convert: amount in "from" → USD → "to"
  const usdAmount = amount / fromRate;
  const converted = usdAmount * toRate;
  return Math.round(converted * 100) / 100;
}
