import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, FileImage, LoaderCircle, Trash2 } from "lucide-react";
import { ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass, toolInputClass } from "./ToolPageFrame";
import { downloadBlob, formatBytes } from "./toolUtils";
import {
  DEFAULT_JPG_OPTIONS,
  JpgToPdfError,
  MAX_JPG_FILES,
  MAX_JPG_FILE_BYTES,
  MAX_JPG_TOTAL_BYTES,
  convertJpgsToPdf,
  validateJpgSelection,
} from "./jpgToPdf";
import type { JpgMargin, JpgPageSize } from "./jpgToPdf";

type ImageInput = { id: string; file: File };

export function JpgToPdfTool() {
  const [items, setItems] = useState<ImageInput[]>([]);
  const [pageSize, setPageSize] = useState<JpgPageSize>(DEFAULT_JPG_OPTIONS.pageSize);
  const [margin, setMargin] = useState<JpgMargin>(DEFAULT_JPG_OPTIONS.margin);
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const convertingRef = useRef(false);

  function resetResult() {
    setPdf(null);
    setStatus("");
    setError("");
  }

  function addFiles(incoming: FileList | null) {
    if (busy || !incoming?.length) return;
    const accepted = Array.from(incoming);
    const problem = validateJpgSelection(items.map((item) => item.file), accepted);
    if (problem) {
      setError(problem);
      return;
    }
    setItems((current) => [...current, ...accepted.map((file) => ({ id: crypto.randomUUID(), file }))]);
    resetResult();
  }

  function moveFile(index: number, offset: -1 | 1) {
    setItems((current) => {
      const destination = index + offset;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
    resetResult();
  }

  function removeFile(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    resetResult();
  }

  async function convert() {
    if (convertingRef.current) return;
    convertingRef.current = true;
    setBusy(true);
    resetResult();
    try {
      const result = await convertJpgsToPdf(items.map((item) => item.file), { pageSize, margin });
      setPdf(result.blob);
      setStatus(`Converted ${items.length} ${items.length === 1 ? "image" : "images"} into a PDF with ${result.pageCount} ${result.pageCount === 1 ? "page" : "pages"}. Your PDF is ready to download.`);
    } catch (caught) {
      setError(caught instanceof JpgToPdfError ? caught.message : "The images could not be converted. Please try again.");
    } finally {
      convertingRef.current = false;
      setBusy(false);
    }
  }

  return <ToolPanel>
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-base font-extrabold text-white">Add JPG images</h2><p className="mt-1 max-w-xl text-xs leading-5 text-[#8193a9]">Choose one or more JPG images. Each image becomes one page, in the order shown. Use the arrows to change the order.</p></div>
      <label className={`${secondaryButtonClass} relative`}>
        <FileImage aria-hidden="true" className="h-4 w-4" />Add JPGs
        <input type="file" data-testid="input-jpg-images" accept="image/jpeg,.jpg,.jpeg,.jpe,.jfif" multiple disabled={busy} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8db7ff]" onChange={(event) => { addFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
      </label>
    </div>
    <p className="mt-3 text-[11px] leading-5 text-[#718197]">Up to {MAX_JPG_FILES} images, {formatBytes(MAX_JPG_FILE_BYTES)} each and {formatBytes(MAX_JPG_TOTAL_BYTES)} combined. JPG and JPEG only. Processing happens locally; images are not uploaded.</p>
    {items.length > 0 ? <ol aria-label="Image page order" className="mt-5 space-y-2">
      {items.map(({ id, file }, index) => <li key={id} data-testid={`item-jpg-${index + 1}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#28394e] bg-[#0c1522] p-3">
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#572e3b] text-xs font-extrabold text-[#ffb0b7]">{index + 1}</span>
        <div className="min-w-0 flex-1 basis-40"><p title={file.name} className="truncate text-xs font-bold text-[#dce6f3]">{file.name}</p><p className="mt-1 text-[11px] text-[#8193a9]">{formatBytes(file.size)}</p></div>
        <div className="flex w-full justify-end gap-1 sm:w-auto">
          <button type="button" data-testid={`button-move-jpg-up-${index}`} aria-label={`Move ${file.name}, page ${index + 1} of ${items.length}, up`} title="Move up" className={secondaryButtonClass} disabled={index === 0 || busy} onClick={() => moveFile(index, -1)}><ArrowUp aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" data-testid={`button-move-jpg-down-${index}`} aria-label={`Move ${file.name}, page ${index + 1} of ${items.length}, down`} title="Move down" className={secondaryButtonClass} disabled={index === items.length - 1 || busy} onClick={() => moveFile(index, 1)}><ArrowDown aria-hidden="true" className="h-4 w-4" /></button>
          <button type="button" data-testid={`button-remove-jpg-${index}`} aria-label={`Remove ${file.name}, page ${index + 1} of ${items.length}`} title="Remove image" className={secondaryButtonClass} disabled={busy} onClick={() => removeFile(id)}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
        </div>
      </li>)}
    </ol> : <div className="mt-5 flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-[#33455c] bg-[#0b1320] px-5 text-center text-xs text-[#718197]"><FileImage aria-hidden="true" className="mb-3 h-8 w-8" /><p>No images selected yet.</p></div>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <ToolField label="Page size" htmlFor="jpg-page-size" hint="Fit to image keeps each image's own shape. A4 and Letter turn to landscape for wide images.">
        <select id="jpg-page-size" data-testid="select-jpg-page-size" className={toolInputClass} value={pageSize} disabled={busy} onChange={(event) => { setPageSize(event.target.value as JpgPageSize); resetResult(); }}>
          <option value="image">Fit to image</option>
          <option value="a4">A4</option>
          <option value="letter">US Letter</option>
        </select>
      </ToolField>
      <ToolField label="Margin" htmlFor="jpg-margin" hint="Blank space around each image.">
        <select id="jpg-margin" data-testid="select-jpg-margin" className={toolInputClass} value={margin} disabled={busy} onChange={(event) => { setMargin(event.target.value as JpgMargin); resetResult(); }}>
          <option value="none">None</option>
          <option value="small">Small (10 mm)</option>
          <option value="large">Large (20 mm)</option>
        </select>
      </ToolField>
    </div>
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" data-testid="button-convert-jpg" className={primaryButtonClass} disabled={items.length < 1 || busy} onClick={convert}>{busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <FileImage aria-hidden="true" className="h-4 w-4" />}{busy ? "Converting…" : "Convert to PDF"}</button>
      {pdf && <button type="button" data-testid="button-download-jpg-pdf" className={secondaryButtonClass} onClick={() => downloadBlob(pdf, "images.pdf")}><Download aria-hidden="true" className="h-4 w-4" />Download PDF</button>}
      {items.length > 0 && <button type="button" data-testid="button-clear-jpgs" className={secondaryButtonClass} disabled={busy} onClick={() => { setItems([]); resetResult(); }}>Clear all</button>}
    </div>
    {error && <p role="alert" data-testid="status-jpg-to-pdf-error" className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs leading-5 text-[#ffb9be]">{error}</p>}
    {status && <p role="status" aria-live="polite" data-testid="status-jpg-to-pdf-complete" className="mt-4 text-xs font-semibold text-[#84cba5]">{status}</p>}
  </ToolPanel>;
}
