import test from "node:test";
import assert from "node:assert/strict";
import { dimensionsMatchHeader, parseImageDimensions, readImageDimensionsFromHeader } from "../src/tools/imageHeaderDimensions.ts";

function ascii(bytes: number[], offset: number, value: string): void {
  [...value].forEach((character, index) => { bytes[offset + index] = character.charCodeAt(0); });
}

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  ascii(bytes, 12, "IHDR");
  bytes.set([(width >>> 24) & 255, (width >>> 16) & 255, (width >>> 8) & 255, width & 255], 16);
  bytes.set([(height >>> 24) & 255, (height >>> 16) & 255, (height >>> 8) & 255, height & 255], 20);
  return bytes;
}

function webpHeader(chunk: "VP8X" | "VP8L" | "VP8 ", width: number, height: number): Uint8Array {
  const payloadLength = chunk === "VP8X" ? 10 : chunk === "VP8L" ? 5 : 10;
  const bytes = new Uint8Array(20 + payloadLength + (payloadLength % 2));
  ascii(bytes, 0, "RIFF");
  const riffSize = bytes.length - 8;
  bytes[4] = riffSize & 255;
  bytes[5] = (riffSize >>> 8) & 255;
  bytes[6] = (riffSize >>> 16) & 255;
  bytes[7] = (riffSize >>> 24) & 255;
  ascii(bytes, 8, "WEBP");
  ascii(bytes, 12, chunk);
  bytes[16] = payloadLength;
  if (chunk === "VP8X") {
    const w = width - 1, h = height - 1;
    bytes[24] = w & 255; bytes[25] = (w >>> 8) & 255; bytes[26] = (w >>> 16) & 255;
    bytes[27] = h & 255; bytes[28] = (h >>> 8) & 255; bytes[29] = (h >>> 16) & 255;
  } else if (chunk === "VP8L") {
    const w = width - 1, h = height - 1;
    bytes[20] = 0x2f;
    bytes[21] = w & 255;
    bytes[22] = ((w >>> 8) & 0x3f) | ((h & 0x03) << 6);
    bytes[23] = (h >>> 2) & 255;
    bytes[24] = (h >>> 10) & 0x0f;
  } else {
    bytes[23] = 0x9d; bytes[24] = 0x01; bytes[25] = 0x2a;
    bytes[26] = width & 255; bytes[27] = (width >>> 8) & 0x3f;
    bytes[28] = height & 255; bytes[29] = (height >>> 8) & 0x3f;
  }
  return bytes;
}

test("reads PNG dimensions from IHDR without decoding pixel data", () => {
  assert.deepEqual(parseImageDimensions(pngHeader(8944, 8944)), { width: 8944, height: 8944 });
});

test("reads JPEG dimensions from a Start Of Frame segment", () => {
  const bytes = new Uint8Array(21);
  bytes.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x23, 0x28, 0x23, 0x30]);
  assert.deepEqual(parseImageDimensions(bytes), { width: 9008, height: 9000 });
});

test("reads WebP extended, lossless and lossy dimensions", () => {
  assert.deepEqual(parseImageDimensions(webpHeader("VP8X", 1200, 800)), { width: 1200, height: 800 });
  assert.deepEqual(parseImageDimensions(webpHeader("VP8L", 1200, 800)), { width: 1200, height: 800 });
  assert.deepEqual(parseImageDimensions(webpHeader("VP8 ", 1200, 800)), { width: 1200, height: 800 });
});

test("returns null for unsupported or truncated image headers", () => {
  assert.equal(parseImageDimensions(new Uint8Array([1, 2, 3, 4])), null);
  assert.equal(parseImageDimensions(pngHeader(10, 10).slice(0, 16)), null);
  assert.equal(parseImageDimensions(new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x01])), null);
});

test("rejects unsupported signatures after reading only the 12-byte signature prefix", async () => {
  const sliceEnds: number[] = [];
  const unsupported = {
    size: 50 * 1024 * 1024,
    slice(start = 0, end?: number) {
      sliceEnds.push(end ?? this.size);
      return new Blob([new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])]).slice(start, end);
    },
  } as unknown as Blob;

  assert.equal(await readImageDimensionsFromHeader(unsupported), null);
  assert.deepEqual(sliceEnds, [12]);
});


test("rejects WebP chunks that exceed the RIFF-declared boundary", () => {
  const bytes = webpHeader("VP8X", 1200, 800);
  // Forge a chunk size that extends beyond the RIFF container.
  bytes[16] = 0xff;
  bytes[17] = 0xff;
  bytes[18] = 0xff;
  bytes[19] = 0x7f;
  assert.equal(parseImageDimensions(bytes), null);
});

test("rejects WebP RIFF lengths larger than the actual file", () => {
  const bytes = webpHeader("VP8X", 1200, 800);
  const declaredSize = bytes.length + 100;
  bytes[4] = declaredSize & 255;
  bytes[5] = (declaredSize >>> 8) & 255;
  bytes[6] = (declaredSize >>> 16) & 255;
  bytes[7] = (declaredSize >>> 24) & 255;
  assert.equal(parseImageDimensions(bytes), null);
});

test("rejects a WebP chunk whose odd-size padding is missing", () => {
  const bytes = webpHeader("VP8L", 1200, 800);
  assert.equal(parseImageDimensions(bytes.slice(0, bytes.length - 1)), null);
});


test("accepts decoded dimensions swapped by JPEG EXIF orientation", () => {
  assert.equal(dimensionsMatchHeader({ width: 4032, height: 3024 }, { width: 3024, height: 4032 }), true);
  assert.equal(dimensionsMatchHeader({ width: 4032, height: 3024 }, { width: 4032, height: 3024 }), true);
  assert.equal(dimensionsMatchHeader({ width: 4032, height: 3024 }, { width: 3000, height: 4000 }), false);
});


function jpegWithLargeMetadata(): Uint8Array {
  const segmentLength = 0xffff;
  const metadataSegments = 17;
  const sofLength = 17;
  const bytes = new Uint8Array(2 + metadataSegments * (segmentLength + 2) + 2 + sofLength);
  bytes.set([0xff, 0xd8], 0);
  let offset = 2;
  for (let index = 0; index < metadataSegments; index += 1) {
    bytes[offset] = 0xff;
    bytes[offset + 1] = 0xe1;
    bytes[offset + 2] = (segmentLength >>> 8) & 255;
    bytes[offset + 3] = segmentLength & 255;
    offset += segmentLength + 2;
  }
  bytes[offset] = 0xff;
  bytes[offset + 1] = 0xc0;
  bytes[offset + 2] = 0;
  bytes[offset + 3] = sofLength;
  bytes[offset + 4] = 8;
  bytes[offset + 5] = 0x03;
  bytes[offset + 6] = 0x20;
  bytes[offset + 7] = 0x04;
  bytes[offset + 8] = 0x00;
  return bytes;
}

test("finds JPEG dimensions when valid metadata extends beyond the initial 1 MiB prefix", async () => {
  const bytes = jpegWithLargeMetadata();
  assert.ok(bytes.length > 1024 * 1024);
  const dimensions = await readImageDimensionsFromHeader(new Blob([bytes], { type: "image/jpeg" }));
  assert.deepEqual(dimensions, { width: 1024, height: 800 });
});
