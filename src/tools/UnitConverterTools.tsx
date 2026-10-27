import { useMemo, useState } from "react";
import { ArrowDownUp, RefreshCw, RotateCcw } from "lucide-react";
import { ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass, toolInputClass } from "./ToolPageFrame";
import { convertUnitValue, unitOptions, type UnitKind } from "./unitConverterLogic";
import { currencyOptions, parseCurrencyRate, type CurrencyRate } from "./currencyConverterLogic";

const configs: Record<UnitKind, { title: string; description: string; from: string; to: string }> = {
  length: { title: "Length Converter", description: "Convert metric and imperial distances, from millimeters to miles.", from: "m", to: "ft" },
  weight: { title: "Weight Converter", description: "Convert common metric and imperial mass units, including kilograms and pounds.", from: "kg", to: "lb" },
  temperature: { title: "Temperature Converter", description: "Convert Celsius, Fahrenheit and Kelvin using their standard formulas.", from: "c", to: "f" },
  area: { title: "Area Converter", description: "Convert square measurements, hectares and acres.", from: "m2", to: "ft2" },
  volume: { title: "Volume Converter", description: "Convert liters, milliliters, US kitchen measures and US gallons.", from: "l", to: "gal" },
  time: { title: "Time Converter", description: "Convert milliseconds, seconds, minutes, hours, days and weeks.", from: "h", to: "min" },
};

function UnitConverter({ kind }: { kind: UnitKind }) {
  const config = configs[kind];
  const options = unitOptions[kind];
  const [input, setInput] = useState("1");
  const [from, setFrom] = useState(config.from);
  const [to, setTo] = useState(config.to);
  const numericValue = input.trim() === "" ? Number.NaN : Number(input);
  const converted = useMemo(() => convertUnitValue(numericValue, kind, from, to), [numericValue, kind, from, to]);
  const result = Number.isFinite(converted)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 10, maximumSignificantDigits: 12 }).format(Object.is(converted, -0) ? 0 : converted)
    : "";
  const fromUnit = options.find((unit) => unit.value === from);
  const toUnit = options.find((unit) => unit.value === to);

  function swapUnits() {
    setFrom(to);
    setTo(from);
  }

  function reset() {
    setInput("1");
    setFrom(config.from);
    setTo(config.to);
  }

  return <ToolPanel>
    <p className="mb-5 text-sm leading-6 text-[#aab7c9]">{config.description} Calculations run locally in your browser.</p>
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
      <ToolField label="Amount" htmlFor={`${kind}-converter-value`}>
        <input id={`${kind}-converter-value`} data-testid={`${kind}-converter-value`} className={toolInputClass} type="number" inputMode="decimal" step="any" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Enter a value" />
      </ToolField>
      <button type="button" aria-label="Swap units" data-testid={`${kind}-converter-swap`} className={secondaryButtonClass} onClick={swapUnits}><ArrowDownUp aria-hidden="true" className="h-4 w-4" />Swap</button>
      <ToolField label="Convert from" htmlFor={`${kind}-converter-from`}>
        <select id={`${kind}-converter-from`} data-testid={`${kind}-converter-from`} className={toolInputClass} value={from} onChange={(event) => setFrom(event.target.value)}>
          {options.map((unit) => <option key={unit.value} value={unit.value}>{unit.label} ({unit.symbol})</option>)}
        </select>
      </ToolField>
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <ToolField label="Convert to" htmlFor={`${kind}-converter-to`}>
        <select id={`${kind}-converter-to`} data-testid={`${kind}-converter-to`} className={toolInputClass} value={to} onChange={(event) => setTo(event.target.value)}>
          {options.map((unit) => <option key={unit.value} value={unit.value}>{unit.label} ({unit.symbol})</option>)}
        </select>
      </ToolField>
      <div className="rounded-xl border border-[#34445a] bg-[#101a28] p-4" aria-live="polite" data-testid={`${kind}-converter-result`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#91a3b9]">Converted result</p>
        <p className="mt-2 break-words text-2xl font-bold text-white">{result || "—"} <span className="text-base font-medium text-[#aab7c9]">{toUnit?.symbol ?? ""}</span></p>
        {Number.isFinite(numericValue) && result && <p className="mt-1 text-xs text-[#91a3b9]">{input} {fromUnit?.symbol} = {result} {toUnit?.symbol}</p>}
        {!Number.isFinite(numericValue) && <p className="mt-1 text-xs text-[#f3b6b6]">Enter a valid number to convert.</p>}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" className={primaryButtonClass} onClick={swapUnits}><ArrowDownUp aria-hidden="true" className="h-4 w-4" />Swap units</button>
      <button type="button" className={secondaryButtonClass} onClick={reset}><RotateCcw aria-hidden="true" className="h-4 w-4" />Reset</button>
    </div>
    <p className="mt-4 text-xs leading-5 text-[#91a3b9]">Results are rounded for display. Volume conversions use US customary kitchen measures; unit definitions can differ by region.</p>
  </ToolPanel>;
}

export function LengthConverterTool() { return <UnitConverter kind="length" />; }
export function WeightConverterTool() { return <UnitConverter kind="weight" />; }
export function TemperatureConverterTool() { return <UnitConverter kind="temperature" />; }
export function AreaConverterTool() { return <UnitConverter kind="area" />; }
export function VolumeConverterTool() { return <UnitConverter kind="volume" />; }
export function TimeConverterTool() { return <UnitConverter kind="time" />; }


export function CurrencyConverterTool() {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const [rate, setRate] = useState<CurrencyRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const numericAmount = amount.trim() === "" ? Number.NaN : Number(amount);
  const result = rate && Number.isFinite(numericAmount) ? numericAmount * rate.rate : Number.NaN;
  const formattedResult = Number.isFinite(result)
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: to, maximumFractionDigits: 4 }).format(result)
    : "";

  function chooseFrom(value: string) { setFrom(value); setRate(null); setStatus(""); }
  function chooseTo(value: string) { setTo(value); setRate(null); setStatus(""); }
  function swapCurrencies() { setFrom(to); setTo(from); setRate(null); setStatus(""); }

  async function loadRate() {
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setRate(null);
      setStatus("Enter a valid amount of zero or more.");
      return;
    }
    if (from === to) {
      setRate({ date: new Date().toISOString().slice(0, 10), base: from, quote: to, rate: 1 });
      setStatus("Same currency selected; no exchange-rate request was needed.");
      return;
    }
    setLoading(true);
    setRate(null);
    setStatus("Fetching the latest available reference rate…");
    try {
      const response = await fetch(`https://api.frankfurter.dev/v2/rate/${from}/${to}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Exchange-rate service returned HTTP ${response.status}.`);
      const parsed = parseCurrencyRate(await response.json(), from, to);
      setRate(parsed);
      setStatus(`Reference rate loaded for ${parsed.date}. Rates are indicative, not a bank quote.`);
    } catch (error) {
      setRate(null);
      setStatus(error instanceof Error && error.name === "TimeoutError"
        ? "The exchange-rate request timed out. Check your connection and try again."
        : error instanceof Error && error.message
          ? `${error.message} Check your connection and try again.`
          : "Could not load a reference rate. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return <ToolPanel>
    <div className="mb-5 rounded-xl border border-[#34445a] bg-[#101a28] p-4">
      <p className="text-sm font-bold text-white">Daily reference rates</p>
      <p className="mt-1 text-xs leading-5 text-[#aab7c9]">Rates are fetched only when you press Get rate, from <a className="underline" href="https://frankfurter.dev/" target="_blank" rel="noreferrer">Frankfurter</a> (no API key). The rate date is shown when available. These are reference rates, not live trading prices or guaranteed bank rates.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
      <ToolField label="Amount" htmlFor="currency-converter-amount">
        <input id="currency-converter-amount" data-testid="currency-converter-amount" className={toolInputClass} type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </ToolField>
      <button type="button" aria-label="Swap currencies" data-testid="currency-converter-swap" className={secondaryButtonClass} onClick={swapCurrencies}><ArrowDownUp aria-hidden="true" className="h-4 w-4" />Swap</button>
      <ToolField label="From currency" htmlFor="currency-converter-from">
        <select id="currency-converter-from" data-testid="currency-converter-from" className={toolInputClass} value={from} onChange={(event) => chooseFrom(event.target.value)}>
          {currencyOptions.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}
        </select>
      </ToolField>
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <ToolField label="To currency" htmlFor="currency-converter-to">
        <select id="currency-converter-to" data-testid="currency-converter-to" className={toolInputClass} value={to} onChange={(event) => chooseTo(event.target.value)}>
          {currencyOptions.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}
        </select>
      </ToolField>
      <div className="rounded-xl border border-[#34445a] bg-[#101a28] p-4" data-testid="currency-converter-result" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#91a3b9]">Converted estimate</p>
        <p className="mt-2 break-words text-2xl font-bold text-white">{formattedResult || "—"}</p>
        {rate && from !== to && <p className="mt-2 text-xs leading-5 text-[#aab7c9]">1 {from} = {new Intl.NumberFormat(undefined, { maximumSignificantDigits: 8 }).format(rate.rate)} {to}</p>}
        {rate && <p className="mt-1 text-xs text-[#91a3b9]">Rate date: {rate.date}</p>}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" data-testid="button-currency-get-rate" className={primaryButtonClass} disabled={loading} onClick={loadRate}><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{loading ? "Loading rate…" : "Get rate"}</button>
      <button type="button" className={secondaryButtonClass} onClick={() => { setAmount("1"); setFrom("USD"); setTo("INR"); setRate(null); setStatus(""); }}>Reset</button>
    </div>
    <p role="status" aria-live="polite" data-testid="status-currency-converter" className="mt-4 min-h-5 text-xs leading-5 text-[#91a3b9]">{status}</p>
  </ToolPanel>;
}
