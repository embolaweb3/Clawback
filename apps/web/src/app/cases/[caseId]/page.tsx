import { notFound } from "next/navigation";
import { CaseNotFoundError, UnauthorizedCaseAccessError } from "@clawback/agent";
import { getOrchestrator } from "@/lib/server/orchestrator";
import { getOrCreateOwnerId } from "@/lib/server/identity";
import { CaseView } from "./CaseView";

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const ownerId = await getOrCreateOwnerId();

  try {
    const summary = await getOrchestrator().getCase(caseId, ownerId);
    return (
      <main className="shell">
        <CaseView initialCase={summary} />
      </main>
    );
  } catch (error) {
    if (error instanceof CaseNotFoundError || error instanceof UnauthorizedCaseAccessError) {
      notFound();
    }
    throw error;
  }
}
