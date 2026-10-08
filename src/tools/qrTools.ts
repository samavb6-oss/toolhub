import QRCode from "qrcode";

export async function createQrDataUrl(
  text: string,
  size: number,
  errorCorrectionLevel: "L" | "M" | "Q" | "H",
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Enter a URL or text to generate a QR code.");
  if (trimmed.length > 2900) throw new Error("Keep the content under 2,900 characters so the QR code remains practical to scan.");
  return QRCode.toDataURL(trimmed, {
    width: size,
    margin: 3,
    errorCorrectionLevel,
    color: { dark: "#07111f", light: "#ffffff" },
  });
}