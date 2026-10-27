export type CurrencyOption = { code: string; name: string; symbol: string };

export const currencyOptions: CurrencyOption[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "CN¥" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Złoty", symbol: "zł" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
];

export type CurrencyRate = { date: string; base: string; quote: string; rate: number };

export function parseCurrencyRate(data: unknown, expectedBase: string, expectedQuote: string): CurrencyRate {
  if (!data || typeof data !== "object") throw new Error("The exchange-rate service returned an invalid response.");
  const row = data as Record<string, unknown>;
  const date = typeof row.date === "string" ? row.date : "";
  const base = typeof row.base === "string" ? row.base.toUpperCase() : "";
  const quote = typeof row.quote === "string" ? row.quote.toUpperCase() : "";
  const rate = row.rate;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date) || !Number.isFinite(Date.parse(date))) {
    throw new Error("The exchange-rate service did not provide a valid rate date.");
  }
  if (base !== expectedBase.toUpperCase() || quote !== expectedQuote.toUpperCase()) {
    throw new Error("The exchange-rate service returned a different currency pair.");
  }
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("The exchange-rate service returned an invalid rate.");
  }
  return { date, base, quote, rate };
}
