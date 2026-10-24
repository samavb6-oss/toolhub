import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { strFromU8, unzipSync } from "fflate";
import {
  MAX_PDF_TO_WORD_BYTES,
  PdfToWordError,
  buildDocx,
  countWords,
  docxFileName,
  escapeXml,
  extractPdfPages,
  groupItemsIntoParagraphs,
  stripInvalidXmlCharacters,
  validatePdfToWordFile,
  type PdfjsLike,
  type PositionedText,
} from "../src/tools/pdfToWordLogic.ts";

function line(text: string, y: number, x = 50): PositionedText {
  return { text, x, y, width: text.length * 5, height: 10 };
}

function docXml(bytes: Uint8Array): string {
  return strFromU8(unzipSync(bytes)["word/document.xml"]);
}

async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (caught) {
    assert.ok(caught instanceof Error);
    return caught;
  }
  assert.fail("Expected the promise to reject");
}

test("validation accepts PDFs and rejects wrong, empty and oversized files", () => {
  assert.equal(validatePdfToWordFile({ name: "a.pdf", type: "application/pdf", size: 10 }), null);
  assert.equal(validatePdfToWordFile({ name: "A.PDF", type: "", size: 10 }), null);
  assert.match(validatePdfToWordFile({ name: "a.docx", type: "", size: 10 }) ?? "", /not a PDF/);
  assert.match(validatePdfToWordFile({ name: "a.pdf", type: "application/pdf", size: 0 }) ?? "", /empty/);
  assert.match(validatePdfToWordFile({ name: "a.pdf", type: "application/pdf", size: MAX_PDF_TO_WORD_BYTES + 1 }) ?? "", /50 MB/);
});

test("output file name swaps the extension and drops unsafe characters", () => {
  assert.equal(docxFileName("Annual Report.PDF"), "Annual Report.docx");
  assert.equal(docxFileName("C:\\docs\\a:b?.pdf"), "ab.docx");
  assert.equal(docxFileName(".pdf"), "converted.docx");
});

test("invalid XML characters are removed and markup is escaped", () => {
  assert.equal(stripInvalidXmlCharacters("a\u0000b\u0008c\ud800d"), "abcd");
  assert.equal(stripInvalidXmlCharacters("tab\tline\n😀"), "tab\tline\n😀");
  assert.equal(escapeXml(`<a href="x">&'</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;'&lt;/a&gt;");
});

test("items on one row are joined and rows are read top to bottom", () => {
  const out = groupItemsIntoParagraphs([line("world", 700, 90), line("Second row", 600), line("Hello", 700)]);
  const joined = out.join(" ");
  assert.ok(joined.includes("Hello"));
  assert.ok(joined.includes("world"));
  assert.ok(joined.indexOf("Hello") < joined.indexOf("Second row"));
});

test("list markers start their own paragraphs", () => {
  const out = groupItemsIntoParagraphs([line("Intro text that runs a full line across the page", 700), line("• first", 560), line("• second", 546)]);
  assert.ok(out.some((p) => p.startsWith("• first")));
  assert.ok(out.some((p) => p.startsWith("• second")));
});

test("blank items yield no paragraphs", () => {
  assert.deepEqual(groupItemsIntoParagraphs([line("   ", 700), line("", 650)]), []);
});

test("countWords counts whitespace-separated words", () => {
  assert.equal(countWords("  one two\nthree  "), 3);
  assert.equal(countWords(""), 0);
});

test("buildDocx writes a valid package with every paragraph, escaped, and correct stats", () => {
  const { bytes, stats } = buildDocx([{ paragraphs: ["Hello <World> & co", "Second"] }, { paragraphs: [] }, { paragraphs: ["Third\u0000page"] }], "My <Title>");
  const files = unzipSync(bytes);
  for (const name of ["[Content_Types].xml", "_rels/.rels", "word/document.xml"]) assert.ok(files[name], `${name} missing`);
  const xml = docXml(bytes);
  assert.ok(xml.includes("Hello &lt;World&gt; &amp; co"));
  assert.ok(xml.includes("Second"));
  assert.ok(xml.includes("Thirdpage"));
  assert.ok(!xml.includes("\u0000"));
  assert.equal(stats.pages, 3);
  assert.equal(stats.emptyPages, 1);
  assert.equal(stats.paragraphs, 3);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
});

function fakePdfjs(pages: string[][], failOpen?: string): PdfjsLike {
  return {
    getDocument() {
      return {
        promise: failOpen
          ? Promise.reject(Object.assign(new Error("x"), { name: failOpen }))
          : Promise.resolve({
              numPages: pages.length,
              async getPage(n: number) {
                return {
                  async getTextContent() {
                    return { items: pages[n - 1].map((str, i) => ({ str, transform: [10, 0, 0, 10, 50, 700 - i * 40], width: str.length * 5, height: 10 })) };
                  },
                };
              },
            }),
      };
    },
  };
}

test("extraction reports progress and returns text for each page", async () => {
  const seen: Array<[number, number]> = [];
  const pages = await extractPdfPages(fakePdfjs([["Alpha"], ["Beta"]]), new Uint8Array([1]), "a.pdf", (p, c) => seen.push([p, c]));
  assert.deepEqual(seen, [[1, 2], [2, 2]]);
  assert.equal(pages.length, 2);
  assert.ok(pages[1].paragraphs.join(" ").includes("Beta"));
});

test("extraction gives clear errors for locked, corrupt, scanned and over-long PDFs", async () => {
  const bytes = new Uint8Array([1]);
  assert.match((await rejection(extractPdfPages(fakePdfjs([], "PasswordException"), bytes, "a.pdf"))).message, /password-protected/);
  assert.match((await rejection(extractPdfPages(fakePdfjs([], "InvalidPDFException"), bytes, "a.pdf"))).message, /could not be read as a PDF/);
  assert.match((await rejection(extractPdfPages(fakePdfjs([], "Other"), bytes, "a.pdf"))).message, /could not be opened/);
  const scanned = await rejection(extractPdfPages(fakePdfjs([[], []]), bytes, "scan.pdf"));
  assert.ok(scanned instanceof PdfToWordError);
  assert.match(scanned.message, /No selectable text/);
  const long = await rejection(extractPdfPages(fakePdfjs(Array.from({ length: 301 }, () => ["x"])), bytes, "big.pdf"));
  assert.match(long.message, /301 pages/);
});

test("extraction does not hand the caller's buffer to pdf.js", async () => {
  const original = new Uint8Array([1, 2, 3]);
  let received: unknown;
  const inner = fakePdfjs([["x"]]);
  const pdfjs: PdfjsLike = {
    getDocument(source) {
      received = source.data;
      return inner.getDocument(source);
    },
  };
  await extractPdfPages(pdfjs, original, "a.pdf");
  assert.notEqual(received, original);
});

test("real PDF round trip: pdf.js extracts text that lands in the .docx", async () => {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfjsLike;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const first = doc.addPage([400, 400]);
  first.drawText("Quarterly Report", { x: 50, y: 340, size: 18, font });
  first.drawText("Revenue grew & costs <fell>.", { x: 50, y: 300, size: 12, font });
  doc.addPage([400, 400]).drawText("Page two content", { x: 50, y: 340, size: 12, font });
  const pdfBytes = await doc.save();

  const pages = await extractPdfPages(pdfjs, pdfBytes, "report.pdf");
  assert.equal(pages.length, 2);
  const { bytes, stats } = buildDocx(pages, "report");
  const xml = docXml(bytes);
  assert.ok(xml.includes("Quarterly Report"));
  assert.ok(xml.includes("Revenue grew &amp; costs &lt;fell&gt;."));
  assert.ok(xml.includes("Page two content"));
  assert.equal(stats.pages, 2);
  assert.equal(stats.emptyPages, 0);

  const blank = await PDFDocument.create();
  blank.addPage([200, 200]);
  const err = await rejection(extractPdfPages(pdfjs, await blank.save(), "blank.pdf"));
  assert.match(err.message, /No selectable text/);
  const garbage = await rejection(extractPdfPages(pdfjs, new TextEncoder().encode("not a pdf at all"), "bad.pdf"));
  assert.ok(garbage instanceof PdfToWordError);
});
