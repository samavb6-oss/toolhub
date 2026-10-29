import { isValidImageDimensions, type ImageDimensions } from "./imageResizeLogic.ts";

export type CropRectangle = { x: number; y: number; width: number; height: number };

export function clampCropRectangle(rect: CropRectangle, image: ImageDimensions): CropRectangle {
  const x = Number.isFinite(rect.x) ? Math.min(image.width - 1, Math.max(0, Math.round(rect.x))) : 0;
  const y = Number.isFinite(rect.y) ? Math.min(image.height - 1, Math.max(0, Math.round(rect.y))) : 0;
  const width = Number.isFinite(rect.width) ? Math.min(image.width - x, Math.max(1, Math.round(rect.width))) : image.width - x;
  const height = Number.isFinite(rect.height) ? Math.min(image.height - y, Math.max(1, Math.round(rect.height))) : image.height - y;
  return { x, y, width, height };
}

export function cropRectangleFromDrag(
  start: { x: number; y: number },
  end: { x: number; y: number },
  image: ImageDimensions,
): CropRectangle {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);
  return clampCropRectangle({ x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) }, image);
}

export function isValidCropRectangle(rect: CropRectangle, image: ImageDimensions): boolean {
  return isValidImageDimensions(image) &&
    Number.isInteger(rect.x) && Number.isInteger(rect.y) &&
    Number.isInteger(rect.width) && Number.isInteger(rect.height) &&
    rect.x >= 0 && rect.y >= 0 && rect.width >= 1 && rect.height >= 1 &&
    rect.x + rect.width <= image.width && rect.y + rect.height <= image.height &&
    isValidImageDimensions({ width: rect.width, height: rect.height });
}