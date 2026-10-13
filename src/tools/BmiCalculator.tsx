import { useId, useState } from "react";
import { ToolField, ToolPanel, toolInputClass } from "./ToolPageFrame";
import {
  BMI_CATEGORIES, evaluateBmi, kgToPounds,
  type BmiInput, type BmiUnitSystem,
} from "./bmiLogic";

const UNITS: ReadonlyArray<{ value: BmiUnitSystem; label: string }> = [
  { value: "metric", label: "Metric (cm, kg)" },
  { value: "imperial", label: "Imperial (ft/in, lb)" },
];

const errorTextClass = "mt-1.5 text-xs font-semibold leading-5 text-[#ffb9be]";

export function BmiCalculator() {
  const uid = useId();
  const [form, setForm] = useState<BmiInput>({ unit: "metric", heightCm: "", heightFt: "", heightIn: "", weight: "" });
  const set = (patch: Partial<BmiInput>) => setForm((current) => ({ ...current, ...patch }));
  const result = evaluateBmi(form);
  const errors = result.ok ? {} : result.errors;
  const imperial = form.unit === "imperial";
  const fieldId = (name: string) => `${uid}-${name}`.replaceAll(":", "");
  const heightErrorId = fieldId("height-error");
  const weightErrorId = fieldId("weight-error");

  function switchUnit(next: BmiUnitSystem) {
    if (next === form.unit) return;
    // Different units mean different numbers, so clear the values instead of silently reinterpreting them.
    setForm({ unit: next, heightCm: "", heightFt: "", heightIn: "", weight: "" });
  }

  const formatWeight = (kg: number) => imperial ? `${kgToPounds(kg).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[1fr_0.92fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">Your measurements</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">For adults aged 18 and over. Nothing you enter leaves this device.</p>

        <fieldset className="mt-5">
          <legend className="text-xs font-bold text-[#cbd5e1]">Units</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {UNITS.map((unit) => <label key={unit.value} className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-4 text-sm font-bold transition focus-within:ring-4 focus-within:ring-[#2d6cdf]/25 ${form.unit === unit.value ? "border-[#3b82f6] bg-[#172a45] text-white" : "border-[#2c3a4c] bg-[#111b29] text-[#aab7c9] hover:border-[#4b6381]"}`}>
              <input type="radio" name={`${uid}-unit`} data-testid={`radio-bmi-${unit.value}`} className="h-4 w-4 accent-[#3b82f6]" value={unit.value} checked={form.unit === unit.value} onChange={() => switchUnit(unit.value)} />
              {unit.label}
            </label>)}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {imperial ? <div className="min-w-0">
            <span id={fieldId("height-label")} className="text-xs font-bold text-[#cbd5e1]">Height</span>
            <div role="group" aria-labelledby={fieldId("height-label")} className="grid grid-cols-2 gap-2">
              <input id={fieldId("ft")} aria-label="Height, feet" aria-invalid={Boolean(errors.height)} aria-describedby={errors.height ? heightErrorId : undefined} data-testid="input-bmi-feet" className={toolInputClass} inputMode="numeric" autoComplete="off" placeholder="ft" value={form.heightFt} onChange={(event) => set({ heightFt: event.target.value })} />
              <input id={fieldId("in")} aria-label="Height, inches" aria-invalid={Boolean(errors.height)} aria-describedby={errors.height ? heightErrorId : undefined} data-testid="input-bmi-inches" className={toolInputClass} inputMode="decimal" autoComplete="off" placeholder="in" value={form.heightIn} onChange={(event) => set({ heightIn: event.target.value })} />
            </div>
            {errors.height && <p id={heightErrorId} data-testid="error-bmi-height" className={errorTextClass}>{errors.height}</p>}
          </div> : <ToolField label="Height (cm)" htmlFor={fieldId("cm")}>
            <input id={fieldId("cm")} aria-invalid={Boolean(errors.height)} aria-describedby={errors.height ? heightErrorId : undefined} data-testid="input-bmi-height" className={toolInputClass} inputMode="decimal" autoComplete="off" placeholder="e.g. 170" value={form.heightCm} onChange={(event) => set({ heightCm: event.target.value })} />
            {errors.height && <p id={heightErrorId} data-testid="error-bmi-height" className={errorTextClass}>{errors.height}</p>}
          </ToolField>}
          <ToolField label={imperial ? "Weight (lb)" : "Weight (kg)"} htmlFor={fieldId("weight")}>
            <input id={fieldId("weight")} aria-invalid={Boolean(errors.weight)} aria-describedby={errors.weight ? weightErrorId : undefined} data-testid="input-bmi-weight" className={toolInputClass} inputMode="decimal" autoComplete="off" placeholder={imperial ? "e.g. 154" : "e.g. 70"} value={form.weight} onChange={(event) => set({ weight: event.target.value })} />
            {errors.weight && <p id={weightErrorId} data-testid="error-bmi-weight" className={errorTextClass}>{errors.weight}</p>}
          </ToolField>
        </div>
      </div>

      <section aria-label="BMI result" className="rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-5 sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]">Your BMI</p>
        <div role="status" aria-live="polite" aria-atomic="true">
          {result.ok ? <>
            <p data-testid="result-bmi-value" className="mt-2 text-5xl font-extrabold tracking-[-0.06em] text-white">{result.bmi.toFixed(1)}</p>
            <p data-testid="result-bmi-category" className="mt-2 text-sm font-bold text-[#cfe0f7]">{result.category.label}</p>
            <p data-testid="result-bmi-healthy-range" className="mt-3 text-xs leading-5 text-[#91a3b9]">A BMI of 18.5 – 24.9 at your height corresponds to about {formatWeight(result.healthyWeightKg.min)} – {formatWeight(result.healthyWeightKg.max)}.</p>
          </> : <>
            <p data-testid="result-bmi-value" className="mt-2 text-5xl font-extrabold tracking-[-0.06em] text-white" aria-label="No result yet">—</p>
            <p className="mt-2 text-xs leading-5 text-[#91a3b9]">{result.empty ? "Enter your height and weight to see your BMI." : "Correct the highlighted values to see your BMI."}</p>
          </>}
        </div>
        <ol aria-label="Adult BMI categories" className="mt-5 grid gap-2">
          {BMI_CATEGORIES.map((category) => {
            const current = result.ok && result.category.id === category.id;
            return <li key={category.id} data-testid={`bmi-category-${category.id}`} aria-current={current ? "true" : undefined} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${current ? "border-[#6da1ff] bg-[#1d3a63] font-extrabold text-white" : "border-[#2d4058] bg-[#162336] font-semibold text-[#91a3b9]"}`}>
              <span>{category.label}{current && <span className="sr-only"> (your result)</span>}</span><span>{category.range}</span>
            </li>;
          })}
        </ol>
      </section>
    </div>
    <div className="mt-6 border-t border-[#26364b] pt-4 text-xs leading-5 text-[#8193a9]">
      <p><strong className="font-bold text-[#cbd5e1]">BMI is a screening measure, not a medical diagnosis.</strong> It does not distinguish muscle from fat or consider age, sex, build, ethnicity or health history, so it can misjudge athletes, older adults and people with high muscle mass.</p>
      <p className="mt-2">The ranges shown are the WHO categories for adults and do not apply to children or teenagers, or during pregnancy. For personal health advice, talk to a doctor or other qualified health professional.</p>
    </div>
  </ToolPanel>;
}
