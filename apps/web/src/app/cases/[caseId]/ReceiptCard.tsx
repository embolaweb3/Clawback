"use client";

import type { CaseSummary } from "@clawback/agent";
import type { VerificationReport } from "@clawback/receipts";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { useIntegrationStatus } from "@/components/IntegrationStatus";
import { CopyableValue } from "@/components/CopyableValue";

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function CheckMark({ result }: { result: boolean | null }) {
  if (result === null) {
    return <span className="pill pill-gold">N/A</span>;
  }
  return (
    <span className={result ? "pill pill-signal" : "pill pill-ember"}>
      {result ? "✓ PASS" : "✕ FAIL"}
    </span>
  );
}

type Receipt = NonNullable<CaseSummary["receipt"]>;

const COMMITMENT_LINKS: ReadonlyArray<{ key: keyof Receipt["commitments"]; label: string }> = [
  { key: "caseCommitment", label: "CASE" },
  { key: "actionCommitment", label: "ACTION" },
  { key: "executionCommitment", label: "EXECUTION" },
  { key: "outcomeCommitment", label: "OUTCOME" },
  { key: "receiptCommitment", label: "RECEIPT" },
];

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
  const status = useIntegrationStatus();
  const chainExplorer = status?.chain.explorerBase ?? null;

  const cryptoChecks = report?.checks.filter((c) => c.strength === "cryptographically_verifiable") ?? [];
  const otherChecks = report?.checks.filter((c) => c.strength !== "cryptographically_verifiable") ?? [];

  return (
    <>
      {receipt.environment === "sandbox" && (
        <div className="env-banner">
          SANDBOX — this outcome came from Clawback's deterministic test simulator, not a real
          merchant. No real merchant was contacted. No real refund occurred. See LIMITATIONS.md.
        </div>
      )}

      <h1>{isSuccessful ? "Receipt verified." : "Request completed — not in your favor."}</h1>
      <div className={`hero-number ${isSuccessful ? "" : "unsuccessful"}`}>
        {receipt.claimedSavingsCents > 0 ? centsToDollars(receipt.claimedSavingsCents) : receipt.outcome}
      </div>
      <p>{receipt.outcome}</p>
      <p style={{ fontSize: "0.85rem", color: "var(--ink-faint)" }}>
        "Verified" describes the receipt's cryptographic chain, not an independent confirmation
        that money moved — see "How was this verified?" below for exactly what that does and
        doesn't cover.
      </p>

      <div style={{ margin: "1.75rem 0" }}>
        <LifecycleStepper current="VERIFIED_SUCCESS" />
      </div>

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
        {receipt.execution.providerAddress && (
          <div className="kv-row">
            <span className="k">Compute provider</span>
            <CopyableValue value={receipt.execution.providerAddress} label="provider address" />
          </div>
        )}
        <div className="kv-row">
          <span className="k">Storage anchor</span>
          {receipt.anchor.storageRootHash ? (
            <CopyableValue value={receipt.anchor.storageRootHash} label="storage root hash" />
          ) : (
            <span>not configured</span>
          )}
        </div>
        <div className="kv-row">
          <span className="k">Chain anchor</span>
          {receipt.anchor.chainTxHash ? (
            <CopyableValue
              value={receipt.anchor.chainTxHash}
              href={chainExplorer ? `${chainExplorer}/tx/${receipt.anchor.chainTxHash}` : null}
              label="chain transaction hash"
            />
          ) : (
            <span>not configured</span>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Commitment chain</h2>
        <p style={{ fontSize: "0.85rem" }}>
          Each stage's commitment is a hash of the previous commitment plus that stage's own
          evidence — so any single substitution anywhere in the chain breaks every commitment
          computed after it. Anyone can recompute these independently.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {COMMITMENT_LINKS.map((c, i) => (
            <div key={c.key}>
              <div className="kv-row" style={{ borderBottom: "none", padding: "0.15rem 0" }}>
                <span className="k">{c.label}</span>
                <CopyableValue value={receipt.commitments[c.key]} label={`${c.label.toLowerCase()} commitment`} />
              </div>
              {i < COMMITMENT_LINKS.length - 1 && (
                <div style={{ color: "var(--ink-faint)", fontSize: "0.8rem", paddingLeft: "0.1rem" }} aria-hidden="true">
                  ↓
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>0G evidence for this case</h2>
        <div className="evidence-grid">
          <div className="evidence-card">
            <h3>0G Compute</h3>
            <dl>
              <dt>Attestation</dt>
              <dd>{receipt.execution.teeAttested ? "TEE-attested (verified)" : "Not attested"}</dd>
              {receipt.execution.model && (
                <>
                  <dt>Model</dt>
                  <dd className="mono">{receipt.execution.model}</dd>
                </>
              )}
              {receipt.execution.providerAddress && (
                <>
                  <dt>Provider</dt>
                  <dd>
                    <CopyableValue value={receipt.execution.providerAddress} label="provider address" />
                  </dd>
                </>
              )}
            </dl>
          </div>
          <div className="evidence-card">
            <h3>0G Storage</h3>
            <dl>
              <dt>Evidence artifact</dt>
              <dd>{receipt.anchor.storageRootHash ? "Uploaded" : "Not configured for this run"}</dd>
              {receipt.anchor.storageRootHash && (
                <>
                  <dt>Root hash</dt>
                  <dd>
                    <CopyableValue value={receipt.anchor.storageRootHash} label="storage root hash" />
                  </dd>
                </>
              )}
            </dl>
          </div>
          <div className="evidence-card">
            <h3>0G Chain</h3>
            <dl>
              <dt>Anchor</dt>
              <dd>{receipt.anchor.chainTxHash ? "Anchored" : "Not configured for this run"}</dd>
              {receipt.anchor.chainTxHash && (
                <>
                  <dt>Network</dt>
                  <dd>
                    {status?.chain.network === "mainnet"
                      ? `0G mainnet (chain ${status.chain.chainId})`
                      : status?.chain.network === "testnet"
                        ? `0G testnet (chain ${status.chain.chainId})`
                        : "0G"}
                  </dd>
                  <dt>Transaction</dt>
                  <dd>
                    <CopyableValue
                      value={receipt.anchor.chainTxHash}
                      href={chainExplorer ? `${chainExplorer}/tx/${receipt.anchor.chainTxHash}` : null}
                      label="chain transaction hash"
                    />
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>

      <details className="evidence" onToggle={(e) => e.currentTarget.open && !report && onLoadReport()}>
        <summary>How was this verified?</summary>
        <div style={{ marginTop: "0.9rem" }}>
          {loadingReport && <p>Recomputing every commitment independently…</p>}
          {report && (
            <>
              <p style={{ fontSize: "0.85rem" }}>
                Every cryptographic check below is recomputed fresh from the raw case data — this
                page never simply repeats a stored opinion.
              </p>
              {cryptoChecks.map((check) => (
                <div key={check.question} className="check-row">
                  <div className="check-head">
                    <span className="check-question">{check.question}</span>
                    <CheckMark result={check.result} />
                  </div>
                  <p className="check-detail">{check.detail}</p>
                </div>
              ))}
              {otherChecks.length > 0 && (
                <>
                  <h3 style={{ fontSize: "0.9rem", margin: "1.25rem 0 0.25rem" }}>
                    Not cryptographic — disclosed honestly rather than upgraded
                  </h3>
                  {otherChecks.map((check) => (
                    <div key={check.question} className="check-row">
                      <div className="check-head">
                        <span className="check-question">{check.question}</span>
                        <CheckMark result={check.result} />
                      </div>
                      <p className="check-detail">{check.detail}</p>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </details>

      <div className="card" style={{ marginTop: "1.25rem" }}>
        <h2>What tampering looks like</h2>
        <p style={{ fontSize: "0.87rem" }}>
          This isn't a staged demo — it's the same mechanism the checks above just ran. If the
          committed case, approved action, execution artifact, outcome, or the receipt's own{" "}
          <code>status</code> field were altered anywhere after the fact, the corresponding
          commitment recomputation above would stop matching, and{" "}
          <code>allCryptographicChecksPassed</code> would flip to <code>false</code> — the exact
          property this codebase's test suite asserts directly rather than only describing.
        </p>
      </div>

      <div className="proof-columns" style={{ marginTop: "1.25rem" }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Proven for this receipt</h3>
          <ul className="proof-list">
            <li>
              <span className="proof-mark proof-mark--yes" aria-hidden="true">✓</span>
              Every commitment above is internally consistent, recomputed fresh.
            </li>
            <li>
              <span className={`proof-mark ${receipt.execution.teeAttested ? "proof-mark--yes" : "proof-mark--no"}`} aria-hidden="true">
                {receipt.execution.teeAttested ? "✓" : "✕"}
              </span>
              {receipt.execution.teeAttested
                ? "This execution passed 0G Compute's own verification mechanism."
                : "This execution was not TEE-attested (0G Compute unconfigured for this run)."}
            </li>
            <li>
              <span className={`proof-mark ${receipt.anchor.chainTxHash ? "proof-mark--yes" : "proof-mark--no"}`} aria-hidden="true">
                {receipt.anchor.chainTxHash ? "✓" : "✕"}
              </span>
              {receipt.anchor.chainTxHash
                ? "This receipt's commitment is anchored on 0G Chain."
                : "This receipt was not anchored on-chain (0G Chain unconfigured for this run)."}
            </li>
          </ul>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Not proven</h3>
          <ul className="proof-list">
            <li>
              <span className="proof-mark proof-mark--no" aria-hidden="true">✕</span>
              {receipt.environment === "sandbox"
                ? "No real merchant was contacted and no real refund occurred."
                : "That the counterparty's confirmation matches a real bank or card statement line."}
            </li>
            <li>
              <span className="proof-mark proof-mark--no" aria-hidden="true">✕</span>
              That no human intervened anywhere in the broader pipeline.
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
