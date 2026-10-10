import { useState } from "react";
import { Download, QrCode } from "lucide-react";
import { ToolField, ToolPanel, primaryButtonClass, toolInputClass, toolTextareaClass } from "./ToolPageFrame";
import { createQrDataUrl } from "./qrTools";

export function QrGeneratorTool() {
  const [text, setText] = useState("");
  const [size, setSize] = useState(512);
  const [level, setLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      setQrDataUrl(await createQrDataUrl(text, size, level));
      setStatus("QR code generated in your browser.");
    } catch (caught) {
      setQrDataUrl("");
      setError(caught instanceof Error ? caught.message : "The QR code could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[1fr_0.72fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">QR code content</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Paste a URL or enter plain text. The code is generated on this device.</p>
        <ToolField label="URL or text" htmlFor="qr-content">
          <textarea id="qr-content" data-testid="input-qr-content" className={`${toolTextareaClass} mt-4 min-h-36`} maxLength={2900} placeholder="https://example.com or any short text" value={text} onChange={(event) => { setText(event.target.value); setQrDataUrl(""); setStatus(""); setError(""); }} />
        </ToolField>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ToolField label="Image size" htmlFor="qr-size">
            <select id="qr-size" data-testid="select-qr-size" className={toolInputClass} value={size} onChange={(event) => { setSize(Number(event.target.value)); setQrDataUrl(""); setStatus(""); setError(""); }}>
              <option value={256}>256 × 256 px</option><option value={512}>512 × 512 px</option><option value={1024}>1024 × 1024 px</option>
            </select>
          </ToolField>
          <ToolField label="Error correction" htmlFor="qr-error-level" hint="Higher correction can make a denser code.">
            <select id="qr-error-level" data-testid="select-qr-error-level" className={toolInputClass} value={level} onChange={(event) => { setLevel(event.target.value as "L" | "M" | "Q" | "H"); setQrDataUrl(""); setStatus(""); setError(""); }}>
              <option value="L">Low — 7%</option><option value="M">Medium — 15%</option><option value="Q">Quartile — 25%</option><option value="H">High — 30%</option>
            </select>
          </ToolField>
        </div>
        <p className="mt-2 text-right text-[11px] text-[#718197]">{text.length}/2,900 characters</p>
        <button type="button" data-testid="button-generate-qr" className={`${primaryButtonClass} mt-4`} disabled={!text.trim() || busy} onClick={generate}>{busy ? "Generating…" : <><QrCode aria-hidden="true" className="h-4 w-4" />Generate QR code</>}</button>
        {error && <p role="alert" data-testid="status-qr-error" className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs leading-5 text-[#ffb9be]">{error}</p>}
      </div>
      <section aria-label="QR code preview" className="flex flex-col items-center justify-center rounded-2xl border border-[#26364b] bg-[#0b1320] p-5">
        {qrDataUrl ? <>
          <img data-testid="result-qr-image" src={qrDataUrl} alt="Generated QR code for the entered content" width={size} height={size} className="h-auto w-full max-w-[320px] rounded-xl bg-white p-3" />
          <a data-testid="link-download-qr" href={qrDataUrl} download="toolhub-qr-code.png" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2d6cdf] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#2258ba] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/25"><Download aria-hidden="true" className="h-4 w-4" />Download PNG</a>
          <p role="status" aria-live="polite" data-testid="status-qr-complete" className="mt-3 text-xs font-semibold text-[#84cba5]">{status}</p>
        </> : <div className="flex flex-col items-center gap-3 text-center text-xs text-[#718197]"><QrCode aria-hidden="true" className="h-10 w-10" /><span>Your generated QR code will appear here.</span></div>}
      </section>
    </div>
  </ToolPanel>;
}