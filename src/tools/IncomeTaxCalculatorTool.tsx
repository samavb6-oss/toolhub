import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  ToolField, ToolPanel, secondaryButtonClass, toolInputClass,
} from "./ToolPageFrame";
import { calculateIncomeTax } from "./incomeTaxCalculatorLogic";
import type { AgeBand, IncomeTaxInput, TaxYear } from "./incomeTaxCalculatorLogic";

type FormValues = {
  taxYear: TaxYear;
  ageBand: AgeBand;
  grossSalary: string;
  otherIncome: string;
  section80C: string;
  section80DSelf: string;
  section80DParents: string;
  parentsSenior: boolean;
  nps80CCD1B: string;
};

const defaults: FormValues = {
  taxYear: "ty2026-27",
  ageBand: "under60",
  grossSalary: "1500000",
  otherIncome: "0",
  section80C: "150000",
  section80DSelf: "25000",
  section80DParents: "0",
  parentsSenior: false,
  nps80CCD1B: "50000",
};

const money = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(amount);

function FieldError({ id, error }: { id: string; error?: string }) {
  return error
    ? <p id={id} role="alert" className="mt-1.5 text-xs font-semibold text-[#ff9ea6]">{error}</p>
    : null;
}

function TaxStat({ label, value, testId, detail }: { label: string; value: string; testId: string; detail?: string }) {
  return <div className="min-w-0 rounded-xl border border-[#2d4058] bg-[#162336] p-3">
    <p className="text-xs font-semibold text-[#91a3b9]">{label}</p>
    <p data-testid={testId} className="mt-1.5 break-words text-lg font-extrabold text-white">{value}</p>
    {detail && <p className="mt-1 text-[11px] leading-4 text-[#8193a9]">{detail}</p>}
  </div>;
}

function RegimeResult({ result, title, taxYear }: { result: ReturnType<typeof calculateIncomeTax>["newRegime"]; title: string; taxYear: TaxYear }) {
  return <section className="min-w-0 rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-4 sm:p-5" aria-label={title}>
    <h3 className="text-sm font-extrabold text-white">{title}</h3>
    <p className="mt-2 text-xs text-[#91a3b9]">Estimated annual tax payable</p>
    <p data-testid={`result-tax-${result.regime}-total`} className="mt-1 break-words text-3xl font-extrabold tracking-[-0.05em] text-white">{money(result.totalTax)}</p>
    <p className="mt-1 text-xs text-[#91a3b9]">{money(result.monthlyTax)} per month, if spread evenly across 12 months</p>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <TaxStat label="Taxable income" value={money(result.taxableIncome)} testId={`result-tax-${result.regime}-taxable`} />
      <TaxStat label="Effective rate" value={`${result.effectiveRate.toFixed(2)}%`} testId={`result-tax-${result.regime}-effective`} />
      <TaxStat label="Standard deduction" value={money(result.standardDeduction)} testId={`result-tax-${result.regime}-standard`} />
      <TaxStat label="Other deductions" value={money(result.totalDeductions - result.standardDeduction)} testId={`result-tax-${result.regime}-deductions`} />
    </div>
    <details className="mt-4 rounded-xl border border-[#2b405a] bg-[#101b2a] p-3">
      <summary className="cursor-pointer text-xs font-bold text-[#d6e3f4]">View tax breakdown</summary>
      <dl className="mt-3 space-y-2 text-xs">
        {[
          ["Tax before rebate / relief", result.taxBeforeRebate],
          [taxYear === "ty2026-27" ? "Rebate / marginal relief (Income-tax Act, 2025)" : "Section 87A rebate / marginal relief", result.rebate],
          ["Tax after rebate / relief", result.taxAfterRebate],
          ["Surcharge (after marginal relief)", result.surcharge],
          ["Health & education cess (4%)", result.cess],
          ["Rounded estimated tax", result.totalTax],
        ].map(([label, value]) => <div key={String(label)} className="flex items-start justify-between gap-3">
          <dt className="text-[#aab7c9]">{label}</dt><dd className="text-right font-bold text-white">{money(Number(value))}</dd>
        </div>)}
      </dl>
    </details>
  </section>;
}

export function IncomeTaxCalculatorTool() {
  const [values, setValues] = useState<FormValues>(defaults);
  const [attempted, setAttempted] = useState(false);
  const numericFields = ["grossSalary", "otherIncome", "section80C", "section80DSelf", "section80DParents", "nps80CCD1B"] as const;
  const errors = useMemo(() => {
    const next: Partial<Record<(typeof numericFields)[number], string>> = {};
    for (const field of numericFields) {
      const raw = values[field].trim();
      const amount = Number(raw);
      if (!raw || !Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0 || amount > 1_000_000_000) {
        next[field] = "Enter a whole-rupee amount from ₹0 to ₹1,000,000,000.";
      }
    }
    return next;
  }, [values]);
  const input = useMemo<IncomeTaxInput | null>(() => {
    if (Object.keys(errors).length) return null;
    return {
      taxYear: values.taxYear,
      ageBand: values.ageBand,
      grossSalary: Number(values.grossSalary),
      otherIncome: Number(values.otherIncome),
      section80C: Number(values.section80C),
      section80DSelf: Number(values.section80DSelf),
      section80DParents: Number(values.section80DParents),
      parentsSenior: values.parentsSenior,
      nps80CCD1B: Number(values.nps80CCD1B),
    };
  }, [values, errors]);
  const result = useMemo(() => input ? calculateIncomeTax(input) : null, [input]);
  const update = (field: keyof FormValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));
  const isDefault = (Object.keys(defaults) as (keyof FormValues)[]).every((key) => values[key] === defaults[key]);

  const amountField = (field: typeof numericFields[number], id: string, label: string, hint: string, maxNote?: string) => (
    <ToolField label={label} htmlFor={id}>
      <input
        id={id}
        data-testid={`input-tax-${field}`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`${toolInputClass} ${attempted && errors[field] ? "border-[#e5707a]" : ""}`}
        value={values[field]}
        onChange={update(field)}
        aria-invalid={attempted && errors[field] ? true : undefined}
        aria-describedby={attempted && errors[field] ? `${id}-hint ${id}-error` : `${id}-hint`}
      />
      <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-[#8291a3]">{hint}{maxNote ? ` ${maxNote}` : ""}</p>
      {attempted && <FieldError id={`${id}-error`} error={errors[field]} />}
    </ToolField>
  );

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr]">
      <form aria-label="Income tax details" data-testid="form-income-tax" onSubmit={(event) => { event.preventDefault(); setAttempted(true); }} noValidate>
        <h2 className="text-base font-extrabold text-white">Your income details</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Estimate tax under both regimes using the same income details. The results update as you type.</p>
        <div className="mt-5 grid gap-4">
          <ToolField label="Tax year / financial year" htmlFor="tax-year">
            <select id="tax-year" data-testid="select-tax-year" className={toolInputClass} value={values.taxYear} onChange={(event) => setValues((current) => ({ ...current, taxYear: event.target.value as TaxYear }))}>
              <option value="ty2026-27">Tax Year 2026–27 (Income-tax Act, 2025)</option>
              <option value="fy2025-26">FY 2025–26 / AY 2026–27 (Income-tax Act, 1961)</option>
            </select>
            <p className="mt-1.5 text-xs leading-5 text-[#8291a3]">Both selections use the published rates for the selected period; terminology changed from FY/AY to Tax Year from 1 April 2026.</p>
          </ToolField>
          <ToolField label="Your age during the tax year" htmlFor="tax-age">
            <select id="tax-age" data-testid="select-tax-age" className={toolInputClass} value={values.ageBand} onChange={(event) => setValues((current) => ({ ...current, ageBand: event.target.value as AgeBand }))}>
              <option value="under60">Under 60 years</option>
              <option value="60to79">60–79 years</option>
              <option value="80plus">80 years or older</option>
            </select>
            <p className="mt-1.5 text-xs leading-5 text-[#8291a3]">Age changes the basic exemption limit under the old regime. The new-regime slabs are age-neutral.</p>
          </ToolField>
          {amountField("grossSalary", "tax-gross-salary", "Gross annual salary (₹)", "Enter your annual salary before the standard deduction.")}
          {amountField("otherIncome", "tax-other-income", "Other ordinary taxable income (₹)", "For example, bank interest. Exclude capital gains and income taxed at special rates.")}
          <div className="rounded-xl border border-[#2b405a] bg-[#101b2a] p-4">
            <h3 className="text-sm font-extrabold text-white">Old-regime deductions</h3>
            <p className="mt-1 text-xs leading-5 text-[#91a3b9]">These are ignored under the new regime. Enter only deductions you are eligible to claim.</p>
            <div className="mt-4 grid gap-4">
              {amountField("section80C", "tax-80c", values.taxYear === "ty2026-27" ? "Eligible savings deductions (section 123 / Schedule XV) (₹)" : "Section 80C / 80CCC / 80CCD(1) (₹)", "Combined eligible amount; capped at ₹1,50,000.")}
              {amountField("section80DSelf", "tax-80d-self", values.taxYear === "ty2026-27" ? "Health insurance — self/family (section 126) (₹)" : "Health insurance — self/family (80D) (₹)", "Capped at ₹25,000, or ₹50,000 if you are a senior citizen.")}
              {amountField("section80DParents", "tax-80d-parents", values.taxYear === "ty2026-27" ? "Health insurance — parents (section 126) (₹)" : "Health insurance — parents (80D) (₹)", "Capped at ₹25,000 or ₹50,000 for senior-citizen parents.")}
              <label className="flex items-start gap-3 text-xs leading-5 text-[#cbd5e1]">
                <input type="checkbox" data-testid="checkbox-tax-parents-senior" className="mt-0.5 h-4 w-4 accent-[#6da1ff]" checked={values.parentsSenior} onChange={(event) => setValues((current) => ({ ...current, parentsSenior: event.target.checked }))} />
                At least one parent covered by this health deduction is a senior citizen (60+).
              </label>
              {amountField("nps80CCD1B", "tax-nps", values.taxYear === "ty2026-27" ? "Additional NPS contribution (section 124) (₹)" : "Additional NPS contribution (80CCD(1B)) (₹)", "Capped at ₹50,000, separate from the savings-deduction limit.")}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className={secondaryButtonClass}>Validate inputs</button>
          <button type="button" data-testid="button-tax-reset" disabled={isDefault} onClick={() => { setValues(defaults); setAttempted(false); }} className={secondaryButtonClass}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />Reset example
          </button>
        </div>
      </form>

      <div className="min-w-0 space-y-4" aria-live="polite">
        {result ? <>
          <div className="rounded-xl border border-[#2f6a50] bg-[#14301f]/70 p-4 text-xs leading-5 text-[#c7f1d8]">
            <p className="font-extrabold text-white">Regime comparison</p>
            {result.lowerTaxRegime === "same"
              ? "Both regimes produce the same estimated tax for these inputs."
              : `The ${result.lowerTaxRegime === "new" ? "new" : "old"} regime has the lower estimated tax by ${money(Math.abs(result.oldRegime.totalTax - result.newRegime.totalTax))}.`}
            <p className="mt-1 text-[#a7cbb6]">This is a comparison estimate, not a recommendation to choose a regime without checking your full tax situation.</p>
          </div>
          <RegimeResult result={result.newRegime} title="New tax regime" taxYear={values.taxYear} />
          <RegimeResult result={result.oldRegime} title="Old tax regime" taxYear={values.taxYear} />
        </> : <div role="alert" data-testid="status-tax-validation" className="rounded-xl border border-[#6e4149] bg-[#3b2429] p-4 text-xs font-semibold leading-5 text-[#ffb9be]">
          {attempted ? "Correct the highlighted fields to calculate your estimate." : "Enter valid amounts to see the tax comparison."}
        </div>}
      </div>
    </div>
    <div className="mt-7 rounded-xl border border-[#344a65] bg-[#162336] p-4 text-xs leading-5 text-[#b9c7d8]">
      <h3 className="font-extrabold text-white">Important limitations</h3>
      <p className="mt-1">For resident salaried individuals with ordinary income only. Does not calculate HRA or other salary exemptions, employer NPS contributions, house-property losses, business/professional income, capital gains, special-rate income, foreign income, non-resident cases or all possible deductions. Surcharge and marginal relief are estimated for ordinary income. Verify your figures with the official Income Tax Department calculator or a qualified tax professional before filing.</p>
    </div>
  </ToolPanel>;
}
