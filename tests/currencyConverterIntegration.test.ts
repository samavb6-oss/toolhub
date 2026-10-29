import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../src/tools/UnitConverterTools.tsx", import.meta.url), "utf8");

test("currency converter prevents currency-pair changes while a rate request is pending", () => {
  assert.match(component, /data-testid="currency-converter-swap"[^>]*disabled=\{loading\}/u);
  assert.match(component, /id="currency-converter-from"[^>]*disabled=\{loading\}/u);
  assert.match(component, /id="currency-converter-to"[^>]*disabled=\{loading\}/u);
  assert.match(component, /className=\{secondaryButtonClass\} disabled=\{loading\} onClick=\{\(\) => \{ setAmount/u);
});

test("currency converter shows a rate date only when an exchange rate was fetched", () => {
  assert.match(component, /rate && from !== to && <p[^>]*>Rate date: \{rate\.date\}<\/p>/u);
  assert.match(component, /Same currency selected; no exchange-rate request was needed\./u);
});
