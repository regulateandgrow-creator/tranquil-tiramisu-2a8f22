import { NextResponse, type NextRequest } from "next/server";
import { aiDefaults } from "@/lib/ai/config";
import { limitedResponse, requireIntelligenceSession } from "@/lib/ai/http";
import { getAiProvider } from "@/lib/ai/provider";
import { AiProviderError } from "@/lib/ai/provider/types";
import { checkUsage } from "@/lib/ai/pipeline/usage";
import { readLabel } from "@/lib/ai/pipeline/label";
import { startAnalysis, StartAnalysisError } from "@/lib/ai/pipeline/start";
import { opsLine } from "@/lib/ai/logging";
import { sniffImageType } from "@/lib/intelligence/image";

export const maxDuration = 120;

/**
 * POST /api/intelligence/scan  multipart: image=<file>
 * Reads the label with vision, then joins the normal flow at the confirm step.
 * The image is read once in memory and never stored or logged.
 */
export async function POST(request: NextRequest) {
  const session = await requireIntelligenceSession();
  if ("error" in session) return session.error;
  const { supabase, admin, userId } = session;

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_image" }, { status: 400 });
  if (file.size > aiDefaults.maxScanBytes) return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = sniffImageType(bytes);
  if (!mediaType) return NextResponse.json({ error: "unsupported_image" }, { status: 415 });

  const usage = await checkUsage(admin, userId);
  if (!usage.allowed) return limitedResponse(usage.limit, usage.resetsAt);

  const provider = getAiProvider()!;
  let label;
  try {
    label = await readLabel(provider, { base64: Buffer.from(bytes).toString("base64"), mediaType }, file.name);
  } catch (err) {
    const code = err instanceof AiProviderError ? (err.code === "refusal" ? "provider_refused" : "provider_unavailable") : "unknown";
    opsLine("scan.failed", { code });
    return NextResponse.json({ error: code }, { status: 502 });
  }
  opsLine("scan.read", { readable: label.result.readable, confidence: label.result.confidence, inputTokens: label.usage.inputTokens, outputTokens: label.usage.outputTokens, model: label.model });
  if (!label.result.readable || !label.query) {
    return NextResponse.json({ error: "label_unreadable", note: label.result.note }, { status: 422 });
  }

  try {
    const started = await startAnalysis(supabase, admin, userId, label.query, "scan", [{ step: "label", prompt: label.raw.prompt, output: label.raw.output }]);
    return NextResponse.json({ ...started, read: { query: label.query, confidence: label.result.confidence, note: label.result.note }, usage: { limit: usage.limit, remaining: usage.remaining } });
  } catch (err) {
    if (err instanceof StartAnalysisError) return NextResponse.json({ id: err.id, status: "failed", error: err.code }, { status: 502 });
    throw err;
  }
}
