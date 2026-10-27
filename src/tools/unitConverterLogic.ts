export type UnitKind = "length" | "weight" | "temperature" | "area" | "volume" | "time";

export type UnitOption = { value: string; label: string; symbol: string; factor?: number };

export const unitOptions: Record<UnitKind, UnitOption[]> = {
  length: [
    { value: "mm", label: "Millimeters", symbol: "mm", factor: 0.001 },
    { value: "cm", label: "Centimeters", symbol: "cm", factor: 0.01 },
    { value: "m", label: "Meters", symbol: "m", factor: 1 },
    { value: "km", label: "Kilometers", symbol: "km", factor: 1000 },
    { value: "in", label: "Inches", symbol: "in", factor: 0.0254 },
    { value: "ft", label: "Feet", symbol: "ft", factor: 0.3048 },
    { value: "yd", label: "Yards", symbol: "yd", factor: 0.9144 },
    { value: "mi", label: "Miles", symbol: "mi", factor: 1609.344 },
  ],
  weight: [
    { value: "mg", label: "Milligrams", symbol: "mg", factor: 0.000001 },
    { value: "g", label: "Grams", symbol: "g", factor: 0.001 },
    { value: "kg", label: "Kilograms", symbol: "kg", factor: 1 },
    { value: "t", label: "Metric tonnes", symbol: "t", factor: 1000 },
    { value: "oz", label: "Ounces", symbol: "oz", factor: 0.028349523125 },
    { value: "lb", label: "Pounds", symbol: "lb", factor: 0.45359237 },
    { value: "st", label: "Stones", symbol: "st", factor: 6.35029318 },
  ],
  temperature: [
    { value: "c", label: "Celsius", symbol: "°C" },
    { value: "f", label: "Fahrenheit", symbol: "°F" },
    { value: "k", label: "Kelvin", symbol: "K" },
  ],
  area: [
    { value: "mm2", label: "Square millimeters", symbol: "mm²", factor: 0.000001 },
    { value: "cm2", label: "Square centimeters", symbol: "cm²", factor: 0.0001 },
    { value: "m2", label: "Square meters", symbol: "m²", factor: 1 },
    { value: "ha", label: "Hectares", symbol: "ha", factor: 10000 },
    { value: "km2", label: "Square kilometers", symbol: "km²", factor: 1000000 },
    { value: "ft2", label: "Square feet", symbol: "ft²", factor: 0.09290304 },
    { value: "ac", label: "Acres", symbol: "ac", factor: 4046.8564224 },
  ],
  volume: [
    { value: "ml", label: "Milliliters", symbol: "mL", factor: 0.001 },
    { value: "l", label: "Liters", symbol: "L", factor: 1 },
    { value: "m3", label: "Cubic meters", symbol: "m³", factor: 1000 },
    { value: "tsp", label: "US teaspoons", symbol: "tsp", factor: 0.00492892159375 },
    { value: "tbsp", label: "US tablespoons", symbol: "tbsp", factor: 0.01478676478125 },
    { value: "cup", label: "US cups", symbol: "cup", factor: 0.2365882365 },
    { value: "gal", label: "US gallons", symbol: "gal", factor: 3.785411784 },
  ],
  time: [
    { value: "ms", label: "Milliseconds", symbol: "ms", factor: 0.001 },
    { value: "s", label: "Seconds", symbol: "s", factor: 1 },
    { value: "min", label: "Minutes", symbol: "min", factor: 60 },
    { value: "h", label: "Hours", symbol: "h", factor: 3600 },
    { value: "d", label: "Days", symbol: "days", factor: 86400 },
    { value: "wk", label: "Weeks", symbol: "weeks", factor: 604800 },
  ],
};

export function convertUnitValue(value: number, kind: UnitKind, from: string, to: string): number {
  if (!Number.isFinite(value)) return Number.NaN;
  if (kind === "temperature") {
    const celsius = from === "c" ? value : from === "f" ? (value - 32) * 5 / 9 : value - 273.15;
    return to === "c" ? celsius : to === "f" ? celsius * 9 / 5 + 32 : celsius + 273.15;
  }
  const options = unitOptions[kind];
  const source = options.find((unit) => unit.value === from);
  const target = options.find((unit) => unit.value === to);
  if (!source?.factor || !target?.factor) return Number.NaN;
  return value * source.factor / target.factor;
}
