import { CaseNotFoundError, UnauthorizedCaseAccessError } from "@clawback/agent";
import { ProposalMismatchError } from "@clawback/agent";
import { IllegalTransitionError } from "@clawback/shared";
import { NextResponse } from "next/server";

/** Maps known domain errors to the right HTTP status without ever
 *  echoing back anything sensitive — every error type here carries only
 *  identifiers and state names, never case content (see @clawback/privacy
 *  redact.ts's registry, which these error messages never touch). */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedCaseAccessError) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (error instanceof CaseNotFoundError) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }
  if (error instanceof ProposalMismatchError) {
    return NextResponse.json({ error: "That proposal no longer matches this case." }, { status: 409 });
  }
  if (error instanceof IllegalTransitionError) {
    return NextResponse.json(
      { error: `This case can't do that right now (currently ${error.from}).` },
      { status: 409 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
