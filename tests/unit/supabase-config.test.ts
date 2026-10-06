import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "@/lib/supabase/config";

describe("normalizeSupabaseUrl", () => {
  const origin = "https://abcdefghijklmnopqrst.supabase.co";

  it("keeps a bare project URL", () => {
    expect(normalizeSupabaseUrl(origin)).toBe(origin);
  });

  it("strips trailing slashes and whitespace", () => {
    expect(normalizeSupabaseUrl(`  ${origin}/  `)).toBe(origin);
  });

  it("strips a copied REST or Auth endpoint suffix", () => {
    expect(normalizeSupabaseUrl(`${origin}/rest/v1/`)).toBe(origin);
    expect(normalizeSupabaseUrl(`${origin}/auth/v1`)).toBe(origin);
  });

  it("returns null when unset", () => {
    expect(normalizeSupabaseUrl(undefined)).toBeNull();
    expect(normalizeSupabaseUrl("")).toBeNull();
  });
});
