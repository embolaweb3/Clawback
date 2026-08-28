import type { VerificationReport } from "@clawback/receipts";

type Check = VerificationReport["checks"][number];

function badgeFor(check: Check): { label: string; className: string } {
  if (check.strength === "not_independently_verifiable") {
    return { label: "Not verifiable", className: "bg-paper-sunken text-ink-faint" };
  }
  if (check.strength === "trusted_claim") {
    return { label: "Trusted claim", className: "bg-gold-soft text-gold" };
  }
  // cryptographically_verifiable
  if (check.result === true) return { label: "Verified", className: "bg-signal-soft text-signal" };
  if (check.result === false) return { label: "Failed", className: "bg-ember-soft text-ember" };
  return { label: "N/A", className: "bg-paper-sunken text-ink-faint" };
}

/**
 * One row of a VerificationReport. The badge is derived from BOTH
 * `strength` and `result` — never simplified to a plain pass/fail, per
 * VERIFICATION.md's five-category model: a trusted claim must never look
 * like cryptographic proof, and an unconfigured check must never look
 * like a failure.
 */
export function VerificationCheckRow({ check }: { check: Check }) {
  const badge = badgeFor(check);
  return (
    <div className="border-b border-rule py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-semibold text-ink">{check.question}</span>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <p className="mt-1.5 text-[0.83rem] leading-relaxed text-ink-faint">{check.detail}</p>
    </div>
  );
}
