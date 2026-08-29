"use client";

import { useState } from "react";
import type { CaseSummary } from "@clawback/agent";
import type { VerificationReport } from "@clawback/receipts";
import { ReceiptCard } from "./ReceiptCard";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { EnvironmentBanner } from "@/components/EnvironmentBanner";

const EXECUTING_STEPS = ["Sending your request...", "Awaiting a response...", "Confirming the outcome..."];

export function CaseView({ initialCase }: { initialCase: CaseSummary }) {
  const [caseData, setCaseData] = useState(initialCase);
  const [executing, setExecuting] = useState(false);
  const [executingStep, setExecutingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  async function approve() {
    if (!caseData.proposal) return;
    setError(null);
    setExecuting(true);
    const timer = setInterval(() => setExecutingStep((i) => Math.min(i + 1, EXECUTING_STEPS.length - 1)), 700);

    try {
      const response = await fetch(`/api/cases/${caseData.caseId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: caseData.proposal.proposalId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setCaseData(data.case);
    } catch {
      setError("Couldn't reach Clawback. Try again.");
    } finally {
      clearInterval(timer);
      setExecuting(false);
    }
  }

  async function reject() {
    setError(null);
    const response = await fetch(`/api/cases/${caseData.caseId}/reject`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setCaseData(data.case);
  }

  async function loadVerification() {
    setLoadingReport(true);
    try {
      const response = await fetch(`/api/cases/${caseData.caseId}/verify`);
      const data = await response.json();
      if (response.ok) setReport(data.report);
    } finally {
      setLoadingReport(false);
    }
  }

  const isReceiptView = caseData.state === "VERIFIED_SUCCESS" && caseData.receipt;

  return (
    <>
      {!isReceiptView && (
        <>
          <div className="mb-4">
            <EnvironmentBanner environment={caseData.environment} />
          </div>
          <div className="mb-7">
            <LifecycleStepper current={executing ? "EXECUTING" : caseData.state} />
          </div>
        </>
      )}

      {executing && (
        <>
          <h1 className="mb-3 text-2xl font-extrabold text-ink">Executing your approved request.</h1>
          <div className="rounded-xl border border-rule bg-paper-raised p-6" role="status" aria-live="polite">
            {EXECUTING_STEPS.map((step, i) => (
              <div
                key={step}
                className="flex items-center gap-3 py-1.5 text-sm text-ink-soft transition-opacity"
                style={{ opacity: i <= executingStep ? 1 : 0.35 }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal motion-safe:animate-soft-pulse" />
                {step}
              </div>
            ))}
          </div>
        </>
      )}

      {!executing && caseData.state === "AWAITING_APPROVAL" && caseData.proposal && (
        <>
          <h1 className="mb-3 text-2xl font-extrabold text-ink">Review before anything is sent.</h1>
          {error && (
            <div role="alert" className="mb-5 rounded-md border border-ember/30 bg-ember-soft px-4 py-3 text-sm font-medium text-ember">
              {error}
            </div>
          )}
          <div className="mb-5 rounded-xl border border-rule bg-paper-raised p-6 shadow-card">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-faint">What Clawback wants to send</h2>
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink">{caseData.proposal.exactMessage}</p>
            <hr className="my-4 border-rule" />
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-faint">Why</h2>
            <p className="text-sm text-ink-soft">{caseData.proposal.summary}</p>
            {caseData.proposal.estimatedRecoveryCents !== null && (
              <>
                <hr className="my-4 border-rule" />
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-faint">Potential recovery</h2>
                <p className="text-lg font-bold text-ink">
                  ${(caseData.proposal.estimatedRecoveryCents / 100).toFixed(2)}
                </p>
              </>
            )}
          </div>
          <p className="mb-4 text-sm font-semibold text-ink">
            You are approving this exact message. Nothing is sent until you approve — and
            approval does not guarantee the merchant honors the request.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={approve}
              className="rounded-md bg-signal px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Approve &amp; Send
            </button>
            <button
              onClick={reject}
              className="rounded-md border border-rule-strong bg-paper-raised px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-faint"
            >
              Don't send this
            </button>
          </div>
        </>
      )}

      {!executing && caseData.state === "REJECTED" && (
        <>
          <h1 className="mb-3 text-2xl font-extrabold text-ink">Case closed.</h1>
          <p className="text-ink-soft">
            You chose not to send this request. No action was taken and nothing was recorded as an outcome.
          </p>
        </>
      )}

      {!executing && (caseData.state === "EXECUTION_FAILED" || caseData.state === "OUTCOME_UNVERIFIED") && (
        <>
          <h1 className="mb-3 text-2xl font-extrabold text-ink">No response yet.</h1>
          <p className="mb-4 text-ink-soft">
            {caseData.outcome?.outcomeType === "no_response"
              ? "The counterparty didn't respond within this case's window. No fee was charged — Clawback never charges against an unconfirmed outcome."
              : "The request didn't complete successfully."}
          </p>
          <span className="inline-flex rounded-full bg-gold-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-gold">
            {caseData.state}
          </span>
        </>
      )}

      {!executing && isReceiptView && caseData.receipt && (
        <ReceiptCard
          summary={caseData}
          report={report}
          loadingReport={loadingReport}
          onLoadReport={loadVerification}
        />
      )}

      {!executing &&
        !isReceiptView &&
        !["AWAITING_APPROVAL", "REJECTED", "EXECUTION_FAILED", "OUTCOME_UNVERIFIED"].includes(caseData.state) && (
          <>
            <h1 className="mb-3 text-2xl font-extrabold text-ink">Working on it.</h1>
            <span className="inline-flex rounded-full bg-gold-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-gold">
              {caseData.state}
            </span>
          </>
        )}
    </>
  );
}
