import type { CaseState } from "./types.js";

/**
 * The case state machine (build prompt §13).
 *
 * This is the ONLY place transitions are legal. Every other package must
 * call `applyTransition` rather than mutate a case's `state` field
 * directly — enforced in packages/agent's CaseStore, which rejects any
 * write that didn't go through this function.
 */

export type CaseEvent =
  | "SUBMIT"
  | "BEGIN_ANALYSIS"
  | "PROPOSE_ACTION"
  | "REQUEST_APPROVAL"
  | "APPROVE"
  | "REJECT"
  | "BEGIN_EXECUTION"
  | "EXECUTION_SUCCEEDED"
  | "EXECUTION_FAILED"
  | "OUTCOME_CONFIRMED"
  | "OUTCOME_UNVERIFIABLE"
  | "EXPIRE";

const TRANSITIONS: Record<CaseState, Partial<Record<CaseEvent, CaseState>>> = {
  DRAFT: {
    SUBMIT: "SUBMITTED",
    EXPIRE: "EXPIRED",
  },
  SUBMITTED: {
    BEGIN_ANALYSIS: "ANALYZING",
    EXPIRE: "EXPIRED",
  },
  ANALYZING: {
    PROPOSE_ACTION: "ACTION_PROPOSED",
    EXECUTION_FAILED: "EXECUTION_FAILED", // analysis itself can fail
    EXPIRE: "EXPIRED",
  },
  ACTION_PROPOSED: {
    REQUEST_APPROVAL: "AWAITING_APPROVAL",
    EXPIRE: "EXPIRED",
  },
  AWAITING_APPROVAL: {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    EXPIRE: "EXPIRED",
  },
  APPROVED: {
    BEGIN_EXECUTION: "EXECUTING",
    EXPIRE: "EXPIRED",
  },
  EXECUTING: {
    EXECUTION_SUCCEEDED: "OUTCOME_PENDING",
    EXECUTION_FAILED: "EXECUTION_FAILED",
  },
  OUTCOME_PENDING: {
    OUTCOME_CONFIRMED: "VERIFIED_SUCCESS",
    OUTCOME_UNVERIFIABLE: "OUTCOME_UNVERIFIED",
    EXPIRE: "EXPIRED",
  },
  // Terminal states: no outgoing transitions.
  VERIFIED_SUCCESS: {},
  EXECUTION_FAILED: {},
  OUTCOME_UNVERIFIED: {},
  REJECTED: {},
  EXPIRED: {},
};

export class IllegalTransitionError extends Error {
  constructor(
    public readonly from: CaseState,
    public readonly event: CaseEvent,
  ) {
    super(`Illegal transition: cannot apply "${event}" from state "${from}".`);
    this.name = "IllegalTransitionError";
  }
}

/**
 * The single, pure entry point for advancing a case. Throws rather than
 * silently no-opping, so a caller can never accidentally believe a
 * transition happened when it didn't (this matters most for APPROVE and
 * BEGIN_EXECUTION — see packages/agent's authorization guard).
 */
export function applyTransition(from: CaseState, event: CaseEvent): CaseState {
  const next = TRANSITIONS[from]?.[event];
  if (!next) {
    throw new IllegalTransitionError(from, event);
  }
  return next;
}

export function isTerminal(state: CaseState): boolean {
  return TRANSITIONS[state] && Object.keys(TRANSITIONS[state]).length === 0;
}

export function legalEvents(state: CaseState): CaseEvent[] {
  return Object.keys(TRANSITIONS[state] ?? {}) as CaseEvent[];
}
