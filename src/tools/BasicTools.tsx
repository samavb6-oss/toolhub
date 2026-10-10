import { useState } from "react";
import { Check, Copy, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import {
  ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass,
  toolInputClass, toolTextareaClass,
} from "./ToolPageFrame";
import {
  buildAiPrompt, calculateEmi, countText, generateSecurePassword, passwordGroups,
} from "./basicToolLogic";
import type { PromptFields } from "./basicToolLogic";
import { copyText } from "./toolUtils";

function ResultStat({ label, value, detail, testId }: { label: string; value: string; detail?: string; testId: string }) {
  return <div className="rounded-2xl border border-[#2d4058] bg-[#162336] p-4">
    <p className="text-xs font-semibold text-[#91a3b9]">{label}</p>
    <p data-testid={testId} className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-white">{value}</p>
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
  const emi = isValid ? calculateEmi(principal, annualRate, months) : 0;
  const totalPayment = emi * months;

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
      </div>
      <section aria-label="EMI results" className="rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-5 sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]">Estimated monthly payment</p>
        <p data-testid="result-emi-monthly" className="mt-2 text-4xl font-extrabold tracking-[-0.06em] text-white">{isValid ? inr(emi) : "—"}</p>
        <p className="mt-2 text-xs text-[#91a3b9]">{isValid ? `${months} monthly payments` : "Correct the values to calculate your EMI."}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ResultStat label="Total interest" value={isValid ? inr(totalPayment - principal) : "—"} testId="result-emi-interest" />
          <ResultStat label="Total repayment" value={isValid ? inr(totalPayment) : "—"} testId="result-emi-total" />
        </div>
      </section>
    </div>
    <p className="mt-6 border-t border-[#26364b] pt-4 text-xs leading-5 text-[#8193a9]">Estimate only. The calculation assumes a fixed annual rate with monthly compounding and equal payments; lender fees and rate changes are not included.</p>
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
      <textarea id="word-counter-text" data-testid="input-word-counter-text" className={`${toolTextareaClass} min-h-[260px] resize-y`} placeholder="Start typing or paste your text here…" value={text} onChange={(event) => setText(event.target.value)} />
    </ToolField>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[#8193a9]">Reading time estimated at 200 words per minute.</p>
      <div className="flex gap-2">
        <button type="button" data-testid="button-copy-word-counter-text" className={secondaryButtonClass} disabled={!text} onClick={copyTextToClipboard}>{copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{copied ? "Copied" : "Copy text"}</button>
        <button type="button" data-testid="button-clear-word-counter" className={secondaryButtonClass} disabled={!text} onClick={() => { setText(""); setCopyError(""); }}>Clear</button>
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
  const characters = Array.from(text).length;
  const charactersNoSpaces = Array.from(text.replace(/\\s/gu, "")).length;
  const words = text.match(/[\\p{L}\\p{N}][\\p{L}\\p{N}'’_-]*/gu)?.length ?? 0;
  const letters = (text.match(/\\p{L}/gu) ?? []).length;
  const numbers = (text.match(/\\p{N}/gu) ?? []).length;
  const spaces = (text.match(/\\s/gu) ?? []).length;
  const lines = text.length ? text.split(/\\r\\n|\\r|\\n/u).length : 0;
  const stats = [
    ["Characters", characters, "result-char-count"],
    ["Without spaces", charactersNoSpaces, "result-char-count-no-spaces"],
    ["Words", words, "result-char-word-count"],
    ["Letters", letters, "result-char-letters"],
    ["Numbers", numbers, "result-char-numbers"],
    ["Spaces & line breaks", spaces, "result-char-whitespace"],
    ["Lines", lines, "result-char-lines"],
  ] as const;

  return <ToolPanel>
    <ToolField label="Enter or paste your text" htmlFor="character-counter-text" hint="Counts update instantly. Your text stays in this browser.">
      <textarea id="character-counter-text" data-testid="input-character-counter-text" className={`${toolTextareaClass} min-h-[260px] resize-y`} placeholder="Type or paste text here…" value={text} onChange={(event) => setText(event.target.value)} />
    </ToolField>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-[#8193a9]">Useful for social posts, titles, descriptions and character limits.</p>
      <button type="button" data-testid="button-clear-character-counter" className={secondaryButtonClass} disabled={!text} onClick={() => setText("")}>Clear text</button>
    </div>
    <div aria-label="Character statistics" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map(([label, value, testId]) => <ResultStat key={label} label={label} value={String(value)} testId={testId} />)}
    </div>
  </ToolPanel>;
}
