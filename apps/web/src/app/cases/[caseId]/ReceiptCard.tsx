"use client";

import type { ReactNode } from "react";
import type { CaseSummary } from "@clawback/agent";
import type { VerificationReport } from "@clawback/receipts";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { useIntegrationStatus } from "@/components/IntegrationStatus";
import { CopyableValue } from "@/components/CopyableValue";
import { CommitmentRail } from "@/components/CommitmentRail";
import { VerificationCheckRow } from "@/components/VerificationCheck";
import { ProofSection } from "@/components/ProofSection";

function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

type Receipt = NonNullable<CaseSummary["receipt"]>;

function EvidencePill({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide ${
        ok ? "bg-signal-soft text-signal" : "bg-paper-sunken text-ink-faint"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-signal" : "bg-ink-faint"}`} aria-hidden="true" />
      {ok ? yes : no}
    </span>
  );
}

function EvidenceCard({
  title,
  status,
  rows,
}: {
  title: string;
  status: ReactNode;
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="rounded-xl border border-rule bg-paper-raised p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold text-ink">{title}</h3>
        {status}
      </div>
      <dl className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-faint">{row.label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
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
  const receipt = summary.receipt as Receipt;
  const isSuccessful = receipt.status === "successful";
  const status = useIntegrationStatus();
  const chainExplorer = status?.chain.explorerBase ?? null;

  const cryptoChecks = report?.checks.filter((c) => c.strength === "cryptographically_verifiable") ?? [];
  const otherChecks = report?.checks.filter((c) => c.strength !== "cryptographically_verifiable") ?? [];

  const railNodes = [
    { label: "Case", hash: receipt.commitments.caseCommitment },
    { label: "Action", hash: receipt.commitments.actionCommitment },
    { label: "Execution", hash: receipt.commitments.executionCommitment },
    { label: "Outcome", hash: receipt.commitments.outcomeCommitment },
    {
      label: "Receipt",
      hash: receipt.commitments.receiptCommitment,
      href: receipt.anchor.chainTxHash && chainExplorer ? `${chainExplorer}/tx/${receipt.anchor.chainTxHash}` : null,
    },
  ];

  return (
    <div className="space-y-8">
      {receipt.environment === "sandbox" && (
        <div className="rounded-lg border border-gold/30 bg-gold-soft px-4 py-3 text-sm font-semibold text-gold">
          SANDBOX — this outcome came from Clawback's deterministic test simulator, not a real
          merchant. No real merchant was contacted. No real refund occurred. See LIMITATIONS.md.
        </div>
      )}

      <div>
        <p className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-signal">
          {isSuccessful ? "Verified receipt" : "Verified outcome"}
        </p>
        <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">
          {isSuccessful ? "Receipt verified." : "Request completed — not in your favor."}
        </h1>
        <div className={`mt-2 text-4xl font-extrabold tracking-tight ${isSuccessful ? "text-signal" : "text-ember"}`}>
          {receipt.claimedSavingsCents > 0 ? centsToDollars(receipt.claimedSavingsCents) : receipt.outcome}
        </div>
        <p className="mt-2 text-ink-soft">{receipt.outcome}</p>
        <p className="mt-2 max-w-2xl text-sm text-ink-faint">
          "Verified" describes the receipt's cryptographic chain, not an independent confirmation
          that money moved — see "How was this verified?" below for exactly what that does and
          doesn't cover.
        </p>
      </div>

      <LifecycleStepper current="VERIFIED_SUCCESS" />

      <section>
        <h2 className="mb-1 text-lg font-bold text-ink">Commitment chain</h2>
        <p className="mb-4 max-w-2xl text-sm text-ink-soft">
          Each stage's commitment is a hash of the previous commitment plus that stage's own
          evidence — any single substitution anywhere in the chain breaks every commitment
          computed after it. Anyone can recompute these independently.
        </p>
        <CommitmentRail nodes={railNodes} />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-ink">0G evidence for this case</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <EvidenceCard
            title="0G Compute"
            status={
              <EvidencePill ok={receipt.execution.teeAttested} yes="Attested" no="Not attested" />
            }
            rows={[
              ...(receipt.execution.model
                ? [{ label: "Model", value: <span className="font-mono text-[0.82rem]">{receipt.execution.model}</span> }]
                : []),
              ...(receipt.execution.providerAddress
                ? [
                    {
                      label: "Provider",
                      value: <CopyableValue value={receipt.execution.providerAddress} label="provider address" />,
                    },
                  ]
                : [{ label: "Provider", value: "Not configured for this run" }]),
            ]}
          />
          <EvidenceCard
            title="0G Storage"
            status={<EvidencePill ok={Boolean(receipt.anchor.storageRootHash)} yes="Uploaded" no="Not configured" />}
            rows={[
              {
                label: "Root hash",
                value: receipt.anchor.storageRootHash ? (
                  <CopyableValue value={receipt.anchor.storageRootHash} label="storage root hash" />
                ) : (
                  "Not configured for this run"
                ),
              },
            ]}
          />
          <EvidenceCard
            title="0G Chain"
            status={<EvidencePill ok={Boolean(receipt.anchor.chainTxHash)} yes="Anchored" no="Not configured" />}
            rows={[
              ...(receipt.anchor.chainTxHash
                ? [
                    {
                      label: "Network",
                      value:
                        status?.chain.network === "mainnet"
                          ? `0G mainnet (chain ${status.chain.chainId})`
                          : status?.chain.network === "testnet"
                            ? `0G testnet (chain ${status.chain.chainId})`
                            : "0G",
                    },
                    {
                      label: "Transaction",
                      value: (
                        <CopyableValue
                          value={receipt.anchor.chainTxHash}
                          href={chainExplorer ? `${chainExplorer}/tx/${receipt.anchor.chainTxHash}` : null}
                          label="chain transaction hash"
                        />
                      ),
                    },
                  ]
                : [{ label: "Anchor", value: "Not configured for this run" }]),
            ]}
          />
        </div>
      </section>

      <section className="rounded-xl border border-rule bg-paper-raised">
        <div className="border-b border-rule p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-faint">Receipt</h2>
        </div>
        <dl className="divide-y divide-rule px-6">
          <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4 text-sm">
            <dt className="text-ink-faint">Receipt ID</dt>
            <dd className="min-w-0">
              <CopyableValue value={receipt.receiptId} label="receipt ID" />
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4 text-sm">
            <dt className="text-ink-faint">Action taken</dt>
            <dd className="text-ink">{receipt.actionTaken}</dd>
          </div>
          <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4 text-sm">
            <dt className="text-ink-faint">Claimed savings</dt>
            <dd className="text-ink">{centsToDollars(receipt.claimedSavingsCents)}</dd>
          </div>
          <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4 text-sm">
            <dt className="text-ink-faint">Verified savings</dt>
            <dd className="text-ink">
              {receipt.verifiedSavingsCents !== null ? centsToDollars(receipt.verifiedSavingsCents) : "Not independently verified"}
            </dd>
          </div>
        </dl>
      </section>

      <details
        className="group rounded-xl border border-rule bg-paper-raised p-6"
        onToggle={(e) => e.currentTarget.open && !report && onLoadReport()}
      >
        <summary className="cursor-pointer text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
          How was this verified?
        </summary>
        <div className="mt-4">
          {loadingReport && <p className="text-sm text-ink-soft">Recomputing every commitment independently…</p>}
          {report && (
            <>
              <p className="mb-2 text-sm text-ink-soft">
                Every cryptographic check below is recomputed fresh from the raw case data — this
                page never simply repeats a stored opinion.
              </p>
              <div>
                {cryptoChecks.map((check) => (
                  <VerificationCheckRow key={check.question} check={check} />
                ))}
              </div>
              {otherChecks.length > 0 && (
                <>
                  <h3 className="mb-1 mt-6 text-sm font-bold text-ink">
                    Not cryptographic — disclosed honestly rather than upgraded
                  </h3>
                  <div>
                    {otherChecks.map((check) => (
                      <VerificationCheckRow key={check.question} check={check} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </details>

      <section className="rounded-xl border border-rule bg-paper-sunken/60 p-6">
        <h2 className="mb-2 text-base font-bold text-ink">What tampering looks like</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          This isn't a staged demo — it's the same mechanism the checks above just ran. If the
          committed case, approved action, execution artifact, outcome, or the receipt's own{" "}
          <code className="font-mono text-[0.82rem]">status</code> field were altered anywhere
          after the fact, the corresponding commitment recomputation above would stop matching,
          and <code className="font-mono text-[0.82rem]">allCryptographicChecksPassed</code> would
          flip to <code className="font-mono text-[0.82rem]">false</code> — the exact property
          this codebase's test suite asserts directly rather than only describing.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-ink">Proven vs. not proven for this receipt</h2>
        <ProofSection
          proven={[
            { proven: true, text: "Every commitment above is internally consistent, recomputed fresh." },
            {
              proven: receipt.execution.teeAttested,
              text: receipt.execution.teeAttested
                ? "This execution passed 0G Compute's own verification mechanism."
                : "This execution was not TEE-attested (0G Compute unconfigured for this run).",
            },
            {
              proven: Boolean(receipt.anchor.chainTxHash),
              text: receipt.anchor.chainTxHash
                ? "This receipt's commitment is anchored on 0G Chain."
                : "This receipt was not anchored on-chain (0G Chain unconfigured for this run).",
            },
          ]}
          notProven={[
            {
              proven: false,
              text:
                receipt.environment === "sandbox"
                  ? "No real merchant was contacted and no real refund occurred."
                  : "That the counterparty's confirmation matches a real bank or card statement line.",
            },
            { proven: false, text: "That no human intervened anywhere in the broader pipeline." },
          ]}
        />
      </section>
    </div>
  );
}
