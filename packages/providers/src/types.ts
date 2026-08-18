import type { SubscriptionCaseInput } from "@clawback/shared";

/**
 * The seam between Clawback and the outside world (build prompt §3, step 7:
 * "the AI agent executes the action inside the protected compute path").
 *
 * A SubscriptionProvider is the thing that actually delivers an approved
 * action to a real counterparty and reports back what happened. Exactly
 * one implementation ships in this repo — SandboxSubscriptionProvider — a
 * deterministic simulator used for development and demos. It is never
 * disguised as a live merchant integration; see its own file header and
 * LIMITATIONS.md for the isolated boundary this represents.
 */

export interface ProviderActionRequest {
  readonly caseId: string;
  readonly input: SubscriptionCaseInput;
  readonly exactMessage: string;
}

export type ProviderOutcomeType = "cancelled" | "refund_issued" | "declined" | "no_response";

export interface ProviderActionResult {
  readonly outcomeType: ProviderOutcomeType;
  readonly counterpartyConfirmation: string | null;
  readonly claimedSavingsCents: number;
  /** Human-readable label of exactly which real-world boundary produced
   *  this result, so a receipt can never quietly imply a sandboxed result
   *  came from a real merchant. */
  readonly source: "sandbox" | "live";
}

export interface SubscriptionProvider {
  readonly source: "sandbox" | "live";
  sendAction(request: ProviderActionRequest): Promise<ProviderActionResult>;
}
