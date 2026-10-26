import { PDFDocument } from "pdf-lib";

export const MAX_SPLIT_BYTES = 100 * 1024 * 1024;

export class SplitPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitPdfError";
  }
}

export function parsePageRanges(input: string, totalPages: number): number[][] {
  if (!Number.isInteger(totalPages) || totalPages < 1) throw new SplitPdfError("This PDF has no pages to split.");
  if (input.trim() === "") throw new SplitPdfError("Enter page numbers or ranges, for example 1-3, 5, 7-9.");

  const result: number[][] = [];
  const seen = new Set<number>();
  for (const rawPart of input.split(",")) {
    const item = rawPart.trim();
    if (!item) throw new SplitPdfError("Remove the empty item between commas in your page ranges.");
    const parts = item.split("-");
    if (parts.length > 2 || parts.some((part) => !/^\s*\d+\s*$/.test(part))) {
      throw new SplitPdfError(`“${item}” is not a valid page number or range.`);
    }
    const start = Number(parts[0].trim());
    const end = parts.length === 2 ? Number(parts[1].trim()) : start;
    if (start < 1 || end < 1) throw new SplitPdfError("Page numbers must start at 1.");
    if (start > end) throw new SplitPdfError(`The range ${start}-${end} is reversed. Put the smaller page first.`);
    if (end > totalPages) throw new SplitPdfError(`Page ${end} is beyond this PDF's ${totalPages} pages.`);
    const pages: number[] = [];
    for (let page = start; page <= end; page++) {
      if (seen.has(page)) throw new SplitPdfError(`Page ${page} appears more than once. Use each page only once.`);
      seen.add(page);
      pages.push(page);
    }
    result.push(pages);
  }
  return result;
}

export type SplitPdfOutput = { blob: Blob; fileName: string; pageCount: number; pages: number[] };

export async function splitPdfFile(file: File, ranges: string): Promise<{ files: SplitPdfOutput[]; totalPages: number }> {
  if (!(file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf")) {
    throw new SplitPdfError(`${file.name} doesn't appear to be a PDF file.`);
  }
  if (file.size === 0) throw new SplitPdfError(`${file.name} is empty (0 bytes).`);
  if (file.size > MAX_SPLIT_BYTES) throw new SplitPdfError(`${file.name} is larger than 100 MB. Choose a smaller PDF.`);

  let sourceBytes: ArrayBuffer;
  try {
    sourceBytes = await file.arrayBuffer();
  } catch {
    throw new SplitPdfError(`${file.name} couldn't be read. Select the file again and retry.`);
  }

  let source: PDFDocument;
  try {
    source = await PDFDocument.load(sourceBytes);
  } catch (caught) {
    const encrypted = caught instanceof Error && /encrypt|password/i.test(caught.message);
    throw new SplitPdfError(encrypted
      ? `${file.name} is encrypted or password-protected. Unlock it before splitting.`
      : `${file.name} couldn't be opened as a PDF. It may be damaged or incomplete.`);
  }

  const totalPages = source.getPageCount();
  if (totalPages < 1) throw new SplitPdfError(`${file.name} has no pages to split.`);
  const pageGroups = parsePageRanges(ranges, totalPages);
  const baseName = file.name.replace(/\.pdf$/i, "").replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim() || "split";
  const outputs: SplitPdfOutput[] = [];

  for (const pages of pageGroups) {
    let output: PDFDocument;
    try {
      output = await PDFDocument.create();
      const copied = await output.copyPages(source, pages.map((page) => page - 1));
      copied.forEach((page) => output.addPage(page));
      const bytes = await output.save();
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const first = pages[0];
      const last = pages[pages.length - 1];
      const fileName = first === last ? `${baseName}_page_${first}.pdf` : `${baseName}_pages_${first}-${last}.pdf`;
      outputs.push({ blob: new Blob([buffer], { type: "application/pdf" }), fileName, pageCount: pages.length, pages });
    } catch {
      throw new SplitPdfError(`A split PDF couldn't be created from ${file.name}. Try a different file or a smaller page range.`);
    }
  }

  return { files: outputs, totalPages };
}
