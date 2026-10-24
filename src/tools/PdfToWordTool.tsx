import { useRef, useState } from "react";
import { Download, FileOutput, LoaderCircle, Trash2 } from "lucide-react";
import { ToolPanel, primaryButtonClass, secondaryButtonClass } from "./ToolPageFrame";
import { downloadBlob, formatBytes } from "./toolUtils";
import {
  DOCX_MIME_TYPE, MAX_PDF_TO_WORD_BYTES, MAX_PDF_TO_WORD_PAGES, PdfToWordError, buildDocx, docxFileName, extractPdfPages,
  validatePdfToWordFile, type DocxStats, type PdfjsLike,
} from "./pdfToWordLogic";

type Converted = { blob: Blob; fileName: string; stats: DocxStats };

// pdf.js is large, so it is only fetched when someone converts a file.
async function loadPdfjs(): Promise<PdfjsLike> {
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs as unknown as PdfjsLike;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function PdfToWordTool() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [converted, setConverted] = useState<Converted | null>(null);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const convertingRef = useRef(false);

  function chooseFile(files: FileList | null) {
    if (busy || !files?.length) return;
    const chosen = files[0];
    const problem = validatePdfToWordFile(chosen);
    if (problem) {
      setError(problem);
      return;
    }
    setFile(chosen);
    setConverted(null);
    setStatus("");
    setError("");
  }

  function clearAll() {
    setFile(null);
    setConverted(null);
    setStatus("");
    setProgress("");
    setError("");
  }

  async function convert() {
    if (!file || convertingRef.current) return;
    convertingRef.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    setProgress("Opening PDF…");
    setConverted(null);
    try {
      let data: ArrayBuffer;
      try {
        data = await file.arrayBuffer();
      } catch {
        throw new PdfToWordError(`${file.name} could not be read. If it was moved or changed after you selected it, add it again.`);
      }
      const pdfjs = await loadPdfjs().catch(() => {
        throw new PdfToWordError("The PDF reader could not be loaded. Check your connection and try again.");
      });
      const pages = await extractPdfPages(pdfjs, data, file.name, (page, count) => setProgress(`Reading page ${page} of ${count}…`));
      setProgress("Building Word file…");
      const { bytes, stats } = buildDocx(pages, file.name.replace(/\.pdf$/i, ""));
      setConverted({ blob: new Blob([toArrayBuffer(bytes)], { type: DOCX_MIME_TYPE }), fileName: docxFileName(file.name), stats });
      const skipped = stats.emptyPages > 0 ? ` ${stats.emptyPages} ${stats.emptyPages === 1 ? "page had" : "pages had"} no selectable text and ${stats.emptyPages === 1 ? "was" : "were"} left out.` : "";
      setStatus(`Converted ${stats.pages - stats.emptyPages} ${stats.pages - stats.emptyPages === 1 ? "page" : "pages"} (${stats.words.toLocaleString("en-US")} words). Your Word file is ready to download.${skipped}`);
    } catch (caught) {
      setError(caught instanceof PdfToWordError ? caught.message : "The PDF could not be converted. Please try again.");
    } finally {
      convertingRef.current = false;
      setBusy(false);
      setProgress("");
    }
  }

  return <ToolPanel>
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-base font-extrabold text-white">Add a PDF</h2><p className="mt-1 max-w-xl text-xs leading-5 text-[#8193a9]">Choose one PDF with selectable text. It becomes an editable Word (.docx) file.</p></div>
      <label className={`${secondaryButtonClass} relative`}>
        <FileOutput aria-hidden="true" className="h-4 w-4" />{file ? "Choose a different PDF" : "Choose PDF"}
        <input type="file" data-testid="input-pdf-to-word" accept="application/pdf,.pdf" disabled={busy} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8db7ff]" onChange={(event) => { chooseFile(event.currentTarget.files); event.currentTarget.value = ""; }} />
      </label>
    </div>
    <p className="mt-3 text-[11px] leading-5 text-[#718197]">Up to {formatBytes(MAX_PDF_TO_WORD_BYTES)} and {MAX_PDF_TO_WORD_PAGES} pages. Processing happens locally; your file is not uploaded.</p>
    <p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#9aaac0]">This copies the text only. Fonts, images, tables, columns and page layout are not reproduced, and scanned or image-only PDFs have no text to copy. Check the result before you rely on it.</p>
    {file ? <div data-testid="item-pdf-to-word-file" className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#28394e] bg-[#0c1522] p-3">
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#572e3b] text-xs font-extrabold text-[#ffb0b7]">PDF</span>
      <div className="min-w-0 flex-1 basis-40"><p title={file.name} className="truncate text-xs font-bold text-[#dce6f3]">{file.name}</p><p className="mt-1 text-[11px] text-[#8193a9]">{formatBytes(file.size)}</p></div>
      <button type="button" data-testid="button-clear-pdf-to-word" aria-label={`Remove ${file.name}`} title="Remove file" className={secondaryButtonClass} disabled={busy} onClick={clearAll}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
    </div> : <div className="mt-5 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-[#33455c] bg-[#0b1320] px-5 text-center text-xs text-[#718197]"><FileOutput aria-hidden="true" className="mb-3 h-8 w-8" /><p>No PDF selected yet.</p></div>}
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" data-testid="button-convert-pdf-to-word" className={primaryButtonClass} disabled={!file || busy} onClick={convert}>{busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <FileOutput aria-hidden="true" className="h-4 w-4" />}{busy ? "Converting…" : "Convert to Word"}</button>
      {converted && <button type="button" data-testid="button-download-word" className={secondaryButtonClass} onClick={() => downloadBlob(converted.blob, converted.fileName)}><Download aria-hidden="true" className="h-4 w-4" />Download {converted.fileName}</button>}
    </div>
    {busy && progress && <p role="status" aria-live="polite" data-testid="status-pdf-to-word-progress" className="mt-4 text-xs font-semibold text-[#9db6d6]">{progress}</p>}
    {error && <p role="alert" data-testid="status-pdf-to-word-error" className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs leading-5 text-[#ffb9be]">{error}</p>}
    {status && <p role="status" aria-live="polite" data-testid="status-pdf-to-word-complete" className="mt-4 text-xs font-semibold text-[#84cba5]">{status}</p>}
  </ToolPanel>;
}
