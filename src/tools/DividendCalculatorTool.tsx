import { useMemo, useState } from "react";
import { Coins } from "lucide-react";
import {
  ToolField, ToolPanel, secondaryButtonClass, toolInputClass,
} from "./ToolPageFrame";
import {
  calculateDividend, formatDividendInr, validateDividendForm,
} from "./dividendCalculatorLogic";
import type { DividendFormValues } from "./dividendCalculatorLogic";

const defaults: DividendFormValues = {
  shares: "150",
  dividendPerShare: "12",
  paymentsPerYear: "1",
  sharePrice: "240",
};

const invalidInputClass = "border-[#e5707a] focus:border-[#e5707a] focus:ring-[#e5707a]/20";

function DividendStat({ label, value, testId, detail }: { label: string; value: string; testId: string; detail?: string }) {
  return <div className="min-w-0 rounded-2xl border border-[#2d4058] bg-[#162336] p-4">
    <p className="text-xs font-semibold text-[#91a3b9]">{label}</p>
    <p data-testid={testId} className="mt-2 break-words text-xl font-extrabold tracking-[-0.04em] text-white sm:text-2xl">{value}</p>
    {detail && <p className="mt-1 text-[11px] leading-4 text-[#8193a9]">{detail}</p>}
  </div>;
}

export function DividendCalculatorTool() {
  const [values, setValues] = useState<DividendFormValues>(defaults);
  const validation = useMemo(() => validateDividendForm(values), [values]);
  const result = useMemo(() => validation.ok ? calculateDividend(validation.input) : null, [validation]);
  const errors = validation.ok ? {} : validation.errors;

  const update = (field: keyof DividendFormValues) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const inputProps = (field: keyof DividendFormValues, id: string, optional = false) => ({
    id,
    type: "number" as const,
    inputMode: "decimal" as const,
    min: field === "shares" || field === "paymentsPerYear" || field === "sharePrice" ? "1" : "0",
    max: field === "shares" ? "1000000" : field === "paymentsPerYear" ? "12" : undefined,
    step: field === "shares" || field === "paymentsPerYear" ? "1" : "0.01",
    value: values[field],
    onChange: update(field),
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${id}-error` : `${id}-hint`,
    className: `${toolInputClass} ${errors[field] ? invalidInputClass : ""}`,
    autoComplete: "off" as const,
    placeholder: optional ? "Optional" : undefined,
  });

  const reset = () => setValues(defaults);

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[1fr_0.92fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">Your shareholding</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Enter the dividend announced per share for one payment. Add the share price to estimate annual dividend yield.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ToolField label="Number of shares" htmlFor="dividend-shares">
            <input {...inputProps("shares", "dividend-shares")} data-testid="input-dividend-shares" />
            {errors.shares
              ? <p id="dividend-shares-error" role="alert" data-testid="error-dividend-shares" className="mt-1.5 text-xs font-semibold leading-5 text-[#ff9ea6]">{errors.shares}</p>
              : <p id="dividend-shares-hint" className="mt-1.5 text-xs leading-5 text-[#8291a3]">Whole shares you are eligible to receive dividends on.</p>}
          </ToolField>
          <ToolField label="Dividend per share (₹)" htmlFor="dividend-per-share">
            <input {...inputProps("dividendPerShare", "dividend-per-share")} data-testid="input-dividend-per-share" />
            {errors.dividendPerShare
              ? <p id="dividend-per-share-error" role="alert" data-testid="error-dividend-per-share" className="mt-1.5 text-xs font-semibold leading-5 text-[#ff9ea6]">{errors.dividendPerShare}</p>
              : <p id="dividend-per-share-hint" className="mt-1.5 text-xs leading-5 text-[#8291a3]">Amount for one declared or hypothetical payment.</p>}
          </ToolField>
          <ToolField label="Dividend payments per year" htmlFor="dividend-payments">
            <input {...inputProps("paymentsPerYear", "dividend-payments")} data-testid="input-dividend-payments" />
            {errors.paymentsPerYear
              ? <p id="dividend-payments-error" role="alert" data-testid="error-dividend-payments" className="mt-1.5 text-xs font-semibold leading-5 text-[#ff9ea6]">{errors.paymentsPerYear}</p>
              : <p id="dividend-payments-hint" className="mt-1.5 text-xs leading-5 text-[#8291a3]">Use 1 for an annual dividend, or enter the expected number of payments.</p>}
          </ToolField>
          <ToolField label="Current share price (₹, optional)" htmlFor="dividend-share-price">
            <input {...inputProps("sharePrice", "dividend-share-price", true)} data-testid="input-dividend-share-price" />
            {errors.sharePrice
              ? <p id="dividend-share-price-error" role="alert" data-testid="error-dividend-share-price" className="mt-1.5 text-xs font-semibold leading-5 text-[#ff9ea6]">{errors.sharePrice}</p>
              : <p id="dividend-share-price-hint" className="mt-1.5 text-xs leading-5 text-[#8291a3]">Used only to estimate investment value and dividend yield.</p>}
          </ToolField>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className={secondaryButtonClass}>Reset example</button>
        </div>
        <div className="mt-5 rounded-xl border border-[#344a65] bg-[#162336] p-4 text-xs leading-5 text-[#b9c7d8]">
          <p className="font-bold text-white">Important to know</p>
          <p className="mt-1">This calculator uses only the values you enter. It does not look up live share prices, verify declared dividends, predict future payments or subtract taxes. Actual dividends depend on company announcements, eligibility dates and your circumstances.</p>
        </div>
      </div>
      <section aria-label="Estimated dividend breakdown" className="min-w-0 rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]">
          <Coins aria-hidden="true" className="h-4 w-4" /> Estimated dividend income
        </div>
        <p data-testid="result-dividend-payment" aria-live="polite" className="mt-2 break-words text-4xl font-extrabold tracking-[-0.06em] text-white">{result ? formatDividendInr(result.dividendPerPayment) : "—"}</p>
        <p className="mt-2 text-xs text-[#91a3b9]">Estimated amount for one dividend payment.</p>
        {result && <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <DividendStat label="Estimated annual dividends" value={formatDividendInr(result.estimatedAnnualDividend)} testId="result-dividend-annual" />
          <DividendStat label="Shares held" value={result.shares.toLocaleString("en-IN")} testId="result-dividend-shares" />
          {result.estimatedInvestmentValue !== null && <DividendStat label="Estimated investment value" value={formatDividendInr(result.estimatedInvestmentValue)} testId="result-dividend-investment-value" />}
          {result.estimatedAnnualYieldPercent !== null && <DividendStat label="Estimated annual dividend yield" value={`${result.estimatedAnnualYieldPercent.toFixed(2)}%`} testId="result-dividend-yield" detail="Based on the entered share price and annualized dividend" />}
        </div>}
        {!result && <p data-testid="status-dividend-validation" role="status" className="mt-5 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs font-semibold leading-5 text-[#ffb9be]">Correct the highlighted fields to see your dividend estimate.</p>}
      </section>
    </div>
  </ToolPanel>;
}
