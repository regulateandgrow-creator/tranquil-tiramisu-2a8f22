import { NextResponse, type NextRequest } from "next/server";
import { limitedResponse, requireIntelligenceSession } from "@/lib/ai/http";
import { checkUsage } from "@/lib/ai/pipeline/usage";
import { startAnalysis, StartAnalysisError } from "@/lib/ai/pipeline/start";
import { opsLine } from "@/lib/ai/logging";
import { extractProductFromHtml, fetchProductPage, validateProductUrl } from "@/lib/intelligence/link";

export const maxDuration = 120;

/**
 * POST /api/intelligence/link  { url }
 * Reads the product name from the page (no model call), then joins the normal
 * flow at the confirm step. The page is never stored.
 */
export async function POST(request: NextRequest) {
  const session = await requireIntelligenceSession();
  if ("error" in session) return session.error;
  const { supabase, admin, userId } = session;

  const body = (await request.json().catch(() => ({}))) as { url?: unknown };
  const checked = validateProductUrl(typeof body.url === "string" ? body.url : "");
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });

  const usage = await checkUsage(admin, userId);
  if (!usage.allowed) return limitedResponse(usage.limit, usage.resetsAt);

  const html = await fetchProductPage(checked.url);
  if (html === null) {
    opsLine("link.unreachable", { host: checked.url.hostname });
    return NextResponse.json({ error: "link_unreachable" }, { status: 422 });
  }
  const product = extractProductFromHtml(html);
  if (product.query.length < 2) {
    opsLine("link.unreadable", { host: checked.url.hostname });
    return NextResponse.json({ error: "link_unreadable" }, { status: 422 });
  }
  opsLine("link.read", { host: checked.url.hostname, hasBrand: !!product.brand });

  try {
    const started = await startAnalysis(supabase, admin, userId, product.query, "link");
    return NextResponse.json({ ...started, read: { query: product.query, title: product.title }, usage: { limit: usage.limit, remaining: usage.remaining } });
  } catch (err) {
    if (err instanceof StartAnalysisError) return NextResponse.json({ id: err.id, status: "failed", error: err.code }, { status: 502 });
    throw err;
  }
}
