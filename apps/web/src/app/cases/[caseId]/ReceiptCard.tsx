"use client";

import type { CaseSummary } from "@clawback/agent";
import type { VerificationReport } from "@clawback/receipts";

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ReceiptCard({
  summary,
  report,
  loadingReport,
  onLoadReport,
}: {
  summary: CaseSummary;
  report: VerificationReport | null;
  loadingReport: boolean;
  onLoadReport: () => void;
}) {
  const receipt = summary.receipt!;
  const isSuccessful = receipt.status === "successful";

  return (
    <>
      {receipt.environment === "sandbox" && (
        <div className="env-banner">
          Sandbox run — this outcome came from Clawback's deterministic test simulator, not a
          real merchant. See LIMITATIONS.md.
        </div>
      )}

      <h1>{isSuccessful ? "Outcome verified." : "Request completed — not in your favor."}</h1>
      <div className={`hero-number ${isSuccessful ? "" : "unsuccessful"}`}>
        {receipt.claimedSavingsCents > 0 ? centsToDollars(receipt.claimedSavingsCents) : receipt.outcome}
      </div>
      <p>{receipt.outcome}</p>

      <div className="card">
        <h2>Receipt</h2>
        <div className="kv-row">
          <span className="k">Case</span>
          <span className="mono">{receipt.receiptId}</span>
        </div>
        <div className="kv-row">
          <span className="k">Action taken</span>
          <span>{receipt.actionTaken}</span>
        </div>
        <div className="kv-row">
          <span className="k">Claimed savings</span>
          <span>{centsToDollars(receipt.claimedSavingsCents)}</span>
        </div>
        <div className="kv-row">
          <span className="k">Verified savings</span>
          <span>
            {receipt.verifiedSavingsCents !== null
              ? centsToDollars(receipt.verifiedSavingsCents)
              : "Not independently verified"}
          </span>
        </div>
        <div className="kv-row">
          <span className="k">Execution</span>
          <span>
            {receipt.execution.teeAttested ? (
              <span className="pill pill-signal">TEE-attested</span>
            ) : (
              <span className="pill pill-ember">Not attested</span>
            )}
          </span>
        </div>
        {receipt.execution.model && (
          <div className="kv-row">
            <span className="k">Model</span>
            <span className="mono">{receipt.execution.model}</span>
          </div>
        )}
        <div className="kv-row">
          <span className="k">Storage anchor</span>
          <span className="mono">{receipt.anchor.storageRootHash ?? "not configured"}</span>
        </div>
        <div className="kv-row">
          <span className="k">Chain anchor</span>
          <span className="mono">{receipt.anchor.chainTxHash ?? "not configured"}</span>
        </div>
      </div>

      <details className="evidence" onToggle={(e) => e.currentTarget.open && !report && onLoadReport()}>
        <summary>How was this verified?</summary>
        <div style={{ marginTop: "0.75rem" }}>
          {loadingReport && <p>Recomputing every commitment independently…</p>}
          {report &&
            report.checks.map((check) => (
              <div key={check.question} style={{ marginBottom: "0.9rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <strong style={{ fontSize: "0.88rem" }}>{check.question}</strong>
                  <span
                    className={
                      check.result === true
                        ? "pill pill-signal"
                        : check.result === false
                          ? "pill pill-ember"
                          : "pill pill-gold"
                    }
                  >
                    {check.result === true ? "yes" : check.result === false ? "no" : "n/a"}
                  </span>
                </div>
                <p style={{ fontSize: "0.83rem", margin: "0.25rem 0 0" }}>{check.detail}</p>
              </div>
            ))}
        </div>
      </details>
    </>
  );
}
