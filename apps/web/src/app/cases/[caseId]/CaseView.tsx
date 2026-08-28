"use client";

import { useState } from "react";
import type { CaseSummary } from "@clawback/agent";
import type { VerificationReport } from "@clawback/receipts";
import { ReceiptCard } from "./ReceiptCard";
import { LifecycleStepper } from "@/components/LifecycleStepper";

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
        <div style={{ marginBottom: "1.75rem" }}>
          <LifecycleStepper current={executing ? "EXECUTING" : caseData.state} />
        </div>
      )}

      {executing && (
        <>
          <h1>Executing your approved request.</h1>
          <div className="card" role="status" aria-live="polite">
            {EXECUTING_STEPS.map((step, i) => (
              <div key={step} className="progress-line" style={{ opacity: i <= executingStep ? 1 : 0.35 }}>
                <span className="dot" />
                {step}
              </div>
            ))}
          </div>
        </>
      )}

      {!executing && caseData.state === "AWAITING_APPROVAL" && caseData.proposal && (
        <>
          <h1>Review before anything is sent.</h1>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <div className="card">
            <h2>What Clawback wants to send</h2>
            <p style={{ whiteSpace: "pre-wrap", color: "var(--ink)" }}>{caseData.proposal.exactMessage}</p>
            <hr className="divider" />
            <h2>Why</h2>
            <p>{caseData.proposal.summary}</p>
            {caseData.proposal.estimatedRecoveryCents !== null && (
              <>
                <hr className="divider" />
                <h2>Potential recovery</h2>
                <p style={{ color: "var(--ink)", fontWeight: 600 }}>
                  ${(caseData.proposal.estimatedRecoveryCents / 100).toFixed(2)}
                </p>
              </>
            )}
          </div>
          <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink)" }}>
            You are approving this exact message. Nothing is sent until you approve — and
            approval does not guarantee the merchant honors the request.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-primary" onClick={approve}>
              Approve &amp; Send
            </button>
            <button className="btn btn-secondary" onClick={reject}>
              Don't send this
            </button>
          </div>
        </>
      )}

      {!executing && caseData.state === "REJECTED" && (
        <>
          <h1>Case closed.</h1>
          <p>You chose not to send this request. No action was taken and nothing was recorded as an outcome.</p>
        </>
      )}

      {!executing && (caseData.state === "EXECUTION_FAILED" || caseData.state === "OUTCOME_UNVERIFIED") && (
        <>
          <h1>No response yet.</h1>
          <p>
            {caseData.outcome?.outcomeType === "no_response"
              ? "The counterparty didn't respond within this case's window. No fee was charged — Clawback only charges against verified savings."
              : "The request didn't complete successfully."}
          </p>
          <span className="pill pill-gold">{caseData.state}</span>
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
            <h1>Working on it.</h1>
            <span className="pill pill-gold">{caseData.state}</span>
          </>
        )}
    </>
  );
}
