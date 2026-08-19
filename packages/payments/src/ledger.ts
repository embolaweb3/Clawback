import type { FeeCalculation } from "./fee.js";

/**
 * Settlement abstraction (build prompt §9: "build the accounting/escrow
 * abstraction cleanly and document exactly where production payment
 * infrastructure would connect").
 *
 * LocalSettlementLedger is an honest bookkeeping record, not a payment
 * processor: it tracks that a fee was assessed and (optionally) marked
 * paid, but moves no real money. A production deployment would replace
 * it with a real charge — e.g. an ACH debit for the fee once
 * verifiedSavingsCents lands in the user's own account, or a 0G Pay
 * settlement if/when that flow is wired (see packages/chain). The
 * interface is designed so that swap never touches calling code.
 */
export interface SettlementRecord {
  readonly caseId: string;
  readonly fee: FeeCalculation;
  readonly status: "assessed" | "collected" | "waived";
  readonly assessedAt: string;
  readonly collectedAt: string | null;
}

export interface SettlementLedger {
  assessFee(caseId: string, fee: FeeCalculation): Promise<SettlementRecord>;
  markCollected(caseId: string): Promise<SettlementRecord>;
  get(caseId: string): Promise<SettlementRecord | null>;
}

export class LocalSettlementLedger implements SettlementLedger {
  private readonly records = new Map<string, SettlementRecord>();

  async assessFee(caseId: string, fee: FeeCalculation): Promise<SettlementRecord> {
    const record: SettlementRecord = {
      caseId,
      fee,
      status: fee.feeCents === 0 ? "waived" : "assessed",
      assessedAt: new Date().toISOString(),
      collectedAt: null,
    };
    this.records.set(caseId, record);
    return record;
  }

  async markCollected(caseId: string): Promise<SettlementRecord> {
    const existing = this.records.get(caseId);
    if (!existing) {
      throw new Error(`No settlement record for case ${caseId}; call assessFee first.`);
    }
    const updated: SettlementRecord = {
      ...existing,
      status: "collected",
      collectedAt: new Date().toISOString(),
    };
    this.records.set(caseId, updated);
    return updated;
  }

  async get(caseId: string): Promise<SettlementRecord | null> {
    return this.records.get(caseId) ?? null;
  }
}
