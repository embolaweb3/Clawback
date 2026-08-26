import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";
import { getOrCreateOwnerId } from "@/lib/server/identity";
import { errorResponse } from "@/lib/server/httpErrors";

/**
 * The single most consequential endpoint in the app (build prompt §6):
 * this is the only path that ever causes a real (or sandboxed) action to
 * be sent. It requires the exact proposalId the user was shown, and
 * Orchestrator.approveAndExecute independently re-checks ownership and
 * proposal identity server-side — this route does not trust anything the
 * client claims beyond "the user clicked approve on this proposal".
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
  const { caseId } = await params;
  const { proposalId } = (await request.json()) as { proposalId?: string };
  if (!proposalId) {
    return NextResponse.json({ error: "proposalId is required." }, { status: 400 });
  }

  const ownerId = await getOrCreateOwnerId();
  try {
    const summary = await getOrchestrator().approveAndExecute(caseId, ownerId, proposalId);
    return NextResponse.json({ case: summary });
  } catch (error) {
    return errorResponse(error);
  }
}
