import { useState } from "react";
import { Check, Copy, RotateCcw, Trash2 } from "lucide-react";
import { ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass, toolTextareaClass } from "./ToolPageFrame";
import { cleanText } from "./textCleanerLogic";
import type { TextCleanerOptions } from "./textCleanerLogic";
import { copyText } from "./toolUtils";

const defaultOptions: TextCleanerOptions = {
  trimLines: true,
  collapseHorizontalWhitespace: false,
  removeBlankLines: false,
  removeDuplicateLines: false,
  normalizeLineEndings: false,
};

export default function TextCleanerTool() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<TextCleanerOptions>(defaultOptions);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");

  const output = cleanText(input, options);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (copyStatus !== "idle") {
      setCopyStatus("idle");
    }
  };

  const handleOptionChange = (key: keyof TextCleanerOptions, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
    if (copyStatus !== "idle") {
      setCopyStatus("idle");
    }
  };

  const handleCopy = async () => {
    try {
      await copyText(output);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  };

  const handleClear = () => {
    setInput("");
    setCopyStatus("idle");
  };

  const handleReset = () => {
    setOptions(defaultOptions);
    setCopyStatus("idle");
  };

  return (
    <ToolPanel>
      <p className="mb-5 text-sm leading-6 text-[#aab7c9]">
        Operations apply in order: normalize line endings, collapse horizontal whitespace, trim line edges, remove blank lines, then remove duplicates.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ToolField label="Input" htmlFor="input-text-cleaner">
          <textarea
            id="input-text-cleaner"
            data-testid="input-text-cleaner"
            className={toolTextareaClass}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste or type your text here..."
            rows={10}
          />
        </ToolField>

        <ToolField label="Output" htmlFor="output-text-cleaner">
          <textarea
            id="output-text-cleaner"
            data-testid="output-text-cleaner"
            className={toolTextareaClass}
            value={output}
            readOnly
            placeholder="Cleaned text will appear here..."
            rows={10}
            aria-live="polite"
          />
        </ToolField>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-[#aab7c9]">
        <div className="flex gap-4">
          <span data-testid="result-text-cleaner-input-count">
            Input: {input.length} characters
          </span>
          <span data-testid="result-text-cleaner-output-count">
            Output: {output.length} characters
          </span>
        </div>

        <span
          data-testid="status-text-cleaner-copy"
          role="status"
          className={
            copyStatus === "success"
              ? "text-green-400"
              : copyStatus === "error"
                ? "text-red-400"
                : ""
          }
        >
          {copyStatus === "success" && "Copied!"}
          {copyStatus === "error" && "Failed to copy"}
        </span>
      </div>

      <fieldset className="mt-5 rounded-2xl border border-[#2d4058] bg-[#162336] p-4">
        <legend className="px-2 text-sm font-bold text-[#cbd5e1]">Options</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#cbd5e1]">
            <input
              type="checkbox"
              data-testid="option-text-cleaner-trim"
              checked={options.trimLines}
              onChange={(e) => handleOptionChange("trimLines", e.target.checked)}
              className="h-4 w-4 rounded border-[#52637a] bg-[#111b29] text-[#2d6cdf] focus:ring-[#8db7ff]"
            />
            Trim each line
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#cbd5e1]">
            <input
              type="checkbox"
              data-testid="option-text-cleaner-collapse"
              checked={options.collapseHorizontalWhitespace}
              onChange={(e) => handleOptionChange("collapseHorizontalWhitespace", e.target.checked)}
              className="h-4 w-4 rounded border-[#52637a] bg-[#111b29] text-[#2d6cdf] focus:ring-[#8db7ff]"
            />
            Collapse repeated spaces/tabs
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#cbd5e1]">
            <input
              type="checkbox"
              data-testid="option-text-cleaner-blank"
              checked={options.removeBlankLines}
              onChange={(e) => handleOptionChange("removeBlankLines", e.target.checked)}
              className="h-4 w-4 rounded border-[#52637a] bg-[#111b29] text-[#2d6cdf] focus:ring-[#8db7ff]"
            />
            Remove blank lines
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#cbd5e1]">
            <input
              type="checkbox"
              data-testid="option-text-cleaner-duplicates"
              checked={options.removeDuplicateLines}
              onChange={(e) => handleOptionChange("removeDuplicateLines", e.target.checked)}
              className="h-4 w-4 rounded border-[#52637a] bg-[#111b29] text-[#2d6cdf] focus:ring-[#8db7ff]"
            />
            Remove duplicate lines
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#cbd5e1]">
            <input
              type="checkbox"
              data-testid="option-text-cleaner-line-endings"
              checked={options.normalizeLineEndings}
              onChange={(e) => handleOptionChange("normalizeLineEndings", e.target.checked)}
              className="h-4 w-4 rounded border-[#52637a] bg-[#111b29] text-[#2d6cdf] focus:ring-[#8db7ff]"
            />
            Normalize CRLF/CR to LF
          </label>
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="button-text-cleaner-copy"
          onClick={handleCopy}
          disabled={output.length === 0}
          className={primaryButtonClass}
        >
          {copyStatus === "success" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copyStatus === "success" ? "Copied" : "Copy Output"}
        </button>
        <button
          type="button"
          data-testid="button-text-cleaner-clear"
          onClick={handleClear}
          className={secondaryButtonClass}
        >
          <Trash2 className="h-4 w-4" />
          Clear Input
        </button>
        <button
          type="button"
          data-testid="button-text-cleaner-reset"
          onClick={handleReset}
          className={secondaryButtonClass}
        >
          <RotateCcw className="h-4 w-4" />
          Reset Options
        </button>
      </div>
    </ToolPanel>
  );
}
