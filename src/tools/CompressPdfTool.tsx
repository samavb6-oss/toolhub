import { useRef, useState, type ChangeEvent } from 'react';
import { FileArchive, Download, LoaderCircle } from 'lucide-react';
import { ToolPanel, ToolField, toolInputClass, primaryButtonClass, secondaryButtonClass } from './ToolPageFrame';
import { downloadBlob, formatBytes } from './toolUtils';
import { compressPdfFile, validateCompressPdf } from './compressPdfLogic';

interface OutputState {
  blob: Blob;
  fileName: string;
  originalBytes: number;
  outputBytes: number;
  reduced: boolean;
}

export default function CompressPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [output, setOutput] = useState<OutputState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (busyRef.current) return;
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setOutput(null);
    setError(null);

    if (selected) {
      const validationError = validateCompressPdf(selected);
      if (validationError) {
        setError(validationError);
      }
    }
  };

  const handleCompress = async () => {
    if (!file || busyRef.current) return;

    const validationError = validateCompressPdf(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setError(null);
    setOutput(null);

    try {
      const result = await compressPdfFile(file);
      setOutput(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (output) {
      downloadBlob(output.blob, output.fileName);
    }
  };

  const reductionPercent = output && output.reduced
    ? (((output.originalBytes - output.outputBytes) / output.originalBytes) * 100).toFixed(1)
    : null;

  return (
    <ToolPanel>
      <p className="mb-4 text-sm leading-6 text-[#aab7c9]">
        Reduce PDF file size using lossless stream and object compression. All processing stays in your browser and files are never uploaded.
      </p>

      <ToolField label="PDF File" htmlFor="compress-pdf-file-input">
        <input
          ref={fileInputRef}
          id="compress-pdf-file-input"
          data-testid="compress-pdf-file-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          disabled={busy}
          className={toolInputClass}
        />
      </ToolField>

      {file && !error && (
        <div className="mt-3 text-sm text-[#cbd5e1]" data-testid="compress-pdf-original-size">
          Original size: {formatBytes(file.size)}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-[#6e4149] bg-[#3b2429] p-3 text-sm text-[#ffb9be]" role="alert" data-testid="compress-pdf-error">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCompress}
          disabled={!file || busy || !!error}
          className={primaryButtonClass}
          data-testid="compress-pdf-button"
          aria-label="Compress PDF"
        >
          {busy ? (
            <>
              <LoaderCircle className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
              Compressing…
            </>
          ) : (
            <>
              <FileArchive className="h-4 w-4" aria-hidden="true" />
              Compress PDF
            </>
          )}
        </button>

        {file && (
          <button
            type="button"
            onClick={() => { if (!busyRef.current) { setFile(null); setOutput(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ""; } }}
            disabled={busy}
            className={secondaryButtonClass}
            data-testid="compress-pdf-clear-button"
          >
            Clear file
          </button>
        )}

        {output && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className={secondaryButtonClass}
            data-testid="compress-pdf-download-button"
            aria-label="Download compressed PDF"
          >
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            Download
          </button>
        )}
      </div>

      {output && (
        <div role="status" aria-live="polite" className="mt-5 rounded-xl border border-[#28394e] bg-[#0c1522] p-4 text-sm text-[#cbd5e1]" data-testid="compress-pdf-status">
          {output.reduced ? (
            <div>
              <p className="mb-2 font-semibold text-[#84cba5]">Compression successful</p>
              <p data-testid="compress-pdf-before-size">Before: {formatBytes(output.originalBytes)}</p>
              <p data-testid="compress-pdf-after-size">After: {formatBytes(output.outputBytes)}</p>
              <p data-testid="compress-pdf-reduction" className="mt-1 font-semibold text-[#84cba5]">
                Reduced by {reductionPercent}%
              </p>
            </div>
          ) : (
            <div data-testid="compress-pdf-no-reduction">
              <p className="font-semibold text-[#e0e8f2]">
                This PDF was already optimized. No size reduction was achieved, so the original file was kept.
              </p>
              <p className="mt-1 text-[#aab7c9]">Size: {formatBytes(output.originalBytes)}</p>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-xs leading-5 text-[#8193a9]" data-testid="compress-pdf-privacy-note">
        Privacy note: Files stay in your browser and are not uploaded to any server. All document processing is performed locally.
      </p>
    </ToolPanel>
  );
}
