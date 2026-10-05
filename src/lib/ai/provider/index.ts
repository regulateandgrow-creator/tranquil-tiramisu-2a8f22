import { getAiProviderName } from "../config";
import type { AiProvider } from "./types";
import { AnthropicProvider } from "./anthropic";
import { FixtureProvider } from "./fixture";

let cached: AiProvider | null = null;

/** The configured provider, or null when no AI is configured (demo mode). */
export function getAiProvider(): AiProvider | null {
  if (cached) return cached;
  const name = getAiProviderName();
  if (name === "anthropic") cached = new AnthropicProvider();
  else if (name === "fixture") cached = new FixtureProvider();
  else return null;
  return cached;
}
