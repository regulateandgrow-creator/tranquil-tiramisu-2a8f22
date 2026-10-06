/**
 * Narrow live check (a few cents): does the vision label read return the printed
 * identity, identity only, as strict JSON? Needs GROWN_LABEL_IMAGE=<path to a jpg/png>.
 * Run: GROWN_LABEL_IMAGE=... npx vitest run --config vitest.live.config.mts tests/live/label-read.test.ts
 */
import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { AnthropicProvider } from "@/lib/ai/provider/anthropic";
import { readLabel } from "@/lib/ai/pipeline/label";
import { sniffImageType } from "@/lib/intelligence/image";

const KEY = process.env.GROWN_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
const IMAGE = process.env.GROWN_LABEL_IMAGE;

it.skipIf(!KEY || !IMAGE)("vision label read on the real API", async () => {
  const bytes = new Uint8Array(readFileSync(IMAGE!));
  const mediaType = sniffImageType(bytes);
  expect(mediaType).not.toBeNull();
  const provider = new AnthropicProvider(KEY);
  const started = Date.now();
  const out = await readLabel(provider, { base64: Buffer.from(bytes).toString("base64"), mediaType: mediaType! });
  const ms = Date.now() - started;
  console.log(JSON.stringify({ result: out.result, query: out.query, usage: out.usage, model: out.model, ms }));
  expect(out.result.readable).toBe(true);
  expect(out.result.brand.toLowerCase()).toContain("spoiled");
  expect(out.query.toLowerCase()).toContain("e27");
  expect(/extra strength/i.test(out.query)).toBe(true);
  // Identity only: no dosages, prices or claims in any field.
  expect(/\$|mg\b|\bg\b|%|clinically|proven/i.test(JSON.stringify(out.result))).toBe(false);
});
