/**
 * Contingency-fee accounting (build prompt §9).
 *
 * The one rule this module exists to enforce in code, not just prose:
 * a fee can NEVER be computed from claimed savings. Only verified
 * savings — the figure packages/receipts's verifier independently
 * corroborates — can ever produce a payable fee. This is what stops
 * Clawback from having any incentive to accept a merchant's or its own
 * sandbox's unverified word as revenue.
 */

export interface VerifiedOutcome {
  readonly verifiedSavingsCents: number | null;
}

export const DEFAULT_FEE_BPS = 4000; // 40% of verified savings, mid-market for this category

export interface FeeCalculation {
  readonly verifiedSavingsCents: number;
  readonly feeBps: number;
  readonly feeCents: number;
  readonly netToUserCents: number;
}

export class UnverifiedSavingsError extends Error {
  constructor() {
    super(
      "Cannot compute a fee against unverified savings. A case must reach " +
        "VERIFIED_SUCCESS with a non-null verifiedSavingsCents before any fee is owed.",
    );
    this.name = "UnverifiedSavingsError";
  }
}

export function computeFee(outcome: VerifiedOutcome, feeBps: number = DEFAULT_FEE_BPS): FeeCalculation {
  if (outcome.verifiedSavingsCents === null) {
    throw new UnverifiedSavingsError();
  }
  if (outcome.verifiedSavingsCents <= 0) {
    return {
      verifiedSavingsCents: outcome.verifiedSavingsCents,
      feeBps,
      feeCents: 0,
      netToUserCents: outcome.verifiedSavingsCents,
    };
  }
  const feeCents = Math.round((outcome.verifiedSavingsCents * feeBps) / 10_000);
  return {
    verifiedSavingsCents: outcome.verifiedSavingsCents,
    feeBps,
    feeCents,
    netToUserCents: outcome.verifiedSavingsCents - feeCents,
  };
}
