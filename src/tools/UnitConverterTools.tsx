import { useMemo, useState } from "react";
import { ArrowDownUp, RotateCcw } from "lucide-react";
import { ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass, toolInputClass } from "./ToolPageFrame";
import { convertUnitValue, unitOptions, type UnitKind } from "./unitConverterLogic";

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
