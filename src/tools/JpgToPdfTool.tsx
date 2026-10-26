import React, { useState, useRef, ChangeEvent } from 'react';
import { FileImage, ArrowUp, ArrowDown, Download, Trash2, LoaderCircle } from 'lucide-react';
import { ToolPanel, ToolField, toolInputClass, primaryButtonClass, secondaryButtonClass } from './ToolPageFrame';
import { downloadBlob, formatBytes } from './toolUtils';
import { convertJpgFilesToPdf, validateJpgSelection, JpgToPdfError, MAX_JPG_PDF_FILES, MAX_JPG_PDF_BYTES } from './jpgToPdfLogic';

interface JpgItem {
  id: string;
  file: File;
}

export default function JpgToPdfTool() {
  const [items, setItems] = useState<JpgItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; fileName: string; pageCount: number } | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  const clearResult = () => {
    setResult(null);
    setStatus(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (busyRef.current) return;
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    clearResult();
    const combined = [...items.map(i => i.file), ...files];
    const validationError = validateJpgSelection(combined);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }

    setError(null);
    const newItems: JpgItem[] = files.map(f => ({ id: crypto.randomUUID(), file: f }));
    setItems(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (busyRef.current) return;
    setItems(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    clearResult();
  };

  const removeItem = (id: string) => {
    if (busyRef.current) return;
    setItems(prev => prev.filter(i => i.id !== id));
    clearResult();
  };

  const clearAll = () => {
    if (busyRef.current) return;
    setItems([]);
    setError(null);
    clearResult();
  };

  const handleConvert = async () => {
    if (busyRef.current || items.length === 0) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    clearResult();

    try {
      const res = await convertJpgFilesToPdf(items.map(i => i.file));
      setResult(res);
      setStatus(`Conversion complete. Output: ${res.fileName} (${res.pageCount} page${res.pageCount !== 1 ? 's' : ''}).`);
    } catch (err) {
      if (err instanceof JpgToPdfError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during conversion.');
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleDownload = () => {
    if (result) {
      downloadBlob(result.blob, result.fileName);
    }
  };

  return (
    <ToolPanel>
      <p className="text-sm text-gray-400 mb-4">
        Combine JPEG images into a single PDF document. Files stay on this device and are not uploaded.
      </p>

      <ToolField label="Select JPEG files" htmlFor="jpg-pdf-input">
        <input
          id="jpg-pdf-input"
          type="file"
          accept="image/jpeg,.jpg,.jpeg"
          multiple
          onChange={handleFileChange}
          disabled={busy}
          className={toolInputClass}
          data-testid="jpg-input"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum {MAX_JPG_PDF_FILES} files or {formatBytes(MAX_JPG_PDF_BYTES)} total.
        </p>
      </ToolField>

      {error && (
        <div role="alert" className="mt-3 p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-200" data-testid="error-status">
          {error}
        </div>
      )}

      {status && (
        <div role="status" aria-live="polite" className="mt-3 p-3 bg-green-900/50 border border-green-700 rounded text-sm text-green-200" data-testid="success-status">
          {status}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-300">Selected files ({items.length})</span>
            <button
              type="button"
              onClick={clearAll}
              disabled={busy}
              className={secondaryButtonClass}
              data-testid="clear-all-btn"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Clear all
            </button>
          </div>
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center justify-between p-2 bg-gray-800 border border-gray-700 rounded"
                data-testid={`jpg-pdf-item-${index}`}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-sm text-gray-200 truncate">{item.file.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(item.file.size)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(index, -1)}
                    disabled={busy || index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                    aria-label={`Move ${item.file.name} up`}
                    data-testid="move-up-btn"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 1)}
                    disabled={busy || index === items.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                    aria-label={`Move ${item.file.name} down`}
                    data-testid="move-down-btn"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={busy}
                    className="p-1 text-red-400 hover:text-red-300 disabled:opacity-30"
                    aria-label={`Remove ${item.file.name}`}
                    data-testid="remove-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleConvert}
          disabled={busy || items.length === 0}
          className={primaryButtonClass}
          data-testid="convert-btn"
        >
          {busy ? <LoaderCircle className="w-4 h-4 mr-2 animate-spin" /> : <FileImage className="w-4 h-4 mr-2" />}
          {busy ? 'Converting...' : 'Convert to PDF'}
        </button>

        {result && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className={primaryButtonClass}
            data-testid="download-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </button>
        )}
      </div>
    </ToolPanel>
  );
}
