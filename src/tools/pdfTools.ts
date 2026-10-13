import { PDFDocument } from "pdf-lib";

export const MAX_MERGE_FILES = 20;
export const MAX_MERGE_BYTES = 100 * 1024 * 1024;

/** An error whose message is already written for the person using the tool and is safe to show as-is. */
export class MergePdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MergePdfError";
  }
}

type PdfCandidate = Pick<File, "name" | "size" | "type">;

function looksLikePdf(file: PdfCandidate): boolean {
  return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
}

/**
 * Checks files the person is trying to add. Returns a message describing the first problem,
 * or null when the whole selection can be accepted.
 */
export function validateMergeSelection(existing: PdfCandidate[], incoming: PdfCandidate[]): string | null {
  const notPdf = incoming.find((file) => !looksLikePdf(file));
  if (notPdf) return `${notPdf.name} is not a PDF file.`;
  const empty = incoming.find((file) => file.size === 0);
  if (empty) return `${empty.name} is empty (0 bytes), so it can't be merged.`;
  const all = [...existing, ...incoming];
  if (all.length > MAX_MERGE_FILES) return `Merge up to ${MAX_MERGE_FILES} PDF files at a time.`;
  const tooLarge = all.find((file) => file.size > MAX_MERGE_BYTES);
  if (tooLarge) return `${tooLarge.name} is larger than 100 MB. Each PDF must be 100 MB or smaller.`;
  if (all.reduce((total, file) => total + file.size, 0) > MAX_MERGE_BYTES) {
    return "Keep the combined size at or below 100 MB to keep browser memory use manageable.";
  }
  return null;
}

export async function mergePdfFiles(files: File[]): Promise<{ blob: Blob; pageCount: number }> {
  if (files.length < 2) throw new MergePdfError("Choose at least two PDF files to merge.");
  const merged = await PDFDocument.create();
  let pageCount = 0;
  for (const file of files) {
    if (!looksLikePdf(file)) throw new MergePdfError(`${file.name} does not appear to be a PDF file.`);
    if (file.size === 0) throw new MergePdfError(`${file.name} is empty (0 bytes), so it can't be merged.`);

    let data: ArrayBuffer;
    try {
      data = await file.arrayBuffer();
    } catch {
      throw new MergePdfError(`${file.name} could not be read. If it was moved or changed after you selected it, add it again.`);
    }

    let source: PDFDocument;
    try {
      source = await PDFDocument.load(data);
    } catch (caught) {
      const encrypted = caught instanceof Error && /encrypted/i.test(caught.message);
      throw new MergePdfError(encrypted
        ? `${file.name} is encrypted or password-protected. Unlock it before merging.`
        : `${file.name} could not be read as a PDF. It may be corrupted, incomplete, or not a real PDF.`);
    }

    try {
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
      pageCount += pages.length;
    } catch {
      throw new MergePdfError(`${file.name} could not be merged. It may contain damaged pages.`);
    }
  }

  let bytes: Uint8Array;
  try {
    bytes = await merged.save();
  } catch {
    throw new MergePdfError("The merged PDF could not be created. The files may be too large for this browser to handle.");
  }
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return { blob: new Blob([buffer], { type: "application/pdf" }), pageCount };
}
