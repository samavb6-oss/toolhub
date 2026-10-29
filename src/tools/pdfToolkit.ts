// Share the dynamically loaded PDF engine and its WASM-backed toolkit across tools.
// The package is fetched only when Compress PDF or Unlock PDF is first used.
type PdfStudioModule = typeof import('pdfstudio');
type PdfToolkitPromise = ReturnType<PdfStudioModule['createPdfToolkit']>;

let pdfStudioPromise: Promise<PdfStudioModule> | null = null;
let toolkitPromise: PdfToolkitPromise | null = null;

export function getPdfStudioModule(): Promise<PdfStudioModule> {
  if (!pdfStudioPromise) {
    pdfStudioPromise = import('pdfstudio');
  }
  return pdfStudioPromise;
}

export function getPdfToolkit(): PdfToolkitPromise {
  if (!toolkitPromise) {
    toolkitPromise = getPdfStudioModule().then(({ createPdfToolkit }) => createPdfToolkit());
  }
  return toolkitPromise;
}
