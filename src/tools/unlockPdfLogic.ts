import { getPdfStudioModule, getPdfToolkit } from './pdfToolkit.ts';

export const MAX_UNLOCK_PDF_BYTES = 100 * 1024 * 1024;

export class UnlockPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnlockPdfError';
  }
}

export function validateUnlockPdf(file: Pick<File, 'name' | 'size' | 'type'>): string | null {
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return 'File is empty.';
  }
  if (file.size > MAX_UNLOCK_PDF_BYTES) {
    return 'File exceeds the maximum size of 100 MiB.';
  }
  const nameLower = file.name.toLowerCase();
  if (!nameLower.endsWith('.pdf') && file.type !== 'application/pdf') {
    return 'File must be a PDF (.pdf or application/pdf).';
  }
  return null;
}

export async function unlockPdfFile(
  file: File,
  password: string
): Promise<{ blob: Blob; fileName: string; originalBytes: number; outputBytes: number }> {
  const validationError = validateUnlockPdf(file);
  if (validationError) {
    throw new UnlockPdfError(validationError);
  }

  if (password.includes('\0')) {
    throw new UnlockPdfError('The password contains an invalid null character.');
  }
  if (password.length > 1024) {
    throw new UnlockPdfError('The password exceeds the 1024-character limit.');
  }

  let inputBytes: ArrayBuffer;
  try {
    const header = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    if (!String.fromCharCode(...header).includes('%PDF-')) {
      throw new UnlockPdfError('The selected file does not appear to be a valid PDF.');
    }
    inputBytes = await file.arrayBuffer();
  } catch (err) {
    if (err instanceof UnlockPdfError) throw err;
    throw new UnlockPdfError('Failed to read the file.');
  }

  let toolkit: Awaited<ReturnType<typeof getPdfToolkit>>;
  let PdfPasswordError: Awaited<ReturnType<typeof getPdfStudioModule>>['PdfPasswordError'];
  try {
    toolkit = await getPdfToolkit();
    ({ PdfPasswordError } = await getPdfStudioModule());
  } catch {
    throw new UnlockPdfError('The PDF unlock engine could not be loaded. Please try again.');
  }

  let outputBytes: Uint8Array;
  try {
    outputBytes = await toolkit.unlock(new Uint8Array(inputBytes), { password });
  } catch (err: unknown) {
    if (err instanceof PdfPasswordError) {
      if (!password) {
        throw new UnlockPdfError('A password is required to unlock this PDF.');
      }
      throw new UnlockPdfError('The password provided is incorrect.');
    }
    throw new UnlockPdfError('The PDF is invalid or corrupt and cannot be unlocked.');
  }

  const ownedBuffer = new ArrayBuffer(outputBytes.byteLength);
  new Uint8Array(ownedBuffer).set(outputBytes);

  const rawBaseName = file.name.replace(/\.pdf$/i, '');
  const safeBaseName = rawBaseName.replace(/[\\/\u0000-\u001f\u007f]/g, '_').replace(/^[-.\s]+/, '').trim();
  const baseName = safeBaseName && !/^\.*$/.test(safeBaseName) ? safeBaseName : 'document';
  const fileName = `${baseName}_unlocked.pdf`;

  return {
    blob: new Blob([ownedBuffer], { type: 'application/pdf' }),
    fileName,
    originalBytes: inputBytes.byteLength,
    outputBytes: ownedBuffer.byteLength,
  };
}
