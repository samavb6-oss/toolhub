import type { ImageDimensions } from "./imageResizeLogic";

const INITIAL_HEADER_BYTES = 1024 * 1024;
const MAX_HEADER_SCAN_BYTES = 50 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Reads dimensions from common image headers without decoding pixel data.
 * totalLength is the full file length when only a bounded header slice is supplied.
 * Returns null for unsupported, malformed, or incomplete headers.
 */
export function parseImageDimensions(bytes: Uint8Array, totalLength = bytes.length): ImageDimensions | null {
  // A complete IHDR chunk is 8 signature bytes + 4 length + 4 type + 13 data + 4 CRC.
  if (bytes.length >= 33 && PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    if (readUint32BE(bytes, 8) !== 13 || readAscii(bytes, 12, 4) !== "IHDR") return null;
    return positiveDimensions(readUint32BE(bytes, 16), readUint32BE(bytes, 20));
  }

  if (bytes.length >= 12 && readAscii(bytes, 0, 4) === "RIFF" && readAscii(bytes, 8, 4) === "WEBP") {
    return parseWebPDimensions(bytes, totalLength);
  }

  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return parseJpegDimensions(bytes);
  }

  return null;
}

/** Scans bounded prefixes of compressed image bytes; pixel data is never decoded here. */

/** Browser-decoded dimensions may be swapped by JPEG EXIF orientation 5–8. */
export function dimensionsMatchHeader(
  header: ImageDimensions,
  decoded: ImageDimensions,
  allowSwappedOrientation = false,
): boolean {
  return (decoded.width === header.width && decoded.height === header.height) ||
    (allowSwappedOrientation && decoded.width === header.height && decoded.height === header.width);
}

function hasSupportedImageSignature(bytes: Uint8Array): boolean {
  return (bytes.length >= PNG_SIGNATURE.length &&
      PNG_SIGNATURE.every((value, index) => bytes[index] === value)) ||
    (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) ||
    (bytes.length >= 12 && readAscii(bytes, 0, 4) === "RIFF" &&
      readAscii(bytes, 8, 4) === "WEBP");
}

export async function readImageDimensionsFromHeader(file: Blob): Promise<ImageDimensions | null> {
  // Reject unsupported formats after reading only their short signature, before
  // allocating progressively larger prefixes. JPEGs still scan onward for late SOF.
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasSupportedImageSignature(signature)) return null;

  const maxScanLength = Math.min(file.size, MAX_HEADER_SCAN_BYTES);
  let scanLength = Math.min(INITIAL_HEADER_BYTES, maxScanLength);

  while (scanLength > 0) {
    const bytes = new Uint8Array(await file.slice(0, scanLength).arrayBuffer());
    const dimensions = parseImageDimensions(bytes, file.size);
    if (dimensions) return dimensions;
    if (scanLength >= maxScanLength) return null;
    scanLength = Math.min(scanLength * 2, maxScanLength);
  }

  return null;
}

function parseWebPDimensions(bytes: Uint8Array, totalLength: number): ImageDimensions | null {
  const riffSize = readUint32LE(bytes, 4);
  const riffEnd = 8 + riffSize;
  if (riffSize < 4 || riffEnd > totalLength || riffEnd < 12) return null;

  let offset = 12;
  while (offset + 8 <= bytes.length && offset + 8 <= riffEnd) {
    const chunkType = readAscii(bytes, offset, 4);
    const chunkSize = readUint32LE(bytes, offset + 4);
    const data = offset + 8;
    const chunkEnd = data + chunkSize;
    const paddedEnd = chunkEnd + (chunkSize % 2);

    // Validate the entire declared chunk and its padding against both RIFF and file bounds.
    if (chunkEnd < data || paddedEnd < chunkEnd || paddedEnd > riffEnd || chunkEnd > totalLength) return null;

    if (chunkType === "VP8X" && chunkSize >= 10) {
      if (data + 10 > bytes.length) return null;
      const width = readUint24LE(bytes, data + 4) + 1;
      const height = readUint24LE(bytes, data + 7) + 1;
      return positiveDimensions(width, height);
    }

    if (chunkType === "VP8L" && chunkSize >= 5) {
      if (data + 5 > bytes.length || bytes[data] !== 0x2f) return null;
      const b1 = bytes[data + 1], b2 = bytes[data + 2], b3 = bytes[data + 3], b4 = bytes[data + 4];
      const width = 1 + b1 + ((b2 & 0x3f) << 8);
      const height = 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10);
      return positiveDimensions(width, height);
    }

    if (chunkType === "VP8 " && chunkSize >= 10) {
      if (data + 10 > bytes.length) return null;
      if (bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a) return null;
      const width = (bytes[data + 6] | (bytes[data + 7] << 8)) & 0x3fff;
      const height = (bytes[data + 8] | (bytes[data + 9] << 8)) & 0x3fff;
      return positiveDimensions(width, height);
    }

    // To locate the next chunk, its complete body and optional pad byte must be present
    // in the bounded header buffer as well as within the declared RIFF/file bounds.
    if (paddedEnd > bytes.length || paddedEnd <= offset) return null;
    offset = paddedEnd;
  }
  return null;
}

function parseJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (isJpegStartOfFrame(marker)) {
      // SOF length = 2-byte length + precision + dimensions + component count
      // + three bytes per component descriptor.
      if (segmentLength < 8) return null;
      const componentCount = bytes[offset + 7];
      if (componentCount < 1 || segmentLength !== 8 + componentCount * 3) return null;
      return positiveDimensions(
        (bytes[offset + 5] << 8) | bytes[offset + 6],
        (bytes[offset + 3] << 8) | bytes[offset + 4],
      );
    }
    offset += segmentLength;
  }
  return null;
}

function isJpegStartOfFrame(marker: number): boolean {
  return [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
}

function positiveDimensions(width: number, height: number): ImageDimensions | null {
  return Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0
    ? { width, height }
    : null;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] * 0x1000000 + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16) + bytes[offset + 3] * 0x1000000;
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16);
}
