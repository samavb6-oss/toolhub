import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  JPG_MARGINS,
  JPG_PAGE_SIZES,
  JpgToPdfError,
  MAX_JPG_FILES,
  MAX_JPG_FILE_BYTES,
  MAX_JPG_TOTAL_BYTES,
  MAX_PAGE_POINTS,
  MIN_IMAGE_POINTS,
  convertJpgsToPdf,
  layoutPage,
  readJpegInfo,
  validateJpgSelection,
} from "../src/tools/jpgToPdf.ts";

// Tiny real JPEGs, 16x8 pixels. Top-left red, top-right green, bottom-left blue, bottom-right yellow.
const fromBase64 = (value: string) => new Uint8Array(Buffer.from(value, "base64"));
const QUAD = fromBase64("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAAIABADAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD4V/4X/wD9Sl/5P/8A2uv37/iRn/qoP/LT/wC+T+oP+Jx/+pH/AOXP/wB7n7Af8O/v+qtf+UH/AO31/if/AMRK/wCoX/yf/wC0P8+f+JWv+pv/AOW//wB3P//Z");
const PROGRESSIVE = fromBase64("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wgARCAAIABADAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAABwj/xAAWAQEBAQAAAAAAAAAAAAAAAAAIBgf/2gAMAwEAAhADEAAAAQq/1CwBOfP/xAAWEAEBAQAAAAAAAAAAAAAAAAAAFRf/2gAIAQEAAQUCvs/f/8QAGREAAgMBAAAAAAAAAAAAAAAAABdko+Lj/9oACAEDAQE/AXHBs5itl17P/8QAHBEAAQMFAAAAAAAAAAAAAAAAABYXY2Who+Hj/9oACAECAQE/AWMqGLoKWK+j/8QAGRAAAgMBAAAAAAAAAAAAAAAAAOE0NaKj/9oACAEBAAY/Aom0W3Bn/8QAFBABAAAAAAAAAAAAAAAAAAAAEP/aAAgBAQABPyEp/wD/2gAMAwEAAgADAAAAEAP/xAAUEQEAAAAAAAAAAAAAAAAAAAAQ/9oACAEDAQE/ECt//8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAgEBPxAM/wD/xAAUEAEAAAAAAAAAAAAAAAAAAAAQ/9oACAEBAAE/EDp//9k=");
const GRAY = fromBase64("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAAIABABAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APmP/hP/APpw/wDI3/2NfoB/wz9/1Hv/ACT/APtlf//Z");
const CMYK = fromBase64("/9j/7gAOQWRvYmUAZAAAAAAA/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/8AAFAgACAAQBEMRAE0RAFkRAEsRAP/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/aAA4EQwBNAFkASwAAPwCv/wAPWP8Aql3/AJcH/wBy1+fVV/8Ah1P/ANVR/wDLf/8Auqv1Tq7/AMOlf+qq/wDlu/8A3VX7wf8ACN/9PP8A45/9evgKiv/Z");

/** Inserts an EXIF APP1 segment that only carries an orientation tag. */
function withOrientation(bytes: Uint8Array, orientation: number, littleEndian: boolean): Uint8Array {
  const tiff = new Uint8Array(24);
  const view = new DataView(tiff.buffer);
  tiff[0] = tiff[1] = littleEndian ? 0x49 : 0x4d;
  view.setUint16(2, 42, littleEndian);
  view.setUint32(4, 8, littleEndian);
  view.setUint16(8, 1, littleEndian);
  view.setUint16(10, 0x0112, littleEndian);
  view.setUint16(12, 3, littleEndian);
  view.setUint32(14, 1, littleEndian);
  view.setUint16(18, orientation, littleEndian);
  const body = new Uint8Array([0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]);
  const segment = new Uint8Array(4 + body.length);
  segment[0] = 0xff;
  segment[1] = 0xe1;
  new DataView(segment.buffer).setUint16(2, body.length + 2, false);
  segment.set(body, 4);
  const out = new Uint8Array(bytes.length + segment.length);
  out.set(bytes.subarray(0, 2));
  out.set(segment, 2);
  out.set(bytes.subarray(2), 2 + segment.length);
  return out;
}

// File parts must be backed by a plain ArrayBuffer to satisfy strict TypeScript BlobPart typing.
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

const jpgFile = (name: string, bytes: Uint8Array = QUAD) => new File([toArrayBuffer(bytes)], name, { type: "image/jpeg" });

/** Applies a PDF matrix to a point in the image's unit square. */
function apply(matrix: number[], u: number, v: number): [number, number] {
  const [a, b, c, d, e, f] = matrix;
  return [a * u + c * v + e, b * u + d * v + f];
}

const close = (actual: number, expected: number, message?: string) => assert.ok(Math.abs(actual - expected) < 1e-6, message ?? `${actual} should equal ${expected}`);

test("reads size, colour type and orientation from real JPEGs", () => {
  assert.deepEqual(readJpegInfo(QUAD), { ok: true, info: { width: 16, height: 8, components: 3, orientation: 1 } });
  assert.deepEqual(readJpegInfo(PROGRESSIVE), { ok: true, info: { width: 16, height: 8, components: 3, orientation: 1 } });
  assert.deepEqual(readJpegInfo(GRAY), { ok: true, info: { width: 16, height: 8, components: 1, orientation: 1 } });
});

test("reads EXIF orientation in both byte orders", () => {
  for (let orientation = 1; orientation <= 8; orientation += 1) {
    for (const littleEndian of [true, false]) {
      const result = readJpegInfo(withOrientation(QUAD, orientation, littleEndian));
      assert.ok(result.ok);
      assert.equal(result.info.orientation, orientation);
      assert.equal(result.info.width, 16);
    }
  }
});

test("ignores unusable orientation data instead of failing", () => {
  assert.equal(readOrientation(withOrientation(QUAD, 9, true)), 1);
  assert.equal(readOrientation(withOrientation(QUAD, 0, false)), 1);
  // A damaged TIFF header and a directory offset pointing past the segment both fall back to "upright".
  const damaged = withOrientation(QUAD, 6, true);
  damaged[12] = 0x00; // the TIFF byte-order mark starts 12 bytes in
  assert.equal(readOrientation(damaged), 1);
  const outOfRange = withOrientation(QUAD, 6, true);
  outOfRange.set([0xff, 0xff, 0xff, 0x7f], 16); // little-endian directory offset far past the end of the segment
  assert.equal(readOrientation(outOfRange), 1);

  function readOrientation(bytes: Uint8Array): number {
    const result = readJpegInfo(bytes);
    assert.ok(result.ok, "the image itself should still be readable");
    return result.info.orientation;
  }
});

test("rejects data that is not a usable JPEG, with a reason", () => {
  assert.deepEqual(readJpegInfo(new Uint8Array(0)), { ok: false, problem: "not-jpeg" });
  assert.deepEqual(readJpegInfo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), { ok: false, problem: "not-jpeg" });
  assert.deepEqual(readJpegInfo(QUAD.subarray(0, 30)), { ok: false, problem: "truncated" });
  assert.deepEqual(readJpegInfo(CMYK), { ok: false, problem: "cmyk" });

  const arithmetic = QUAD.slice();
  const sof = arithmetic.findIndex((byte, index) => byte === 0xff && arithmetic[index + 1] === 0xc0);
  arithmetic[sof + 1] = 0xc9; // SOF9: arithmetic-coded
  assert.deepEqual(readJpegInfo(arithmetic), { ok: false, problem: "unsupported-coding" });

  const twelveBit = QUAD.slice();
  twelveBit[sof + 4] = 12; // sample precision
  assert.deepEqual(readJpegInfo(twelveBit), { ok: false, problem: "unsupported-depth" });

  const zeroWidth = QUAD.slice();
  zeroWidth[sof + 7] = 0;
  zeroWidth[sof + 8] = 0;
  assert.deepEqual(readJpegInfo(zeroWidth), { ok: false, problem: "invalid" });
});

test("image-sized pages use 0.75 points per pixel and honour margins", () => {
  const plain = layoutPage({ width: 800, height: 400, orientation: 1 }, { pageSize: "image", margin: "none" });
  assert.deepEqual([plain.pageWidth, plain.pageHeight], [600, 300]);
  assert.deepEqual(plain.matrix, [600, 0, 0, 300, 0, 0]);

  const framed = layoutPage({ width: 800, height: 400, orientation: 1 }, { pageSize: "image", margin: "small" });
  close(framed.pageWidth, 600 + 2 * JPG_MARGINS.small);
  close(framed.pageHeight, 300 + 2 * JPG_MARGINS.small);
  close(framed.matrix[4], JPG_MARGINS.small);
  close(framed.matrix[5], JPG_MARGINS.small);
});

test("sideways EXIF orientations swap the page's width and height", () => {
  for (const orientation of [5, 6, 7, 8]) {
    const layout = layoutPage({ width: 800, height: 400, orientation }, { pageSize: "image", margin: "none" });
    assert.deepEqual([layout.pageWidth, layout.pageHeight], [300, 600], `orientation ${orientation}`);
  }
  for (const orientation of [1, 2, 3, 4]) {
    const layout = layoutPage({ width: 800, height: 400, orientation }, { pageSize: "image", margin: "none" });
    assert.deepEqual([layout.pageWidth, layout.pageHeight], [600, 300], `orientation ${orientation}`);
  }
});

test("each EXIF orientation puts the image's corners where an upright viewer would", () => {
  // Image corners in the stored image: (u, v) with v = 1 at the top row.
  const topLeft = [0, 1] as const;
  const topRight = [1, 1] as const;
  const bottomLeft = [0, 0] as const;
  // Where each stored corner lands on the upright display, in a unit box with y = 1 at the top. These follow the EXIF
  // definitions: 2 mirror, 3 rotate 180, 4 flip, 5 transpose, 6 rotate 90 clockwise, 7 transverse, 8 rotate 90 anticlockwise.
  const expected: Record<number, { topLeft: [number, number]; topRight: [number, number]; bottomLeft: [number, number] }> = {
    1: { topLeft: [0, 1], topRight: [1, 1], bottomLeft: [0, 0] },
    2: { topLeft: [1, 1], topRight: [0, 1], bottomLeft: [1, 0] },
    3: { topLeft: [1, 0], topRight: [0, 0], bottomLeft: [1, 1] },
    4: { topLeft: [0, 0], topRight: [1, 0], bottomLeft: [0, 1] },
    5: { topLeft: [0, 1], topRight: [0, 0], bottomLeft: [1, 1] },
    6: { topLeft: [1, 1], topRight: [1, 0], bottomLeft: [0, 1] },
    7: { topLeft: [1, 0], topRight: [1, 1], bottomLeft: [0, 0] },
    8: { topLeft: [0, 0], topRight: [0, 1], bottomLeft: [1, 0] },
  };
  for (let orientation = 1; orientation <= 8; orientation += 1) {
    const layout = layoutPage({ width: 100, height: 100, orientation }, { pageSize: "image", margin: "none" });
    const { pageWidth, pageHeight, matrix } = layout;
    for (const [name, corner] of [["topLeft", topLeft], ["topRight", topRight], ["bottomLeft", bottomLeft]] as const) {
      const [x, y] = apply(matrix, corner[0], corner[1]);
      close(x / pageWidth, expected[orientation][name][0], `orientation ${orientation} ${name} x`);
      close(y / pageHeight, expected[orientation][name][1], `orientation ${orientation} ${name} y`);
    }
  }
});

test("A4 and Letter pages fit the image, centre it and follow its shape", () => {
  const landscape = layoutPage({ width: 2000, height: 1000, orientation: 1 }, { pageSize: "a4", margin: "none" });
  assert.deepEqual([landscape.pageWidth, landscape.pageHeight], [JPG_PAGE_SIZES.a4[1], JPG_PAGE_SIZES.a4[0]]);
  close(landscape.matrix[0], JPG_PAGE_SIZES.a4[1]); // full width
  close(landscape.matrix[3], JPG_PAGE_SIZES.a4[1] / 2);
  close(landscape.matrix[5], (JPG_PAGE_SIZES.a4[0] - JPG_PAGE_SIZES.a4[1] / 2) / 2); // centred vertically

  const portrait = layoutPage({ width: 1000, height: 2000, orientation: 1 }, { pageSize: "letter", margin: "large" });
  assert.deepEqual([portrait.pageWidth, portrait.pageHeight], [612, 792]);
  const available = 792 - 2 * JPG_MARGINS.large;
  close(portrait.matrix[3], available); // limited by height
  close(portrait.matrix[0], available / 2);
  close(portrait.matrix[4], (612 - available / 2) / 2);
  close(portrait.matrix[5], JPG_MARGINS.large);

  // A sideways phone photo (stored landscape, shown portrait) gets a portrait page.
  const sideways = layoutPage({ width: 2000, height: 1000, orientation: 6 }, { pageSize: "a4", margin: "none" });
  assert.deepEqual([sideways.pageWidth, sideways.pageHeight], [JPG_PAGE_SIZES.a4[0], JPG_PAGE_SIZES.a4[1]]);
});

test("huge and tiny images produce viewer-safe page sizes", () => {
  const huge = layoutPage({ width: 65535, height: 1000, orientation: 1 }, { pageSize: "image", margin: "small" });
  close(Math.max(huge.pageWidth, huge.pageHeight), MAX_PAGE_POINTS);
  assert.ok(huge.pageHeight > 0 && huge.matrix[0] > 0);
  assert.ok(huge.matrix[0] + 2 * huge.matrix[4] <= huge.pageWidth + 1e-6, "margin and image fit inside the page");

  const tiny = layoutPage({ width: 1, height: 1, orientation: 1 }, { pageSize: "image", margin: "none" });
  assert.deepEqual([tiny.pageWidth, tiny.pageHeight], [MIN_IMAGE_POINTS, MIN_IMAGE_POINTS]);
});

test("converts several JPEGs into one PDF with one page each, in order", async () => {
  const files = [
    jpgFile("one.jpg", QUAD),
    jpgFile("two.jpeg", GRAY),
    jpgFile("three.JPG", withOrientation(PROGRESSIVE, 6, false)),
  ];
  const { blob, pageCount } = await convertJpgsToPdf(files);
  assert.equal(pageCount, 3);
  assert.equal(blob.type, "application/pdf");
  const reloaded = await PDFDocument.load(await blob.arrayBuffer());
  assert.equal(reloaded.getPageCount(), 3);
  const sizes = reloaded.getPages().map((page) => page.getSize());
  assert.deepEqual(sizes.map(({ width, height }) => [width, height]), [[36, 18], [36, 18], [18, 36]]);
});

test("page size and margin options reach the finished PDF", async () => {
  const { blob } = await convertJpgsToPdf([jpgFile("a.jpg")], { pageSize: "letter", margin: "small" });
  const [page] = (await PDFDocument.load(await blob.arrayBuffer())).getPages();
  assert.deepEqual([page.getWidth(), page.getHeight()], [792, 612]);
});

test("conversion errors name the file and explain the fix", async () => {
  const message = async (files: File[]) => {
    try {
      await convertJpgsToPdf(files);
    } catch (caught) {
      assert.ok(caught instanceof JpgToPdfError);
      return caught.message;
    }
    return assert.fail("conversion should have been rejected");
  };
  assert.match(await message([]), /at least one JPG/);
  assert.match(await message([jpgFile("empty.jpg", new Uint8Array(0))]), /empty\.jpg is empty/);
  assert.match(await message([new File([toArrayBuffer(QUAD)], "photo.png", { type: "image/png" })]), /photo\.png is not a JPG/);
  assert.match(await message([jpgFile("fake.jpg", new Uint8Array([1, 2, 3, 4, 5, 6]))]), /fake\.jpg does not look like a JPG/);
  assert.match(await message([jpgFile("cut.jpg", QUAD.subarray(0, 40))]), /cut\.jpg could not be read as a JPG/);
  assert.match(await message([jpgFile("print.jpg", CMYK)]), /print\.jpg uses CMYK/);
  // One bad file stops the whole conversion, and it is the bad file that is named.
  assert.match(await message([jpgFile("good.jpg"), jpgFile("bad.jpg", new Uint8Array([0xff, 0xd8, 0x00, 0x00]))]), /bad\.jpg/);
});

test("selection validation accepts JPG spellings and enforces limits", () => {
  const candidate = (name: string, size = 1000, type = "image/jpeg") => ({ name, size, type });
  assert.equal(validateJpgSelection([], [candidate("a.jpg"), candidate("b.JPEG"), candidate("c.jpe"), candidate("d.jfif"), candidate("noext", 10, "image/jpeg")]), null);
  assert.match(validateJpgSelection([], [candidate("pic.png", 10, "image/png")]) ?? "", /pic\.png is not a JPG or JPEG image/);
  assert.match(validateJpgSelection([], [candidate("pic.jpg.exe", 10, "application/octet-stream")]) ?? "", /pic\.jpg\.exe is not a JPG/);
  assert.match(validateJpgSelection([], [candidate("zero.jpg", 0)]) ?? "", /zero\.jpg is empty/);

  const full = Array.from({ length: MAX_JPG_FILES }, (_, index) => candidate(`${index}.jpg`, 10));
  assert.equal(validateJpgSelection(full.slice(0, -1), [full[full.length - 1]]), null);
  assert.match(validateJpgSelection(full, [candidate("extra.jpg")]) ?? "", /up to 50 images/);

  assert.equal(validateJpgSelection([], [candidate("max.jpg", MAX_JPG_FILE_BYTES)]), null);
  assert.match(validateJpgSelection([], [candidate("big.jpg", MAX_JPG_FILE_BYTES + 1)]) ?? "", /big\.jpg is larger than 30 MB/);
  const chunk = MAX_JPG_TOTAL_BYTES / 4;
  assert.equal(validateJpgSelection([candidate("a.jpg", chunk), candidate("b.jpg", chunk), candidate("c.jpg", chunk)], [candidate("d.jpg", chunk)]), null);
  assert.match(validateJpgSelection([candidate("a.jpg", chunk), candidate("b.jpg", chunk), candidate("c.jpg", chunk)], [candidate("d.jpg", chunk + 1)]) ?? "", /combined size/);
});
