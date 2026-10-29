import type { Ream } from 'reamkit';

export const MAX_CONVERSION_BYTES = 50 * 1024 * 1024;

export interface ConversionResult {
  blob: Blob;
  fileName: string;
  outputBytes: number;
  warning: string;
}

export class DocumentConversionError extends Error {
  constructor(message: string) { super(message); this.name = 'DocumentConversionError'; }
}

function getExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

function stripExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? name : name.slice(0, i);
}

export function validateConversionFile(file: Pick<File, 'name' | 'size' | 'type'>, mode: 'pdf-to-word' | 'word-to-pdf'): string | null {
  if (!file || file.size <= 0) return 'The selected file is empty. Please choose a valid document.';
  if (file.size > MAX_CONVERSION_BYTES) return 'The file exceeds the 50 MiB size limit. Please choose a smaller file.';
  const ext = getExtension(file.name);
  const isPdf = ext === 'pdf' || file.type === 'application/pdf';
  const isDocx = ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (mode === 'pdf-to-word' && !isPdf) return 'Please select a PDF file for conversion to Word.';
  if (mode === 'word-to-pdf' && !isDocx) return 'Please select a DOCX file for conversion to PDF.';
  return null;
}

export async function convertDocument(
  file: File,
  mode: 'pdf-to-word' | 'word-to-pdf'
): Promise<ConversionResult> {
  const validationError = validateConversionFile(file, mode);
  if (validationError) throw new DocumentConversionError(validationError);

  let reamModule: typeof import('reamkit');
  try {
    reamModule = await import('reamkit');
  } catch {
    throw new DocumentConversionError('Failed to load the conversion engine. Please try again later.');
  }

  const { Ream, WrongPasswordError } = reamModule;

  let buffer: ArrayBuffer;
  try {
    const header = new Uint8Array(await file.slice(0, mode === 'pdf-to-word' ? 1024 : 4).arrayBuffer());
    const headerText = String.fromCharCode(...header);
    const looksValid = mode === 'pdf-to-word' ? headerText.includes('%PDF-') : headerText.startsWith('PK\u0003\u0004');
    if (!looksValid) throw new DocumentConversionError('The selected file does not appear to be a valid PDF or DOCX.');
    buffer = await file.arrayBuffer();
  } catch (err) {
    if (err instanceof DocumentConversionError) throw err;
    throw new DocumentConversionError('Unable to read the selected file. Please ensure it is not corrupted and try again.');
  }

  const inputBytes = new Uint8Array(buffer);
  let doc: ReturnType<typeof Ream.parse>;

  try {
    doc = Ream.parse(inputBytes);
    const expectedSource = mode === 'pdf-to-word' ? 'pdf' : 'docx';
    if (doc.format !== expectedSource) {
      throw new DocumentConversionError(`This file contains ${doc.format || 'an unsupported format'}, not the expected ${expectedSource.toUpperCase()} document.`);
    }
  } catch (err: unknown) {
    if (err instanceof DocumentConversionError) throw err;
    if (WrongPasswordError && err instanceof WrongPasswordError) {
      throw new DocumentConversionError('The document is password-protected. Use the Unlock PDF tool first, then try again.');
    }
    throw new DocumentConversionError('Unable to parse the document. Ensure it is a valid, uncorrupted file.');
  }

  const targetFormat = mode === 'pdf-to-word' ? 'docx' : 'pdf';
  let converted: Uint8Array;

  try {
    converted = await doc.convert(targetFormat);
  } catch {
    throw new DocumentConversionError('Conversion failed. The document may contain unsupported features or be corrupted.');
  }

  const ownedBuffer = new ArrayBuffer(converted.byteLength);
  new Uint8Array(ownedBuffer).set(converted);

  const mimeType = targetFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const blob = new Blob([ownedBuffer], { type: mimeType });
  const rawBaseName = stripExtension(file.name);
  const safeBaseName = rawBaseName.replace(/[\\/\u0000-\u001f\u007f]/g, '_').replace(/^[-.\s]+/, '').trim();
  const baseName = safeBaseName && !/^\.*$/.test(safeBaseName) ? safeBaseName : 'document';
  const outExt = targetFormat === 'pdf' ? '.pdf' : '.docx';
  const fileName = `${baseName}_converted${outExt}`;

  const warning = mode === 'pdf-to-word'
    ? 'Scanned PDFs are not processed with OCR, so image-only pages will not become editable text. Formatting may change.'
    : 'Formatting may change during conversion. Font assets may be fetched as needed; document content is not uploaded.';

  return {
    blob,
    fileName,
    outputBytes: blob.size,
    warning
  };
}
