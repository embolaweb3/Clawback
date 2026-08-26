import { NextResponse } from "next/server";
import type { SubscriptionCaseInput } from "@clawback/shared";
import { getOrchestrator } from "@/lib/server/orchestrator";
import { getOrCreateOwnerId } from "@/lib/server/identity";
import { errorResponse } from "@/lib/server/httpErrors";

interface NewCaseBody {
  readonly merchantName: string;
  readonly accountIdentifierLast4: string;
  readonly subscriptionDetails: string;
  readonly desiredOutcome: string;
}

function validate(body: Partial<NewCaseBody>): string | null {
  if (!body.merchantName?.trim()) return "Merchant name is required.";
  if (!body.accountIdentifierLast4?.trim() || body.accountIdentifierLast4.trim().length > 6) {
    return "Enter the last few digits of your account, not the full number.";
  }
  if (!body.subscriptionDetails?.trim()) return "Tell us about the subscription.";
  if (!body.desiredOutcome?.trim()) return "Tell us what you want to happen.";
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as Partial<NewCaseBody>;
  const validationError = validate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const ownerId = await getOrCreateOwnerId();
  const input: SubscriptionCaseInput = {
    merchantName: body.merchantName!.trim(),
    accountIdentifierLast4: body.accountIdentifierLast4!.trim(),
    subscriptionDetails: body.subscriptionDetails!.trim(),
    desiredOutcome: body.desiredOutcome!.trim(),
    contactChannel: "sandbox",
    contactAddress: "sandbox@clawback.test",
  };

  try {
    const summary = await getOrchestrator().submitCase(ownerId, input);
    return NextResponse.json({ case: summary }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
