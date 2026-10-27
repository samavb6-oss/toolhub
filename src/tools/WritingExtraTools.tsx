import { useState } from "react";
import { BookOpen, Check, Copy, Trash2 } from "lucide-react";
import { ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass, toolInputClass, toolTextareaClass } from "./ToolPageFrame";
import { copyText } from "./toolUtils";
import { estimateReadingTime, generateLoremIpsum, LOREM_LIMITS, READING_SPEEDS } from "./writingExtraLogic";

export function ReadTimeTool() {
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(200);
  const [copyStatus, setCopyStatus] = useState("");
  const estimate = estimateReadingTime(text, speed);

  async function copyInput() {
    try {
      await copyText(text);
      setCopyStatus("Text copied to the clipboard.");
    } catch {
      setCopyStatus("Clipboard access is unavailable in this browser.");
    }
  }

  return <ToolPanel>
    <p className="mb-5 text-sm leading-6 text-[#aab7c9]">Paste an article, essay or script to estimate how long it may take to read. This is a rough estimate based on your selected reading speed; actual pace varies.</p>
    <ToolField label="Text to estimate" htmlFor="read-time-text" hint="Your text is processed locally in this browser and is not uploaded.">
      <textarea id="read-time-text" data-testid="input-read-time-text" className={`${toolTextareaClass} min-h-[240px] resize-y`} value={text} onChange={(event) => { setText(event.target.value); setCopyStatus(""); }} placeholder="Paste or type your text here…" />
    </ToolField>
    <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_2fr]">
      <ToolField label="Reading speed" htmlFor="read-time-speed" hint="Typical adult reading speeds vary by text and reader.">
        <select id="read-time-speed" data-testid="select-read-time-speed" className={toolInputClass} value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
          {READING_SPEEDS.map((value) => <option key={value} value={value}>{value} words/minute</option>)}
        </select>
      </ToolField>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#2d4058] bg-[#162336] p-4"><p className="text-xs font-semibold text-[#91a3b9]">Word count</p><p data-testid="result-read-time-words" className="mt-2 text-2xl font-extrabold text-white">{estimate.words.toLocaleString()}</p></div>
        <div className="rounded-xl border border-[#2d4058] bg-[#162336] p-4"><p className="text-xs font-semibold text-[#91a3b9]">Estimated read</p><p data-testid="result-read-time-minutes" className="mt-2 text-2xl font-extrabold text-white">{estimate.minutes === 0 ? "—" : estimate.minutes === 1 ? "1 min" : `${estimate.minutes} min`}</p></div>
      </div>
    </div>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" data-testid="button-read-time-copy" className={secondaryButtonClass} disabled={!text} onClick={copyInput}>{copyStatus === "Text copied to the clipboard." ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{copyStatus === "Text copied to the clipboard." ? "Copied" : "Copy text"}</button>
      <button type="button" data-testid="button-read-time-clear" className={secondaryButtonClass} disabled={!text} onClick={() => { setText(""); setCopyStatus(""); }}><Trash2 aria-hidden="true" className="h-4 w-4" />Clear</button>
    </div>
    <p role="status" aria-live="polite" className="mt-3 min-h-5 text-xs text-[#91a3b9]">{copyStatus}</p>
  </ToolPanel>;
}

export function LoremIpsumTool() {
  const [paragraphs, setParagraphs] = useState(3);
  const [wordsPerParagraph, setWordsPerParagraph] = useState(60);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");

  function generate() {
    setOutput(generateLoremIpsum(paragraphs, wordsPerParagraph));
    setStatus("Placeholder text generated locally.");
  }

  async function copyOutput() {
    try {
      await copyText(output);
      setStatus("Text copied to the clipboard.");
    } catch {
      setStatus("Clipboard access is unavailable in this browser.");
    }
  }

  return <ToolPanel>
    <p className="mb-5 text-sm leading-6 text-[#aab7c9]">Generate classic Lorem Ipsum placeholder copy for page layouts, mockups and design prototypes. The text is generated locally; it is filler, not meaningful content.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <ToolField label="Paragraphs" htmlFor="lorem-paragraphs">
        <select id="lorem-paragraphs" data-testid="select-lorem-paragraphs" className={toolInputClass} value={paragraphs} onChange={(event) => setParagraphs(Number(event.target.value))}>
          {Array.from({ length: LOREM_LIMITS.maxParagraphs }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} {value === 1 ? "paragraph" : "paragraphs"}</option>)}
        </select>
      </ToolField>
      <ToolField label="Words per paragraph" htmlFor="lorem-words-per-paragraph">
        <select id="lorem-words-per-paragraph" data-testid="select-lorem-words-per-paragraph" className={toolInputClass} value={wordsPerParagraph} onChange={(event) => setWordsPerParagraph(Number(event.target.value))}>
          {Array.from({ length: (LOREM_LIMITS.maxWordsPerParagraph - LOREM_LIMITS.minWordsPerParagraph) / 20 + 1 }, (_, index) => LOREM_LIMITS.minWordsPerParagraph + index * 20).map((value) => <option key={value} value={value}>{value} words</option>)}
        </select>
      </ToolField>
    </div>
    <div className="mt-5">
      <ToolField label="Generated placeholder text" htmlFor="lorem-output" hint="Choose your settings, then generate or copy the result.">
        <textarea id="lorem-output" data-testid="output-lorem-text" className={`${toolTextareaClass} min-h-[260px] resize-y`} value={output} onChange={(event) => { setOutput(event.target.value); setStatus(""); }} placeholder="Your Lorem Ipsum text will appear here…" />
      </ToolField>
    </div>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" data-testid="button-lorem-generate" className={primaryButtonClass} onClick={generate}><BookOpen aria-hidden="true" className="h-4 w-4" />Generate placeholder text</button>
      <button type="button" data-testid="button-lorem-copy" className={secondaryButtonClass} disabled={!output} onClick={copyOutput}>{status === "Text copied to the clipboard." ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{status === "Text copied to the clipboard." ? "Copied" : "Copy text"}</button>
      <button type="button" data-testid="button-lorem-clear" className={secondaryButtonClass} disabled={!output} onClick={() => { setOutput(""); setStatus(""); }}><Trash2 aria-hidden="true" className="h-4 w-4" />Clear</button>
    </div>
    <p role="status" aria-live="polite" className="mt-3 min-h-5 text-xs text-[#91a3b9]">{status}</p>
  </ToolPanel>;
}