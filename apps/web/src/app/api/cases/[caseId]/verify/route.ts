import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";
import { getOrCreateOwnerId } from "@/lib/server/identity";
import { errorResponse } from "@/lib/server/httpErrors";

/**
 * The "How was this verified?" panel's data source (build prompt §10):
 * runs @clawback/receipts's independent verifier fresh, on demand, rather
 * than returning a cached judgment — so what the UI shows here is
 * recomputed from the same commitments a third party could recompute
 * themselves, not a stored opinion this endpoint is merely repeating.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
  const { caseId } = await params;
  const ownerId = await getOrCreateOwnerId();
  try {
    const report = await getOrchestrator().verifyCaseReceipt(caseId, ownerId);
    return NextResponse.json({ report });
  } catch (error) {
    return errorResponse(error);
  }
}
