import type { SubscriptionCaseInput } from "@clawback/shared";

/**
 * Deterministic, dependency-free message generator used when 0G Compute
 * is not configured (build prompt §1: never oversell — an unattested
 * fallback path must exist and must be labeled honestly, not silently
 * disguised as an attested one).
 *
 * This is not "a worse AI" standing in for a better one — it's a fixed,
 * auditable template, on purpose. packages/agent always labels output
 * produced here with `evidenceStrength: "not_independently_verifiable"`
 * and `teeAttested: false`. See ARCHITECTURE.md.
 */
export function generateFallbackMessage(input: SubscriptionCaseInput): string {
  return (
    `Hello,\n\n` +
    `I am writing regarding my ${input.merchantName} account ending in ${input.accountIdentifierLast4}. ` +
    `${input.subscriptionDetails}\n\n` +
    `${input.desiredOutcome}\n\n` +
    `Please confirm this request in writing and let me know the reference number for my case.\n\n` +
    `Thank you.`
  );
}
