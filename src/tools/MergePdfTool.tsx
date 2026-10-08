import { useState } from "react";
import { ArrowDown, ArrowUp, Download, FilePlus2, LoaderCircle, Trash2 } from "lucide-react";
import { ToolPanel, primaryButtonClass, secondaryButtonClass } from "./ToolPageFrame";
import { downloadBlob, formatBytes } from "./toolUtils";
import { mergePdfFiles } from "./pdfTools";

type PdfInput = { id: string; file: File };

export function MergePdfTool() {
  const [items, setItems] = useState<PdfInput[]>([]);
  const [busy, setBusy] = useState(false);
  const [merged, setMerged] = useState<Blob | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function addFiles(incoming: FileList | null) {
    if (!incoming?.length) return;
    const accepted = Array.from(incoming);
    const invalid = accepted.find((file) => !file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf");
    if (invalid) {
      setError(`${invalid.name} is not a PDF file.`);
      return;
    }
    if ([...items, ...accepted].length > 20) {
      setError("Merge up to 20 PDF files at a time.");
      return;
    }
    const selectedFiles = [...items.map((item) => item.file), ...accepted];
    if (selectedFiles.some((file) => file.size > 100 * 1024 * 1024)) {
      setError("Each PDF must be smaller than 100 MB.");
      return;
    }
    if (selectedFiles.reduce((total, file) => total + file.size, 0) > 100 * 1024 * 1024) {
      setError("Keep the combined size below 100 MB to keep browser memory use manageable.");
      return;
    }
    setItems((current) => [...current, ...accepted.map((file) => ({ id: crypto.randomUUID(), file }))]);
    setMerged(null);
    setStatus("");
    setError("");
  }

  function moveFile(index: number, offset: -1 | 1) {
    setItems((current) => {
      const destination = index + offset;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
    setMerged(null);
    setStatus("");
  }

  function removeFile(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setMerged(null);
    setStatus("");
    setError("");
  }

  async function mergeFiles() {
    setBusy(true);
    setError("");
    setStatus("");
    setMerged(null);
    try {
      const result = await mergePdfFiles(items.map((item) => item.file));
      setMerged(result.blob);
      setStatus(`Merged ${items.length} files and ${result.pageCount} pages. Your PDF is ready to download.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The PDFs could not be merged.";
      setError(message.includes("encrypted") ? "One of the PDFs is encrypted or password-protected. Unlock it before merging." : message);
    } finally {
      setBusy(false);
    }
  }

  return <ToolPanel>
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-base font-extrabold text-white">Add PDF files</h2><p className="mt-1 max-w-xl text-xs leading-5 text-[#8193a9]">Choose at least two files. Use the arrows to set the page order before merging.</p></div>
      <label className={secondaryButtonClass}>
        <FilePlus2 aria-hidden="true" className="h-4 w-4" />Add PDFs
        <input type="file" data-testid="input-merge-pdfs" accept="application/pdf,.pdf" multiple className="sr-only" onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
      </label>
    </div>
    <p className="mt-3 text-[11px] leading-5 text-[#718197]">Up to 20 files and 100 MB combined. Processing happens locally; files are not uploaded.</p>
    {items.length > 0 ? <ol aria-label="PDF merge order" className="mt-5 space-y-2">
      {items.map(({ id, file }, index) => <li key={id} data-testid={`item-pdf-${index + 1}`} className="flex items-center gap-3 rounded-xl border border-[#28394e] bg-[#0c1522] p-3">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#572e3b] text-xs font-extrabold text-[#ffb0b7]">{index + 1}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#dce6f3]">{file.name}</p><p className="mt-1 text-[11px] text-[#8193a9]">{formatBytes(file.size)}</p></div>
        <div className="flex gap-1">
          <button type="button" data-testid={`button-move-pdf-up-${index}`} aria-label={`Move ${file.name} up`} title="Move up" className={secondaryButtonClass} disabled={index === 0 || busy} onClick={() => moveFile(index, -1)}><ArrowUp aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" data-testid={`button-move-pdf-down-${index}`} aria-label={`Move ${file.name} down`} title="Move down" className={secondaryButtonClass} disabled={index === items.length - 1 || busy} onClick={() => moveFile(index, 1)}><ArrowDown aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" data-testid={`button-remove-pdf-${index}`} aria-label={`Remove ${file.name}`} title="Remove file" className={secondaryButtonClass} disabled={busy} onClick={() => removeFile(id)}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
        </div>
      </li>)}
    </ol> : <div className="mt-5 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-[#33455c] bg-[#0b1320] px-5 text-center text-xs text-[#718197]"><FilePlus2 aria-hidden="true" className="mb-3 h-8 w-8" /><p>No PDFs selected yet.</p></div>}
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" data-testid="button-merge-pdfs" className={primaryButtonClass} disabled={items.length < 2 || busy} onClick={mergeFiles}>{busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <FilePlus2 aria-hidden="true" className="h-4 w-4" />}{busy ? "Merging PDFs…" : "Merge PDFs"}</button>
      {merged && <button type="button" data-testid="button-download-merged-pdf" className={secondaryButtonClass} onClick={() => downloadBlob(merged, "merged.pdf")}><Download aria-hidden="true" className="h-4 w-4" />Download merged PDF</button>}
      {items.length > 0 && <button type="button" data-testid="button-clear-pdfs" className={secondaryButtonClass} disabled={busy} onClick={() => { setItems([]); setMerged(null); setStatus(""); setError(""); }}>Clear all</button>}
    </div>
    {error && <p role="alert" data-testid="status-merge-pdf-error" className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs leading-5 text-[#ffb9be]">{error}</p>}
    {status && <p role="status" aria-live="polite" data-testid="status-merge-pdf-complete" className="mt-4 text-xs font-semibold text-[#84cba5]">{status}</p>}
  </ToolPanel>;
}