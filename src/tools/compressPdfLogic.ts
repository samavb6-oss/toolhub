import { getPdfToolkit } from './pdfToolkit.ts';

export const MAX_COMPRESS_PDF_BYTES = 100 * 1024 * 1024;

export class CompressPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompressPdfError';
  }
}

export function validateCompressPdf(file: Pick<File, 'name' | 'size' | 'type'>): string | null {
  const nameLower = file.name.toLowerCase();
  const isPdfExt = nameLower.endsWith('.pdf');
  const isPdfMime = file.type === 'application/pdf';

  if (!isPdfExt && !isPdfMime) {
    return 'Please select a valid PDF file.';
  }

  if (file.size === 0) {
    return 'The selected file is empty.';
  }

  if (file.size > MAX_COMPRESS_PDF_BYTES) {
    return 'File size exceeds the 100 MiB limit.';
  }

  return null;
}

function sanitizeFileName(name: string): string {
  const withoutExt = name.replace(/\.pdf$/i, '');
  const sanitized = withoutExt.replace(/[^a-zA-Z0-9_\- .]/g, '_');
  const base = sanitized.replace(/^[-.\s]+/, '').trim() || 'document';
  return `${base}_compressed.pdf`;
}

export async function compressPdfFile(
  file: File
): Promise<{ blob: Blob; fileName: string; originalBytes: number; outputBytes: number; reduced: boolean }> {
  const validationError = validateCompressPdf(file);
  if (validationError) {
    throw new CompressPdfError(validationError);
  }

  let inputBytes: Uint8Array;
  try {
    const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const headerText = String.fromCharCode(...header);
    if (!headerText.includes('%PDF-')) {
      throw new CompressPdfError('The selected file does not appear to be a valid PDF.');
    }
    const arrayBuffer = await file.arrayBuffer();
    inputBytes = new Uint8Array(arrayBuffer);
  } catch (err) {
    if (err instanceof CompressPdfError) throw err;
    throw new CompressPdfError('Failed to read the PDF file.');
  }

  const originalBytes = inputBytes.length;
  let compressedBytes: Uint8Array;

  try {
    const toolkit = await getPdfToolkit();
    compressedBytes = await toolkit.compress(inputBytes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    const lower = message.toLowerCase();
    if (lower.includes('encrypt') || lower.includes('password')) {
      throw new CompressPdfError('This PDF is encrypted or password-protected and cannot be compressed.');
    }
    if (lower.includes('corrupt') || lower.includes('invalid') || lower.includes('parse')) {
      throw new CompressPdfError('The PDF appears to be corrupt or invalid.');
    }
    throw new CompressPdfError('An error occurred while compressing the PDF. The file may be corrupt or unsupported.');
  }

  const outputBytesCount = compressedBytes.length;
  const reduced = outputBytesCount < originalBytes;

  const finalBytes = reduced ? compressedBytes : inputBytes;
  const outputBytes = reduced ? outputBytesCount : originalBytes;

  const ownedBuffer = new ArrayBuffer(finalBytes.length);
  new Uint8Array(ownedBuffer).set(finalBytes);

  const blob = new Blob([ownedBuffer], { type: 'application/pdf' });
  const fileName = sanitizeFileName(file.name);

  return { blob, fileName, originalBytes, outputBytes, reduced };
}
