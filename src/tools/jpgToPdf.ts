import { PDFDocument, concatTransformationMatrix, drawObject, popGraphicsState, pushGraphicsState } from "pdf-lib";

export const MAX_JPG_FILES = 50;
export const MAX_JPG_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_JPG_TOTAL_BYTES = 100 * 1024 * 1024;

/** PDF viewers handle pages up to 14,400 points (200 inches); larger pages are scaled down to fit. */
export const MAX_PAGE_POINTS = 14400;
/** Pages for very small images are enlarged so the longest side is at least this many points. */
export const MIN_IMAGE_POINTS = 36;
/** CSS pixels to PDF points (96 dpi to 72 dpi). */
const POINTS_PER_PIXEL = 0.75;

export type JpgPageSize = "image" | "a4" | "letter";
export type JpgMargin = "none" | "small" | "large";

export const JPG_PAGE_SIZES: Record<Exclude<JpgPageSize, "image">, readonly [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};
/** Margins in points: none, 10 mm and 20 mm. */
export const JPG_MARGINS: Record<JpgMargin, number> = { none: 0, small: 28.35, large: 56.69 };

export type JpgToPdfOptions = { pageSize: JpgPageSize; margin: JpgMargin };
export const DEFAULT_JPG_OPTIONS: JpgToPdfOptions = { pageSize: "image", margin: "none" };

/** An error whose message is already written for the person using the tool and is safe to show as-is. */
export class JpgToPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JpgToPdfError";
  }
}

type JpgCandidate = Pick<File, "name" | "size" | "type">;

function looksLikeJpeg(file: JpgCandidate): boolean {
  return /\.(jpe?g|jpe|jfif)$/i.test(file.name) || file.type === "image/jpeg";
}

/**
 * Checks files the person is trying to add. Returns a message describing the first problem,
 * or null when the whole selection can be accepted.
 */
export function validateJpgSelection(existing: JpgCandidate[], incoming: JpgCandidate[]): string | null {
  const notJpeg = incoming.find((file) => !looksLikeJpeg(file));
  if (notJpeg) return `${notJpeg.name} is not a JPG or JPEG image.`;
  const empty = incoming.find((file) => file.size === 0);
  if (empty) return `${empty.name} is empty (0 bytes), so it can't be converted.`;
  const all = [...existing, ...incoming];
  if (all.length > MAX_JPG_FILES) return `Convert up to ${MAX_JPG_FILES} images at a time.`;
  const tooLarge = all.find((file) => file.size > MAX_JPG_FILE_BYTES);
  if (tooLarge) return `${tooLarge.name} is larger than 30 MB. Each image must be 30 MB or smaller.`;
  if (all.reduce((total, file) => total + file.size, 0) > MAX_JPG_TOTAL_BYTES) {
    return "Keep the combined size at or below 100 MB to keep browser memory use manageable.";
  }
  return null;
}

export type JpegInfo = {
  width: number;
  height: number;
  /** 1 (grayscale) or 3 (colour). */
  components: 1 | 3;
  /** EXIF orientation, 1 to 8 (1 when absent or unreadable). */
  orientation: number;
};

export type JpegProblem = "not-jpeg" | "truncated" | "invalid" | "unsupported-coding" | "unsupported-depth" | "cmyk";
export type JpegReadResult = { ok: true; info: JpegInfo } | { ok: false; problem: JpegProblem };

function readExifOrientation(bytes: Uint8Array, tiff: number, end: number): number {
  if (tiff + 8 > end) return 1;
  const little = bytes[tiff] === 0x49 && bytes[tiff + 1] === 0x49;
  const big = bytes[tiff] === 0x4d && bytes[tiff + 1] === 0x4d;
  if (!little && !big) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(tiff + 2, little) !== 42) return 1;
  const directory = tiff + view.getUint32(tiff + 4, little);
  if (directory + 2 > end) return 1;
  const count = view.getUint16(directory, little);
  for (let index = 0; index < count; index += 1) {
    const entry = directory + 2 + index * 12;
    if (entry + 12 > end) return 1;
    if (view.getUint16(entry, little) !== 0x0112) continue;
    // Orientation is a single SHORT value stored inline in the entry.
    if (view.getUint16(entry + 2, little) !== 3 || view.getUint32(entry + 4, little) !== 1) return 1;
    const value = view.getUint16(entry + 8, little);
    return value >= 1 && value <= 8 ? value : 1;
  }
  return 1;
}

/** Reads the size, colour type and EXIF orientation from a JPEG without decoding any pixels. */
export function readJpegInfo(bytes: Uint8Array): JpegReadResult {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return { ok: false, problem: "not-jpeg" };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let orientation = 1;
  let sawExif = false;
  let frame: Omit<JpegInfo, "orientation"> | null = null;
  let position = 2;
  while (position < bytes.length) {
    if (bytes[position] !== 0xff) return { ok: false, problem: "invalid" };
    while (position < bytes.length && bytes[position] === 0xff) position += 1; // fill bytes
    const marker = bytes[position];
    position += 1;
    if (marker === undefined) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue; // markers without a length
    if (marker === 0xd9) return { ok: false, problem: frame ? "truncated" : "invalid" }; // end of image before any pixel data
    if (marker === 0xda && !frame) return { ok: false, problem: "invalid" }; // pixel data before a frame header
    if (position + 2 > bytes.length) return { ok: false, problem: "truncated" };
    const length = view.getUint16(position, false);
    const segmentEnd = position + length;
    if (length < 2 || segmentEnd > bytes.length) return { ok: false, problem: "truncated" };

    if (marker === 0xe1 && !sawExif && length >= 8 && String.fromCharCode(...bytes.subarray(position + 2, position + 6)) === "Exif" && bytes[position + 6] === 0 && bytes[position + 7] === 0) {
      sawExif = true;
      orientation = readExifOrientation(bytes, position + 8, segmentEnd);
    }

    if (marker === 0xda && frame) {
      // Start of scan: the frame header is only useful if the pixel data and the end-of-image marker follow it.
      // Inside scan data every 0xFF is followed by 0x00 or a restart marker, so the first 0xFFD9 is the real end.
      for (let index = segmentEnd; index + 1 < bytes.length; index += 1) {
        if (bytes[index] === 0xff && bytes[index + 1] === 0xd9) return { ok: true, info: { ...frame, orientation } };
      }
      return { ok: false, problem: "truncated" };
    }

    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame && !frame) {
      // Baseline (C0), extended sequential (C1) and progressive (C2) are the codings PDF viewers decode.
      if (marker > 0xc2) return { ok: false, problem: "unsupported-coding" };
      if (length < 8) return { ok: false, problem: "truncated" };
      const precision = bytes[position + 2];
      const height = view.getUint16(position + 3, false);
      const width = view.getUint16(position + 5, false);
      const components = bytes[position + 7];
      if (precision !== 8) return { ok: false, problem: "unsupported-depth" };
      if (width === 0 || height === 0) return { ok: false, problem: "invalid" };
      if (components === 4) return { ok: false, problem: "cmyk" };
      if (components !== 1 && components !== 3) return { ok: false, problem: "invalid" };
      frame = { width, height, components };
    }
    position = segmentEnd;
  }
  return { ok: false, problem: "truncated" };
}

export type PageLayout = {
  pageWidth: number;
  pageHeight: number;
  /** PDF transformation matrix [a, b, c, d, e, f] that maps the unit square of an image onto its place on the page. */
  matrix: [number, number, number, number, number, number];
};

/**
 * For each EXIF orientation, the matrix [a, b, c, d, e, f] that maps the stored image's unit square
 * (u to the right, v up, top row at v = 1) onto the upright display's unit square.
 */
const ORIENTATION_MATRICES: Record<number, readonly [number, number, number, number, number, number]> = {
  1: [1, 0, 0, 1, 0, 0],
  2: [-1, 0, 0, 1, 1, 0],
  3: [-1, 0, 0, -1, 1, 1],
  4: [1, 0, 0, -1, 0, 1],
  5: [0, -1, -1, 0, 1, 1],
  6: [0, -1, 1, 0, 0, 1],
  7: [0, 1, 1, 0, 0, 0],
  8: [0, 1, -1, 0, 1, 0],
};

export function layoutPage(image: Pick<JpegInfo, "width" | "height" | "orientation">, options: JpgToPdfOptions): PageLayout {
  const orientation = ORIENTATION_MATRICES[image.orientation] ? image.orientation : 1;
  const swapped = orientation >= 5;
  const displayWidth = swapped ? image.height : image.width;
  const displayHeight = swapped ? image.width : image.height;
  let margin = JPG_MARGINS[options.margin];

  let pageWidth: number;
  let pageHeight: number;
  let boxWidth: number;
  let boxHeight: number;
  if (options.pageSize === "image") {
    boxWidth = displayWidth * POINTS_PER_PIXEL;
    boxHeight = displayHeight * POINTS_PER_PIXEL;
    const longest = Math.max(boxWidth, boxHeight);
    if (longest < MIN_IMAGE_POINTS) {
      const grow = MIN_IMAGE_POINTS / longest;
      boxWidth *= grow;
      boxHeight *= grow;
    }
    pageWidth = boxWidth + 2 * margin;
    pageHeight = boxHeight + 2 * margin;
    const largest = Math.max(pageWidth, pageHeight);
    if (largest > MAX_PAGE_POINTS) {
      const shrink = MAX_PAGE_POINTS / largest;
      pageWidth *= shrink;
      pageHeight *= shrink;
      boxWidth *= shrink;
      boxHeight *= shrink;
      margin *= shrink;
    }
  } else {
    const [shortSide, longSide] = JPG_PAGE_SIZES[options.pageSize];
    const landscape = displayWidth > displayHeight;
    pageWidth = landscape ? longSide : shortSide;
    pageHeight = landscape ? shortSide : longSide;
    const scale = Math.min((pageWidth - 2 * margin) / displayWidth, (pageHeight - 2 * margin) / displayHeight);
    boxWidth = displayWidth * scale;
    boxHeight = displayHeight * scale;
  }

  const offsetX = (pageWidth - boxWidth) / 2;
  const offsetY = (pageHeight - boxHeight) / 2;
  const [a, b, c, d, e, f] = ORIENTATION_MATRICES[orientation];
  return {
    pageWidth,
    pageHeight,
    matrix: [a * boxWidth, b * boxHeight, c * boxWidth, d * boxHeight, offsetX + e * boxWidth, offsetY + f * boxHeight],
  };
}

function problemMessage(name: string, problem: JpegProblem): string {
  switch (problem) {
    case "not-jpeg":
      return `${name} does not look like a JPG image. Its contents are not in JPEG format.`;
    case "truncated":
      return `${name} could not be read as a JPG. It may be corrupted or incomplete.`;
    case "invalid":
      return `${name} could not be read as a JPG. Its header is damaged or invalid.`;
    case "unsupported-coding":
      return `${name} uses a rare JPEG variant (arithmetic or lossless coding) that PDF viewers cannot display. Re-save it as a standard JPG first.`;
    case "unsupported-depth":
      return `${name} is not an 8-bit JPG, which is the only kind supported. Re-save it as a standard JPG first.`;
    case "cmyk":
      return `${name} uses CMYK colours, which can look wrong in a PDF. Export it as an RGB JPG first.`;
  }
}

export async function convertJpgsToPdf(files: File[], options: JpgToPdfOptions = DEFAULT_JPG_OPTIONS): Promise<{ blob: Blob; pageCount: number }> {
  if (files.length < 1) throw new JpgToPdfError("Choose at least one JPG image to convert.");
  const document = await PDFDocument.create();
  for (const file of files) {
    if (!looksLikeJpeg(file)) throw new JpgToPdfError(`${file.name} is not a JPG or JPEG image.`);
    if (file.size === 0) throw new JpgToPdfError(`${file.name} is empty (0 bytes), so it can't be converted.`);

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      throw new JpgToPdfError(`${file.name} could not be read. If it was moved or changed after you selected it, add it again.`);
    }

    const read = readJpegInfo(bytes);
    if (!read.ok) throw new JpgToPdfError(problemMessage(file.name, read.problem));

    let embedded;
    try {
      embedded = await document.embedJpg(bytes);
    } catch {
      throw new JpgToPdfError(`${file.name} could not be read as a JPG. It may be corrupted or incomplete.`);
    }
    if (embedded.width !== read.info.width || embedded.height !== read.info.height) {
      throw new JpgToPdfError(`${file.name} could not be read as a JPG. Its size information is inconsistent.`);
    }

    const layout = layoutPage(read.info, options);
    const page = document.addPage([layout.pageWidth, layout.pageHeight]);
    const imageName = page.node.newXObject("Image", embedded.ref);
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...layout.matrix), drawObject(imageName), popGraphicsState());
  }

  let saved: Uint8Array;
  try {
    saved = await document.save();
  } catch {
    throw new JpgToPdfError("The PDF could not be created. The images may be too large for this browser to handle.");
  }
  const buffer = new ArrayBuffer(saved.byteLength);
  new Uint8Array(buffer).set(saved);
  return { blob: new Blob([buffer], { type: "application/pdf" }), pageCount: files.length };
}
