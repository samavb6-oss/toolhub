import test from "node:test";
import assert from "node:assert/strict";
import { currencyOptions, parseCurrencyRate } from "../src/tools/currencyConverterLogic.ts";

test("currency list uses unique uppercase ISO codes", () => {
  assert.ok(currencyOptions.some((currency) => currency.code === "INR"));
  assert.ok(currencyOptions.some((currency) => currency.code === "USD"));
  assert.equal(new Set(currencyOptions.map((currency) => currency.code)).size, currencyOptions.length);
  assert.ok(currencyOptions.every((currency) => /^[A-Z]{3}$/u.test(currency.code)));
});

test("parses a valid dated Frankfurter currency-pair rate", () => {
  assert.deepEqual(parseCurrencyRate({ date: "2026-10-27", base: "USD", quote: "INR", rate: 95.11 }, "USD", "INR"), {
    date: "2026-10-27", base: "USD", quote: "INR", rate: 95.11,
  });
});

test("rejects malformed, mismatched, undated and non-positive rates", () => {
  assert.throws(() => parseCurrencyRate(null, "USD", "INR"), /invalid response/u);
  assert.throws(() => parseCurrencyRate({ date: "bad", base: "USD", quote: "INR", rate: 95 }, "USD", "INR"), /valid rate date/u);
  assert.throws(() => parseCurrencyRate({ date: "2026-10-27", base: "EUR", quote: "INR", rate: 95 }, "USD", "INR"), /different currency pair/u);
  assert.throws(() => parseCurrencyRate({ date: "2026-10-27", base: "USD", quote: "INR", rate: 0 }, "USD", "INR"), /invalid rate/u);
});
