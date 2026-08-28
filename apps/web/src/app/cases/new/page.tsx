"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LifecycleStepper } from "@/components/LifecycleStepper";

const ANALYSIS_STEPS = [
  "Reviewing subscription terms...",
  "Identifying cancellation/refund opportunity...",
  "Preparing recommended action...",
];

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
      <main className="shell">
        <h1>Your data is protected while we work.</h1>
        <p>
          The details below are sent to an attested execution path — not stored in the clear
          on our own servers while your case is analyzed.
        </p>
        <div style={{ marginBottom: "1.5rem" }}>
          <LifecycleStepper current="ANALYZING" />
        </div>
        <div className="card" role="status" aria-live="polite">
          {ANALYSIS_STEPS.map((step, i) => (
            <div key={step} className="progress-line" style={{ opacity: i <= stepIndex ? 1 : 0.35 }}>
              <span className="dot" />
              {step}
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <h1>Tell us what happened.</h1>
      <p>We'll investigate the bill and prepare the next action — you approve before anything sends.</p>

      <div style={{ marginBottom: "1.75rem" }}>
        <LifecycleStepper current="DRAFT" />
      </div>

      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="card">
        <div className="field">
          <label htmlFor="merchant">Company</label>
          <input
            id="merchant"
            required
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="e.g. Acme Streaming"
          />
        </div>
        <div className="field">
          <label htmlFor="account">Last digits of your account</label>
          <input
            id="account"
            required
            maxLength={6}
            value={accountIdentifierLast4}
            onChange={(e) => setAccountIdentifierLast4(e.target.value)}
            placeholder="4242"
          />
          <div className="hint">Never your full account number — just enough to identify the case to you.</div>
        </div>
        <div className="field">
          <label htmlFor="details">What's the subscription?</label>
          <textarea
            id="details"
            required
            rows={3}
            value={subscriptionDetails}
            onChange={(e) => setSubscriptionDetails(e.target.value)}
            placeholder="Premium plan, $19.99/month, billed on the 3rd."
          />
        </div>
        <div className="field">
          <label htmlFor="outcome">What do you want to happen?</label>
          <textarea
            id="outcome"
            required
            rows={3}
            value={desiredOutcome}
            onChange={(e) => setDesiredOutcome(e.target.value)}
            placeholder="Cancel it and refund this month's $19.99 charge — I never used it."
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Investigate this bill
        </button>
      </form>
    </main>
  );
}
