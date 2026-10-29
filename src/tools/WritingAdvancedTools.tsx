import { useState } from "react";
import { Check, Copy, FileText, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass, toolInputClass, toolTextareaClass } from "./ToolPageFrame";
import { copyText } from "./toolUtils";
import { applyWritingSuggestions, checkWriting, summarizeText, type SummaryResult, type WritingIssue } from "./writingAdvancedLogic";

const maxTextLength = 20_000;

export function GrammarCheckerTool() {
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<WritingIssue[]>([]);
  const [corrected, setCorrected] = useState("");
  const [status, setStatus] = useState("");

  function checkText() {
    const found = checkWriting(text);
    setIssues(found);
    setCorrected("");
    setStatus(text.trim() ? (found.length ? `Found ${found.length} possible issue${found.length === 1 ? "" : "s"}. Review each suggestion before using it.` : "No issues were found by these basic checks.") : "Enter some text to check.");
  }

  function previewCorrections() {
    setCorrected(applyWritingSuggestions(text, issues));
    setStatus("Suggested edits are shown below. Review them before copying.");
  }

  async function copyCorrections() {
    try {
      await copyText(corrected);
      setStatus("Suggested text copied to the clipboard.");
    } catch {
      setStatus("Clipboard access is unavailable in this browser.");
    }
  }

  return <ToolPanel>
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#3b4b62] bg-[#101a28] p-4">
      <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#8db7ff]" />
      <div className="space-y-1">
        <p className="text-sm font-bold text-white">Private, rule-based writing checks</p>
        <p className="text-xs leading-5 text-[#aab7c9]">Checks common typos, repeated words, spacing, capitalization and a few common grammar patterns. It is a lightweight helper, not a full grammar proofreader. Your text stays in this browser.</p>
      </div>
    </div>
    <ToolField label="Text to check" htmlFor="grammar-checker-input" hint={`${text.length.toLocaleString()} / ${maxTextLength.toLocaleString()} characters. Text is checked locally.`}>
      <textarea id="grammar-checker-input" data-testid="input-grammar-checker" className={`${toolTextareaClass} min-h-[220px] resize-y`} maxLength={maxTextLength} value={text} onChange={(event) => { setText(event.target.value); setIssues([]); setCorrected(""); setStatus(""); }} placeholder="Paste a paragraph or draft here…" />
    </ToolField>
    <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" data-testid="button-grammar-check" className={primaryButtonClass} disabled={!text.trim()} onClick={checkText}><ShieldCheck aria-hidden="true" className="h-4 w-4" />Check text</button>
      <button type="button" data-testid="button-grammar-clear" className={secondaryButtonClass} disabled={!text} onClick={() => { setText(""); setIssues([]); setCorrected(""); setStatus(""); }}><RotateCcw aria-hidden="true" className="h-4 w-4" />Clear</button>
    </div>
    {issues.length > 0 && <section className="mt-5 space-y-3" aria-label="Writing suggestions" data-testid="list-grammar-issues">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-white">Suggestions</h3><span className="rounded-full border border-[#3b4b62] px-2.5 py-1 text-xs text-[#cbd5e1]">{issues.length} found</span></div>
      {issues.map((issue, index) => <div key={`${issue.start}-${issue.end}-${issue.reason}`} className="rounded-xl border border-[#28394e] bg-[#0c1522] p-3" data-testid={`grammar-issue-${index}`}>
        <div className="flex flex-wrap items-center gap-2 text-sm"><span className="rounded bg-[#3b2429] px-2 py-1 text-[#ffb9be] line-through">{issue.original.replace(/ /g, "·").replace(/\t/g, "⇥").replace(/\n/g, "↵")}</span><span aria-hidden="true" className="text-[#8193a9]">→</span><span className="rounded bg-[#15352b] px-2 py-1 text-[#a6e6c3]">{issue.suggestion}</span></div>
        <p className="mt-2 text-xs leading-5 text-[#aab7c9]">{issue.reason}</p>
      </div>)}
      <button type="button" data-testid="button-grammar-preview" className={secondaryButtonClass} onClick={previewCorrections}><Sparkles aria-hidden="true" className="h-4 w-4" />Preview suggested edits</button>
    </section>}
    {corrected && <div className="mt-5 space-y-3" data-testid="grammar-corrected-preview">
      <ToolField label="Suggested text — review before using" htmlFor="grammar-corrected-output"><textarea id="grammar-corrected-output" data-testid="output-grammar-corrected" className={`${toolTextareaClass} min-h-[180px] resize-y`} value={corrected} readOnly /></ToolField>
      <button type="button" data-testid="button-grammar-copy" className={secondaryButtonClass} onClick={copyCorrections}><Copy aria-hidden="true" className="h-4 w-4" />Copy suggested text</button>
    </div>}
    <p role="status" aria-live="polite" data-testid="status-grammar-checker" className="mt-4 min-h-5 text-xs text-[#91a3b9]">{status}</p>
  </ToolPanel>;
}

export function TextSummarizerTool() {
  const [text, setText] = useState("");
  const [sentenceCount, setSentenceCount] = useState(3);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [status, setStatus] = useState("");

  function generate() {
    setResult(summarizeText(text, sentenceCount));
    setStatus(text.trim() ? "Extractive summary generated locally. Check it against the original before relying on it." : "Enter some text to summarize.");
  }

  async function copySummary() {
    if (!result?.summary) return;
    try {
      await copyText(result.summary);
      setStatus("Summary copied to the clipboard.");
    } catch {
      setStatus("Clipboard access is unavailable in this browser.");
    }
  }

  return <ToolPanel>
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#3b4b62] bg-[#101a28] p-4">
      <FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#8db7ff]" />
      <div className="space-y-1">
        <p className="text-sm font-bold text-white">Extractive summary — no AI model or upload</p>
        <p className="text-xs leading-5 text-[#aab7c9]">Selects sentences that score highly for repeated key terms and keeps their original wording. It does not generate new sentences or understand nuance like a human editor. Your text stays in this browser.</p>
      </div>
    </div>
    <ToolField label="Text to summarize" htmlFor="text-summarizer-input" hint={`${text.length.toLocaleString()} / ${maxTextLength.toLocaleString()} characters. Long text is capped at ${maxTextLength.toLocaleString()} characters.`}>
      <textarea id="text-summarizer-input" data-testid="input-text-summarizer" className={`${toolTextareaClass} min-h-[240px] resize-y`} maxLength={maxTextLength} value={text} onChange={(event) => { setText(event.target.value); setResult(null); setStatus(""); }} placeholder="Paste an article, notes or a longer passage…" />
    </ToolField>
    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_2fr]">
      <ToolField label="Target summary length" htmlFor="text-summarizer-sentences">
        <select id="text-summarizer-sentences" data-testid="select-text-summarizer-sentences" className={toolInputClass} value={sentenceCount} onChange={(event) => { setSentenceCount(Number(event.target.value)); setResult(null); setStatus(""); }}>
          {[2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value} sentences</option>)}
        </select>
      </ToolField>
      <div className="flex items-end gap-3"><button type="button" data-testid="button-text-summarizer-generate" className={primaryButtonClass} disabled={!text.trim()} onClick={generate}><Sparkles aria-hidden="true" className="h-4 w-4" />Summarize text</button><button type="button" data-testid="button-text-summarizer-clear" className={secondaryButtonClass} disabled={!text} onClick={() => { setText(""); setResult(null); setStatus(""); }}><RotateCcw aria-hidden="true" className="h-4 w-4" />Clear</button></div>
    </div>
    {result && <section className="mt-5 space-y-4" aria-label="Summary result" data-testid="text-summarizer-result">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#2d4058] bg-[#162336] p-3"><p className="text-xs text-[#91a3b9]">Original words</p><p data-testid="result-summarizer-source-words" className="mt-1 text-xl font-extrabold text-white">{result.sourceWords.toLocaleString()}</p></div>
        <div className="rounded-xl border border-[#2d4058] bg-[#162336] p-3"><p className="text-xs text-[#91a3b9]">Summary words</p><p data-testid="result-summarizer-summary-words" className="mt-1 text-xl font-extrabold text-white">{result.summaryWords.toLocaleString()}</p></div>
        <div className="rounded-xl border border-[#2d4058] bg-[#162336] p-3"><p className="text-xs text-[#91a3b9]">Source sentences</p><p className="mt-1 text-xl font-extrabold text-white">{result.sourceSentences.toLocaleString()}</p></div>
        <div className="rounded-xl border border-[#2d4058] bg-[#162336] p-3"><p className="text-xs text-[#91a3b9]">Selected sentences</p><p className="mt-1 text-xl font-extrabold text-white">{result.summarySentences.toLocaleString()}</p></div>
      </div>
      <ToolField label="Summary" htmlFor="text-summarizer-output"><textarea id="text-summarizer-output" data-testid="output-text-summarizer" className={`${toolTextareaClass} min-h-[180px] resize-y`} value={result.summary} readOnly placeholder="Your summary will appear here…" /></ToolField>
      <button type="button" data-testid="button-text-summarizer-copy" className={secondaryButtonClass} disabled={!result.summary} onClick={copySummary}>{status === "Summary copied to the clipboard." ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{status === "Summary copied to the clipboard." ? "Copied" : "Copy summary"}</button>
    </section>}
    <p role="status" aria-live="polite" data-testid="status-text-summarizer" className="mt-4 min-h-5 text-xs text-[#91a3b9]">{status}</p>
  </ToolPanel>;
}
