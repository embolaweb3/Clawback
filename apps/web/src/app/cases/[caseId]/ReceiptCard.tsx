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
import { EnvironmentBanner } from "@/components/EnvironmentBanner";

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

/** The three-tier claim hierarchy this whole product rests on (build
 *  brief §4): what's proven, what depends on runtime config, and what
 *  isn't independently established at all — never merged into one
 *  headline word. */
function ClaimTier({
  index,
  label,
  value,
  tone,
}: {
  index: string;
  label: string;
  value: string;
  tone: "signal" | "gold" | "neutral";
}) {
  const toneClass =
    tone === "signal" ? "bg-signal-soft text-signal" : tone === "gold" ? "bg-gold-soft text-gold" : "bg-paper-sunken text-ink-faint";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule py-3 last:border-b-0">
      <span className="flex items-center gap-2.5 text-sm text-ink-soft">
        <span className="font-mono text-[0.68rem] text-ink-faint">{index}</span>
        {label}
      </span>
      <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide ${toneClass}`}>{value}</span>
    </div>
  );
}

/** Illustrates the tamper-detection mechanism as a hypothetical flow —
 *  explicitly labeled as illustrative, never dressed up as this
 *  receipt's actual data (build brief §10). */
function TamperFlow() {
  const steps = ["Original commitment", "Evidence changes", "Recomputation differs", "Chain mismatch", "Verification fails"];
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        {steps.map((step, i) => (
          <div key={step} className="flex flex-1 items-center gap-2">
            <div className="flex-1 rounded-md border border-ember/25 bg-paper-raised px-3 py-2 text-center text-[0.78rem] font-medium text-ink-soft">
              {step}
            </div>
            {i < steps.length - 1 && (
              <span className="hidden shrink-0 text-ember/50 sm:block" aria-hidden="true">
                →
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        Illustrative — this diagram does not use this receipt's real data. This receipt itself
        passed every check above; see "How was this verified?" for the actual recomputation.
      </p>
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
  const status = useIntegrationStatus();
  const chainExplorer = status?.chain.explorerBase ?? null;
  const isSandbox = receipt.environment === "sandbox";

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
      <EnvironmentBanner environment={receipt.environment} />

      <div>
        <p className="mb-1 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-signal">Receipt</p>
        <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Receipt integrity verified.</h1>
        <p className="mt-1 text-ink-soft">Cryptographic chain intact — recomputable by anyone, not just Clawback.</p>

        <div className="mt-5 rounded-xl border border-rule bg-paper-raised px-5">
          <ClaimTier index="01" label="Integrity — commitment chain" value="Verified" tone="signal" />
          <ClaimTier
            index="02"
            label="Execution — 0G Compute attestation"
            value={receipt.execution.teeAttested ? "Attested" : "Local / not attested"}
            tone={receipt.execution.teeAttested ? "signal" : "neutral"}
          />
          <ClaimTier
            index="03"
            label="Financial outcome — did money move?"
            value={isSandbox ? "Simulated" : "Reported, not corroborated"}
            tone="gold"
          />
        </div>

        <p className="mt-4 max-w-2xl text-sm text-ink-faint">
          "Verified" above describes the receipt's cryptographic chain only — see "How was this
          verified?" below for the independent recomputation. It is not an independent
          confirmation that money moved.
        </p>
      </div>

      <LifecycleStepper current="VERIFIED_SUCCESS" />

      <section className="rounded-xl border border-rule bg-paper-raised p-6">
        <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-gold">
          {isSandbox ? "Simulated outcome" : "Reported outcome"}
        </p>
        <div className="text-3xl font-extrabold tracking-tight text-ink">
          {receipt.claimedSavingsCents > 0 ? centsToDollars(receipt.claimedSavingsCents) : receipt.outcome}
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {receipt.outcome}
          {isSandbox && " — recorded by Clawback's deterministic sandbox simulator, not a real merchant."}
        </p>

        <div className="mt-4 grid gap-4 border-t border-rule pt-4 sm:grid-cols-2">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-faint">Claimed savings</p>
            <p className="mt-0.5 text-lg font-bold text-ink">{centsToDollars(receipt.claimedSavingsCents)}</p>
            <p className="mt-0.5 text-xs text-ink-faint">What the counterparty (or sandbox) said, unadjusted.</p>
          </div>
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-ink-faint">
              Independently corroborated savings
            </p>
            <p className="mt-0.5 text-lg font-bold text-ink">
              {isSandbox ? "Not available in sandbox" : receipt.verifiedSavingsCents !== null ? centsToDollars(receipt.verifiedSavingsCents) : "Not corroborated"}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {isSandbox
                ? "Sandbox confirmations always clear this system's bar — see LIMITATIONS.md §5."
                : "A non-null counterparty confirmation, not a matched bank/card statement line."}
            </p>
          </div>
        </div>
      </section>

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
        <h2 className="mb-1 text-lg font-bold text-ink">0G evidence for this case</h2>
        <p className="mb-4 max-w-2xl text-sm text-ink-soft">
          Attested execution and an anchored commitment are different claims from a real merchant
          accepting the request — the cards below speak only to the former.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <EvidenceCard
            title="0G Compute"
            status={<EvidencePill ok={receipt.execution.teeAttested} yes="Attested" no="Not attested" />}
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
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-faint">Receipt identity</h2>
        </div>
        <dl className="divide-y divide-rule px-6">
          <div className="grid grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
            <dt className="text-ink-faint">Receipt ID</dt>
            <dd className="min-w-0">
              <CopyableValue value={receipt.receiptId} label="receipt ID" />
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
            <dt className="text-ink-faint">Case reference</dt>
            <dd className="min-w-0">
              <CopyableValue value={receipt.caseId} label="case ID" />
            </dd>
          </div>
          <div className="grid grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
            <dt className="text-ink-faint">Created</dt>
            <dd className="text-ink">{new Date(receipt.createdAt).toLocaleString()}</dd>
          </div>
          <div className="grid grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-4">
            <dt className="text-ink-faint">Action taken</dt>
            <dd className="text-ink">{receipt.actionTaken}</dd>
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
                {cryptoChecks.map((check, i) => (
                  <VerificationCheckRow key={check.question} check={check} index={i} />
                ))}
              </div>
              {otherChecks.length > 0 && (
                <>
                  <h3 className="mb-1 mt-6 text-sm font-bold text-ink">
                    Not cryptographic — disclosed honestly rather than upgraded
                  </h3>
                  <div>
                    {otherChecks.map((check, i) => (
                      <VerificationCheckRow key={check.question} check={check} index={cryptoChecks.length + i} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </details>

      <section className="rounded-xl border border-rule bg-paper-sunken/60 p-6">
        <h2 className="mb-3 text-base font-bold text-ink">What tampering looks like</h2>
        <TamperFlow />
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold text-ink">The trust boundary</h2>
        <p className="mb-4 max-w-2xl text-sm text-ink-soft">
          Everything on the left, a third party can check themselves. Everything on the right,
          this system explicitly does not establish — stated plainly, not softened.
        </p>
        <ProofSection
          proven={[
            { proven: true, text: "The commitment chain is internally consistent and independently recomputable." },
            { proven: true, text: "Unauthorized access to another owner's case is rejected." },
            {
              proven: receipt.execution.teeAttested,
              text: receipt.execution.teeAttested
                ? "0G Compute attestation passed for this execution."
                : "0G Compute was unconfigured for this run — not attested, not claimed to be.",
            },
            {
              proven: Boolean(receipt.anchor.chainTxHash),
              text: receipt.anchor.chainTxHash
                ? "This receipt's commitment is anchored on 0G Chain."
                : "This receipt was not anchored on-chain (0G Chain unconfigured for this run).",
            },
          ]}
          notProven={[
            { proven: false, text: "A real merchant was contacted." },
            { proven: false, text: "A real refund occurred, or money moved through a bank/card network." },
            { proven: false, text: "No human intervention occurred outside the recorded pipeline." },
          ]}
        />
      </section>
    </div>
  );
}
