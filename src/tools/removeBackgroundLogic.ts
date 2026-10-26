export const MAX_BACKGROUND_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_BACKGROUND_IMAGE_PIXELS = 40_000_000;

const SUPPORTED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const SUPPORTED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

export type BackgroundImageFile = {
  name: string;
  type: string;
  size: number;
};

export function validateBackgroundImageFile(file: BackgroundImageFile): string | null {
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "Choose a non-empty image file.";
  }
  if (file.size > MAX_BACKGROUND_FILE_BYTES) {
    return "Choose an image smaller than 25 MB to keep processing manageable.";
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!SUPPORTED_MIME_TYPES.has(file.type.toLowerCase()) &&
      !(file.type === "" && SUPPORTED_EXTENSIONS.has(extension))) {
    return "Choose a PNG, JPG, JPEG, or WebP image.";
  }

  return null;
}

export function validateBackgroundImageDimensions(width: number, height: number): string | null {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    return "This image has invalid dimensions.";
  }
  if (width > 40_000 || height > 40_000 || width * height > MAX_BACKGROUND_IMAGE_PIXELS) {
    return "This image is too large to process safely. Choose an image up to 40 megapixels.";
  }
  return null;
}

export function backgroundOutputBaseName(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/u, "");
  const safe = withoutExtension
    .replace(/[\\/:*?"<>|]/gu, "-")
    .replace(/^[.\s-]+|[.\s-]+$/gu, "")
    .slice(0, 80);
  return safe || "image";
}
