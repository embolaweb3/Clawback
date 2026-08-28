import { LifecycleStepper } from "@/components/LifecycleStepper";
import { PremiumStatusBadge } from "@/components/IntegrationStatus";
import { ProofSection } from "@/components/ProofSection";

const STEP_NOTES = [
  { label: "Case", detail: "You describe the bill and what you want to happen." },
  { label: "Private analysis", detail: "Sent to an attested execution path — not stored in the clear while analyzed." },
  { label: "Proposed action", detail: "Clawback drafts the exact message it plans to send." },
  { label: "Your approval", detail: "Nothing sends until you approve this exact wording." },
  { label: "Execution", detail: "The approved request goes out — sandboxed in this deployment." },
  { label: "Outcome", detail: "What the counterparty (or sandbox) reports back." },
  { label: "Verifiable receipt", detail: "A chain of commitments anyone can independently recompute." },
];

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
      <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-signal">Verification model</p>
      <h1 className="mb-3 text-3xl font-extrabold text-ink sm:text-4xl">How privacy verification works</h1>
      <p className="mb-8 max-w-xl text-lg leading-relaxed text-ink-soft">
        Plainly, and without overselling any of it.
      </p>

      <div className="mb-12 flex flex-wrap items-center gap-4 rounded-xl border border-rule bg-paper-raised p-5">
        <span className="text-sm font-semibold text-ink">This deployment right now:</span>
        <span className="flex items-center gap-2 text-sm text-ink-soft">
          Compute <PremiumStatusBadge component="compute" />
        </span>
        <span className="flex items-center gap-2 text-sm text-ink-soft">
          Storage <PremiumStatusBadge component="storage" />
        </span>
        <span className="flex items-center gap-2 text-sm text-ink-soft">
          Chain <PremiumStatusBadge component="chain" />
        </span>
      </div>

      <section className="mb-16">
        <h2 className="mb-5 text-xl font-bold text-ink">The lifecycle every case runs through</h2>
        <LifecycleStepper />
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {STEP_NOTES.map((step, i) => (
            <div key={step.label} className="flex gap-3">
              <dt className="shrink-0 font-mono text-xs font-semibold text-ink-faint">{String(i + 1).padStart(2, "0")}</dt>
              <dd>
                <span className="block text-sm font-semibold text-ink">{step.label}</span>
                <span className="text-sm text-ink-soft">{step.detail}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-16 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-rule bg-paper-raised p-6">
          <h2 className="mb-2 text-base font-bold text-ink">What we can prove</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            When your case runs through an attested execution path, we get back a signed
            confirmation of which model handled it and that its response wasn't tampered with.
            Anyone can independently recompute the commitments on your receipt and confirm they
            match — that check doesn't require trusting Clawback's word for it.
          </p>
        </div>
        <div className="rounded-xl border border-rule bg-paper-raised p-6">
          <h2 className="mb-2 text-base font-bold text-ink">What we can't prove</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            No system today — ours included — can cryptographically rule out a human quietly
            doing the work behind the scenes instead of the AI. We tell you plainly, on every
            receipt, when a claim is a trusted claim rather than a proof.
          </p>
        </div>
        <div className="rounded-xl border border-rule bg-paper-raised p-6">
          <h2 className="mb-2 text-base font-bold text-ink">What "attested" actually means here</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            It doesn't mean unbreakable, and it isn't unique to any one company's hardware —
            several major cloud providers offer similar guarantees. What matters is that the
            settlement and the record live on a neutral network, not inside the same company
            that's asking you to trust it.
          </p>
        </div>
        <div className="rounded-xl border border-rule bg-paper-raised p-6">
          <h2 className="mb-2 text-base font-bold text-ink">Every receipt shows its work</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Open "How was this verified?" on any receipt to see exactly which claims are
            cryptographically checkable, which are trusted claims from a counterparty, and which
            this system is honest enough to say it simply can't prove.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-5 text-xl font-bold text-ink">In short</h2>
        <ProofSection
          proven={[
            { proven: true, text: "A recomputed commitment either matches the receipt, or it doesn't — no middle ground." },
            { proven: true, text: "A TEE-attested response either passed the SDK's own verification, or it's labeled not attested." },
          ]}
          notProven={[
            { proven: false, text: "That no human operator secretly performed the work — no system today can rule that out." },
            { proven: false, text: "That TEE attestation is unique to 0G — AWS, Azure, and GCP all offer comparable primitives." },
          ]}
        />
      </section>
    </main>
  );
}
