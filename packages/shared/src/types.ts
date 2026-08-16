/**
 * Core domain types for Clawback.
 *
 * These types are the contract every package builds against. Nothing here
 * invents a 0G capability — anything described as "attested" or "verified"
 * corresponds to a concrete field this codebase actually produces from a
 * real SDK call (see packages/compute, packages/storage, packages/chain).
 * Where a claim cannot be backed by a real mechanism, the type says so
 * explicitly (see `EvidenceStrength`).
 */

// ── Evidence strength ────────────────────────────────────────────────────
//
// Every piece of evidence Clawback shows a user is labeled with exactly how
// strong it is. This is the single most important type in the codebase —
// it is what stops "verified" from becoming a marketing word instead of a
// technical fact (see VERIFICATION.md).
export type EvidenceStrength =
  /** Backed by math/cryptography a third party can independently check
   *  (e.g. a recomputed hash matching an on-chain commitment). */
  | "cryptographically_verifiable"
  /** Backed by a TEE-signed response a third party can independently check
   *  against the provider's published attestation, per the 0G Compute SDK's
   *  broker.inference.processResponse(). Depends on trusting the TEE
   *  vendor's hardware root of trust — real, but not "trustless". */
  | "tee_attested"
  /** Backed by a real economic action (funds actually moved, escrow
   *  actually released) that would be costly to fake, but not
   *  cryptographically self-proving on its own. */
  | "economically_enforced"
  /** A claim this system believes but cannot independently prove — e.g.
   *  an external company's own confirmation email. Shown to the user
   *  labeled as such, never silently upgraded to a stronger claim. */
  | "trusted_claim"
  /** Explicitly documented as NOT solvable by this system today. See
   *  THREAT-MODEL.md — most importantly, that a human operator secretly
   *  performing the task cannot be cryptographically ruled out. */
  | "not_independently_verifiable";

// ── Case lifecycle ───────────────────────────────────────────────────────

export const CASE_STATES = [
  "DRAFT",
  "SUBMITTED",
  "ANALYZING",
  "ACTION_PROPOSED",
  "AWAITING_APPROVAL",
  "APPROVED",
  "EXECUTING",
  "OUTCOME_PENDING",
  "VERIFIED_SUCCESS",
  "EXECUTION_FAILED",
  "OUTCOME_UNVERIFIED",
  "REJECTED",
  "EXPIRED",
] as const;

export type CaseState = (typeof CASE_STATES)[number];

export const TERMINAL_STATES: ReadonlySet<CaseState> = new Set([
  "VERIFIED_SUCCESS",
  "EXECUTION_FAILED",
  "OUTCOME_UNVERIFIED",
  "REJECTED",
  "EXPIRED",
]);

/** MVP ships exactly one vertical, on purpose (see build prompt §2). */
export type CaseCategory = "subscription_cancellation";

// ── Sensitive input (privacy boundary) ───────────────────────────────────
//
// This is the plaintext the user gives Clawback. It is the thing the whole
// architecture exists to keep out of the platform's own hands wherever
// possible. See packages/privacy for exactly where it lives and for how
// long, and DATA_FLOW registry below for a field-by-field account.
export interface SubscriptionCaseInput {
  readonly merchantName: string;
  readonly accountIdentifierLast4: string; // never the full account number
  readonly subscriptionDetails: string; // free text: plan, price, dates
  readonly desiredOutcome: string; // free text: what the user wants
  /** Contact channel the action will actually be sent through. */
  readonly contactChannel: "email" | "chat" | "sandbox";
  readonly contactAddress: string; // email address or sandbox handle
}

// ── Action proposal (requires explicit approval, build prompt §6) ───────

export interface ActionProposal {
  readonly proposalId: string;
  readonly summary: string; // short, human-readable rationale
  readonly exactMessage: string; // the literal text that will be sent
  readonly estimatedRecoveryCents: number | null; // null if not estimable
  readonly createdAt: string; // ISO timestamp
}

export interface ApprovalRecord {
  readonly caseId: string;
  readonly proposalId: string;
  readonly actionCommitment: string; // sha256 of the exact approved action
  readonly approvedAt: string;
  readonly approvedBy: string; // user identifier
}

// ── Execution & outcome evidence ─────────────────────────────────────────

export interface ExecutionEvidence {
  readonly executionId: string;
  readonly caseId: string;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly succeeded: boolean;
  /** True only if a real broker.inference.processResponse() call returned
   *  isValid === true for this execution. False (not omitted) when 0G
   *  Compute was not configured — see LIMITATIONS.md. */
  readonly teeAttested: boolean;
  readonly attestationEvidence: TeeAttestationEvidence | null;
  readonly providerAddress: string | null;
  readonly inputCommitment: string; // sha256 of the sensitive input
  readonly outputCommitment: string; // sha256 of the raw provider output
  readonly errorMessage: string | null;
}

/** Exactly the fields the 0G Compute SDK actually exposes today — see
 *  packages/compute/src/attestation.ts for the call sites. Nothing here is
 *  invented; anything the SDK doesn't expose is simply absent, not faked. */
export interface TeeAttestationEvidence {
  readonly providerAddress: string;
  readonly model: string | null;
  readonly chatId: string | null;
  /** Return value of broker.inference.processResponse(). */
  readonly isValid: boolean;
  readonly verifiedAt: string;
}

export interface OutcomeEvidence {
  readonly caseId: string;
  readonly outcomeType: "cancelled" | "refund_issued" | "declined" | "no_response";
  /** What the platform is told by the counterparty/sandbox — a trusted
   *  claim, not a cryptographic proof (see EvidenceStrength). */
  readonly counterpartyConfirmation: string | null;
  readonly claimedSavingsCents: number;
  /** Set only once independently corroborated (see packages/receipts's
   *  verifier). Never equal to claimedSavingsCents by default. */
  readonly verifiedSavingsCents: number | null;
  readonly evidenceStrength: EvidenceStrength;
  readonly recordedAt: string;
}

// ── Receipt (the trust surface, build prompt §7) ─────────────────────────

export interface ClawbackReceipt {
  readonly receiptId: string;
  readonly caseId: string;
  readonly category: CaseCategory;
  readonly status: "successful" | "unsuccessful" | "unverified";
  /** Which real-world boundary produced the outcome this receipt
   *  describes. "sandbox" MUST be shown prominently in the UI — never
   *  presented as if a real merchant were contacted (build prompt §3,
   *  §23). See packages/providers/src/sandboxProvider.ts. */
  readonly environment: "sandbox" | "live";
  readonly actionTaken: string; // short, public-safe description
  readonly outcome: string; // short, public-safe description
  readonly claimedSavingsCents: number;
  readonly verifiedSavingsCents: number | null;
  readonly execution: {
    readonly teeAttested: boolean;
    readonly evidenceStrength: EvidenceStrength;
    readonly providerAddress: string | null;
    readonly model: string | null;
  };
  readonly commitments: {
    readonly caseCommitment: string;
    readonly actionCommitment: string;
    readonly executionCommitment: string;
    readonly outcomeCommitment: string;
    readonly receiptCommitment: string;
  };
  readonly anchor: {
    /** Populated only when packages/chain actually submitted a
     *  transaction. Absent (not faked) when unconfigured. */
    readonly chainTxHash: string | null;
    readonly storageRootHash: string | null;
  };
  readonly approval: {
    readonly verified: boolean;
    readonly approvedAt: string | null;
  };
  readonly createdAt: string;
}

// ── Field-by-field data-flow registry (build prompt §5) ──────────────────
//
// This is documentation-as-code: every sensitive field Clawback ever
// touches is registered here with who can see it, where it lives, how
// long it persists, and what (if anything) represents it as a commitment.
// packages/privacy/src/dataFlow.test.ts asserts every field referenced by
// SubscriptionCaseInput has a registry entry, so this can't silently drift.
export type DataVisibility = "user_only" | "attested_compute_only" | "public";
export type DataLifetime = "ephemeral_in_memory" | "encrypted_at_rest" | "permanent_public";

export interface DataFlowEntry {
  readonly field: string;
  readonly visibility: DataVisibility;
  readonly lifetime: DataLifetime;
  readonly commitmentField: keyof ClawbackReceipt["commitments"] | null;
}

export const DATA_FLOW_REGISTRY: readonly DataFlowEntry[] = [
  {
    field: "merchantName",
    visibility: "attested_compute_only",
    lifetime: "encrypted_at_rest",
    commitmentField: "caseCommitment",
  },
  {
    field: "accountIdentifierLast4",
    visibility: "attested_compute_only",
    lifetime: "encrypted_at_rest",
    commitmentField: "caseCommitment",
  },
  {
    field: "subscriptionDetails",
    visibility: "attested_compute_only",
    lifetime: "encrypted_at_rest",
    commitmentField: "caseCommitment",
  },
  {
    field: "desiredOutcome",
    visibility: "attested_compute_only",
    lifetime: "encrypted_at_rest",
    commitmentField: "caseCommitment",
  },
  {
    field: "contactAddress",
    visibility: "attested_compute_only",
    lifetime: "encrypted_at_rest",
    commitmentField: "caseCommitment",
  },
  {
    field: "exactMessage",
    visibility: "user_only",
    lifetime: "encrypted_at_rest",
    commitmentField: "actionCommitment",
  },
  {
    field: "claimedSavingsCents",
    visibility: "public",
    lifetime: "permanent_public",
    commitmentField: "outcomeCommitment",
  },
] as const;
