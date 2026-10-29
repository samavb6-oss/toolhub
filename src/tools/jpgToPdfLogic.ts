import { PDFDocument } from 'pdf-lib';

export const MAX_JPG_PDF_FILES = 30;
export const MAX_JPG_PDF_BYTES = 100 * 1024 * 1024;

export class JpgToPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JpgToPdfError';
  }
}

export function validateJpgSelection(files: Pick<File, 'name' | 'size' | 'type'>[]): string | null {
  if (!files || files.length === 0) {
    return 'No files selected.';
  }
  if (files.length > MAX_JPG_PDF_FILES) {
    return `Too many files. Maximum allowed is ${MAX_JPG_PDF_FILES}.`;
  }
  let totalBytes = 0;
  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    const isJpgExt = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
    if (!isJpgExt) {
      return `Unsupported file type for "${file.name}". Only .jpg and .jpeg files are allowed.`;
    }
    if (file.type && file.type !== 'image/jpeg') {
      return `Unsupported file type for "${file.name}". Only JPEG images are allowed.`;
    }
    if (!Number.isFinite(file.size) || file.size <= 0) {
      return `File "${file.name}" is 0 bytes or invalid.`;
    }
    totalBytes += file.size;
  }
  if (totalBytes > MAX_JPG_PDF_BYTES) {
    return `Combined file size exceeds the maximum limit of 100 MiB.`;
  }
  return null;
}

export function sanitizeJpgPdfName(name: string): string {
  const dotIndex = name.lastIndexOf('.');
  let base = dotIndex > -1 ? name.substring(0, dotIndex) : name;
  // Keep downloads portable across operating systems and avoid hidden/dot-only names.
  // eslint-disable-next-line no-control-regex
  base = base.replace(/[^a-zA-Z0-9_\- .]/g, '_').replace(/^[-.\s]+/, '').trim();
  if (!base || /^\.*$/.test(base)) {
    base = 'document';
  }
  return `${base}_converted.pdf`;
}

export function calculateContainedImageSize(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number = 595.28,
  pageHeight: number = 841.89,
  margin: number = 36
): { x: number; y: number; width: number; height: number } {
  if (!Number.isFinite(imageWidth) || imageWidth <= 0) {
    throw new JpgToPdfError('Invalid image width: must be a finite positive number.');
  }
  if (!Number.isFinite(imageHeight) || imageHeight <= 0) {
    throw new JpgToPdfError('Invalid image height: must be a finite positive number.');
  }
  if (!Number.isFinite(pageWidth) || pageWidth <= 0) {
    throw new JpgToPdfError('Invalid page width.');
  }
  if (!Number.isFinite(pageHeight) || pageHeight <= 0) {
    throw new JpgToPdfError('Invalid page height.');
  }
  if (!Number.isFinite(margin) || margin < 0) {
    throw new JpgToPdfError('Invalid margin.');
  }

  const availableWidth = pageWidth - 2 * margin;
  const availableHeight = pageHeight - 2 * margin;

  if (availableWidth <= 0 || availableHeight <= 0) {
    throw new JpgToPdfError('Page margins are too large for the given page dimensions.');
  }

  const ratio = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
  const width = imageWidth * ratio;
  const height = imageHeight * ratio;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;

  return { x, y, width, height };
}

export async function convertJpgFilesToPdf(
  files: File[]
): Promise<{ blob: Blob; fileName: string; pageCount: number }> {
  try {
    if (!files || files.length === 0 || files.length > MAX_JPG_PDF_FILES) {
      throw new JpgToPdfError(`Please select between 1 and ${MAX_JPG_PDF_FILES} JPEG images.`);
    }

    const validationError = validateJpgSelection(files);
    if (validationError) {
      throw new JpgToPdfError(validationError);
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const jpgImage = await pdfDoc.embedJpg(uint8Array);
      const page = pdfDoc.addPage([595.28, 841.89]);
      const dims = calculateContainedImageSize(jpgImage.width, jpgImage.height, 595.28, 841.89, 36);
      page.drawImage(jpgImage, {
        x: dims.x,
        y: dims.y,
        width: dims.width,
        height: dims.height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const outputBuffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(outputBuffer).set(pdfBytes);
    const blob = new Blob([outputBuffer], { type: 'application/pdf' });
    const fileName = sanitizeJpgPdfName(files[0].name);
    const pageCount = pdfDoc.getPageCount();

    return { blob, fileName, pageCount };
  } catch (error) {
    if (error instanceof JpgToPdfError) {
      throw error;
    }
    throw new JpgToPdfError(
      `Failed to convert images to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
