import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ToolField, ToolPanel, secondaryButtonClass, toolInputClass,
} from "./ToolPageFrame";
import { calculateLoan, formatInr, formatTerm, validateLoanForm } from "./loanCalculatorLogic";
import type { LoanFormField, LoanFormValues } from "./loanCalculatorLogic";

const defaultValues: LoanFormValues = {
  principal: "1000000",
  annualRate: "9",
  years: "10",
  months: "0",
  extraPayment: "",
};

const invalidInputClass = "border-[#e5707a] focus:border-[#e5707a] focus:ring-[#e5707a]/20";

function Stat({ label, value, detail, testId }: { label: string; value: string; detail?: string; testId: string }) {
  return <div className="min-w-0 rounded-2xl border border-[#2d4058] bg-[#162336] p-4">
    <p className="text-xs font-semibold text-[#91a3b9]">{label}</p>
    <p data-testid={testId} className="mt-2 break-words text-xl font-extrabold tracking-[-0.04em] text-white sm:text-2xl">{value}</p>
    {detail && <p className="mt-1 text-[11px] leading-4 text-[#8193a9]">{detail}</p>}
  </div>;
}

function FieldMessage({ id, hint, error }: { id: string; hint?: string; error?: string }): ReactNode {
  if (error) return <p id={id} data-testid={`${id}`} className="mt-1.5 text-xs font-semibold leading-5 text-[#ff9ea6]">{error}</p>;
  if (hint) return <p id={id} className="mt-1.5 text-xs leading-5 text-[#8291a3]">{hint}</p>;
  return null;
}

export function LoanCalculatorTool() {
  const [values, setValues] = useState<LoanFormValues>(defaultValues);
  const validation = useMemo(() => validateLoanForm(values), [values]);
  const result = useMemo(() => (validation.ok ? calculateLoan(validation.input) : null), [validation]);
  const errors = validation.ok ? {} : validation.errors;
  const errorCount = Object.keys(errors).length;
  const isDefault = (Object.keys(defaultValues) as (keyof LoanFormValues)[]).every((key) => values[key] === defaultValues[key]);

  const update = (field: keyof LoanFormValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const inputProps = (field: LoanFormField, id: string, described: string) => ({
    id,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": described,
    autoComplete: "off",
    spellCheck: false,
    className: cn(toolInputClass, errors[field] && invalidInputClass),
  });

  const hasExtra = Boolean(result && validation.ok && result.monthlyPaymentWithExtra > result.monthlyPayment);
  const finalDiffers = Boolean(result && result.finalPayment !== result.monthlyPayment && result.numberOfPayments > 1);

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={(event) => event.preventDefault()} noValidate aria-label="Loan details" data-testid="form-loan">
        <h2 className="text-base font-extrabold text-white">Loan details</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Enter the amount, yearly interest rate and how long you will take to repay it.</p>

        <div className="mt-5 grid gap-4">
          <ToolField label="Loan amount (₹)" htmlFor="loan-principal">
            <input {...inputProps("principal", "loan-principal", "loan-principal-note")} data-testid="input-loan-principal" type="text" inputMode="decimal" value={values.principal} onChange={update("principal")} />
            <FieldMessage id="loan-principal-note" hint="Up to ₹10,000 crore. Paise are supported." error={errors.principal} />
          </ToolField>

          <ToolField label="Annual interest rate (% per year)" htmlFor="loan-rate">
            <input {...inputProps("annualRate", "loan-rate", "loan-rate-note")} data-testid="input-loan-rate" type="text" inputMode="decimal" value={values.annualRate} onChange={update("annualRate")} />
            <FieldMessage id="loan-rate-note" hint="Enter 0 for an interest-free loan. Maximum 100%." error={errors.annualRate} />
          </ToolField>

          <fieldset aria-describedby="loan-term-note" className="min-w-0">
            <legend className="text-xs font-bold text-[#cbd5e1]">Loan term</legend>
            <div className="grid grid-cols-2 gap-4">
              <ToolField label="Years" htmlFor="loan-years">
                <input {...inputProps("years", "loan-years", "loan-term-note")} aria-invalid={errors.years || errors.term ? true : undefined} className={cn(toolInputClass, (errors.years || errors.term) && invalidInputClass)} data-testid="input-loan-years" type="text" inputMode="numeric" value={values.years} onChange={update("years")} />
              </ToolField>
              <ToolField label="Months" htmlFor="loan-months">
                <input {...inputProps("months", "loan-months", "loan-term-note")} aria-invalid={errors.months || errors.term ? true : undefined} className={cn(toolInputClass, (errors.months || errors.term) && invalidInputClass)} data-testid="input-loan-months" type="text" inputMode="numeric" value={values.months} onChange={update("months")} />
              </ToolField>
            </div>
            <FieldMessage id="loan-term-note" hint="Whole numbers only, from 1 month to 50 years. For example, 2 years and 6 months." error={errors.years ?? errors.months ?? errors.term} />
          </fieldset>

          <ToolField label="Extra monthly payment (₹), optional" htmlFor="loan-extra">
            <input {...inputProps("extraPayment", "loan-extra", "loan-extra-note")} data-testid="input-loan-extra" type="text" inputMode="decimal" value={values.extraPayment} onChange={update("extraPayment")} placeholder="0" />
            <FieldMessage id="loan-extra-note" hint="Paying more each month usually shortens the loan and cuts interest, if your lender allows it." error={errors.extraPayment} />
          </ToolField>
        </div>

        <div className="mt-6">
          <button type="button" onClick={() => setValues(defaultValues)} disabled={isDefault} data-testid="button-loan-reset" className={secondaryButtonClass}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />Reset
          </button>
        </div>
      </form>

      <section aria-label="Loan results" aria-live="polite" className="min-w-0 rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-5 sm:p-6">
        {!result ? <div data-testid="status-loan-validation">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]">Results</p>
          <p role="alert" className="mt-3 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs font-semibold leading-5 text-[#ffb9be]">
            {errorCount === 1 ? "Fix the highlighted field to see your repayment results." : `Fix the ${errorCount} highlighted fields to see your repayment results.`}
          </p>
        </div> : <>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]">{hasExtra ? "Monthly payment with extra" : "Monthly payment"}</p>
          <p data-testid="result-loan-monthly" className="mt-2 break-words text-3xl font-extrabold tracking-[-0.06em] text-white sm:text-4xl">{formatInr(hasExtra ? result.monthlyPaymentWithExtra : result.monthlyPayment)}</p>
          <p className="mt-2 text-xs leading-5 text-[#91a3b9]" data-testid="result-loan-count">
            {result.numberOfPayments} {result.numberOfPayments === 1 ? "payment" : "payments"} over {formatTerm(result.numberOfPayments)}
            {hasExtra && <> ({formatInr(result.monthlyPayment)} regular payment + {formatInr(result.monthlyPaymentWithExtra - result.monthlyPayment)} extra)</>}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Loan amount" value={formatInr(result.totalPrincipal)} testId="result-loan-principal" />
            <Stat label="Total interest" value={formatInr(result.totalInterest)} testId="result-loan-interest" />
            <Stat label="Total repayment" value={formatInr(result.totalPayment)} testId="result-loan-total" />
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-extrabold text-white">Principal vs interest</h3>
            <div
              role="img" data-testid="chart-loan-breakdown"
              aria-label={`Total repayment is ${result.principalPercent.toFixed(1)}% principal and ${result.interestPercent.toFixed(1)}% interest.`}
              className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-[#0c1522]"
            >
              <div className="h-full bg-[#4f8df5]" style={{ width: `${result.principalPercent}%` }} />
              <div className="h-full bg-[#f0b14a]" style={{ width: `${result.interestPercent}%` }} />
            </div>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm bg-[#4f8df5]" /><dt className="text-[#aab7c9]">Principal</dt><dd data-testid="result-loan-principal-share" className="ml-auto font-bold text-white sm:ml-1">{result.principalPercent.toFixed(1)}%</dd></div>
              <div className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm bg-[#f0b14a]" /><dt className="text-[#aab7c9]">Interest</dt><dd data-testid="result-loan-interest-share" className="ml-auto font-bold text-white sm:ml-1">{result.interestPercent.toFixed(1)}%</dd></div>
            </dl>
          </div>

          {hasExtra && <div data-testid="result-loan-savings" className="mt-5 rounded-xl border border-[#2f6a50] bg-[#14301f]/70 px-4 py-3 text-xs leading-5 text-[#b9ecce]">
            <p className="font-extrabold text-[#d8f7e5]">Your extra payment saves about {formatInr(result.interestSaved)} in interest</p>
            <p className="mt-1">The loan ends {formatTerm(result.monthsSaved)} sooner: {formatTerm(result.numberOfPayments)} instead of {formatTerm(result.withoutExtra.numberOfPayments)}. Without the extra payment, total interest would be {formatInr(result.withoutExtra.totalInterest)}.</p>
          </div>}

          {finalDiffers && <p data-testid="note-loan-final" className="mt-4 text-xs leading-5 text-[#91a3b9]">
            Your final payment is {formatInr(result.finalPayment)}. It settles the balance that remains after each month is rounded to the nearest paisa{hasExtra ? " and any shortened last month" : ""}.
          </p>}
        </>}
      </section>
    </div>

    {result && <div className="mt-8">
      <h3 className="text-sm font-extrabold text-white">Year-by-year repayment</h3>
      <div role="region" aria-label="Year-by-year repayment table" tabIndex={0} className="mt-3 overflow-x-auto rounded-2xl border border-[#26364b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/25">
        <table data-testid="table-loan-yearly" className="w-full min-w-[34rem] border-collapse text-left text-xs">
          <caption className="sr-only">Principal and interest paid, and the remaining balance, at the end of each year of the loan.</caption>
          <thead className="bg-[#162336] text-[#aab7c9]">
            <tr>
              <th scope="col" className="px-4 py-3 font-bold">Year</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">Payments</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">Principal paid</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">Interest paid</th>
              <th scope="col" className="px-4 py-3 text-right font-bold">Balance at year end</th>
            </tr>
          </thead>
          <tbody className="text-[#e8eef7]">
            {result.yearly.map((row) => <tr key={row.year} className="border-t border-[#22324a]">
              <th scope="row" className="px-4 py-2.5 font-semibold">{row.year}</th>
              <td className="px-4 py-2.5 text-right tabular-nums">{row.payments}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatInr(row.principalPaid)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatInr(row.interestPaid)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatInr(row.closingBalance)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>}

    <details className="mt-6 rounded-2xl border border-[#26364b] bg-[#0f1826] px-4 py-3 text-xs leading-5 text-[#9fb0c5]">
      <summary className="cursor-pointer font-bold text-[#cbd5e1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/25">How this is calculated</summary>
      <div className="mt-3 space-y-2">
        <p>The calculator uses the standard reducing-balance method: each month, interest is charged on the balance still owed at one twelfth of the annual rate, and the rest of your payment reduces the balance.</p>
        <p>The regular payment is P × r ÷ (1 − (1 + r)<sup>−n</sup>), where P is the loan amount, r is the annual rate ÷ 12 ÷ 100 and n is the number of months. With a 0% rate it is simply P ÷ n.</p>
        <p>Amounts are rounded to the nearest paisa each month, so the table adds up exactly. The final payment settles whatever remains, so it can differ from the regular payment by a few rupees.</p>
      </div>
    </details>

    <p className="mt-6 border-t border-[#26364b] pt-4 text-xs leading-5 text-[#8193a9]" data-testid="text-loan-disclaimer">
      <strong className="font-bold text-[#aab7c9]">Estimate only.</strong> This is not a loan offer, quote or financial advice. It assumes a fixed rate, equal monthly payments and monthly compounding. Lenders may add fees, insurance or charges, use different rounding or day-count rules, change floating rates, or restrict prepayment. Check the figures with your lender before you decide.
    </p>
  </ToolPanel>;
}
