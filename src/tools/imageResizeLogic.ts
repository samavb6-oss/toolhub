export type ImageDimensions = { width: number; height: number };
export type AspectPreset = "original" | "9:16" | "16:9" | "1:1" | "4:5" | "4:3" | "3:2" | "custom";
export type ResizeFitMode = "contain" | "cover";

export const MAX_IMAGE_DIMENSION = 40_000;
export const MAX_IMAGE_PIXELS = 80_000_000;

export function ratioForPreset(preset: AspectPreset, original: ImageDimensions | null): number | null {
  if (preset === "original") return original ? original.width / original.height : null;
  if (preset === "custom") return null;
  const [width, height] = preset.split(":").map(Number);
  return width / height;
}

export function isValidImageDimensions(dimensions: ImageDimensions): boolean {
  const { width, height } = dimensions;
  return Number.isFinite(width) &&
    Number.isFinite(height) &&
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 1 &&
    height >= 1 &&
    width <= MAX_IMAGE_DIMENSION &&
    height <= MAX_IMAGE_DIMENSION &&
    width * height <= MAX_IMAGE_PIXELS;
}

export function fitRectangle(
  source: ImageDimensions,
  target: ImageDimensions,
  mode: ResizeFitMode,
): { x: number; y: number; width: number; height: number } {
  const scale = mode === "contain"
    ? Math.min(target.width / source.width, target.height / source.height)
    : Math.max(target.width / source.width, target.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  return { x: (target.width - width) / 2, y: (target.height - height) / 2, width, height };
}
