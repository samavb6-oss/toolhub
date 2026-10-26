import { useRef, useState, type ChangeEvent } from 'react';
import { FileOutput, FileText, Download, LoaderCircle } from 'lucide-react';
import { ToolPanel, ToolField, toolInputClass, primaryButtonClass, secondaryButtonClass } from './ToolPageFrame';
import { downloadBlob, formatBytes } from './toolUtils';
import { convertDocument } from './documentConversionLogic';

type ConversionMode = 'pdf-to-word' | 'word-to-pdf';

interface ConversionResult {
  blob: Blob;
  fileName: string;
  outputBytes: number;
  warning?: string;
}

function DocumentConversionTool({ mode }: { mode: ConversionMode }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const busyRef = useRef(false);

  const accept = mode === 'pdf-to-word' ? '.pdf' : '.docx';
  const title = mode === 'pdf-to-word' ? 'PDF to Word' : 'Word to PDF';
  const description = mode === 'pdf-to-word'
    ? 'Convert a PDF document to a Word (.docx) file.'
    : 'Convert a Word (.docx) document to a PDF file.';

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (busyRef.current) return;
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setStatus('');
    setError('');
    e.target.value = '';
  };

  const handleClear = () => {
    setFile(null);
    setResult(null);
    setStatus('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleConvert = async () => {
    if (!file || busyRef.current) return;
    busyRef.current = true;
    setIsProcessing(true);
    setStatus('Converting document...');
    setError('');
    setResult(null);
    try {
      const res = await convertDocument(file, mode);
      setResult(res);
      setStatus(`Conversion complete. Output size: ${formatBytes(res.outputBytes)}`);
    } catch (err) {
      setStatus('');
      setError(err instanceof Error ? err.message : 'Conversion failed. Please check the input file and try again.');
    } finally {
      setIsProcessing(false);
      busyRef.current = false;
    }
  };

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, result.fileName);
  };

  return (
    <ToolPanel className="space-y-4">
      <h2 className="text-base font-extrabold text-white">{title}</h2>
      <p className="text-sm leading-6 text-[#aab7c9]">{description}</p>
      <ToolField label="Select file" htmlFor={`${mode}-file-input`}>
        <input
          ref={inputRef}
          id={`${mode}-file-input`}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isProcessing}
          aria-label={`Select ${mode === 'pdf-to-word' ? 'PDF' : 'Word'} file`}
          data-testid={`${mode}-file-input`}
          className={toolInputClass}
        />
      </ToolField>

      {file && (
        <div className="text-sm text-[#cbd5e1]" data-testid={`${mode}-file-info`}>
          <span className="font-medium">{file.name}</span>
          <span className="ml-2 text-[#8193a9]">({formatBytes(file.size)})</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleConvert}
          disabled={!file || isProcessing}
          aria-label="Convert document"
          data-testid={`${mode}-convert-button`}
          className={primaryButtonClass}
        >
          {isProcessing ? (
            <LoaderCircle className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <FileOutput className="w-4 h-4 mr-2" />
          )}
          Convert
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={isProcessing}
          aria-label="Clear file"
          data-testid={`${mode}-clear-button`}
          className={secondaryButtonClass}
        >
          Clear
        </button>
      </div>

      {error && <p role="alert" data-testid={`${mode}-error`} className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] p-3 text-sm text-[#ffb9be]">{error}</p>}
      {status && <p role="status" aria-live="polite" data-testid={`${mode}-status`} className="mt-4 text-sm text-[#cbd5e1]">{status}</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-[#28394e] bg-[#0c1522] p-4" data-testid={`${mode}-result`}>
          <div className="mb-3 text-sm text-[#cbd5e1]">
            <span className="font-semibold text-[#e0e8f2]">{result.fileName}</span>
            <span className="ml-2">({formatBytes(result.outputBytes)})</span>
            {result.warning && (
              <p className="mt-2 text-[#f0c674]" data-testid={`${mode}-warning`}>
                {result.warning}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download converted file"
            data-testid={`${mode}-download-button`}
            className={primaryButtonClass}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        </div>
      )}

      <div className="mt-6 space-y-1 rounded-xl border border-[#28394e] bg-[#0c1522] p-4 text-xs leading-5 text-[#8193a9]" data-testid={`${mode}-privacy-note`}>
        <p><strong className="text-[#cbd5e1]">Privacy:</strong> Document content stays in your browser and is never uploaded.</p>
        <p>PDF rendering may fetch font assets from external sources.</p>
        <p>Scanned PDFs do not get OCR processing, and complex formatting may change during conversion.</p>
      </div>
    </ToolPanel>
  );
}

export function PdfToWordTool() {
  return <DocumentConversionTool mode="pdf-to-word" />;
}

export function WordToPdfTool() {
  return <DocumentConversionTool mode="word-to-pdf" />;
}
