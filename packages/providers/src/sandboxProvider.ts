import { commit } from "@clawback/shared";
import type { ProviderActionRequest, ProviderActionResult, SubscriptionProvider } from "./types.js";

/**
 * SandboxSubscriptionProvider — a deterministic simulator, NOT a live
 * merchant integration (build prompt §3: "isolate that boundary and make
 * the limitation obvious").
 *
 * This is the one external-facing boundary the build prompt explicitly
 * allows to be simulated in a hackathon environment, on the condition that
 * it is never presented as a real outcome. Every result this class returns
 * carries `source: "sandbox"`, and packages/receipts refuses to label a
 * receipt "successful" from live merchant confirmation unless the
 * provider that produced it reports `source: "live"` — see
 * receipts/verifier.ts's `assertNoSandboxLeakage`.
 *
 * The behavior is deterministic (seeded from the case's own merchant +
 * account identifier, not randomness) so the same case always reaches the
 * same simulated outcome — useful for tests and for a demo that needs to
 * be rehearsed without becoming a coin flip — while still not being a
 * rigged "always succeeds" toy: roughly 60% of merchants issue a refund,
 * 25% cancel without refunding anything, and 15% decline outright.
 */
export class SandboxSubscriptionProvider implements SubscriptionProvider {
  readonly source = "sandbox" as const;

  async sendAction(request: ProviderActionRequest): Promise<ProviderActionResult> {
    const { merchantName, accountIdentifierLast4, subscriptionDetails, desiredOutcome } =
      request.input;

    const seedHex = commit({ merchantName, accountIdentifierLast4 }).slice(2, 6);
    const bucket = parseInt(seedHex, 16) % 100;

    const requestedCents = extractAmountCents(subscriptionDetails) ?? extractAmountCents(desiredOutcome);

    if (bucket < 60) {
      const amount = requestedCents ?? 999;
      return {
        outcomeType: "refund_issued",
        counterpartyConfirmation: `Sandbox confirmation: "${merchantName}" approved a refund of $${(amount / 100).toFixed(2)} for account ending ${accountIdentifierLast4}.`,
        claimedSavingsCents: amount,
        source: "sandbox",
      };
    }

    if (bucket < 85) {
      return {
        outcomeType: "cancelled",
        counterpartyConfirmation: `Sandbox confirmation: "${merchantName}" confirmed cancellation for account ending ${accountIdentifierLast4}. No refund was issued for the current period.`,
        claimedSavingsCents: 0,
        source: "sandbox",
      };
    }

    if (bucket < 95) {
      return {
        outcomeType: "declined",
        counterpartyConfirmation: `Sandbox confirmation: "${merchantName}" declined the request, citing its stated cancellation policy.`,
        claimedSavingsCents: 0,
        source: "sandbox",
      };
    }

    return {
      outcomeType: "no_response",
      counterpartyConfirmation: null,
      claimedSavingsCents: 0,
      source: "sandbox",
    };
  }
}

function extractAmountCents(text: string): number | null {
  const match = text.match(/\$\s?(\d+(?:\.\d{1,2})?)/);
  const amount = match?.[1];
  if (!amount) return null;
  return Math.round(parseFloat(amount) * 100);
}
