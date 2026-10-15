import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, FilePlus2, LoaderCircle, Trash2 } from "lucide-react";
import { ToolPanel, primaryButtonClass, secondaryButtonClass } from "./ToolPageFrame";
import { downloadBlob, formatBytes } from "./toolUtils";
import { MAX_MERGE_BYTES, MAX_MERGE_FILES, MergePdfError, mergePdfFiles, validateMergeSelection } from "./pdfTools";

type PdfInput = { id: string; file: File };

export function MergePdfTool() {
  const [items, setItems] = useState<PdfInput[]>([]);
  const [busy, setBusy] = useState(false);
  const [merged, setMerged] = useState<Blob | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const mergingRef = useRef(false);

  function addFiles(incoming: FileList | null) {
    if (busy || !incoming?.length) return;
    const accepted = Array.from(incoming);
    const problem = validateMergeSelection(items.map((item) => item.file), accepted);
    if (problem) {
      setError(problem);
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
    setError("");
  }

  function removeFile(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setMerged(null);
    setStatus("");
    setError("");
  }

  async function mergeFiles() {
    if (mergingRef.current) return;
    mergingRef.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    setMerged(null);
    try {
      const result = await mergePdfFiles(items.map((item) => item.file));
      setMerged(result.blob);
      setStatus(`Merged ${items.length} files into one PDF with ${result.pageCount} ${result.pageCount === 1 ? "page" : "pages"}. Your PDF is ready to download.`);
    } catch (caught) {
      setError(caught instanceof MergePdfError ? caught.message : "The PDFs could not be merged. Please try again.");
    } finally {
      mergingRef.current = false;
      setBusy(false);
    }
  }

  return <ToolPanel>
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-base font-extrabold text-white">Add PDF files</h2><p className="mt-1 max-w-xl text-xs leading-5 text-[#8193a9]">Choose at least two files. Use the arrows to set the page order before merging.</p></div>
      <label className={`${secondaryButtonClass} relative`}>
        <FilePlus2 aria-hidden="true" className="h-4 w-4" />Add PDFs
        <input type="file" data-testid="input-merge-pdfs" accept="application/pdf,.pdf" multiple disabled={busy} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8db7ff]" onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
      </label>
    </div>
    <p className="mt-3 text-[11px] leading-5 text-[#718197]">Up to {MAX_MERGE_FILES} files and {formatBytes(MAX_MERGE_BYTES)} combined. Processing happens locally; files are not uploaded.</p>
    {items.length > 0 ? <ol aria-label="PDF merge order" className="mt-5 space-y-2">
      {items.map(({ id, file }, index) => <li key={id} data-testid={`item-pdf-${index + 1}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#28394e] bg-[#0c1522] p-3">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#572e3b] text-xs font-extrabold text-[#ffb0b7]">{index + 1}</span>
        <div className="min-w-0 flex-1 basis-40"><p title={file.name} className="truncate text-xs font-bold text-[#dce6f3]">{file.name}</p><p className="mt-1 text-[11px] text-[#8193a9]">{formatBytes(file.size)}</p></div>
        <div className="flex w-full justify-end gap-1 sm:w-auto">
          <button type="button" data-testid={`button-move-pdf-up-${index}`} aria-label={`Move ${file.name}, position ${index + 1} of ${items.length}, up`} title="Move up" className={secondaryButtonClass} disabled={index === 0 || busy} onClick={() => moveFile(index, -1)}><ArrowUp aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" data-testid={`button-move-pdf-down-${index}`} aria-label={`Move ${file.name}, position ${index + 1} of ${items.length}, down`} title="Move down" className={secondaryButtonClass} disabled={index === items.length - 1 || busy} onClick={() => moveFile(index, 1)}><ArrowDown aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" data-testid={`button-remove-pdf-${index}`} aria-label={`Remove ${file.name}, position ${index + 1} of ${items.length}`} title="Remove file" className={secondaryButtonClass} disabled={busy} onClick={() => removeFile(id)}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
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