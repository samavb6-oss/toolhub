import { useMemo, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import {
  ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass, toolInputClass,
} from "./ToolPageFrame";
import {
  calculateSalary, formatSalaryInr, validateSalaryForm,
} from "./salaryCalculatorLogic";
import type { SalaryField, SalaryFormValues } from "./salaryCalculatorLogic";

const defaults: SalaryFormValues = {
  annualGross: "1200000",
  annualDeductions: "120000",
  frequency: "monthly",
};

const invalidInputClass = "border-[#e5707a] focus:border-[#e5707a] focus:ring-[#e5707a]/20";

function SalaryStat({ label, value, testId, detail }: { label: string; value: string; testId: string; detail?: string }) {
  return <div className="min-w-0 rounded-2xl border border-[#2d4058] bg-[#162336] p-4">
    <p className="text-xs font-semibold text-[#91a3b9]">{label}</p>
    <p data-testid={testId} className="mt-2 break-words text-xl font-extrabold tracking-[-0.04em] text-white sm:text-2xl">{value}</p>
    {detail && <p className="mt-1 text-[11px] leading-4 text-[#8193a9]">{detail}</p>}
  </div>;
}

export function SalaryCalculatorTool() {
  const [values, setValues] = useState<SalaryFormValues>(defaults);
  const validation = useMemo(() => validateSalaryForm(values), [values]);
  const result = useMemo(() => validation.ok ? calculateSalary(validation.input) : null, [validation]);
  const errors = validation.ok ? {} : validation.errors;

  const update = (field: SalaryField) => (event: { target: { value: string } }) => {
    setValues((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const inputProps = (field: "annualGross" | "annualDeductions", id: string) => ({
    id,
    type: "number" as const,
    inputMode: "decimal" as const,
    min: field === "annualGross" ? "0.01" : "0",
    max: field === "annualGross" ? "1000000000" : values.annualGross,
    step: "0.01",
    value: values[field],
    onChange: update(field),
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${id}-error` : `${id}-hint`,
    className: `${toolInputClass} ${errors[field] ? invalidInputClass : ""}`,
    autoComplete: "off",
  });

  const reset = () => setValues(defaults);

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[1fr_0.92fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">Salary details</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Enter your annual gross salary and the total deductions you want to account for.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ToolField label="Annual gross salary (₹)" htmlFor="salary-gross">
            <input {...inputProps("annualGross", "salary-gross")} data-testid="input-salary-gross" />
            {errors.annualGross
              ? <p id="salary-gross-error" role="alert" data-testid="error-salary-gross" className="mt-1.5 text-xs font-semibold leading-5 text-[#ff9ea6]">{errors.annualGross}</p>
              : <p id="salary-gross-hint" className="mt-1.5 text-xs leading-5 text-[#8291a3]">Use your annual amount before the deductions entered below.</p>}
          </ToolField>
          <ToolField label="Annual deductions (₹)" htmlFor="salary-deductions">
            <input {...inputProps("annualDeductions", "salary-deductions")} data-testid="input-salary-deductions" />
            {errors.annualDeductions
              ? <p id="salary-deductions-error" role="alert" data-testid="error-salary-deductions" className="mt-1.5 text-xs font-semibold leading-5 text-[#ff9ea6]">{errors.annualDeductions}</p>
              : <p id="salary-deductions-hint" className="mt-1.5 text-xs leading-5 text-[#8291a3]">Enter a total you choose; use 0 if there are none. No tax rules are assumed.</p>}
          </ToolField>
          <ToolField label="Pay frequency" htmlFor="salary-frequency">
            <select
              id="salary-frequency" data-testid="select-salary-frequency" value={values.frequency}
              onChange={update("frequency")} className={toolInputClass} aria-describedby="salary-frequency-hint"
            >
              <option value="monthly">Monthly (12 periods/year)</option>
              <option value="fortnightly">Fortnightly (26 periods/year)</option>
              <option value="weekly">Weekly (52 periods/year)</option>
            </select>
            <p id="salary-frequency-hint" className="mt-1.5 text-xs leading-5 text-[#8291a3]">Per-period amounts are averages; actual payroll schedules can differ.</p>
          </ToolField>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={secondaryButtonClass}>Reset example</button>
        </div>
        <div className="mt-5 rounded-xl border border-[#344a65] bg-[#162336] p-4 text-xs leading-5 text-[#b9c7d8]">
          <p className="font-bold text-white">What this estimate includes</p>
          <p className="mt-1">Net pay = gross salary − the deductions you enter. This tool does not calculate income tax, provident fund, insurance, or other statutory deductions automatically. Choose your own deduction total and confirm payroll rules with a qualified source.</p>
        </div>
      </div>
      <section aria-label="Salary breakdown" className="min-w-0 rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]">
          <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" /> Estimated take-home pay
        </div>
        <p data-testid="result-salary-net-annual" aria-live="polite" className="mt-2 break-words text-4xl font-extrabold tracking-[-0.06em] text-white">{result ? formatSalaryInr(result.annualNet) : "—"}</p>
        <p className="mt-2 text-xs text-[#91a3b9]">Annual net after your configured deductions. This is not a tax calculation.</p>
        {result && <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <SalaryStat label="Annual gross" value={formatSalaryInr(result.annualGross)} testId="result-salary-gross" />
          <SalaryStat label="Annual deductions" value={formatSalaryInr(result.annualDeductions)} testId="result-salary-deductions" />
          <SalaryStat label="Average monthly net" value={formatSalaryInr(result.averageMonthlyNet)} testId="result-salary-monthly-net" />
          <SalaryStat label="Net per pay period" value={formatSalaryInr(result.netPerPeriod)} testId="result-salary-period-net" detail={`Average across ${result.periodsPerYear} periods per year`} />
        </div>}
        {result && <div className="mt-5 rounded-xl border border-[#2d4058] bg-[#101b2a] p-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#91a3b9]">Gross pay</span>
            <span data-testid="result-salary-gross-period" className="font-bold text-white">{formatSalaryInr(result.grossPerPeriod)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#91a3b9]">Deductions per period</span>
            <span data-testid="result-salary-deductions-period" className="font-bold text-white">{formatSalaryInr(result.deductionsPerPeriod)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#91a3b9]">Share of gross deducted</span>
            <span data-testid="result-salary-deduction-percent" className="font-bold text-white">{result.deductionPercent.toFixed(2)}%</span>
          </div>
        </div>}
        {!result && <p data-testid="status-salary-validation" role="status" className="mt-5 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs font-semibold leading-5 text-[#ffb9be]">Correct the highlighted fields to see your salary breakdown.</p>}
      </section>
    </div>
  </ToolPanel>;
}
