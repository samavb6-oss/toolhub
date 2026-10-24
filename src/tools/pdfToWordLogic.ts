import { strToU8, zipSync } from "fflate";

export const MAX_PDF_TO_WORD_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_TO_WORD_PAGES = 300;
/** Stops runaway output (and browser memory use) from very text-heavy files. */
export const MAX_PDF_TO_WORD_CHARACTERS = 2_000_000;

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** An error whose message is written for the person using the tool and is safe to show as-is. */
export class PdfToWordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfToWordError";
  }
}

type PdfCandidate = Pick<File, "name" | "size" | "type">;

/** One run of text as the PDF placed it. `y` grows upward, as in PDF user space. */
export type PositionedText = { text: string; x: number; y: number; width: number; height: number };

export type ConvertedPage = { paragraphs: string[] };

export type DocxStats = { pages: number; emptyPages: number; paragraphs: number; words: number };

function looksLikePdf(file: PdfCandidate): boolean {
  return file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
}

/** Returns a message describing the first problem with the chosen file, or null when it can be converted. */
export function validatePdfToWordFile(file: PdfCandidate): string | null {
  if (!looksLikePdf(file)) return `${file.name} is not a PDF file.`;
  if (file.size === 0) return `${file.name} is empty (0 bytes), so it can't be converted.`;
  if (file.size > MAX_PDF_TO_WORD_BYTES) return `${file.name} is larger than 50 MB. Choose a PDF that is 50 MB or smaller.`;
  return null;
}

/** `Annual Report.PDF` becomes `Annual Report.docx`; unsafe file-name characters are dropped. */
export function docxFileName(pdfName: string): string {
  const withoutFolders = pdfName.split(/[\\/]/).pop() ?? "";
  const base = withoutFolders
    .replace(/\.pdf$/i, "")
    .replace(/[\u0000-\u001F\u007F"*:<>?|]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 100)
    .trim();
  return `${base || "converted"}.docx`;
}

/**
 * Removes characters that cannot appear in an XML 1.0 document: most control characters,
 * U+FFFE/U+FFFF and unpaired surrogates. Word refuses to open a file that contains them.
 */
export function stripInvalidXmlCharacters(value: string): string {
  let out = "";
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += value[index] + value[index + 1];
        index += 1;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    if (code === 0x9 || code === 0xa || code === 0xd || (code >= 0x20 && code <= 0xfffd)) out += value[index];
  }
  return out;
}

export function escapeXml(value: string): string {
  return stripInvalidXmlCharacters(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

type Line = { text: string; y: number; height: number; left: number; right: number };

const LIST_MARKER = /^(?:[•◦▪▫●○■□‣⁃*–—-]\s|\(?\d{1,3}[.)]\s|\(?[a-zA-Z][.)]\s)/u;

function buildLines(items: PositionedText[]): Line[] {
  const usable = items.filter((item) => item.text.length > 0 && Number.isFinite(item.x) && Number.isFinite(item.y));
  if (usable.length === 0) return [];
  const typicalHeight = median(usable.filter((item) => item.text.trim() !== "").map((item) => item.height).filter((h) => h > 0)) || 10;
  const tolerance = Math.max(1, typicalHeight * 0.4);

  const byTopThenLeft = [...usable].sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: PositionedText[][] = [];
  for (const item of byTopThenLeft) {
    const current = groups[groups.length - 1];
    if (current && Math.abs(current[0].y - item.y) <= tolerance) current.push(item);
    else groups.push([item]);
  }

  const lines: Line[] = [];
  for (const group of groups) {
    const ordered = [...group].sort((a, b) => a.x - b.x);
    let text = "";
    let previousRight = Number.NaN;
    for (const item of ordered) {
      const needsSpace = text !== "" && !/\s$/.test(text) && !/^\s/.test(item.text)
        && Number.isFinite(previousRight) && item.x - previousRight > Math.max(0.5, item.height * 0.15);
      text += (needsSpace ? " " : "") + item.text;
      previousRight = Math.max(Number.isFinite(previousRight) ? previousRight : -Infinity, item.x + item.width);
    }
    const clean = text.replace(/[\t\r\n\f\v]+/g, " ").replace(/ {2,}/g, " ").trim();
    if (clean === "") continue;
    const visible = ordered.filter((item) => item.text.trim() !== "");
    lines.push({
      text: clean,
      y: group[0].y,
      height: median(visible.map((item) => item.height).filter((h) => h > 0)) || typicalHeight,
      left: Math.min(...visible.map((item) => item.x)),
      right: Math.max(...visible.map((item) => item.x + item.width)),
    });
  }
  return lines;
}

/**
 * Turns the text runs of one PDF page into paragraphs: runs on the same baseline become a line (in
 * left-to-right order), and consecutive lines are joined into a paragraph unless there is a larger
 * gap, a list marker, or the previous line stopped well short of the page's text width. Layout,
 * columns and tables are not reconstructed.
 */
export function groupItemsIntoParagraphs(items: PositionedText[]): string[] {
  const lines = buildLines(items);
  if (lines.length === 0) return [];

  const pitches = lines.slice(1).map((line, index) => lines[index].y - line.y).filter((pitch) => pitch > 0);
  const typicalPitch = median(pitches) || median(lines.map((line) => line.height)) * 1.2 || 12;
  const textLeft = Math.min(...lines.map((line) => line.left));
  const textRight = Math.max(...lines.map((line) => line.right));
  const fullWidth = textRight - textLeft;

  const paragraphs: string[] = [];
  let current = lines[0].text;
  for (let index = 1; index < lines.length; index += 1) {
    const previous = lines[index - 1];
    const line = lines[index];
    const gap = previous.y - line.y;
    const bigGap = gap > typicalPitch * 1.6 || gap < 0;
    const startsList = LIST_MARKER.test(line.text);
    const previousEndedEarly = fullWidth > 0 && previous.right - textLeft < fullWidth * 0.75;
    const heightJump = Math.abs(line.height - previous.height) > Math.max(previous.height, line.height) * 0.25;
    if (bigGap || startsList || previousEndedEarly || heightJump) {
      paragraphs.push(current);
      current = line.text;
    } else {
      current += ` ${line.text}`;
    }
  }
  paragraphs.push(current);
  return paragraphs;
}

const NAMESPACES =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function paragraphXml(text: string): string {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

/** Packs the converted pages into a .docx (WordprocessingML) file. Pages without text are skipped. */
export function buildDocx(pages: ConvertedPage[], title = ""): { bytes: Uint8Array; stats: DocxStats } {
  const body: string[] = [];
  let paragraphCount = 0;
  let words = 0;
  let emptyPages = 0;
  for (const page of pages) {
    const paragraphs = page.paragraphs.filter((paragraph) => stripInvalidXmlCharacters(paragraph).trim() !== "");
    if (paragraphs.length === 0) {
      emptyPages += 1;
      continue;
    }
    if (body.length > 0) body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    for (const paragraph of paragraphs) {
      body.push(paragraphXml(paragraph));
      paragraphCount += 1;
      words += countWords(paragraph);
    }
  }
  if (paragraphCount === 0) throw new PdfToWordError("No selectable text was found in this PDF, so there is nothing to put in a Word file.");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NAMESPACES}><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${NAMESPACES}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

  const packageRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const created = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>ToolHub</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created></cp:coreProperties>`;

  const bytes = zipSync({
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(packageRels),
    "word/document.xml": strToU8(documentXml),
    "word/_rels/document.xml.rels": strToU8(documentRels),
    "word/styles.xml": strToU8(stylesXml),
    "docProps/core.xml": strToU8(coreXml),
  });
  return { bytes, stats: { pages: pages.length, emptyPages, paragraphs: paragraphCount, words } };
}

// ---- Reading text out of a PDF (pdf.js is supplied by the caller so Node tests and the browser can each use their own build) ----

/** The small part of pdf.js this tool uses, so tests can supply the Node build and the page the browser build. */
export type PdfTextContentItem = { str?: string; transform?: number[]; width?: number; height?: number };
export type PdfPageLike = { getTextContent(): Promise<{ items: PdfTextContentItem[] }>; cleanup?(): unknown };
export type PdfDocumentLike = { numPages: number; getPage(pageNumber: number): Promise<PdfPageLike>; destroy?(): Promise<unknown> };
export type PdfjsLike = {
  getDocument(source: Record<string, unknown>): { promise: Promise<PdfDocumentLike>; destroy?(): Promise<unknown> };
};

export type ExtractionProgress = (pageNumber: number, pageCount: number) => void;

function toPositioned(item: PdfTextContentItem): PositionedText | null {
  if (typeof item.str !== "string" || !Array.isArray(item.transform) || item.transform.length < 6) return null;
  const [a, b, , d, x, y] = item.transform;
  const fontSize = Math.hypot(a, b) || Math.abs(d) || 0;
  const height = item.height && item.height > 0 ? item.height : fontSize;
  return { text: item.str, x, y, width: item.width ?? 0, height };
}

function friendlyLoadError(caught: unknown, fileName: string): PdfToWordError {
  const name = caught instanceof Error ? caught.name : "";
  if (name === "PasswordException") {
    return new PdfToWordError(`${fileName} is password-protected. Unlock it before converting.`);
  }
  if (name === "InvalidPDFException" || name === "FormatError") {
    return new PdfToWordError(`${fileName} could not be read as a PDF. It may be corrupted, incomplete, or not a real PDF.`);
  }
  return new PdfToWordError(`${fileName} could not be opened. It may be damaged or use a feature this tool cannot read.`);
}

/**
 * Reads the text of every page. Throws PdfToWordError with a message for the user when the file is
 * locked, unreadable, too long, or has no selectable text (for example a scan).
 */
export async function extractPdfPages(
  pdfjs: PdfjsLike,
  data: ArrayBuffer | Uint8Array,
  fileName: string,
  onProgress?: ExtractionProgress,
): Promise<ConvertedPage[]> {
  // pdf.js takes ownership of the bytes it is given, so hand it a copy.
  const copy = data instanceof Uint8Array ? data.slice() : new Uint8Array(data.slice(0));
  const task = pdfjs.getDocument({ data: copy, isEvalSupported: false, useSystemFonts: false, verbosity: 0 });

  let doc: PdfDocumentLike;
  try {
    doc = await task.promise;
  } catch (caught) {
    throw friendlyLoadError(caught, fileName);
  }

  try {
    if (doc.numPages > MAX_PDF_TO_WORD_PAGES) {
      throw new PdfToWordError(`${fileName} has ${doc.numPages} pages. Convert PDFs of up to ${MAX_PDF_TO_WORD_PAGES} pages at a time.`);
    }
    const pages: ConvertedPage[] = [];
    let characters = 0;
    let anyText = false;
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      onProgress?.(pageNumber, doc.numPages);
      let paragraphs: string[];
      try {
        const page = await doc.getPage(pageNumber);
        const content = await page.getTextContent();
        paragraphs = groupItemsIntoParagraphs(content.items.map(toPositioned).filter((item): item is PositionedText => item !== null));
        page.cleanup?.();
      } catch {
        throw new PdfToWordError(`Page ${pageNumber} of ${fileName} could not be read. The file may be damaged.`);
      }
      characters += paragraphs.reduce((total, paragraph) => total + paragraph.length, 0);
      if (characters > MAX_PDF_TO_WORD_CHARACTERS) {
        throw new PdfToWordError(`${fileName} contains too much text to convert in the browser. Try a shorter PDF.`);
      }
      if (paragraphs.length > 0) anyText = true;
      pages.push({ paragraphs });
    }
    if (!anyText) {
      throw new PdfToWordError(`No selectable text was found in ${fileName}. It may be a scan or an image-only PDF, which this tool cannot convert.`);
    }
    return pages;
  } finally {
    await doc.destroy?.().catch(() => undefined);
    await task.destroy?.().catch(() => undefined);
  }
}
