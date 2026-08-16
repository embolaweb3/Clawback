import { describe, expect, it } from "vitest";
import { applyTransition, IllegalTransitionError, isTerminal, legalEvents } from "./stateMachine.js";

describe("case state machine", () => {
  it("walks the full happy path in order", () => {
    let state = applyTransition("DRAFT", "SUBMIT");
    expect(state).toBe("SUBMITTED");
    state = applyTransition(state, "BEGIN_ANALYSIS");
    expect(state).toBe("ANALYZING");
    state = applyTransition(state, "PROPOSE_ACTION");
    expect(state).toBe("ACTION_PROPOSED");
    state = applyTransition(state, "REQUEST_APPROVAL");
    expect(state).toBe("AWAITING_APPROVAL");
    state = applyTransition(state, "APPROVE");
    expect(state).toBe("APPROVED");
    state = applyTransition(state, "BEGIN_EXECUTION");
    expect(state).toBe("EXECUTING");
    state = applyTransition(state, "EXECUTION_SUCCEEDED");
    expect(state).toBe("OUTCOME_PENDING");
    state = applyTransition(state, "OUTCOME_CONFIRMED");
    expect(state).toBe("VERIFIED_SUCCESS");
    expect(isTerminal(state)).toBe(true);
  });

  it("rejects skipping the approval step (cannot execute without approval)", () => {
    expect(() => applyTransition("ACTION_PROPOSED", "BEGIN_EXECUTION")).toThrow(
      IllegalTransitionError,
    );
  });

  it("rejects re-approving an already-approved case", () => {
    expect(() => applyTransition("APPROVED", "APPROVE")).toThrow(IllegalTransitionError);
  });

  it("rejects any transition out of a terminal state", () => {
    for (const event of [
      "SUBMIT",
      "APPROVE",
      "BEGIN_EXECUTION",
      "OUTCOME_CONFIRMED",
    ] as const) {
      expect(() => applyTransition("VERIFIED_SUCCESS", event)).toThrow(IllegalTransitionError);
    }
    expect(legalEvents("VERIFIED_SUCCESS")).toEqual([]);
  });

  it("allows rejection only while awaiting approval", () => {
    expect(applyTransition("AWAITING_APPROVAL", "REJECT")).toBe("REJECTED");
    expect(() => applyTransition("EXECUTING", "REJECT")).toThrow(IllegalTransitionError);
  });

  it("allows expiry from every non-terminal state that defines it", () => {
    expect(applyTransition("DRAFT", "EXPIRE")).toBe("EXPIRED");
    expect(applyTransition("AWAITING_APPROVAL", "EXPIRE")).toBe("EXPIRED");
  });

  it("distinguishes execution failure from outcome-unverifiable", () => {
    expect(applyTransition("EXECUTING", "EXECUTION_FAILED")).toBe("EXECUTION_FAILED");
    expect(applyTransition("OUTCOME_PENDING", "OUTCOME_UNVERIFIABLE")).toBe("OUTCOME_UNVERIFIED");
  });
});
