import test from "node:test";
import assert from "node:assert/strict";
import { calculateGst, formatPaiseINR, formatRatePercent } from "../src/tools/gstCalculatorLogic.ts";

function value(amount: number | string, rate: number | string, mode: "exclusive" | "inclusive" = "exclusive", type: "intra-state" | "inter-state" = "intra-state") {
  const result = calculateGst(amount, rate, mode, type);
  assert.equal(result.ok, true, result.ok ? undefined : result.error);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

test("adds 5%, 12%, 18% and 28% GST to a base amount", () => {
  assert.deepEqual([5, 12, 18, 28].map((rate) => value(1000, rate).gstAmount), [50, 120, 180, 280]);
});

test("exclusive intra-state GST splits into CGST and SGST", () => {
  const result = value(1000, 18);
  assert.equal(result.baseAmount, 1000);
  assert.equal(result.cgst, 90);
  assert.equal(result.sgst, 90);
  assert.equal(result.igst, 0);
  assert.equal(result.totalAmount, 1180);
});

test("exclusive inter-state GST is shown as IGST only", () => {
  const result = value(1000, 18, "exclusive", "inter-state");
  assert.equal(result.igst, 180);
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
});

test("extracts GST from inclusive totals", () => {
  const result = value(1180, 18, "inclusive");
  assert.equal(result.baseAmount, 1000);
  assert.equal(result.gstAmount, 180);
  assert.equal(result.totalAmount, 1180);
});

test("rounds half-up to paise for exclusive calculations", () => {
  const result = value("0.05", 10);
  assert.equal(result.gstAmount, 0.01);
  assert.equal(result.totalAmount, 0.06);
});

test("handles zero amounts and zero rates", () => {
  assert.equal(value(0, 18).totalAmount, 0);
  assert.equal(value(123.45, 0).gstAmount, 0);
  assert.equal(value(123.45, 0, "inclusive").baseAmount, 123.45);
});

test("splits odd paise deterministically without losing total tax", () => {
  const result = value("0.01", 100);
  assert.equal(result.gstAmount, 0.01);
  assert.equal(result.cgst + result.sgst, result.gstAmount);
});

test("accepts the 100% rate boundary", () => {
  assert.equal(value(50, 100).totalAmount, 100);
  assert.equal(value(100, 100, "inclusive").baseAmount, 50);
});

test("rejects empty, negative, non-finite, and unrepresentably large amounts", () => {
  for (const amount of ["", -1, "-0.01", "nope", Infinity, NaN, Number.MAX_VALUE]) {
    assert.equal(calculateGst(amount, 18).ok, false, `amount ${String(amount)} should be rejected`);
  }
});

test("rejects invalid rates and invalid modes or supply types", () => {
  for (const rate of ["", -0.01, 100.01, Infinity, NaN, "x"]) assert.equal(calculateGst(100, rate).ok, false);
  assert.equal(calculateGst(100, 18, "other" as never).ok, false);
  assert.equal(calculateGst(100, 18, "exclusive", "other" as never).ok, false);
});

test("accepts decimal rupee inputs and rounds input precision to paise", () => {
  assert.equal(value("123.456", 0).baseAmount, 123.46);
});

test("supports a zero-rate inter-state supply without GST", () => {
  const result = value("999.99", 0, "exclusive", "inter-state");
  assert.equal(result.gstAmount, 0);
  assert.equal(result.igst, 0);
  assert.equal(result.totalAmount, 999.99);
});

test("extracts inclusive GST as IGST for inter-state supplies", () => {
  const result = value(1180, 18, "inclusive", "inter-state");
  assert.equal(result.baseAmount, 1000);
  assert.equal(result.igst, 180);
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
});


test("extracts inclusive GST exactly for large fractional-rate totals", () => {
  // Exact base = round(7,036,874,417,680,349 * 1000 / 1001) paise.
  const result = value("70368744176803.49", "0.1", "inclusive");
  assert.equal(result.baseAmount, 70298445731072.42);
  assert.equal(result.gstAmount, 70298445731.07);
  assert.equal(result.totalAmount, 70368744176803.49);
});

test("extracts inclusive GST into CGST and SGST for intra-state supplies", () => {
  const result = value(112, 12, "inclusive", "intra-state");
  assert.equal(result.baseAmount, 100);
  assert.equal(result.cgst, 6);
  assert.equal(result.sgst, 6);
});

test("preserves the entered inclusive total when the tax is fractional", () => {
  const result = value("10.01", 18, "inclusive");
  assert.equal(result.totalAmount, 10.01);
  assert.equal(Math.round((result.baseAmount + result.gstAmount) * 100), 1001);
});

test("supports fractional percentage rates", () => {
  const result = value(1000, "2.5");
  assert.equal(result.gstAmount, 25);
  assert.equal(result.totalAmount, 1025);
});


test("rounds large fractional-rate calculations exactly to paise", () => {
  // The exact tax is 7,029,844,571,352.499 paise: half-up must round down.
  // Both base and total remain inside the calculator's representable output range.
  const result = value("70298445713524.99", "0.1");
  assert.equal(result.baseAmount, 70298445713524.99);
  assert.equal(result.gstAmount, 70298445713.52);
  assert.equal(result.totalAmount, 70368744159238.51);
});

test("rounds input amounts down to the nearest paise when appropriate", () => {
  assert.equal(value("12.344", 0).baseAmount, 12.34);
});

test("rounds input amounts up at a half-paise boundary", () => {
  assert.equal(value("12.345", 0).baseAmount, 12.35);
});

test("rounds larger half-paise boundaries correctly for strings and numbers", () => {
  assert.equal(value("10000.005", 0).baseAmount, 10000.01);
  assert.equal(value(10000.005, 0).baseAmount, 10000.01);
});

test("accepts scientific-notation amounts without losing decimal rounding", () => {
  assert.equal(value("1e3", 0).baseAmount, 1000);
  assert.equal(value(1e-7, 0).baseAmount, 0);
});

test("rejects whitespace-only amount input", () => {
  assert.equal(calculateGst("   ", 18).ok, false);
});

test("rejects whitespace-only rate input", () => {
  assert.equal(calculateGst(100, "   ").ok, false);
});

test("rejects calculations whose intermediate tax multiplication is unsafe", () => {
  assert.equal(calculateGst("90000000000000", 100).ok, false);
});

test("keeps all tax components at zero for a zero inclusive total", () => {
  const result = value(0, 18, "inclusive", "inter-state");
  assert.equal(result.baseAmount, 0);
  assert.equal(result.gstAmount, 0);
  assert.equal(result.igst, 0);
});

test("rounds a non-even intra-state split while preserving the tax sum", () => {
  const result = value("0.03", 100);
  assert.equal(result.gstAmount, 0.03);
  assert.equal(result.cgst, 0.01);
  assert.equal(result.sgst, 0.02);
  assert.equal(result.cgst + result.sgst, result.gstAmount);
});


test("formats large safe-integer paise without losing the final paisa", () => {
  const result = value("90071992547400.01", 0, "exclusive", "inter-state");
  assert.equal(result.basePaise, 9007199254740001);
  assert.equal(result.totalPaise, 9007199254740001);
  assert.equal(formatPaiseINR(result.basePaise), "₹9,00,71,99,25,47,400.01");
  assert.equal(formatPaiseINR(result.totalPaise), "₹9,00,71,99,25,47,400.01");
});

test("formats ordinary paise with exactly two decimal digits", () => {
  assert.equal(formatPaiseINR(100001), "₹1,000.01");
  assert.equal(formatPaiseINR(100000), "₹1,000.00");
});

// ---------------------------------------------------------------------------------------------
// Display exactness around 2^46 rupees (₹70,368,744,177,664). Above it, paise / 100 can no longer
// hold every paisa in a JS number, so a number -> Intl(2 decimals) path showed e.g. ₹…664.01 as
// ₹…664.02. Expected strings below are literals computed independently of formatPaiseINR.
// ---------------------------------------------------------------------------------------------

test("displays the first paisa above 2^46 rupees exactly (the reported case)", () => {
  const result = value("70368744177664.01", 0, "exclusive", "inter-state");
  assert.equal(result.basePaise, 7036874417766401);
  assert.equal(result.totalPaise, 7036874417766401);
  assert.equal(formatPaiseINR(result.basePaise), "₹7,03,68,74,41,77,664.01");
  assert.equal(formatPaiseINR(result.totalPaise), "₹7,03,68,74,41,77,664.01");
  assert.equal(formatPaiseINR(result.gstPaise), "₹0.00");
  assert.equal(formatPaiseINR(result.igstPaise), "₹0.00");
});

test("displays every paisa exactly on both sides of the 2^46-rupee boundary", () => {
  for (const [rupees, grouped] of [
    ["70368744177663", "₹7,03,68,74,41,77,663"],
    ["70368744177664", "₹7,03,68,74,41,77,664"],
    ["70368744177665", "₹7,03,68,74,41,77,665"],
  ] as const) {
    for (let cents = 0; cents < 100; cents++) {
      const cc = String(cents).padStart(2, "0");
      const result = value(`${rupees}.${cc}`, 0, "exclusive", "inter-state");
      assert.equal(formatPaiseINR(result.totalPaise), `${grouped}.${cc}`, `₹${rupees}.${cc}`);
    }
  }
});

test("displays exact base, GST, CGST/SGST, IGST and total above 2^46 rupees", () => {
  const intra = value("70368744177664.01", 18, "exclusive", "intra-state");
  assert.deepEqual(
    [intra.basePaise, intra.gstPaise, intra.cgstPaise, intra.sgstPaise, intra.totalPaise].map(formatPaiseINR),
    ["₹7,03,68,74,41,77,664.01", "₹1,26,66,37,39,51,979.52", "₹63,33,18,69,75,989.76", "₹63,33,18,69,75,989.76", "₹8,30,35,11,81,29,643.53"],
  );
  const inclusive = value("70368744177664.01", 18, "inclusive", "inter-state");
  assert.deepEqual(
    [inclusive.basePaise, inclusive.igstPaise, inclusive.totalPaise].map(formatPaiseINR),
    ["₹5,96,34,52,89,64,122.04", "₹1,07,34,21,52,13,541.97", "₹7,03,68,74,41,77,664.01"],
  );
});

test("accepts every amount up to the largest safe paise value and rejects the next paisa", () => {
  // Number.MAX_SAFE_INTEGER paise = ₹90,071,992,547,409.91
  for (let cents = 0; cents < 100; cents++) {
    const cc = String(cents).padStart(2, "0");
    const result = calculateGst(`90071992547409.${cc}`, 0, "exclusive", "inter-state");
    if (cents <= 91) {
      assert.equal(result.ok, true, `₹90071992547409.${cc} should be accepted`);
      if (result.ok) {
        assert.equal(result.value.totalPaise, 9007199254740900 + cents);
        assert.equal(formatPaiseINR(result.value.totalPaise), `₹9,00,71,99,25,47,409.${cc}`);
      }
    } else {
      assert.equal(result.ok, false, `₹90071992547409.${cc} should be rejected`);
    }
  }
  // Half-paisa input at the very top: .914 rounds to .91 (accepted), .915 rounds to .92 (rejected).
  assert.equal(calculateGst("90071992547409.914", 0).ok, true);
  assert.equal(calculateGst("90071992547409.915", 0).ok, false);
  assert.equal(calculateGst("90071992547409.91", 0, "inclusive").ok, true);
  assert.equal(calculateGst("90071992547409.92", 0, "inclusive").ok, false);
});

test("rejects exclusive totals that exceed the safe range by one paisa", () => {
  const ok = value("45035996273704.95", 100, "exclusive", "inter-state");
  assert.equal(ok.totalPaise, 9007199254740990);
  assert.equal(formatPaiseINR(ok.totalPaise), "₹9,00,71,99,25,47,409.90");
  const tooLarge = calculateGst("45035996273704.96", 100, "exclusive", "inter-state");
  assert.equal(tooLarge.ok, false);
  if (!tooLarge.ok) assert.match(tooLarge.error, /too large/);
});

// ---------------------------------------------------------------------------------------------
// Exact half-paisa ties (inclusive and exclusive), asserted on integer paise.
// ---------------------------------------------------------------------------------------------

test("rounds exact half-paisa GST up for exclusive calculations", () => {
  assert.equal(value("0.25", 10).gstPaise, 3); // 2.5 paise; half-even would give 2
  assert.equal(value("1.00", "0.5").gstPaise, 1); // 0.5 paise
  assert.equal(value("0.01", 50).gstPaise, 1); // 0.5 paise
});

test("rounds an exact half-paisa base up when extracting inclusive GST", () => {
  const cases: [string, number, number, number][] = [
    // total, rate, expected base paise, expected GST paise
    ["0.14", 12, 13, 1], // 14 * 100 / 112 = 12.5
    ["0.16", 28, 13, 3], // 16 * 100 / 128 = 12.5
    ["0.01", 100, 1, 0], // 1 / 2 = 0.5
    ["0.03", 100, 2, 1], // 3 / 2 = 1.5
  ];
  for (const [total, rate, basePaise, gstPaise] of cases) {
    const result = value(total, rate, "inclusive", "inter-state");
    assert.equal(result.basePaise, basePaise, `base for ₹${total} @${rate}%`);
    assert.equal(result.gstPaise, gstPaise, `GST for ₹${total} @${rate}%`);
    assert.equal(result.totalPaise, basePaise + gstPaise);
  }
});

test("keeps exact half-paisa rounding at very large magnitudes", () => {
  // Exclusive tie: 4,503,599,627,370,495 paise * 50% = 2,251,799,813,685,247.5 -> ...248
  const exclusive = value("45035996273704.95", 50, "exclusive", "inter-state");
  assert.equal(exclusive.gstPaise, 2251799813685248);
  assert.equal(exclusive.totalPaise, 6755399441055743);
  assert.equal(formatPaiseINR(exclusive.gstPaise), "₹2,25,17,99,81,36,852.48");
  assert.equal(formatPaiseINR(exclusive.totalPaise), "₹6,75,53,99,44,10,557.43");
  // Inclusive tie at the maximum: 9,007,199,254,740,991 / 2 = ...495.5 -> base ...496, GST ...495
  const inclusive = value("90071992547409.91", 100, "inclusive", "inter-state");
  assert.equal(inclusive.basePaise, 4503599627370496);
  assert.equal(inclusive.gstPaise, 4503599627370495);
  assert.equal(inclusive.totalPaise, 9007199254740991);
  assert.equal(formatPaiseINR(inclusive.basePaise), "₹4,50,35,99,62,73,704.96");
  assert.equal(formatPaiseINR(inclusive.igstPaise), "₹4,50,35,99,62,73,704.95");
});

// ---------------------------------------------------------------------------------------------
// Rate parsing: negative zero and non-decimal strings.
// ---------------------------------------------------------------------------------------------

test("normalises a numeric negative-zero rate so -0 never reaches the UI", () => {
  const result = value(100, -0);
  assert.equal(Object.is(result.rate, 0), true);
  assert.equal(result.gstPaise, 0);
});

test("rejects negative-zero and non-decimal rate strings", () => {
  for (const rate of ["-0", "-0.0", "0x12", "0X1F", "0b11", "0o7", "1e", "1_0", "Infinity", "18abc"]) {
    assert.equal(calculateGst(100, rate).ok, false, `rate ${JSON.stringify(rate)} should be rejected`);
  }
});

// ---------------------------------------------------------------------------------------------
// Rate labels (IGST, and half-rate for CGST / SGST): exact decimal text, never rounded to 4 places.
// ---------------------------------------------------------------------------------------------

test("formats standard GST rates and their CGST / SGST halves", () => {
  const cases: [number, string, string][] = [
    // rate, full label, half label
    [0, "0", "0"],
    [5, "5", "2.5"],
    [12, "12", "6"],
    [18, "18", "9"],
    [28, "28", "14"],
    [100, "100", "50"],
    [2.5, "2.5", "1.25"],
    [0.1, "0.1", "0.05"],
    [99.99, "99.99", "49.995"],
  ];
  for (const [rate, full, half] of cases) {
    assert.equal(formatRatePercent(rate), full, `rate ${rate}`);
    assert.equal(formatRatePercent(rate, true), half, `half of rate ${rate}`);
  }
});

test("rate labels keep every decimal place instead of rounding at four", () => {
  assert.equal(formatRatePercent(0.00004), "0.00004"); // the old label showed "0%"
  assert.equal(formatRatePercent(0.00004, true), "0.00002");
  assert.equal(formatRatePercent(0.00003, true), "0.000015");
  assert.equal(formatRatePercent(18.12345), "18.12345"); // the old label showed "18.1235%"
  assert.equal(formatRatePercent(18.12345, true), "9.061725");
  assert.equal(formatRatePercent(1e-7), "0.0000001");
  assert.equal(formatRatePercent(1e-7, true), "0.00000005");
});

test("the displayed rate is the rate the tax was calculated with", () => {
  const result = value("10000000000", "0.00004", "exclusive", "inter-state");
  assert.equal(formatRatePercent(result.rate), "0.00004");
  assert.equal(formatPaiseINR(result.igstPaise), "₹4,000.00"); // 1,000,000,000,000 paise * 0.00004%
  const odd = value("10000000000", "0.00003", "exclusive", "intra-state");
  assert.equal(formatRatePercent(odd.rate, true), "0.000015");
  assert.equal(odd.cgstPaise + odd.sgstPaise, odd.gstPaise);
});

test("still accepts ordinary decimal rate strings", () => {
  const cases: [string, number][] = [[" 18 ", 1800], ["+18", 1800], [".5", 50], ["5.", 500], ["1e1", 1000], ["0", 0], ["100", 10000]];
  for (const [rate, gstPaise] of cases) assert.equal(value(100, rate).gstPaise, gstPaise, `rate ${JSON.stringify(rate)}`);
});
