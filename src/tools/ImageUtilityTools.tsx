import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Download, LoaderCircle, RotateCcw, RotateCw, Crop, FlipHorizontal, FlipVertical } from "lucide-react";
import { ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass, toolInputClass } from "./ToolPageFrame";
import { downloadBlob, formatBytes } from "./toolUtils";
import { clampCropRectangle, cropRectangleFromDrag, isValidCropRectangle, type CropRectangle } from "./imageCropLogic";
import { isValidImageDimensions, type ImageDimensions } from "./imageResizeLogic";

type ImageFormat = "image/webp" | "image/jpeg" | "image/png";
const formats: { value: ImageFormat; label: string; extension: string }[] = [
  { value: "image/webp", label: "WebP", extension: "webp" },
  { value: "image/jpeg", label: "JPEG", extension: "jpg" },
  { value: "image/png", label: "PNG", extension: "png" },
];
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function encodeCanvas(canvas: HTMLCanvasElement, mime: ImageFormat, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("This browser could not encode the image. Try another output format."));
  }, mime, quality));
}

function acceptedImage(file: File): boolean {
  return ["image/png", "image/jpeg", "image/webp"].includes(file.type) && file.size > 0 && file.size <= MAX_FILE_BYTES;
}

function filenameBase(file: File): string {
  return file.name.replace(/\.[^.]+$/u, "") || "image";
}

function useObjectUrl(blob: Blob | File | null): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) { setUrl(""); return; }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

export function CropImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [crop, setCrop] = useState<CropRectangle | null>(null);
  const [format, setFormat] = useState<ImageFormat>("image/png");
  const [output, setOutput] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const selectionId = useRef(0);
  useEffect(() => () => { selectionId.current += 1; }, []);
  const sourceUrl = useObjectUrl(file);
  const outputUrl = useObjectUrl(output);

  async function chooseFile(next: File | undefined) {
    const requestId = ++selectionId.current;
    setFile(null); setDimensions(null); setCrop(null); setOutput(null); setError(""); setStatus("");
    if (!next) return;
    if (!acceptedImage(next)) { setError("Choose a non-empty PNG, JPEG or WebP image smaller than 50 MB."); return; }
    try {
      const bitmap = await createImageBitmap(next);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      if (requestId !== selectionId.current) return;
      if (!isValidImageDimensions(size)) { setError("This image exceeds the 80-megapixel processing limit or has an unsupported dimension."); return; }
      setFile(next); setDimensions(size); setCrop({ x: 0, y: 0, width: size.width, height: size.height });
    } catch {
      if (requestId === selectionId.current) setError("This image could not be opened. Try a different PNG, JPEG or WebP file.");
    }
  }

  function imagePoint(event: ReactPointerEvent<HTMLDivElement>) {
    const image = imageRef.current;
    if (!image || !dimensions) return null;
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.min(dimensions.width, Math.max(0, (event.clientX - rect.left) * dimensions.width / rect.width)),
      y: Math.min(dimensions.height, Math.max(0, (event.clientY - rect.top) * dimensions.height / rect.height)),
    };
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dimensions || busy || event.button !== 0) return;
    const point = imagePoint(event);
    if (!point) return;
    dragStart.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
    setCrop({ x: Math.round(point.x), y: Math.round(point.y), width: 1, height: 1 });
    setOutput(null); setStatus("");
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart.current || !dimensions) return;
    const point = imagePoint(event);
    if (point) setCrop(cropRectangleFromDrag(dragStart.current, point, dimensions));
  }
  function pointerUp() { dragStart.current = null; }

  function updateCrop(field: keyof CropRectangle, value: string) {
    if (!dimensions || !crop) return;
    const numeric = value === "" ? 0 : Number(value);
    setCrop(clampCropRectangle({ ...crop, [field]: Number.isFinite(numeric) ? numeric : 0 }, dimensions));
    setOutput(null); setStatus("");
  }

  async function runCrop() {
    if (!file || !dimensions || !crop || busy) return;
    if (!isValidCropRectangle(crop, dimensions)) { setError("Choose a valid crop area inside the image."); return; }
    setBusy(true); setError(""); setStatus(""); setOutput(null);
    let bitmap: ImageBitmap | null = null;
    const canvas = document.createElement("canvas");
    try {
      bitmap = await createImageBitmap(file);
      canvas.width = crop.width; canvas.height = crop.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable in this browser.");
      if (format === "image/jpeg") { context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); }
      context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      const result = await encodeCanvas(canvas, format);
      setOutput(result); setStatus(`Cropped image to ${crop.width} × ${crop.height} pixels.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The image could not be cropped.");
    } finally {
      bitmap?.close(); canvas.width = 0; canvas.height = 0; setBusy(false);
    }
  }

  function downloadResult() {
    if (!file || !output) return;
    const extension = formats.find((item) => item.value === output.type)?.extension ?? "png";
    downloadBlob(output, `${filenameBase(file)}-cropped.${extension}`);
  }

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-5">
        <ToolField label="Choose an image" htmlFor="crop-image-file" hint="PNG, JPEG or WebP · max 50 MB · processed locally in your browser">
          <input id="crop-image-file" data-testid="input-crop-image" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => chooseFile(event.currentTarget.files?.[0])} className={`${toolInputClass} h-auto min-h-12 py-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#263b58] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#d8e6fa]`} />
        </ToolField>
        {file && dimensions && crop && <>
          <div className="rounded-xl border border-[#26364b] bg-[#0b1320] px-4 py-3 text-xs leading-5 text-[#aab7c9]"><p className="truncate font-semibold text-[#dce6f3]">{file.name}</p><p>{dimensions.width} × {dimensions.height} px · {formatBytes(file.size)}</p></div>
          <p className="text-xs leading-5 text-[#aab7c9]">Drag across the preview to choose a crop. You can also enter exact pixel coordinates below.</p>
          <div className="grid grid-cols-2 gap-3">
            {([ ["x", "Left (px)"], ["y", "Top (px)"], ["width", "Width (px)"], ["height", "Height (px)"] ] as const).map(([field, label]) => <ToolField key={field} label={label} htmlFor={`crop-${field}`}>
              <input id={`crop-${field}`} data-testid={`input-crop-${field}`} className={toolInputClass} type="number" min={field === "x" || field === "y" ? 0 : 1} max={field === "x" ? dimensions.width - 1 : field === "y" ? dimensions.height - 1 : field === "width" ? dimensions.width - crop.x : dimensions.height - crop.y} value={crop[field]} disabled={busy} onChange={(event) => updateCrop(field, event.target.value)} />
            </ToolField>)}
          </div>
          <ToolField label="Output format" htmlFor="crop-format">
            <select id="crop-format" data-testid="select-crop-format" className={toolInputClass} value={format} disabled={busy} onChange={(event) => { setFormat(event.target.value as ImageFormat); setOutput(null); setStatus(""); }}>
              {formats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </ToolField>
        </>}
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="button-crop-image" className={primaryButtonClass} disabled={!file || !crop || !dimensions || !isValidCropRectangle(crop, dimensions) || busy} onClick={runCrop}>{busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Crop aria-hidden="true" className="h-4 w-4" />}{busy ? "Cropping…" : "Crop image"}</button>
          {output && <button type="button" data-testid="button-download-crop-image" className={secondaryButtonClass} onClick={downloadResult}><Download aria-hidden="true" className="h-4 w-4" />Download</button>}
        </div>
        {error && <p role="alert" data-testid="status-crop-error" className="rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs leading-5 text-[#ffb9be]">{error}</p>}
        {output && <p role="status" aria-live="polite" data-testid="status-crop-complete" className="text-xs font-semibold text-[#84cba5]">{status}</p>}
      </div>
      <section aria-label="Crop preview" className="min-w-0">
        <h2 className="text-base font-extrabold text-white">Preview</h2>
        <div className="mt-4 flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#33455c] bg-[#0b1320] p-4">
          {outputUrl ? <img data-testid="result-crop-image" src={outputUrl} alt="Cropped image result" className="max-h-[420px] max-w-full rounded-lg object-contain" /> : sourceUrl && dimensions && crop ? <div className="relative inline-block max-w-full touch-none select-none" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
            <img ref={imageRef} src={sourceUrl} alt="Original image; drag to select the area to keep" draggable={false} className="block max-h-[420px] max-w-full rounded-lg" />
            <div aria-hidden="true" className="pointer-events-none absolute border-2 border-[#6da1ff] bg-[#3b82f6]/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" style={{ left: `${crop.x / dimensions.width * 100}%`, top: `${crop.y / dimensions.height * 100}%`, width: `${crop.width / dimensions.width * 100}%`, height: `${crop.height / dimensions.height * 100}%` }} />
          </div> : <p className="text-center text-xs text-[#aab7c9]">Choose an image to start cropping.</p>}
        </div>
      </section>
    </div>
  </ToolPanel>;
}

export function RotateImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImageFormat>("image/png");
  const [angle, setAngle] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [output, setOutput] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const selectionId = useRef(0);
  useEffect(() => () => { selectionId.current += 1; }, []);
  const sourceUrl = useObjectUrl(file);
  const outputUrl = useObjectUrl(output);

  async function chooseFile(next: File | undefined) {
    const requestId = ++selectionId.current;
    setFile(null); setOutput(null); setError(""); setStatus(""); setAngle(0); setFlipX(false); setFlipY(false);
    if (!next) return;
    if (!acceptedImage(next)) { setError("Choose a non-empty PNG, JPEG or WebP image smaller than 50 MB."); return; }
    try {
      const bitmap = await createImageBitmap(next);
      const valid = isValidImageDimensions({ width: bitmap.width, height: bitmap.height });
      bitmap.close();
      if (requestId !== selectionId.current) return;
      if (!valid) { setError("This image exceeds the 80-megapixel processing limit or has an unsupported dimension."); return; }
      setFile(next);
    } catch { if (requestId === selectionId.current) setError("This image could not be opened. Try a different PNG, JPEG or WebP file."); }
  }

  async function runRotate() {
    if (!file || busy) return;
    setBusy(true); setError(""); setStatus(""); setOutput(null);
    let bitmap: ImageBitmap | null = null;
    const canvas = document.createElement("canvas");
    try {
      bitmap = await createImageBitmap(file);
      const sideways = angle % 180 !== 0;
      canvas.width = sideways ? bitmap.height : bitmap.width;
      canvas.height = sideways ? bitmap.width : bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable in this browser.");
      if (format === "image/jpeg") { context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); }
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(angle * Math.PI / 180);
      context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
      const result = await encodeCanvas(canvas, format);
      setOutput(result); setStatus(`Image transformed: ${angle}° rotation${flipX ? ", horizontal flip" : ""}${flipY ? ", vertical flip" : ""}.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The image could not be transformed."); }
    finally { bitmap?.close(); canvas.width = 0; canvas.height = 0; setBusy(false); }
  }

  function downloadResult() {
    if (!file || !output) return;
    const extension = formats.find((item) => item.value === output.type)?.extension ?? "png";
    downloadBlob(output, `${filenameBase(file)}-rotated.${extension}`);
  }

  function changeTransform(update: () => void) { update(); setOutput(null); setStatus(""); }

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-5">
        <ToolField label="Choose an image" htmlFor="rotate-image-file" hint="PNG, JPEG or WebP · max 50 MB · processed locally in your browser">
          <input id="rotate-image-file" data-testid="input-rotate-image" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => chooseFile(event.currentTarget.files?.[0])} className={`${toolInputClass} h-auto min-h-12 py-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#263b58] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#d8e6fa]`} />
        </ToolField>
        {file && <div className="rounded-xl border border-[#26364b] bg-[#0b1320] px-4 py-3 text-xs leading-5 text-[#aab7c9]"><p className="truncate font-semibold text-[#dce6f3]">{file.name}</p><p>{formatBytes(file.size)}</p></div>}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className={secondaryButtonClass} disabled={!file || busy} onClick={() => changeTransform(() => setAngle((current) => (current + 270) % 360))}><RotateCcw aria-hidden="true" className="h-4 w-4" />Rotate left 90°</button>
          <button type="button" className={secondaryButtonClass} disabled={!file || busy} onClick={() => changeTransform(() => setAngle((current) => (current + 90) % 360))}><RotateCw aria-hidden="true" className="h-4 w-4" />Rotate right 90°</button>
          <button type="button" aria-pressed={flipX} className={secondaryButtonClass} disabled={!file || busy} onClick={() => changeTransform(() => setFlipX((current) => !current))}><FlipHorizontal aria-hidden="true" className="h-4 w-4" />Flip horizontal</button>
          <button type="button" aria-pressed={flipY} className={secondaryButtonClass} disabled={!file || busy} onClick={() => changeTransform(() => setFlipY((current) => !current))}><FlipVertical aria-hidden="true" className="h-4 w-4" />Flip vertical</button>
        </div>
        <ToolField label="Output format" htmlFor="rotate-format">
          <select id="rotate-format" data-testid="select-rotate-format" className={toolInputClass} value={format} disabled={busy} onChange={(event) => { setFormat(event.target.value as ImageFormat); setOutput(null); setStatus(""); }}>
            {formats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </ToolField>
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="button-rotate-image" className={primaryButtonClass} disabled={!file || busy || (angle === 0 && !flipX && !flipY)} onClick={runRotate}>{busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RotateCw aria-hidden="true" className="h-4 w-4" />}{busy ? "Processing…" : "Apply changes"}</button>
          {output && <button type="button" data-testid="button-download-rotate-image" className={secondaryButtonClass} onClick={downloadResult}><Download aria-hidden="true" className="h-4 w-4" />Download</button>}
        </div>
        {error && <p role="alert" data-testid="status-rotate-error" className="rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs leading-5 text-[#ffb9be]">{error}</p>}
        {output && <p role="status" aria-live="polite" data-testid="status-rotate-complete" className="text-xs font-semibold text-[#84cba5]">{status}</p>}
      </div>
      <section aria-label="Rotate and flip preview" className="min-w-0">
        <h2 className="text-base font-extrabold text-white">Preview</h2>
        <div className="mt-4 flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#33455c] bg-[#0b1320] p-4">
          {outputUrl ? <img data-testid="result-rotate-image" src={outputUrl} alt="Rotated or flipped image result" className="max-h-[420px] max-w-full rounded-lg object-contain" /> : sourceUrl ? <img src={sourceUrl} alt="Original image preview" className="max-h-[420px] max-w-full rounded-lg object-contain" style={{ transform: `rotate(${angle}deg) scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})` }} /> : <p className="text-center text-xs text-[#aab7c9]">Choose an image to preview rotation and flips.</p>}
        </div>
      </section>
    </div>
  </ToolPanel>;
}

[executed on device: n8n-nuc11 (0edb2ec4-460f-4079-a4de-ad338db1e4b4)]