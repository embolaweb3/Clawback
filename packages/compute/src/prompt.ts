import type { SubscriptionCaseInput } from "@clawback/shared";

/**
 * The exact prompt sent to whichever analysis path handles a case —
 * whether that's a real 0G Compute provider or the local fallback
 * template. Keeping it in one place means both paths are answering
 * literally the same question, so a receipt's "what was the AI asked to
 * do" claim doesn't quietly change based on which path ran.
 */
export function buildAnalysisPrompt(input: SubscriptionCaseInput): { system: string; user: string } {
  const system =
    "You are a firm, factual, professional consumer advocate drafting a single message a customer will send to a subscription provider. " +
    "Write ONLY the message itself — no preamble, no explanation, no markdown. " +
    "Be specific, cite the account details given, state the desired outcome clearly, and keep it under 120 words.";
  const user = [
    `Merchant: ${input.merchantName}`,
    `Account ending: ${input.accountIdentifierLast4}`,
    `Subscription details: ${input.subscriptionDetails}`,
    `Desired outcome: ${input.desiredOutcome}`,
  ].join("\n");
  return { system, user };
}
