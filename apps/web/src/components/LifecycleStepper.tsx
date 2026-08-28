import type { CaseState } from "@clawback/shared";

interface Step {
  readonly label: string;
  readonly states: readonly CaseState[];
}

/** Mirrors packages/shared/src/types.ts's CASE_STATES exactly — every real
 *  state belongs to exactly one step here, so this can't silently drift
 *  into showing a step the state machine doesn't actually support. */
const STEPS: readonly Step[] = [
  { label: "Case", states: ["DRAFT", "SUBMITTED"] },
  { label: "Private analysis", states: ["ANALYZING"] },
  { label: "Proposed action", states: ["ACTION_PROPOSED"] },
  { label: "Your approval", states: ["AWAITING_APPROVAL", "APPROVED"] },
  { label: "Execution", states: ["EXECUTING"] },
  { label: "Outcome", states: ["OUTCOME_PENDING", "EXECUTION_FAILED", "OUTCOME_UNVERIFIED", "REJECTED", "EXPIRED"] },
  { label: "Verifiable receipt", states: ["VERIFIED_SUCCESS"] },
];

const FAILED_STATES: ReadonlySet<CaseState> = new Set([
  "EXECUTION_FAILED",
  "OUTCOME_UNVERIFIED",
  "REJECTED",
  "EXPIRED",
]);

/**
 * The seven-step lifecycle, in both its two roles:
 *  - static (no `current`): the landing page's illustration of what
 *    Clawback always does, in order.
 *  - live (`current` set): the actual case's real state, reflected
 *    exactly — never a fabricated "almost there" position.
 */
export function LifecycleStepper({ current }: { current?: CaseState }) {
  const currentIndex = current ? STEPS.findIndex((s) => s.states.includes(current)) : -1;
  const failed = current ? FAILED_STATES.has(current) : false;

  return (
    <ol className="stepper" aria-label="Case lifecycle">
      {STEPS.map((step, i) => {
        let status: "done" | "current" | "upcoming" | "failed" = "upcoming";
        if (currentIndex === -1) {
          status = "upcoming"; // static illustration mode
        } else if (i < currentIndex) {
          status = "done";
        } else if (i === currentIndex) {
          status = failed ? "failed" : "current";
        }
        return (
          <li key={step.label} className={`stepper-step stepper-step--${status}`}>
            <span className="stepper-index" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="stepper-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
