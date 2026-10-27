import { useEffect, useRef, useState } from "react";
import type { BackgroundRemover as BackgroundRemoverInstance } from "@katana-video/web-bg-removal";
import { Download, ImageMinus, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { alphaMatteToRgba, backgroundOutputBaseName, validateBackgroundImageDimensions, validateBackgroundImageFile } from "./removeBackgroundLogic";
import { downloadBlob, formatBytes } from "./toolUtils";
import { primaryButtonClass, secondaryButtonClass, ToolField, ToolPanel, toolInputClass } from "./ToolPageFrame";

const CHECKERBOARD_STYLE = {
  backgroundColor: "#f8fafc",
  backgroundImage: "linear-gradient(45deg,#cbd5e1 25%,transparent 25%),linear-gradient(-45deg,#cbd5e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cbd5e1 75%),linear-gradient(-45deg,transparent 75%,#cbd5e1 75%)",
  backgroundSize: "24px 24px",
  backgroundPosition: "0 0,0 12px,12px -12px,-12px 0",
};

export function RemoveBackgroundTool() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [backend, setBackend] = useState<"WebGPU" | "WebGL2" | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const removerRef = useRef<BackgroundRemoverInstance | null>(null);
  const operationIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationIdRef.current += 1;
      removerRef.current?.destroy();
      removerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setSourceUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!resultBlob) {
      setResultUrl(null);
      return;
    }
    const url = URL.createObjectURL(resultBlob);
    setResultUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [resultBlob]);

  async function handleFileChange(nextFile: File | null) {
    const requestId = ++operationIdRef.current;
    setError("");
    setStatus("");
    setProgress(0);
    setBackend(null);
    setFile(null);
    setResultBlob(null);
    if (!nextFile) return;

    const fileError = validateBackgroundImageFile(nextFile);
    if (fileError) {
      setError(fileError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(nextFile);
      const dimensionError = validateBackgroundImageDimensions(bitmap.width, bitmap.height);
      if (requestId !== operationIdRef.current || !mountedRef.current) return;
      if (dimensionError) {
        setError(dimensionError);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      setFile(nextFile);
      setStatus("Image ready: " + bitmap.width + " × " + bitmap.height + " pixels.");
    } catch {
      if (requestId === operationIdRef.current && mountedRef.current) {
        setError("The image could not be opened. Try a different PNG, JPG, or WebP file.");
        if (inputRef.current) inputRef.current.value = "";
      }
    } finally {
      bitmap?.close();
    }
  }

  async function handleRemoveBackground() {
    if (!file || busy) return;
    const requestId = ++operationIdRef.current;
    setBusy(true);
    setLoadingModel(false);
    setProgress(0);
    setError("");
    setStatus("Preparing image…");

    let sourceBitmap: ImageBitmap | null = null;
    let maskCanvas: HTMLCanvasElement | null = null;
    let canvas: HTMLCanvasElement | null = null;

    try {
      let remover = removerRef.current;
      if (!remover) {
        setLoadingModel(true);
        setStatus("Loading the background-removal model. The first use downloads model weights (about 90 MB with half-precision support, up to 179 MB otherwise); later visits may reuse cached weights.");
        const { BackgroundRemover } = await import("@katana-video/web-bg-removal");
        remover = await BackgroundRemover.load("birefnet_lite", {
          dtype: "auto",
          backend: "auto",
          cache: true,
          onProgress: (fraction) => {
            if (requestId !== operationIdRef.current || !mountedRef.current) return;
            const nextProgress = Number.isFinite(fraction) ? Math.max(0, Math.min(100, Math.round(fraction * 100))) : 0;
            setProgress(nextProgress);
            setStatus(nextProgress >= 100 ? "Model downloaded. Preparing the image…" : "Downloading model weights: " + nextProgress + "%");
          },
        });
        if (requestId !== operationIdRef.current || !mountedRef.current) {
          remover.destroy();
          return;
        }
        removerRef.current = remover;
      }

      setLoadingModel(false);
      setProgress(100);
      setStatus("Removing the background locally…");
      sourceBitmap = await createImageBitmap(file);
      const matte = await remover.alpha(sourceBitmap);
      if (requestId !== operationIdRef.current || !mountedRef.current) return;
      if (matte.w !== sourceBitmap.width || matte.h !== sourceBitmap.height) {
        throw new Error("The background-removal model returned an unexpected mask size.");
      }
      // Composite the documented raw matte ourselves. The library's GPU render output can
      // be an empty bitmap on some browser/backend combinations even when inference succeeds.
      maskCanvas = document.createElement("canvas");
      maskCanvas.width = matte.w;
      maskCanvas.height = matte.h;
      const maskContext = maskCanvas.getContext("2d");
      if (!maskContext) throw new Error("Canvas rendering is unavailable.");
      const maskPixels = maskContext.createImageData(matte.w, matte.h);
      maskPixels.data.set(alphaMatteToRgba(matte));
      maskContext.putImageData(maskPixels, 0, 0);

      canvas = document.createElement("canvas");
      canvas.width = sourceBitmap.width;
      canvas.height = sourceBitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas rendering is unavailable.");
      context.drawImage(sourceBitmap, 0, 0);
      context.globalCompositeOperation = "destination-in";
      context.imageSmoothingEnabled = true;
      context.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = "source-over";
      const output = await new Promise<Blob>((resolve, reject) => {
        canvas!.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("PNG export failed."));
        }, "image/png");
      });
      if (requestId !== operationIdRef.current || !mountedRef.current) return;
      setResultBlob(output);
      setBackend(remover.backend === "webgpu" ? "WebGPU" : "WebGL2");
      setStatus("Background removed. Transparent PNG ready (" + formatBytes(output.size) + ").");
    } catch (cause) {
      if (requestId === operationIdRef.current && mountedRef.current) {
        const message = cause instanceof Error ? cause.message.toLowerCase() : "";
        setError(message.includes("fetch") || message.includes("network")
          ? "The model could not be downloaded. Check your connection and try again."
          : "Background removal failed. Try another image or reload the page and retry.");
        setStatus("");
      }
    } finally {
      sourceBitmap?.close();
      if (maskCanvas) {
        maskCanvas.width = 0;
        maskCanvas.height = 0;
      }
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      if (requestId === operationIdRef.current && mountedRef.current) {
        setBusy(false);
        setLoadingModel(false);
      }
    }
  }

  function clearSelection() {
    if (busy) return;
    operationIdRef.current += 1;
    setFile(null);
    setResultBlob(null);
    setError("");
    setStatus("");
    setProgress(0);
    setBackend(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <ToolPanel>
      <div className="space-y-5" aria-busy={busy}>
        <div className="flex items-start gap-3 rounded-2xl border border-[#355a49] bg-[#11251f] p-4">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#73d4a7]" />
          <div>
            <p className="text-sm font-bold text-[#dff8eb]">Your image stays on this device</p>
            <p className="mt-1 text-xs leading-5 text-[#b5d7c7]">
              Background removal runs locally in your browser. The first run downloads model weights (about 90 MB with half-precision support, up to 179 MB otherwise). Your image is not uploaded.
            </p>
          </div>
        </div>

        <ToolField label="Choose an image" htmlFor="remove-background-file" hint="PNG, JPG, or WebP · up to 25 MB and 40 megapixels.">
          <input
            ref={inputRef}
            id="remove-background-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            disabled={busy}
            onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
            className={toolInputClass}
            data-testid="input-remove-background"
          />
        </ToolField>

        {file && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2a394d] bg-[#0b1320] p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#edf3fb]">{file.name}</p>
              <p className="text-xs text-[#9fb0c6]">{formatBytes(file.size)}</p>
            </div>
            <button type="button" onClick={clearSelection} disabled={busy} className={secondaryButtonClass} data-testid="button-clear-remove-background">
              <Trash2 aria-hidden="true" className="h-4 w-4" /> Clear
            </button>
          </div>
        )}

        {busy && loadingModel && (
          <div className="space-y-2" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-xs text-[#c6d3e3]">
              <span>Preparing model</span><span>{progress}%</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-[#26364a]"
              role="progressbar"
              aria-label="Background-removal model download"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              data-testid="progress-remove-background"
            >
              <div className="h-full rounded-full bg-[#4e91ff] transition-[width]" style={{ width: progress + "%" }} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void handleRemoveBackground()} disabled={!file || busy} className={primaryButtonClass} data-testid="button-remove-background">
            {busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ImageMinus aria-hidden="true" className="h-4 w-4" />}
            {busy ? "Removing background…" : "Remove background"}
          </button>
          {resultBlob && file && (
            <button type="button" onClick={() => downloadBlob(resultBlob, backgroundOutputBaseName(file.name) + "-no-background.png")} className={secondaryButtonClass} data-testid="button-download-remove-background">
              <Download aria-hidden="true" className="h-4 w-4" /> Download transparent PNG
            </button>
          )}
        </div>

        {status && <p role="status" aria-live="polite" className="text-sm text-[#b8c7da]" data-testid="status-remove-background">{status}</p>}
        {error && <p role="alert" className="rounded-xl border border-[#6e4149] bg-[#3b2429] p-4 text-sm text-[#ffb9be]" data-testid="error-remove-background">{error}</p>}
        {backend && <p className="text-xs text-[#9fb0c6]">Processing backend: {backend}. No image upload was performed.</p>}

        {(sourceUrl || resultUrl) && (
          <div className="grid gap-4 md:grid-cols-2">
            {sourceUrl && (
              <div className="min-w-0 space-y-2">
                <h3 className="text-sm font-bold text-[#dce6f3]">Original image</h3>
                <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-[#2a394d] p-2" style={CHECKERBOARD_STYLE}>
                  <img src={sourceUrl} alt="Original image preview" className="max-h-[420px] max-w-full object-contain" />
                </div>
              </div>
            )}
            {resultUrl && (
              <div className="min-w-0 space-y-2">
                <h3 className="text-sm font-bold text-[#dce6f3]">Transparent background</h3>
                <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-[#2a394d] p-2" style={CHECKERBOARD_STYLE}>
                  <img src={resultUrl} alt="Image with its background removed" className="max-h-[420px] max-w-full object-contain" data-testid="result-remove-background" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolPanel>
  );
}