import QRCode from "qrcode";

const MAX_QR_BYTES: Record<"L" | "M" | "Q" | "H", number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273,
};

export async function createQrDataUrl(
  text: string,
  size: number,
  errorCorrectionLevel: "L" | "M" | "Q" | "H",
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Enter a URL or text to generate a QR code.");
  const byteLength = new TextEncoder().encode(trimmed).length;
  if (byteLength > MAX_QR_BYTES[errorCorrectionLevel]) {
    const maxBytes = MAX_QR_BYTES[errorCorrectionLevel].toLocaleString("en-US");
    throw new Error(`This content is too large for QR error-correction level ${errorCorrectionLevel}. Shorten it to fit within approximately ${maxBytes} bytes, or choose a lower correction level.`);
  }
  try {
    return await QRCode.toDataURL(trimmed, {
      width: size,
      margin: 3,
      errorCorrectionLevel,
      color: { dark: "#07111f", light: "#ffffff" },
    });
  } catch {
    throw new Error("This content could not be encoded as a QR code. Shorten the text and try again.");
  }
}
