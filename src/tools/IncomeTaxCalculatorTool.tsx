import { useMemo, useState } from "react";
import { Calculator, CheckCircle2, Info } from "lucide-react";
import { ToolField, ToolPanel, secondaryButtonClass, toolInputClass } from "./ToolPageFrame";
import { calculateIncomeTax, formatTaxInr, INCOME_TAX_YEAR, validateIncomeTaxForm } from "./incomeTaxCalculatorLogic";
import type { IncomeTaxFormValues, TaxAgeGroup, TaxResidency } from "./incomeTaxCalculatorLogic";

const defaults: IncomeTaxFormValues = {
  salary: "1200000",
  otherIncome: "0",
  oldRegimeDeductions: "150000",
  regime: "new",
  ageGroup: "under60",
  residency: "resident",
};
const invalidInputClass = "border-[#e5707a] focus:border-[#e5707a] focus:ring-[#e5707a]/20";

function TaxStat({ label, value, detail, testId, prominent = false }: { label: string; value: string; detail?: string; testId: string; prominent?: boolean }) {
  return <div className={`min-w-0 rounded-xl border p-3.5 ${prominent ? "border-[#355b89] bg-[#172d49]" : "border-[#2d4058] bg-[#162336]"}`}>
    <p className="text-xs font-semibold text-[#91a3b9]">{label}</p>
    <p data-testid={testId} className={`mt-1.5 break-words font-extrabold tracking-tight text-white ${prominent ? "text-2xl sm:text-3xl" : "text-lg"}`}>{value}</p>
    {detail && <p className="mt-1 text-[11px] leading-4 text-[#8193a9]">{detail}</p>}
  </div>;
}

export function IncomeTaxCalculatorTool() {
  const [values, setValues] = useState<IncomeTaxFormValues>(defaults);
  const validation = useMemo(() => validateIncomeTaxForm(values), [values]);
  const results = useMemo(() => validation.ok ? {
    newRegime: calculateIncomeTax({ ...validation.input, regime: "new" }),
    oldRegime: calculateIncomeTax({ ...validation.input, regime: "old" }),
  } : null, [validation]);
  const errors = validation.ok ? {} : validation.errors;
  const update = (field: keyof IncomeTaxFormValues) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };
  const reset = () => setValues(defaults);
  const inputProps = (field: "salary" | "otherIncome" | "oldRegimeDeductions", id: string) => ({
    id, type: "number" as const, inputMode: "decimal" as const, min: "0", max: "1000000000", step: "1000",
    value: values[field], onChange: update(field), "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${id}-error` : `${id}-hint`,
    className: `${toolInputClass} ${errors[field] ? invalidInputClass : ""}`, autoComplete: "off" as const,
  });
  const bestRegime = results ? (results.newRegime.totalTax <= results.oldRegime.totalTax ? "new" : "old") : null;

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">Your annual income</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Enter annual amounts in rupees. The estimate compares the new and old tax regimes for Tax Year {INCOME_TAX_YEAR}.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <ToolField label="Gross annual salary (₹)" htmlFor="income-tax-salary">
            <input {...inputProps("salary", "income-tax-salary")} data-testid="input-income-tax-salary" />
            {errors.salary ? <p id="income-tax-salary-error" role="alert" className="mt-1.5 text-xs font-semibold text-[#ff9ea6]">{errors.salary}</p> : <p id="income-tax-salary-hint" className="mt-1.5 text-xs leading-5 text-[#8291a3]">Before the standard deduction.</p>}
          </ToolField>
          <ToolField label="Other annual taxable income (₹)" htmlFor="income-tax-other">
            <input {...inputProps("otherIncome", "income-tax-other")} data-testid="input-income-tax-other" />
            {errors.otherIncome ? <p id="income-tax-other-error" role="alert" className="mt-1.5 text-xs font-semibold text-[#ff9ea6]">{errors.otherIncome}</p> : <p id="income-tax-other-hint" className="mt-1.5 text-xs leading-5 text-[#8291a3]">For example, bank interest. Excludes income taxed at special rates.</p>}
          </ToolField>
          <ToolField label="Eligible old-regime deductions / exemptions (₹)" htmlFor="income-tax-deductions">
            <input {...inputProps("oldRegimeDeductions", "income-tax-deductions")} data-testid="input-income-tax-deductions" />
            {errors.oldRegimeDeductions ? <p id="income-tax-deductions-error" role="alert" className="mt-1.5 text-xs font-semibold text-[#ff9ea6]">{errors.oldRegimeDeductions}</p> : <p id="income-tax-deductions-hint" className="mt-1.5 text-xs leading-5 text-[#8291a3]">Enter your eligible old-regime deductions together (for example, 80C / 80D). Not applied to the new regime.</p>}
          </ToolField>
          <ToolField label="Age during the tax year" htmlFor="income-tax-age">
            <select id="income-tax-age" data-testid="select-income-tax-age" value={values.ageGroup} onChange={(event) => setValues((current) => ({ ...current, ageGroup: event.target.value as TaxAgeGroup }))} className={toolInputClass}>
              <option value="under60">Under 60</option><option value="60to79">60–79 years</option><option value="80plus">80 years or older</option>
            </select>
            <p className="mt-1.5 text-xs leading-5 text-[#8291a3]">Age changes old-regime slabs only.</p>
          </ToolField>
          <ToolField label="Residential status" htmlFor="income-tax-residency">
            <select id="income-tax-residency" data-testid="select-income-tax-residency" value={values.residency} onChange={(event) => setValues((current) => ({ ...current, residency: event.target.value as TaxResidency }))} className={toolInputClass}>
              <option value="resident">Resident individual</option><option value="nonresident">Non-resident individual</option>
            </select>
            <p className="mt-1.5 text-xs leading-5 text-[#8291a3]">Section 156 rebate under the Income-tax Act, 2025 is available only to resident individuals.</p>
          </ToolField>
        </div>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={reset} className={secondaryButtonClass}>Reset example</button></div>
        <div className="mt-5 rounded-xl border border-[#344a65] bg-[#162336] p-4 text-xs leading-5 text-[#b9c7d8]">
          <p className="flex items-center gap-2 font-bold text-white"><Info aria-hidden="true" className="h-4 w-4 text-[#8fb6ec]" />Scope and assumptions</p>
          <p className="mt-1">This is an estimate for an individual with ordinary income under Tax Year {INCOME_TAX_YEAR}. It includes standard deduction, slab tax, Section 156 rebate/marginal relief under the Income-tax Act, 2025, surcharge and 4% health and education cess. It does not calculate capital gains or other special-rate income, business/professional income adjustments, HRA calculations, or every personal deduction. Confirm your circumstances with the official tax portal or a tax professional.</p>
          <p className="mt-2">Official references: <a className="font-bold text-[#9fc4ff] underline underline-offset-2 hover:text-white" href="https://www.incometaxindia.gov.in/documents/d/guest/income_tax_act_2025_as_amended_by_fa_act_2026-pdf" target="_blank" rel="noreferrer">Income-tax Act, 2025 (as amended in 2026)</a> · <a className="font-bold text-[#9fc4ff] underline underline-offset-2 hover:text-white" href="https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/income-and-tax-estimator-um?mobile-app=1" target="_blank" rel="noreferrer">Income and Tax Estimator guide</a></p>
        </div>
      </div>

      <section aria-label="Income tax regime comparison" className="min-w-0 rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]"><Calculator aria-hidden="true" className="h-4 w-4" /> Estimated tax comparison</div>
        {!results ? <p data-testid="status-income-tax-validation" role="status" className="mt-5 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs font-semibold leading-5 text-[#ffb9be]">Correct the highlighted fields to see your estimate.</p> : <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={`rounded-xl border p-3.5 ${bestRegime === "new" ? "border-[#34785e] bg-[#12372d]" : "border-[#2d4058] bg-[#162336]"}`}>
              <p className="text-xs font-bold text-[#a9c8e7]">New regime</p>
              <p data-testid="result-income-tax-new" aria-live="polite" className="mt-2 break-words text-2xl font-extrabold text-white">{formatTaxInr(results.newRegime.totalTax)}</p>
              <p className="mt-1 text-[11px] text-[#91a3b9]">{formatTaxInr(results.newRegime.monthlyTaxEstimate)} / month estimate</p>
              {bestRegime === "new" && <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#8fe0b6]"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />Lower estimated tax</p>}
            </div>
            <div className={`rounded-xl border p-3.5 ${bestRegime === "old" ? "border-[#34785e] bg-[#12372d]" : "border-[#2d4058] bg-[#162336]"}`}>
              <p className="text-xs font-bold text-[#a9c8e7]">Old regime</p>
              <p data-testid="result-income-tax-old" className="mt-2 break-words text-2xl font-extrabold text-white">{formatTaxInr(results.oldRegime.totalTax)}</p>
              <p className="mt-1 text-[11px] text-[#91a3b9]">{formatTaxInr(results.oldRegime.monthlyTaxEstimate)} / month estimate</p>
              {bestRegime === "old" && <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#8fe0b6]"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />Lower estimated tax</p>}
            </div>
          </div>
          <p data-testid="result-income-tax-recommendation" className="mt-3 rounded-xl border border-[#35506f] bg-[#16283e] px-3.5 py-3 text-xs leading-5 text-[#c3d4e8]">{results.newRegime.totalTax === results.oldRegime.totalTax ? "Both regimes produce the same estimated tax with these inputs." : `The ${bestRegime === "new" ? "new" : "old"} regime produces about ${formatTaxInr(Math.abs(results.newRegime.totalTax - results.oldRegime.totalTax))} less estimated annual tax with these inputs. Compare only after entering deductions you can actually claim.`}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <TaxStat label="Taxable income · new regime" value={formatTaxInr(results.newRegime.taxableIncome)} detail={`Standard deduction: ${formatTaxInr(results.newRegime.standardDeduction)}`} testId="result-income-tax-taxable-new" />
            <TaxStat label="Taxable income · old regime" value={formatTaxInr(results.oldRegime.taxableIncome)} detail={`Standard deduction: ${formatTaxInr(results.oldRegime.standardDeduction)}`} testId="result-income-tax-taxable-old" />
            <TaxStat label="Rebate / marginal relief · new" value={formatTaxInr(results.newRegime.rebate)} testId="result-income-tax-rebate-new" />
            <TaxStat label="Cess · new regime" value={formatTaxInr(results.newRegime.cess)} testId="result-income-tax-cess-new" />
          </div>
        </>}
      </section>
    </div>
  </ToolPanel>;
}