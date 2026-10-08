import { PDFDocument } from "pdf-lib";

export async function mergePdfFiles(files: File[]): Promise<{ blob: Blob; pageCount: number }> {
  if (files.length < 2) throw new Error("Choose at least two PDF files to merge.");
  const merged = await PDFDocument.create();
  let pageCount = 0;
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      throw new Error(`${file.name} does not appear to be a PDF file.`);
    }
    const source = await PDFDocument.load(await file.arrayBuffer());
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
    pageCount += pages.length;
  }
  const bytes = await merged.save();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return { blob: new Blob([buffer], { type: "application/pdf" }), pageCount };
}