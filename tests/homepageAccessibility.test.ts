import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function luminance(hex: string): number {
  const channels = hex.match(/[0-9a-f]{2}/gi)!.map((channel) => parseInt(channel, 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("homepage search focus border has 3:1 contrast in light and dark themes", () => {
  const source = readFileSync(new URL("../src/components/ToolsHomepage.tsx", import.meta.url), "utf8");
  const input = source.match(/data-testid="input-tool-search"[^>]*className="([^"]+)"/)?.[1];
  assert.ok(input, "homepage search input and className should exist");

  const lightFocus = input.match(/(?:^|\\s)focus:border-\\[#([0-9a-f]{6})\\]/i)?.[1];
  const darkFocus = input.match(/(?:^|\\s)dark:focus:border-\\[#([0-9a-f]{6})\\]/i)?.[1];
  const darkBackground = input.match(/(?:^|\\s)dark:bg-\\[#([0-9a-f]{6})\\]/i)?.[1];

  assert.ok(lightFocus, "light-theme focus border color should be explicit");
  assert.ok(darkFocus, "dark-theme focus border color should be explicit");
  assert.ok(darkBackground, "dark-theme input background should be explicit");
  assert.ok(contrastRatio(lightFocus, "ffffff") >= 3, "light focus border must contrast with white input");
  assert.ok(contrastRatio(darkFocus, darkBackground) >= 3, "dark focus border must contrast with dark input");
});
