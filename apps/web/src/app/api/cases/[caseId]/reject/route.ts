import { NextResponse } from "next/server";
import { getOrchestrator } from "@/lib/server/orchestrator";
import { getOrCreateOwnerId } from "@/lib/server/identity";
import { errorResponse } from "@/lib/server/httpErrors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
  const { caseId } = await params;
  const ownerId = await getOrCreateOwnerId();
  try {
    const summary = await getOrchestrator().rejectProposal(caseId, ownerId);
    return NextResponse.json({ case: summary });
  } catch (error) {
    return errorResponse(error);
  }
}
