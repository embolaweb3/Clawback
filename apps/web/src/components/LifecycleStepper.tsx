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

type StepStatus = "done" | "current" | "upcoming" | "failed";

const DOT_STYLES: Record<StepStatus, string> = {
  done: "bg-signal text-white",
  current: "bg-signal text-white motion-safe:animate-soft-pulse",
  upcoming: "bg-paper-sunken text-ink-faint",
  failed: "bg-ember text-white",
};

const LABEL_STYLES: Record<StepStatus, string> = {
  done: "text-ink",
  current: "text-ink font-semibold",
  upcoming: "text-ink-faint",
  failed: "text-ember font-semibold",
};

/**
 * The seven-step lifecycle, in both its two roles: a static illustration
 * (no `current`) on the landing/how-it-works pages, and the live position
 * of a real case (`current` set) — never a fabricated "almost there".
 */
export function LifecycleStepper({ current }: { current?: CaseState }) {
  const currentIndex = current ? STEPS.findIndex((s) => s.states.includes(current)) : -1;
  const failed = current ? FAILED_STATES.has(current) : false;

  return (
    <ol
      className="flex flex-col gap-0 rounded-xl border border-rule bg-paper-raised p-1 sm:flex-row"
      aria-label="Case lifecycle"
    >
      {STEPS.map((step, i) => {
        let status: StepStatus = "upcoming";
        if (currentIndex !== -1) {
          if (i < currentIndex) status = "done";
          else if (i === currentIndex) status = failed ? "failed" : "current";
        }
        return (
          <li key={step.label} className="flex flex-1 items-center gap-3 px-3 py-3 sm:flex-col sm:items-start sm:gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-bold tabular-nums transition-colors ${DOT_STYLES[status]}`}
              aria-hidden="true"
            >
              {status === "done" ? "✓" : i + 1}
            </span>
            <span className={`text-[0.83rem] leading-tight transition-colors ${LABEL_STYLES[status]}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
