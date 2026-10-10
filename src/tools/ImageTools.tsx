import { useEffect, useState } from "react";
import { Download, ImageDown, LoaderCircle, RefreshCw } from "lucide-react";
import {
  ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass,
  toolInputClass,
} from "./ToolPageFrame";
import { downloadBlob, formatBytes } from "./toolUtils";

type ImageFormat = "image/webp" | "image/jpeg" | "image/png";
type ImageDimensions = { width: number; height: number };
type AspectPreset = "original" | "9:16" | "16:9" | "1:1" | "4:5" | "4:3" | "3:2" | "custom";
type ProcessingMode = "compress" | "resize";

const aspectPresets: { value: AspectPreset; label: string }[] = [
  { value: "original", label: "Original ratio" },
  { value: "9:16", label: "9:16 · Vertical video / Shorts" },
  { value: "16:9", label: "16:9 · Landscape video" },
  { value: "1:1", label: "1:1 · Square" },
  { value: "4:5", label: "4:5 · Portrait post" },
  { value: "4:3", label: "4:3 · Classic" },
  { value: "3:2", label: "3:2 · Photography" },
  { value: "custom", label: "Custom dimensions" },
];

function ratioForPreset(preset: AspectPreset, original: ImageDimensions | null): number | null {
  if (preset === "original") return original ? original.width / original.height : null;
  if (preset === "custom") return null;
  const [width, height] = preset.split(":").map(Number);
  return width / height;
}

const imageFormats: { value: ImageFormat; label: string; extension: string }[] = [
  { value: "image/webp", label: "WebP", extension: "webp" },
  { value: "image/jpeg", label: "JPEG", extension: "jpg" },
  { value: "image/png", label: "PNG", extension: "png" },
];

function extensionFor(mime: string): string {
  return imageFormats.find((format) => format.value === mime)?.extension ?? "png";
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: ImageFormat, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("This browser could not encode the image. Try another output format."));
    }, mime, quality);
  });
}

async function processImage(
  file: File,
  dimensions: ImageDimensions,
  mime: ImageFormat,
  quality: number,
): Promise<Blob> {
  if (dimensions.width < 1 || dimensions.height < 1 || dimensions.width * dimensions.height > 80_000_000) {
    throw new Error("Choose dimensions between 1 pixel and 80 megapixels.");
  }
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Image processing is unavailable in this browser.");
  }
  if (mime === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToBlob(canvas, mime, quality);
}

function ImageProcessor({ mode }: { mode: ProcessingMode }) {
  const isResize = mode === "resize";
  const [file, setFile] = useState<File | null>(null);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [widthText, setWidthText] = useState("");
  const [heightText, setHeightText] = useState("");
  const [keepRatio, setKeepRatio] = useState(true);
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>("original");
  const [quality, setQuality] = useState(82);
  const [mime, setMime] = useState<ImageFormat>("image/webp");
  const [output, setOutput] = useState<Blob | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setSourceUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!output) {
      setOutputUrl("");
      return;
    }
    const url = URL.createObjectURL(output);
    setOutputUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [output]);

  async function chooseFile(nextFile?: File) {
    setError("");
    setStatus("");
    setOutput(null);
    setImageDimensions(null);
    setAspectPreset("original");
    setKeepRatio(true);
    if (!nextFile) {
      setFile(null);
      setWidthText("");
      setHeightText("");
      return;
    }
    if (!nextFile.type.startsWith("image/") || !imageFormats.some((format) => format.value === nextFile.type)) {
      setFile(null);
      setError("Choose a PNG, JPEG or WebP image.");
      return;
    }
    if (nextFile.size > 50 * 1024 * 1024) {
      setFile(null);
      setError("Choose an image smaller than 50 MB to keep browser memory use manageable.");
      return;
    }
    try {
      const bitmap = await createImageBitmap(nextFile);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      setImageDimensions(dimensions);
      setWidthText(String(dimensions.width));
      setHeightText(String(dimensions.height));
      setFile(nextFile);
    } catch {
      setFile(null);
      setError("This image could not be opened. Try a different PNG, JPEG or WebP file.");
    }
  }

  function updateWidth(value: string) {
    setOutput(null);
    setStatus("");
    setWidthText(value);
    const ratio = ratioForPreset(aspectPreset, imageDimensions);
    if (keepRatio && ratio) {
      const width = Number(value);
      if (width > 0) setHeightText(String(Math.max(1, Math.round(width / ratio))));
    }
  }

  function updateHeight(value: string) {
    setOutput(null);
    setStatus("");
    setHeightText(value);
    const ratio = ratioForPreset(aspectPreset, imageDimensions);
    if (keepRatio && ratio) {
      const height = Number(value);
      if (height > 0) setWidthText(String(Math.max(1, Math.round(height * ratio))));
    }
  }

  function updateAspectPreset(value: AspectPreset) {
    setAspectPreset(value);
    setOutput(null);
    setStatus("");
    if (value === "custom") {
      setKeepRatio(false);
      return;
    }
    setKeepRatio(true);
    const ratio = ratioForPreset(value, imageDimensions);
    const width = Number(widthText);
    if (ratio && width > 0) setHeightText(String(Math.max(1, Math.round(width / ratio))));
  }

  async function runProcessing() {
    if (!file || !imageDimensions) return;
    setBusy(true);
    setError("");
    setStatus("");
    setOutput(null);
    try {
      const dimensions = isResize
        ? { width: Number(widthText), height: Number(heightText) }
        : imageDimensions;
      const result = await processImage(file, dimensions, mime, quality / 100);
      setOutput(result);
      const resultFormat = imageFormats.find((format) => format.value === result.type)?.label ?? "the selected format";
      setStatus(`Finished ${isResize ? "resizing" : "compressing"} ${file.name} as ${resultFormat}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The image could not be processed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadResult() {
    if (!output || !file) return;
    const baseName = file.name.replace(/\.[^.]+$/u, "") || "image";
    downloadBlob(output, `${baseName}-${isResize ? "resized" : "compressed"}.${extensionFor(output.type)}`);
  }

  const validDimensions = !isResize || (
    Number.isInteger(Number(widthText)) && Number(widthText) > 0 &&
    Number.isInteger(Number(heightText)) && Number(heightText) > 0 &&
    Number(widthText) * Number(heightText) <= 80_000_000
  );
  const sizeDifference = file && output ? file.size - output.size : 0;
  const savings = file && output && file.size > 0 ? (sizeDifference / file.size) * 100 : 0;

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[0.92fr_1.08fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">{isResize ? "Image and dimensions" : "Image and output settings"}</h2>
        <div className="mt-5">
          <ToolField label="Choose an image" htmlFor={`${mode}-file`} hint="PNG, JPEG or WebP · max 50 MB · processed locally in your browser">
            <input id={`${mode}-file`} data-testid={`input-${mode}-image`} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => chooseFile(event.currentTarget.files?.[0])} className={`${toolInputClass} h-auto min-h-12 py-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-[#263b58] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#d8e6fa]`} />
          </ToolField>
        </div>
        {file && imageDimensions && <div className="mt-4 rounded-xl border border-[#26364b] bg-[#0b1320] px-4 py-3 text-xs leading-5 text-[#9aabc0]">
          <p className="truncate font-semibold text-[#dce6f3]">{file.name}</p>
          <p>{imageDimensions.width} × {imageDimensions.height} px <span aria-hidden="true">·</span> {formatBytes(file.size)}</p>
        </div>}
        {isResize && <div className="mt-5 space-y-4">
          <ToolField label="Aspect ratio preset" htmlFor="resize-aspect-preset" hint="Choose a common format, or use custom dimensions.">
            <select id="resize-aspect-preset" data-testid="select-resize-aspect-preset" className={toolInputClass} value={aspectPreset} disabled={!file} onChange={(event) => updateAspectPreset(event.target.value as AspectPreset)}>
              {aspectPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
            </select>
          </ToolField>
          <div className="grid grid-cols-2 gap-3">
            <ToolField label="Width (px)" htmlFor="resize-width">
              <input id="resize-width" data-testid="input-resize-width" className={toolInputClass} type="number" min="1" max="40000" value={widthText} disabled={!file} onChange={(event) => updateWidth(event.target.value)} />
            </ToolField>
            <ToolField label="Height (px)" htmlFor="resize-height">
              <input id="resize-height" data-testid="input-resize-height" className={toolInputClass} type="number" min="1" max="40000" value={heightText} disabled={!file} onChange={(event) => updateHeight(event.target.value)} />
            </ToolField>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#2c3a4c] bg-[#152031] px-3 text-xs font-semibold text-[#cbd5e1]">
            <input type="checkbox" data-testid="checkbox-keep-aspect-ratio" className="h-4 w-4 accent-[#3b82f6]" checked={keepRatio} onChange={(event) => { const checked = event.target.checked; setKeepRatio(checked); setAspectPreset(checked ? "original" : "custom"); setOutput(null); setStatus(""); if (checked && imageDimensions) { const width = Number(widthText); if (width > 0) setHeightText(String(Math.max(1, Math.round(width * imageDimensions.height / imageDimensions.width)))); } }} />
            Keep aspect ratio
          </label>
        </div>}
        {isResize && file && !validDimensions && <p role="alert" data-testid="status-resize-dimensions-error" className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs leading-5 text-[#ffb9be]">Enter whole-number dimensions greater than zero and keep the result under 80 megapixels.</p>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ToolField label="Output format" htmlFor={`${mode}-format`}>
            <select id={`${mode}-format`} data-testid={`select-${mode}-format`} className={toolInputClass} value={mime} onChange={(event) => { setMime(event.target.value as ImageFormat); setOutput(null); setStatus(""); }}>
              {imageFormats.map((format) => <option key={format.value} value={format.value}>{format.label}</option>)}
            </select>
          </ToolField>
          <ToolField label={`Quality — ${quality}%`} htmlFor={`${mode}-quality`} hint={mime === "image/png" ? "PNG is lossless; quality is not applied." : "Lower quality generally means a smaller file."}>
            <input id={`${mode}-quality`} data-testid={`input-${mode}-quality`} className="mt-4 w-full accent-[#3b82f6] disabled:opacity-40" type="range" min="10" max="100" step="1" value={quality} disabled={mime === "image/png"} onChange={(event) => { setQuality(Number(event.target.value)); setOutput(null); setStatus(""); }} />
          </ToolField>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" data-testid={`button-${mode}-image`} className={primaryButtonClass} disabled={!file || !validDimensions || busy} onClick={runProcessing}>{busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="h-4 w-4" />}{busy ? "Processing…" : isResize ? "Resize image" : "Compress image"}</button>
          {output && <button type="button" data-testid={`button-download-${mode}-image`} className={secondaryButtonClass} onClick={downloadResult}><Download aria-hidden="true" className="h-4 w-4" />Download</button>}
        </div>
        {error && <p role="alert" data-testid={`status-${mode}-error`} className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs leading-5 text-[#ffb9be]">{error}</p>}
      </div>
      <section aria-label={`${isResize ? "Resized" : "Compressed"} image preview`} className="min-w-0">
        <h2 className="text-base font-extrabold text-white">Preview</h2>
        <div className="mt-4 flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#33455c] bg-[#0b1320] p-4">
          {outputUrl ? <img data-testid={`result-${mode}-image`} src={outputUrl} alt={`${isResize ? "Resized" : "Compressed"} version of ${file?.name ?? "the selected image"}`} className="max-h-[420px] max-w-full rounded-lg object-contain" /> : sourceUrl ? <img src={sourceUrl} alt={`Original ${file?.name ?? "image"} preview`} className="max-h-[420px] max-w-full rounded-lg object-contain opacity-75" /> : <div className="flex flex-col items-center gap-3 text-center text-xs text-[#718197]"><ImageDown aria-hidden="true" className="h-9 w-9" /><span>Your preview will appear here</span></div>}
        </div>
        {output && file && <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#26364b] bg-[#101a28] p-3"><p className="text-[11px] font-semibold text-[#8291a3]">Original</p><p data-testid={`text-${mode}-original-size`} className="mt-1 text-sm font-extrabold text-white">{formatBytes(file.size)}</p></div>
          <div className="rounded-xl border border-[#26364b] bg-[#101a28] p-3"><p className="text-[11px] font-semibold text-[#8291a3]">Result</p><p data-testid={`text-${mode}-result-size`} className="mt-1 text-sm font-extrabold text-white">{formatBytes(output.size)}</p></div>
        </div>}
        {output && <p role="status" aria-live="polite" data-testid={`status-${mode}-complete`} className="mt-3 text-xs font-semibold text-[#84cba5]">{status}{!isResize && file && ` ${savings >= 0 ? `${savings.toFixed(1)}% smaller` : `${Math.abs(savings).toFixed(1)}% larger`}.`}</p>}
      </section>
    </div>
    {!isResize && <p className="mt-6 border-t border-[#26364b] pt-4 text-xs leading-5 text-[#8193a9]">For photographs, WebP or JPEG often reduces size most. PNG output preserves crisp edges but is lossless and ignores the quality slider.</p>}
  </ToolPanel>;
}

export function CompressImageTool() {
  return <ImageProcessor mode="compress" />;
}

export function ResizeImageTool() {
  return <ImageProcessor mode="resize" />;
}