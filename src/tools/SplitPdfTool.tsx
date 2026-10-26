import { useState, useRef, useCallback, type ChangeEvent } from "react";
import { FilePlus2, Scissors, Download, Trash2, LoaderCircle } from 'lucide-react';
import { ToolPanel, ToolField, toolInputClass, primaryButtonClass, secondaryButtonClass } from "./ToolPageFrame";
import { downloadBlob, formatBytes } from "./toolUtils";
import { splitPdfFile, SplitPdfError, MAX_SPLIT_BYTES } from "./splitPdfLogic";

interface SplitResult {
  blob: Blob;
  fileName: string;
  pageCount: number;
  pages: number[];
}

export default function SplitPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [ranges, setRanges] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SplitResult[]>([]);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearState = useCallback(() => {
    setResults([]);
    setTotalPages(null);
    setError('');
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    clearState();
    if (!selected) {
      setFile(null);
      return;
    }
    const nameLower = selected.name.toLowerCase();
    if (!nameLower.endsWith('.pdf')) {
      setError('Please select a valid PDF file. The file must have a .pdf extension.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (selected.type && selected.type !== 'application/pdf') {
      setError('Invalid file type. Please select a PDF file.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (selected.size === 0) {
      setError('The selected file is empty (0 bytes). Please choose a valid PDF.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (selected.size > MAX_SPLIT_BYTES) {
      setError(`File size exceeds the maximum allowed limit of ${formatBytes(MAX_SPLIT_BYTES)}.`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(selected);
    setError('');
  };

  const handleClearFile = () => {
    setFile(null);
    setRanges('');
    clearState();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRangesChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRanges(e.target.value);
    clearState();
  };

  const handleSplit = async () => {
    if (!file || !ranges.trim() || busy) return;
    setBusy(true);
    setError('');
    setResults([]);
    setTotalPages(null);
    try {
      const result = await splitPdfFile(file, ranges);
      setResults(result.files);
      setTotalPages(result.totalPages);
    } catch (err) {
      if (err instanceof SplitPdfError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while splitting the PDF.');
      }
    } finally {
      setBusy(false);
    }
  };

  const canSplit = !!file && ranges.trim().length > 0 && !busy;

  return (
    <ToolPanel>
      <div className="space-y-6">
        <ToolField label="PDF File" htmlFor="split-pdf-file">
          <div className="space-y-2">
            <input
              id="split-pdf-file"
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              disabled={busy}
              className={toolInputClass}
              data-testid="input-split-pdf"
            />
            {file && (
              <div className="flex items-center justify-between bg-[#0c1522] border border-[#28394e] rounded-xl p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FilePlus2 className="w-5 h-5 text-[#8db7ff] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#dce6f3] truncate">{file.name}</p>
                    <p className="text-xs text-[#8193a9]">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  disabled={busy}
                  className={secondaryButtonClass + ' flex items-center gap-1.5 ml-3'}
                  data-testid="button-clear-split-pdf"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>
            )}
          </div>
        </ToolField>

        <ToolField label="Page Ranges" htmlFor="split-pdf-ranges">
          <div className="space-y-2">
            <input
              id="split-pdf-ranges"
              type="text"
              value={ranges}
              onChange={handleRangesChange}
              disabled={!file || busy}
              placeholder="1-3, 5, 7-9"
              className={toolInputClass}
              data-testid="input-split-pdf-ranges"
            />
            <p className="text-xs text-[#8193a9]">
              Enter comma-separated page numbers or ranges (1-based). Each entry will become a separate PDF output file. Overlapping pages are not allowed.
            </p>
          </div>
        </ToolField>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSplit}
            disabled={!canSplit}
            className={primaryButtonClass + ' flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'}
            data-testid="button-split-pdf"
          >
            {busy ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Splitting…
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4" />
                Split PDF
              </>
            )}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="error-split-pdf"
            className="bg-[#3b2429] border border-[#6e4149] text-[#ffb9be] rounded-xl p-4 text-sm"
          >
            {error}
          </div>
        )}

        {results.length > 0 && totalPages !== null && (
          <div
            role="status"
            aria-live="polite"
            data-testid="status-split-pdf"
            className="space-y-4"
          >
            <div className="bg-[#0c1522] border border-[#28394e] rounded-xl p-4 space-y-1">
              <p className="text-sm text-[#cbd5e1]">
                Source PDF total pages: <span className="font-semibold text-white">{totalPages}</span>
              </p>
              <p className="text-sm text-[#cbd5e1]">
                Output files generated: <span className="font-semibold text-white">{results.length}</span>
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[#cbd5e1]">Output Files</h3>
              <ul
                data-testid="list-split-pdf-results"
                className="space-y-2"
              >
                {results.map((result, index) => (
                  <li
                    key={`${result.fileName}-${index}`}
                    className="flex items-center justify-between bg-[#0c1522] border border-[#28394e] rounded-xl p-3"
                  >
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium text-[#dce6f3] truncate">{result.fileName}</p>
                      <p className="text-xs text-[#8193a9]">
                        {result.pageCount} page{result.pageCount !== 1 ? 's' : ''} ({result.pages.join(', ')})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadBlob(result.blob, result.fileName)}
                      className={secondaryButtonClass + ' flex items-center gap-1.5 flex-shrink-0'}
                      data-testid={`button-download-split-pdf-${index}`}
                      aria-label={`Download ${result.fileName}`}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </ToolPanel>
  );
}
