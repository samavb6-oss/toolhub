import { useEffect, useRef, useState } from "react";
import { Check, Copy, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import {
  ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass,
  toolInputClass, toolTextareaClass,
} from "./ToolPageFrame";
import {
  buildAiPrompt, calculateEmiResults, calculateSip, countText, describeIndianAmount, generateSecurePassword, parseSipNumber, passwordGroups, roundSipAmounts, validateSipInputs,
} from "./basicToolLogic";
import type { PromptFields, SipYearRow } from "./basicToolLogic";
import { convertCase } from "./caseConversion";
import type { CaseMode } from "./caseConversion";
import { countCharacters, describeCounts } from "./characterCounterLogic";
import { copyText } from "./toolUtils";

function ResultStat({ label, value, detail, testId }: { label: string; value: string; detail?: string; testId: string }) {
  return <div className="min-w-0 rounded-2xl border border-[#2d4058] bg-[#162336] p-4">
    <p className="text-xs font-semibold text-[#91a3b9]">{label}</p>
    <p data-testid={testId} className="mt-2 min-w-0 break-words text-xl font-extrabold tracking-[-0.04em] text-white sm:text-2xl">{value}</p>
    {detail && <p className="mt-1 text-[11px] leading-4 text-[#8193a9]">{detail}</p>}
  </div>;
}

function inr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function EmiCalculator() {
  const [principalText, setPrincipalText] = useState("500000");
  const [annualRateText, setAnnualRateText] = useState("8.5");
  const [yearsText, setYearsText] = useState("20");
  const [extraMonthsText, setExtraMonthsText] = useState("0");
  const principal = Number(principalText);
  const annualRate = Number(annualRateText);
  const years = Number(yearsText);
  const extraMonths = Number(extraMonthsText);
  const months = years * 12 + extraMonths;
  const isValid = principalText.trim() !== "" && annualRateText.trim() !== "" && yearsText.trim() !== "" && extraMonthsText.trim() !== "" &&
    Number.isFinite(principal) && principal > 0 &&
    Number.isFinite(annualRate) && annualRate >= 0 && annualRate <= 100 &&
    Number.isInteger(years) && years >= 0 && years <= 50 &&
    Number.isInteger(extraMonths) && extraMonths >= 0 && extraMonths <= 11 &&
    months > 0 && months <= 600;
  const results = isValid ? calculateEmiResults(principal, annualRate, months) : null;
  const calculationError = isValid && results === null;

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[1fr_0.92fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">Loan details</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Enter the principal, annual interest rate and repayment term.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ToolField label="Loan amount (₹)" htmlFor="emi-principal">
            <input id="emi-principal" data-testid="input-emi-principal" className={toolInputClass} type="number" min="1" step="1000" value={principalText} onChange={(event) => setPrincipalText(event.target.value)} />
          </ToolField>
          <ToolField label="Annual interest rate (%)" htmlFor="emi-rate">
            <input id="emi-rate" data-testid="input-emi-rate" className={toolInputClass} type="number" min="0" max="100" step="0.01" value={annualRateText} onChange={(event) => setAnnualRateText(event.target.value)} />
          </ToolField>
          <ToolField label="Term (years)" htmlFor="emi-years">
            <input id="emi-years" data-testid="input-emi-years" className={toolInputClass} type="number" min="0" max="50" step="1" value={yearsText} onChange={(event) => setYearsText(event.target.value)} />
          </ToolField>
          <ToolField label="Additional months" htmlFor="emi-extra-months" hint="Use this for a term that includes part of a year.">
            <input id="emi-extra-months" data-testid="input-emi-extra-months" className={toolInputClass} type="number" min="0" max="11" step="1" value={extraMonthsText} onChange={(event) => setExtraMonthsText(event.target.value)} />
          </ToolField>
        </div>
        {!isValid && <p role="alert" data-testid="status-emi-validation" className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs font-semibold leading-5 text-[#ffb9be]">Enter a positive loan amount, a non-negative rate, and a term from 1 month to 50 years.</p>}
        {calculationError && <p role="alert" data-testid="status-emi-calculation" className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs font-semibold leading-5 text-[#ffb9be]">These values produce results outside the calculator’s supported numeric range. Reduce the loan amount or term to see a reliable estimate.</p>}
      </div>
      <section aria-label="EMI results" className="rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-5 sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]">Estimated monthly payment</p>
        <p data-testid="result-emi-monthly" className="mt-2 text-4xl font-extrabold tracking-[-0.06em] text-white">{results ? inr(results.emi) : "—"}</p>
        <p className="mt-2 text-xs text-[#91a3b9]">{results ? `${months} monthly payments` : calculationError ? "The calculated results exceed the supported numeric range. Try a smaller loan amount or shorter term." : "Correct the values to calculate your EMI."}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ResultStat label="Total interest" value={results ? inr(results.totalInterest) : "—"} testId="result-emi-interest" />
          <ResultStat label="Total repayment" value={results ? inr(results.totalRepayment) : "—"} testId="result-emi-total" />
        </div>
      </section>
    </div>
    <p className="mt-6 border-t border-[#26364b] pt-4 text-xs leading-5 text-[#8193a9]">Estimate only. The calculation assumes a fixed annual rate with monthly compounding and equal payments; lender fees and rate changes are not included.</p>
  </ToolPanel>;
}

const sipFaqs: Array<{ question: string; answer: string }> = [
  {
    question: "How is the SIP future value calculated?",
    answer: "Each monthly instalment is assumed to be invested at the start of its month and to grow at one-twelfth of the annual return, compounded monthly. The future value is P × [((1 + i)ⁿ − 1) ÷ i] × (1 + i), where P is the monthly amount, i is the annual rate ÷ 12 and n is the number of months.",
  },
  {
    question: "Are these returns guaranteed?",
    answer: "No. The calculator applies one fixed return to every month. Real investments rise and fall, so actual results can be higher or lower, and may be negative. Treat the output as an illustration of how time and compounding work, not as a forecast or financial advice.",
  },
  {
    question: "Why might another SIP calculator show a slightly different number?",
    answer: "Calculators differ in when each instalment is assumed to be invested (start or end of the month) and in how the annual rate becomes a monthly rate. This one invests at the start of the month and divides the annual rate by 12. Investing at the end of each month gives a slightly lower figure.",
  },
  {
    question: "Which expected return should I enter?",
    answer: "There is no single correct value. Try a few different rates, including cautious ones, to see how sensitive the result is. Past performance of any fund or index does not guarantee future returns.",
  },
  {
    question: "Does the result include taxes, fund charges or inflation?",
    answer: "No. The projection is before taxes, expense ratios, exit loads and other costs, and it is not adjusted for inflation, so the buying power of the final amount will be lower than the number shown.",
  },
];

function SipGrowthChart({ rows }: { rows: SipYearRow[] }) {
  const width = 640;
  const height = 250;
  const top = 8;
  const bottom = 28;
  const plotHeight = height - top - bottom;
  const max = Math.max(...rows.map((row) => row.value));
  const slot = width / rows.length;
  const barWidth = Math.max(2, slot * 0.7);
  const step = rows.length <= 10 ? 1 : rows.length <= 20 ? 5 : 10;
  const last = rows[rows.length - 1];
  const showTick = (year: number) => year === rows.length || (year % step === 0 && rows.length - year >= step / 2);

  return <svg
    viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" data-testid="chart-sip-growth"
    aria-label={`Stacked bar chart of the amount invested and estimated returns at the end of each year, growing to ${inr(last.value)} after ${last.year} years. The same figures are listed in the table below.`}
  >
    <line x1="0" x2={width} y1={top + plotHeight} y2={top + plotHeight} stroke="#33455c" />
    {rows.map((row, index) => {
      const x = index * slot + (slot - barWidth) / 2;
      const investedHeight = (row.invested / max) * plotHeight;
      const returnsHeight = Math.max(0, (row.returns / max) * plotHeight);
      return <g key={row.year}>
        <rect x={x} y={top + plotHeight - investedHeight} width={barWidth} height={investedHeight} fill="#3b82f6" />
        <rect x={x} y={top + plotHeight - investedHeight - returnsHeight} width={barWidth} height={returnsHeight} fill="#34d399" />
        {showTick(row.year) && <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fontSize="14" fill="#8291a3">{row.year}</text>}
      </g>;
    })}
  </svg>;
}

export function SipCalculator() {
  const [monthlyText, setMonthlyText] = useState("5000");
  const [rateText, setRateText] = useState("12");
  const [yearsText, setYearsText] = useState("10");
  const monthly = parseSipNumber(monthlyText);
  const rate = parseSipNumber(rateText);
  const years = parseSipNumber(yearsText);
  const errors = validateSipInputs(monthly, rate, years);
  const result = calculateSip(monthly, rate, years);
  const display = result ? roundSipAmounts(result.invested, result.futureValue) : null;
  const words = display ? describeIndianAmount(display.value) : null;
  const errorClass = "mt-1.5 text-xs font-semibold leading-5 text-[#ffb9be]";
  const fieldProps = (id: string, error?: string) => ({
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  });

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[1fr_0.92fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">Investment details</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Enter a monthly amount, the annual return you want to test, and how long you will invest.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ToolField label="Monthly investment (₹)" htmlFor="sip-monthly">
            <input id="sip-monthly" data-testid="input-sip-monthly" className={toolInputClass} type="number" inputMode="decimal" min="1" max="10000000" step="500" value={monthlyText} onChange={(event) => setMonthlyText(event.target.value)} {...fieldProps("sip-monthly", errors.monthly)} />
            {errors.monthly && <p id="sip-monthly-error" role="alert" data-testid="error-sip-monthly" className={errorClass}>{errors.monthly}</p>}
          </ToolField>
          <ToolField label="Expected annual return (%)" htmlFor="sip-rate">
            <input id="sip-rate" data-testid="input-sip-rate" className={toolInputClass} type="number" inputMode="decimal" min="0" max="30" step="0.5" value={rateText} onChange={(event) => setRateText(event.target.value)} {...fieldProps("sip-rate", errors.rate)} />
            {errors.rate && <p id="sip-rate-error" role="alert" data-testid="error-sip-rate" className={errorClass}>{errors.rate}</p>}
          </ToolField>
          <ToolField label="Investment period (years)" htmlFor="sip-years">
            <input id="sip-years" data-testid="input-sip-years" className={toolInputClass} type="number" inputMode="numeric" min="1" max="50" step="1" value={yearsText} onChange={(event) => setYearsText(event.target.value)} {...fieldProps("sip-years", errors.years)} />
            {errors.years && <p id="sip-years-error" role="alert" data-testid="error-sip-years" className={errorClass}>{errors.years}</p>}
          </ToolField>
        </div>
        {result && rate > 15 && <p data-testid="note-sip-high-rate" className="mt-4 rounded-xl border border-[#5c5230] bg-[#352f1d] px-4 py-3 text-xs font-semibold leading-5 text-[#f2dc9b]">A return assumption this high may overstate what is realistic over long periods. Try a more cautious rate as well.</p>}
        {!result && <p data-testid="status-sip-validation" className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs font-semibold leading-5 text-[#ffb9be]">Correct the highlighted fields to see your projection.</p>}
      </div>
      <section aria-label="SIP results" className="min-w-0 rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-5 sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]">Projected value (estimate)</p>
        <p data-testid="result-sip-value" aria-live="polite" className="mt-2 break-words text-4xl font-extrabold tracking-[-0.06em] text-white">{display ? inr(display.value) : "—"}</p>
        <p className="mt-2 text-xs text-[#91a3b9]">{display ? `${words ? `About ${words} · ` : ""}${inr(monthly)} a month for ${years} ${years === 1 ? "year" : "years"} at ${rate}% a year` : "Enter valid values to see an estimate."}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ResultStat label="Total invested" value={display ? inr(display.invested) : "—"} testId="result-sip-invested" />
          <ResultStat label="Estimated returns" value={display ? inr(display.returns) : "—"} testId="result-sip-returns" />
        </div>
      </section>
    </div>
    {result && <div className="mt-8 border-t border-[#26364b] pt-6">
      <h2 className="text-base font-extrabold text-white">Year-by-year growth</h2>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[#aab7c9]" aria-hidden="true">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#3b82f6]" />Amount invested</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#34d399]" />Estimated returns</span>
      </div>
      <div className="mt-3"><SipGrowthChart rows={result.yearly} /></div>
      <div role="region" aria-label="Year-by-year SIP breakdown" tabIndex={0} className="mt-4 max-h-80 overflow-auto rounded-xl border border-[#26364b] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/25">
        <table data-testid="table-sip-yearly" className="w-full min-w-[480px] text-right text-xs">
          <caption className="sr-only">Amount invested, estimated returns and projected value at the end of each year</caption>
          <thead className="sticky top-0 bg-[#162336] text-[#aab7c9]">
            <tr>
              <th scope="col" className="px-3 py-2.5 text-left font-bold">Year</th>
              <th scope="col" className="px-3 py-2.5 font-bold">Invested</th>
              <th scope="col" className="px-3 py-2.5 font-bold">Estimated returns</th>
              <th scope="col" className="px-3 py-2.5 font-bold">Projected value</th>
            </tr>
          </thead>
          <tbody className="text-[#dbe5f2]">
            {result.yearly.map((row) => {
              const rounded = roundSipAmounts(row.invested, row.value);
              return <tr key={row.year} className="border-t border-[#26364b]">
                <th scope="row" className="px-3 py-2 text-left font-semibold">{row.year}</th>
                <td className="px-3 py-2">{inr(rounded.invested)}</td>
                <td className="px-3 py-2">{inr(rounded.returns)}</td>
                <td className="px-3 py-2 font-semibold text-white">{inr(rounded.value)}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>}
    <p className="mt-6 border-t border-[#26364b] pt-4 text-xs leading-5 text-[#8193a9]" data-testid="text-sip-assumptions">Estimate only; not a guarantee of returns and not financial advice. The projection assumes a constant annual return, equal investments at the start of every month, and monthly compounding at one-twelfth of the annual rate. Taxes, fund charges, inflation and market volatility are not included, and actual results can be lower or negative.</p>
    <section aria-labelledby="sip-faq-heading" className="mt-6 border-t border-[#26364b] pt-6">
      <h2 id="sip-faq-heading" className="text-base font-extrabold text-white">SIP calculator FAQ</h2>
      <div className="mt-3 divide-y divide-[#26364b] rounded-xl border border-[#26364b]">
        {sipFaqs.map((faq) => <details key={faq.question} className="group px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold text-[#e8eef7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/25">{faq.question}</summary>
          <p className="mt-2 text-xs leading-5 text-[#9fb0c5]">{faq.answer}</p>
        </details>)}
      </div>
    </section>
  </ToolPanel>;
}

export function WordCounter() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const counts = countText(text);

  async function copyTextToClipboard() {
    try {
      await copyText(text);
      setCopied(true);
      setCopyError("");
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      setCopyError(error instanceof Error ? error.message : "Could not copy the text.");
    }
  }

  const stats = [
    ["Words", counts.words, "result-word-count"],
    ["Characters", counts.characters, "result-character-count"],
    ["Characters without spaces", counts.charactersNoSpaces, "result-character-count-no-spaces"],
    ["Sentences", counts.sentences, "result-sentence-count"],
    ["Paragraphs", counts.paragraphs, "result-paragraph-count"],
    ["Reading time", `${counts.readingMinutes} min`, "result-reading-time"],
  ] as const;

  return <ToolPanel>
    <ToolField label="Paste or write your text" htmlFor="word-counter-text" hint="Counts update as you type. Text stays in this browser tab.">
      <textarea id="word-counter-text" data-testid="input-word-counter-text" className={`${toolTextareaClass} min-h-[260px] resize-y`} placeholder="Start typing or paste your text here…" value={text} onChange={(event) => { setText(event.target.value); setCopied(false); setCopyError(""); }} />
    </ToolField>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[#8193a9]">Reading time estimated at 200 words per minute.</p>
      <div className="flex gap-2">
        <button type="button" data-testid="button-copy-word-counter-text" className={secondaryButtonClass} disabled={!text} onClick={copyTextToClipboard}>{copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{copied ? "Copied" : "Copy text"}</button>
        <button type="button" data-testid="button-clear-word-counter" className={secondaryButtonClass} disabled={!text} onClick={() => { setText(""); setCopied(false); setCopyError(""); }}>Clear</button>
      </div>
    </div>
    {copyError && <p role="alert" className="mt-3 text-xs text-[#ffb9be]">{copyError}</p>}
    <div aria-label="Text statistics" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map(([label, value, testId]) => <ResultStat key={label} label={label} value={String(value)} testId={testId} />)}
    </div>
  </ToolPanel>;
}

export function PasswordGenerator() {
  const [length, setLength] = useState(20);
  const [selectedGroups, setSelectedGroups] = useState(passwordGroups.map((group) => group.id));
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  function generate() {
    try {
      setPassword(generateSecurePassword(length, selectedGroups, excludeAmbiguous));
      setStatus("New password generated locally with the Web Crypto API.");
      setCopied(false);
    } catch (error) {
      setPassword("");
      setStatus(error instanceof Error ? error.message : "Could not generate a password.");
    }
  }

  async function copyPassword() {
    try {
      await copyText(password);
      setCopied(true);
      setStatus("Password copied to your clipboard.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not copy the password.");
    }
  }

  function toggleGroup(id: string) {
    setSelectedGroups((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[0.82fr_1.18fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">Password settings</h2>
        <div className="mt-5">
          <ToolField label={`Length — ${length} characters`} htmlFor="password-length">
            <input id="password-length" data-testid="input-password-length" className="mt-4 w-full accent-[#3b82f6]" type="range" min="8" max="64" step="1" value={length} onChange={(event) => { setLength(Number(event.target.value)); setPassword(""); setStatus(""); setCopied(false); }} />
          </ToolField>
        </div>
        <fieldset className="mt-6">
          <legend className="text-xs font-bold text-[#cbd5e1]">Include character types</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {passwordGroups.map((group) => <label key={group.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#2c3a4c] bg-[#152031] px-3 text-xs font-semibold text-[#cbd5e1]">
              <input type="checkbox" data-testid={`checkbox-${group.id}`} className="h-4 w-4 accent-[#3b82f6]" checked={selectedGroups.includes(group.id)} onChange={() => { toggleGroup(group.id); setPassword(""); setStatus(""); setCopied(false); }} />
              {group.label}
            </label>)}
          </div>
        </fieldset>
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#2c3a4c] bg-[#152031] px-3 text-xs font-semibold text-[#cbd5e1]">
          <input type="checkbox" data-testid="checkbox-exclude-ambiguous" className="h-4 w-4 accent-[#3b82f6]" checked={excludeAmbiguous} onChange={(event) => { setExcludeAmbiguous(event.target.checked); setPassword(""); setStatus(""); setCopied(false); }} />
          Exclude similar-looking characters (0, O, 1, l)
        </label>
        <button type="button" data-testid="button-generate-password" className={`${primaryButtonClass} mt-6 w-full`} onClick={generate}><RefreshCw aria-hidden="true" className="h-4 w-4" />Generate password</button>
      </div>
      <div className="flex flex-col">
        <h2 className="text-base font-extrabold text-white">Your password</h2>
        <div className="mt-4 flex min-h-24 items-center rounded-2xl border border-[#2d4058] bg-[#0b1320] p-4">
          <output data-testid="result-generated-password" aria-live="polite" className="w-full break-all font-mono text-lg font-bold tracking-wide text-[#dce9fb]">{password || "Generate a password to see it here"}</output>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="button-copy-password" className={secondaryButtonClass} disabled={!password} onClick={copyPassword}>{copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{copied ? "Copied" : "Copy password"}</button>
        </div>
        <p role="status" aria-live="polite" data-testid="status-password" className="mt-4 min-h-5 text-xs text-[#84cba5]">{status}</p>
        <p className="mt-auto flex items-start gap-2 border-t border-[#26364b] pt-4 text-xs leading-5 text-[#8193a9]"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#63c293]" />This password is generated on your device. ToolHub does not receive or store it.</p>
      </div>
    </div>
  </ToolPanel>;
}

export function AiPromptGenerator() {
  const [fields, setFields] = useState<PromptFields>({
    task: "", role: "", audience: "", context: "", tone: "Clear, direct, and practical", format: "Step-by-step plan", constraints: "",
  });
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  function update<K extends keyof PromptFields>(key: K, value: PromptFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }
  function generate() {
    setPrompt(buildAiPrompt(fields));
    setStatus("Prompt generated. You can edit it before copying.");
    setCopied(false);
  }
  async function copyPrompt() {
    try {
      await copyText(prompt);
      setCopied(true);
      setStatus("Prompt copied to your clipboard.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not copy the prompt.");
    }
  }

  return <div className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
    <ToolPanel>
      <h2 className="text-base font-extrabold text-white">Prompt details</h2>
      <p className="mt-1 text-xs leading-5 text-[#8193a9]">Add enough context to get a focused result. Only the task is required.</p>
      <div className="mt-5 space-y-4">
        <ToolField label="What should the AI do?" htmlFor="prompt-task">
          <textarea id="prompt-task" data-testid="input-prompt-task" className={`${toolTextareaClass} min-h-24`} placeholder="For example: Create a weekly vegetarian meal plan…" value={fields.task} onChange={(event) => update("task", event.target.value)} />
        </ToolField>
        <ToolField label="Role or expertise" htmlFor="prompt-role">
          <input id="prompt-role" data-testid="input-prompt-role" className={toolInputClass} placeholder="e.g. experienced nutritionist" value={fields.role} onChange={(event) => update("role", event.target.value)} />
        </ToolField>
        <div className="grid gap-4 sm:grid-cols-2">
          <ToolField label="Audience" htmlFor="prompt-audience">
            <input id="prompt-audience" data-testid="input-prompt-audience" className={toolInputClass} placeholder="Who is this for?" value={fields.audience} onChange={(event) => update("audience", event.target.value)} />
          </ToolField>
          <ToolField label="Tone" htmlFor="prompt-tone">
            <input id="prompt-tone" data-testid="input-prompt-tone" className={toolInputClass} placeholder="e.g. friendly and concise" value={fields.tone} onChange={(event) => update("tone", event.target.value)} />
          </ToolField>
        </div>
        <ToolField label="Context" htmlFor="prompt-context">
          <textarea id="prompt-context" data-testid="input-prompt-context" className={`${toolTextareaClass} min-h-24`} placeholder="Background or source details the AI should know…" value={fields.context} onChange={(event) => update("context", event.target.value)} />
        </ToolField>
        <ToolField label="Desired output format" htmlFor="prompt-format">
          <input id="prompt-format" data-testid="input-prompt-format" className={toolInputClass} placeholder="e.g. a table with a short summary" value={fields.format} onChange={(event) => update("format", event.target.value)} />
        </ToolField>
        <ToolField label="Requirements or constraints" htmlFor="prompt-constraints">
          <textarea id="prompt-constraints" data-testid="input-prompt-constraints" className={`${toolTextareaClass} min-h-24`} placeholder="Limits, must-haves, things to avoid…" value={fields.constraints} onChange={(event) => update("constraints", event.target.value)} />
        </ToolField>
        <button type="button" data-testid="button-generate-prompt" className={primaryButtonClass} disabled={!fields.task.trim()} onClick={generate}><Sparkles aria-hidden="true" className="h-4 w-4" />Build prompt</button>
      </div>
    </ToolPanel>
    <ToolPanel className="flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-base font-extrabold text-white">Generated prompt</h2><p className="mt-1 text-xs leading-5 text-[#8193a9]">Review and edit it before using it with an AI.</p></div>
        <button type="button" data-testid="button-copy-prompt" className={secondaryButtonClass} disabled={!prompt} onClick={copyPrompt}>{copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{copied ? "Copied" : "Copy"}</button>
      </div>
      <textarea data-testid="result-generated-prompt" aria-label="Generated prompt" className={`${toolTextareaClass} mt-4 min-h-[430px] flex-1 resize-y font-mono text-xs`} placeholder="Enter a task and build your prompt…" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
      <p role="status" aria-live="polite" data-testid="status-prompt" className="mt-3 min-h-5 text-xs text-[#84cba5]">{status}</p>
    </ToolPanel>
  </div>;
}

export function CharacterCounter() {
  const [text, setText] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const counts = countCharacters(text);
  const summary = describeCounts(counts);
  const stats = [
    ["Characters", counts.characters, "result-char-count"],
    ["Without spaces", counts.charactersNoSpaces, "result-char-count-no-spaces"],
    ["Words", counts.words, "result-char-word-count"],
    ["Letters", counts.letters, "result-char-letters"],
    ["Numbers", counts.numbers, "result-char-numbers"],
    ["Spaces & line breaks", counts.whitespace, "result-char-whitespace"],
    ["Lines", counts.lines, "result-char-lines"],
  ] as const;

  // Screen-reader users cannot see the tiles update while typing, so announce a
  // short summary once typing pauses instead of on every keystroke. Nothing is
  // announced on first load while the field is still empty.
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncement((previous) => (text || previous ? summary : "")), 800);
    return () => window.clearTimeout(timer);
  }, [text, summary]);

  function clearText() {
    setText("");
    // The Clear button disables itself once the field is empty, which would drop
    // keyboard focus to the page; hand focus back to the text field instead.
    textareaRef.current?.focus();
  }

  return <ToolPanel>
    <ToolField label="Enter or paste your text" htmlFor="character-counter-text" hint="Counts update instantly. Your text stays in this browser.">
      <textarea ref={textareaRef} id="character-counter-text" data-testid="input-character-counter-text" className={`${toolTextareaClass} min-h-[260px] resize-y`} placeholder="Type or paste text here…" value={text} onChange={(event) => setText(event.target.value)} />
    </ToolField>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[#8193a9]">Useful for social posts, titles, descriptions and character limits.</p>
      <button type="button" data-testid="button-clear-character-counter" className={secondaryButtonClass} disabled={!text} onClick={clearText}>Clear text</button>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true" data-testid="status-character-counter" className="sr-only">{announcement}</p>
    <div role="group" aria-label="Character statistics" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map(([label, value, testId]) => <ResultStat key={label} label={label} value={String(value)} testId={testId} />)}
    </div>
  </ToolPanel>;
}


const caseModes: { value: CaseMode; label: string; description: string }[] = [
  { value: "uppercase", label: "UPPERCASE", description: "MAKE EVERY LETTER CAPITAL" },
  { value: "lowercase", label: "lowercase", description: "make every letter lowercase" },
  { value: "title", label: "Title Case", description: "Capitalize Each Word" },
  { value: "sentence", label: "Sentence case", description: "Capitalize the start of sentences." },
  { value: "capitalize", label: "Capitalize Words", description: "Capitalize the first letter of each word" },
];

export function CaseConverter() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<CaseMode>("sentence");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const output = convertCase(text, mode);

  async function copyOutput() {
    try {
      await copyText(output);
      setCopied(true);
      setStatus("Converted text copied to your clipboard.");
    } catch (error) {
      setCopied(false);
      setStatus(error instanceof Error ? error.message : "Could not copy the text.");
    }
  }

  function chooseMode(nextMode: CaseMode) {
    setMode(nextMode);
    setCopied(false);
    setStatus("");
  }

  return <ToolPanel>
    <ToolField label="Your text" htmlFor="case-converter-input" hint="Paste or type text, then choose a case style. The result updates instantly.">
      <textarea id="case-converter-input" data-testid="input-case-converter" className={`${toolTextareaClass} min-h-[220px] resize-y`} placeholder="Type or paste text here…" value={text} onChange={(event) => { setText(event.target.value); setCopied(false); setStatus(""); }} />
    </ToolField>
    <div className="mt-5">
      <p className="mb-3 text-sm font-bold text-white">Convert to</p>
      <div className="flex flex-wrap gap-2">
        {caseModes.map((item) => <button key={item.value} type="button" data-testid={`button-case-${item.value}`} aria-pressed={mode === item.value} className={mode === item.value ? primaryButtonClass : secondaryButtonClass} onClick={() => chooseMode(item.value)}>{item.label}</button>)}
      </div>
    </div>
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="case-converter-output" className="text-sm font-bold text-white">Converted text</label>
        <button type="button" data-testid="button-copy-case-converter" className={secondaryButtonClass} disabled={!output} onClick={copyOutput}>{copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{copied ? "Copied" : "Copy result"}</button>
      </div>
      <textarea id="case-converter-output" data-testid="result-case-converter" aria-label="Converted text" className={`${toolTextareaClass} mt-3 min-h-[220px] resize-y`} placeholder="Your converted text will appear here…" value={output} readOnly />
      <p role="status" aria-live="polite" data-testid="status-case-converter" className="mt-3 min-h-5 text-xs text-[#84cba5]">{status}</p>
    </div>
    <div className="mt-2 flex justify-end">
      <button type="button" data-testid="button-clear-case-converter" className={secondaryButtonClass} disabled={!text} onClick={() => { setText(""); setCopied(false); setStatus(""); }}>Clear text</button>
    </div>
  </ToolPanel>;
}
