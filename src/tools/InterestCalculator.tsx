import { useState } from "react";
import { ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass, toolInputClass } from "./ToolPageFrame";
import { calculateInterest, parseInterestNumber, type CompoundingFrequency, type InterestMode } from "./interestCalculatorLogic";

function inr(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function InterestCalculator() {
  const [principalText, setPrincipalText] = useState("100000");
  const [rateText, setRateText] = useState("8");
  const [yearsText, setYearsText] = useState("5");
  const [mode, setMode] = useState<InterestMode>("compound");
  const [frequency, setFrequency] = useState<CompoundingFrequency>("annually");
  const result = calculateInterest(parseInterestNumber(principalText), parseInterestNumber(rateText), parseInterestNumber(yearsText), mode, frequency);

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[1fr_0.95fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">Interest calculation</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Compare simple interest with interest compounded over time.</p>
        <div className="mt-5 space-y-4">
          <ToolField label="Principal amount (₹)" htmlFor="interest-principal" hint="Enter the starting amount in rupees.">
            <input id="interest-principal" data-testid="input-interest-principal" className={toolInputClass} type="number" min="0.01" max="1000000000000" step="any" inputMode="decimal" value={principalText} onChange={(event) => setPrincipalText(event.target.value)} />
          </ToolField>
          <ToolField label="Annual interest rate (%)" htmlFor="interest-rate" hint="Enter the annual nominal rate, from 0% to 1,000%.">
            <input id="interest-rate" data-testid="input-interest-rate" className={toolInputClass} type="number" min="0" max="1000" step="any" inputMode="decimal" value={rateText} onChange={(event) => setRateText(event.target.value)} />
          </ToolField>
          <ToolField label="Duration (whole years)" htmlFor="interest-years" hint="Choose 0 to 100 years.">
            <input id="interest-years" data-testid="input-interest-years" className={toolInputClass} type="number" min="0" max="100" step="1" inputMode="numeric" value={yearsText} onChange={(event) => setYearsText(event.target.value)} />
          </ToolField>
          <fieldset>
            <legend className="text-xs font-bold text-[#cbd5e1]">Interest type</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" data-testid="button-interest-simple" aria-pressed={mode === "simple"} className={mode === "simple" ? primaryButtonClass : secondaryButtonClass} onClick={() => setMode("simple")}>Simple interest</button>
              <button type="button" data-testid="button-interest-compound" aria-pressed={mode === "compound"} className={mode === "compound" ? primaryButtonClass : secondaryButtonClass} onClick={() => setMode("compound")}>Compound interest</button>
            </div>
          </fieldset>
          {mode === "compound" && <ToolField label="Compounding frequency" htmlFor="interest-frequency">
            <select id="interest-frequency" data-testid="select-interest-frequency" className={toolInputClass} value={frequency} onChange={(event) => setFrequency(event.target.value as CompoundingFrequency)}>
              <option value="annually">Annually</option>
              <option value="semi-annually">Half-yearly</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </ToolField>}
        </div>
        {!result && <p role="alert" data-testid="status-interest-validation" className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs font-semibold leading-5 text-[#ffb9be]">Please correct the inputs. Principal must be positive, the rate must be 0–1,000%, and duration must be a whole number from 0 to 100 years. Values that overflow the calculation are not shown.</p>}
      </div>
      <section aria-label="Interest results" aria-live="polite" className="rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-5 sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]">Total amount</p>
        <p data-testid="result-interest-total" className="mt-2 break-words text-3xl font-extrabold tracking-[-0.05em] text-white">{result ? inr(result.total) : "—"}</p>
        <div className="mt-6 space-y-3">
          <ResultRow label="Principal" value={result ? inr(result.principal) : "—"} testId="result-interest-principal" />
          <ResultRow label="Interest earned" value={result ? inr(result.interest) : "—"} testId="result-interest-earned" />
          <ResultRow label="Effective annual rate" value={result ? `${result.effectiveAnnualRate.toLocaleString("en-IN", { maximumFractionDigits: 4 })}%` : "—"} testId="result-interest-effective-rate" />
        </div>
      </section>
    </div>
    <p className="mt-6 border-t border-[#26364b] pt-4 text-xs leading-5 text-[#8193a9]">Estimates assume a fixed annual rate, no deposits or withdrawals, and no taxes, fees, or inflation. Simple interest is calculated on the original principal. Compound interest is compounded at the selected frequency. Monetary values are displayed rounded to paise; the underlying calculation retains full precision.</p>
  </ToolPanel>;
}

function ResultRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return <div className="flex items-center justify-between gap-4"><p className="text-sm text-[#b7c4d6]">{label}</p><p data-testid={testId} className="break-words text-right text-sm font-extrabold tabular-nums text-white">{value}</p></div>;
}
