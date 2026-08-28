"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LifecycleStepper } from "@/components/LifecycleStepper";

const ANALYSIS_STEPS = [
  "Reviewing subscription terms...",
  "Identifying cancellation/refund opportunity...",
  "Preparing recommended action...",
];

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-rule bg-paper-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20";

export default function NewCasePage() {
  const router = useRouter();
  const [merchantName, setMerchantName] = useState("");
  const [accountIdentifierLast4, setAccountIdentifierLast4] = useState("");
  const [subscriptionDetails, setSubscriptionDetails] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1));
    }, 700);

    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantName,
          accountIdentifierLast4,
          subscriptionDetails,
          desiredOutcome,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        setSubmitting(false);
        clearInterval(stepTimer);
        return;
      }
      router.push(`/cases/${data.case.caseId}`);
    } catch {
      setError("Couldn't reach Clawback. Try again.");
      setSubmitting(false);
      clearInterval(stepTimer);
    }
  }

  if (submitting) {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 sm:px-8">
        <h1 className="mb-3 text-2xl font-extrabold text-ink">Your data is protected while we work.</h1>
        <p className="mb-6 leading-relaxed text-ink-soft">
          The details below are sent to an attested execution path — not stored in the clear on
          our own servers while your case is analyzed.
        </p>
        <div className="mb-6">
          <LifecycleStepper current="ANALYZING" />
        </div>
        <div className="rounded-xl border border-rule bg-paper-raised p-6" role="status" aria-live="polite">
          {ANALYSIS_STEPS.map((step, i) => (
            <div
              key={step}
              className="flex items-center gap-3 py-1.5 text-sm text-ink-soft transition-opacity"
              style={{ opacity: i <= stepIndex ? 1 : 0.35 }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal motion-safe:animate-soft-pulse" />
              {step}
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-16 sm:px-8">
      <h1 className="mb-2 text-2xl font-extrabold text-ink sm:text-3xl">Tell us what happened.</h1>
      <p className="mb-6 leading-relaxed text-ink-soft">
        We'll investigate the bill and prepare the next action — you approve before anything sends.
      </p>

      <div className="mb-7">
        <LifecycleStepper current="DRAFT" />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-md border border-ember/30 bg-ember-soft px-4 py-3 text-sm font-medium text-ember"
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="rounded-xl border border-rule bg-paper-raised p-6 shadow-card">
        <Field id="merchant" label="Company">
          <input
            id="merchant"
            required
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="e.g. Acme Streaming"
            className={inputClass}
          />
        </Field>
        <Field
          id="account"
          label="Last digits of your account"
          hint="Never your full account number — just enough to identify the case to you."
        >
          <input
            id="account"
            required
            maxLength={6}
            value={accountIdentifierLast4}
            onChange={(e) => setAccountIdentifierLast4(e.target.value)}
            placeholder="4242"
            className={inputClass}
          />
        </Field>
        <Field id="details" label="What's the subscription?">
          <textarea
            id="details"
            required
            rows={3}
            value={subscriptionDetails}
            onChange={(e) => setSubscriptionDetails(e.target.value)}
            placeholder="Premium plan, $19.99/month, billed on the 3rd."
            className={`${inputClass} resize-y`}
          />
        </Field>
        <Field id="outcome" label="What do you want to happen?">
          <textarea
            id="outcome"
            required
            rows={3}
            value={desiredOutcome}
            onChange={(e) => setDesiredOutcome(e.target.value)}
            placeholder="Cancel it and refund this month's $19.99 charge — I never used it."
            className={`${inputClass} resize-y`}
          />
        </Field>
        <button
          type="submit"
          className="w-full rounded-md bg-signal px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
        >
          Investigate this bill
        </button>
      </form>
    </main>
  );
}
