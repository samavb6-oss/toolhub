import { useState } from "react";
import { ToolField, ToolPanel, primaryButtonClass, secondaryButtonClass, toolInputClass } from "./ToolPageFrame";
import { calculateGst, type GstMode, type SupplyType } from "./gstCalculatorLogic";

function inr(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function GstCalculatorTool() {
  const [amount, setAmount] = useState("1000.00");
  const [rate, setRate] = useState("18");
  const [mode, setMode] = useState<GstMode>("exclusive");
  const [supplyType, setSupplyType] = useState<SupplyType>("intra-state");
  const result = calculateGst(amount, rate, mode, supplyType);

  return <ToolPanel>
    <div className="grid gap-7 lg:grid-cols-[1fr_0.95fr]">
      <div>
        <h2 className="text-base font-extrabold text-white">GST calculation</h2>
        <p className="mt-1 text-xs leading-5 text-[#8193a9]">Calculate GST on a base price or extract it from a GST-inclusive amount.</p>
        <div className="mt-5 space-y-4">
          <ToolField label={mode === "exclusive" ? "Base price before GST (₹)" : "Total price including GST (₹)"} htmlFor="gst-amount" hint="Enter a non-negative amount in rupees; results are rounded to paise.">
            <input id="gst-amount" data-testid="input-gst-amount" className={toolInputClass} type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </ToolField>
          <ToolField label="GST rate (%)" htmlFor="gst-rate" hint="Choose the rate applicable to your specific supply; rates are not inferred by this tool.">
            <input id="gst-rate" data-testid="input-gst-rate" className={toolInputClass} type="number" min="0" max="100" step="0.01" inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} />
          </ToolField>
          <fieldset>
            <legend className="text-xs font-bold text-[#cbd5e1]">Amount type</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" data-testid="button-gst-exclusive" aria-pressed={mode === "exclusive"} className={mode === "exclusive" ? primaryButtonClass : secondaryButtonClass} onClick={() => setMode("exclusive")}>Add GST</button>
              <button type="button" data-testid="button-gst-inclusive" aria-pressed={mode === "inclusive"} className={mode === "inclusive" ? primaryButtonClass : secondaryButtonClass} onClick={() => setMode("inclusive")}>Extract GST</button>
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-xs font-bold text-[#cbd5e1]">Supply type (assumption)</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" data-testid="button-gst-intra-state" aria-pressed={supplyType === "intra-state"} className={supplyType === "intra-state" ? primaryButtonClass : secondaryButtonClass} onClick={() => setSupplyType("intra-state")}>Intra-state</button>
              <button type="button" data-testid="button-gst-inter-state" aria-pressed={supplyType === "inter-state"} className={supplyType === "inter-state" ? primaryButtonClass : secondaryButtonClass} onClick={() => setSupplyType("inter-state")}>Inter-state</button>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#8193a9]">Select based on the legally determined place of supply, not just the delivery address.</p>
          </fieldset>
        </div>
        {!result.ok && <p role="alert" data-testid="status-gst-validation" className="mt-4 rounded-xl border border-[#6e4149] bg-[#3b2429] px-4 py-3 text-xs font-semibold leading-5 text-[#ffb9be]">{result.error}</p>}
      </div>
      <section aria-label="GST results" className="rounded-2xl border border-[#28466b] bg-[linear-gradient(145deg,#152c49,#111b29)] p-5 sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#8fb6ec]">{mode === "exclusive" ? "Total including GST" : "Base price before GST"}</p>
        <p data-testid="result-gst-primary" className="mt-2 break-words text-3xl font-extrabold tracking-[-0.05em] text-white">{result.ok ? inr(mode === "exclusive" ? result.value.totalAmount : result.value.baseAmount) : "—"}</p>
        <div className="mt-6 space-y-3">
          <ResultRow label="Base price" value={result.ok ? inr(result.value.baseAmount) : "—"} testId="result-gst-base" />
          <ResultRow label="GST amount" value={result.ok ? inr(result.value.gstAmount) : "—"} testId="result-gst-tax" />
          {supplyType === "intra-state" ? <>
            <ResultRow label="CGST" detail={`${result.ok ? (result.value.rate / 2).toLocaleString("en-IN", { maximumFractionDigits: 4 }) : "—"}%`} value={result.ok ? inr(result.value.cgst) : "—"} testId="result-gst-cgst" />
            <ResultRow label="SGST / UTGST" detail={`${result.ok ? (result.value.rate / 2).toLocaleString("en-IN", { maximumFractionDigits: 4 }) : "—"}%`} value={result.ok ? inr(result.value.sgst) : "—"} testId="result-gst-sgst" />
          </> : <ResultRow label="IGST" detail={`${result.ok ? result.value.rate.toLocaleString("en-IN", { maximumFractionDigits: 4 }) : "—"}%`} value={result.ok ? inr(result.value.igst) : "—"} testId="result-gst-igst" />}
          <div className="border-t border-[#35506f] pt-3"><ResultRow label="Total payable" value={result.ok ? inr(result.value.totalAmount) : "—"} testId="result-gst-total" strong /></div>
        </div>
      </section>
    </div>
    <p className="mt-6 border-t border-[#26364b] pt-4 text-xs leading-5 text-[#8193a9]">Estimate only. Monetary results are rounded to the nearest ₹0.01; for intra-state supplies, the rounded GST total is split between CGST and SGST/UTGST, with any odd paise assigned to SGST/UTGST. This tool does not determine HSN/SAC classification, exemptions, cess, reverse charge, place of supply, invoice-specific rounding, or the legally applicable rate.</p>
  </ToolPanel>;
}

function ResultRow({ label, value, detail, testId, strong = false }: { label: string; value: string; detail?: string; testId: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-4">
    <div><p className={`text-xs ${strong ? "font-extrabold text-white" : "font-semibold text-[#aab9cc]"}`}>{label}</p>{detail && <p className="mt-0.5 text-[11px] text-[#8193a9]">{detail}</p>}</div>
    <p data-testid={testId} className={`text-right text-sm ${strong ? "font-extrabold text-white" : "font-bold text-[#dce9fb]"}`}>{value}</p>
  </div>;
}
