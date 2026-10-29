import { useRef, useState, type ChangeEvent } from 'react';
import { Unlock, Download, LoaderCircle, Trash2 } from 'lucide-react';
import { ToolPanel, ToolField, toolInputClass, primaryButtonClass, secondaryButtonClass } from './ToolPageFrame';
import { downloadBlob, formatBytes } from './toolUtils';
import { unlockPdfFile, validateUnlockPdf, UnlockPdfError, MAX_UNLOCK_PDF_BYTES } from './unlockPdfLogic';

export default function UnlockPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<{ blob: Blob; fileName: string; originalBytes: number; outputBytes: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const busyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processing = busy;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (processing) return;
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
    setSuccess(null);
    if (selected) {
      const validationError = validateUnlockPdf(selected);
      if (validationError) {
        setError(validationError);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (processing) return;
    setPassword(e.target.value);
  };

  const handleUnlock = async () => {
    if (!file || processing) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setSuccess(null);
    setResult(null);
    try {
      const unlocked = await unlockPdfFile(file, password);
      setResult(unlocked);
      setSuccess(`PDF unlocked successfully. Ready to download ${unlocked.fileName}.`);
    } catch (err) {
      if (err instanceof UnlockPdfError) {
        setError(err.message);
      } else {
        setError('Failed to unlock PDF.');
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, result.fileName);
  };

  const handleClear = () => {
    if (processing) return;
    setFile(null);
    setPassword('');
    setResult(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <ToolPanel className="space-y-4">
      <h2 className="text-base font-extrabold text-white">Unlock PDF</h2>
      <p className="text-sm leading-6 text-[#aab7c9]">Remove PDF password protection using a password you know. Files stay on this device.</p>
      <ToolField label="PDF File" htmlFor="unlock-pdf-file-input">
        <input
          ref={fileInputRef}
          id="unlock-pdf-file-input"
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          disabled={processing}
          className={toolInputClass}
          aria-label="Select PDF file"
          data-testid="unlock-pdf-file-input"
        />
      </ToolField>

      {file && (
        <div className="mt-1 text-sm text-[#aab7c9]" data-testid="unlock-pdf-file-info">
          <span>{file.name}</span>
          <span className="ml-2">({formatBytes(file.size)})</span>
          {file.size > MAX_UNLOCK_PDF_BYTES && (
            <span className="ml-2 text-[#ffb9be]">Exceeds maximum size.</span>
          )}
        </div>
      )}

      <ToolField label="PDF password" htmlFor="unlock-pdf-password-input">
        <input
          id="unlock-pdf-password-input"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          disabled={processing}
          className={toolInputClass}
          placeholder="Leave blank if no user password"
          aria-label="PDF password"
          data-testid="unlock-pdf-password-input"
        />
      </ToolField>

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={handleUnlock}
          disabled={!file || processing || file.size > MAX_UNLOCK_PDF_BYTES}
          className={primaryButtonClass}
          aria-label="Unlock PDF"
          data-testid="unlock-pdf-unlock-button"
        >
          {processing ? (
            <LoaderCircle className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Unlock className="w-4 h-4 mr-2" />
          )}
          {processing ? 'Processing…' : 'Unlock'}
        </button>

        <button
          type="button"
          onClick={handleClear}
          disabled={processing || !file}
          className={secondaryButtonClass}
          aria-label="Clear file"
          data-testid="unlock-pdf-clear-button"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </button>
      </div>

      {result && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleDownload}
            className={primaryButtonClass}
            aria-label="Download unlocked PDF"
            data-testid="unlock-pdf-download-button"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Unlocked PDF
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] p-3 text-sm text-[#ffb9be]"
          data-testid="unlock-pdf-error"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-xl border border-[#2d5946] bg-[#10291f] p-3 text-sm text-[#84cba5]"
          data-testid="unlock-pdf-success"
        >
          {success}
        </div>
      )}

      <p className="mt-6 text-xs leading-5 text-[#8193a9]" data-testid="unlock-pdf-privacy-note">
        Privacy note: Your files and password stay entirely in your browser. No data is uploaded. This tool does not perform brute-force attacks. Only unlock documents you are authorized to access.
      </p>
    </ToolPanel>
  );
}
