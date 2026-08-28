import Link from "next/link";
import { CommitmentRail } from "@/components/CommitmentRail";
import { InfrastructureCard, InfraRow } from "@/components/InfrastructureCard";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { ProofSection } from "@/components/ProofSection";
import { Reveal } from "@/components/Reveal";

const RAIL_NODES = [
  { label: "Case" },
  { label: "Action" },
  { label: "Execution" },
  { label: "Outcome" },
  { label: "Receipt" },
];

export default function HomePage() {
  return (
    <main>
      <section className="bg-technical-grid bg-radial-signal relative overflow-hidden border-b border-rule">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <p className="mb-4 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-signal">
              Private billing advocate
            </p>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.08] text-ink sm:text-5xl">
              A private AI advocate for billing disputes, with a verifiable evidence trail.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              Clawback fights subscription and billing disputes on your behalf — and instead of
              asking you to trust its word for what happened, it gives you a receipt whose claims
              anyone can independently recompute.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cases/new"
                className="inline-flex items-center rounded-md bg-signal px-5 py-3 text-sm font-semibold text-white shadow-card transition-opacity hover:opacity-90"
              >
                Start a case
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center rounded-md border border-rule-strong bg-paper-raised px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink-faint"
              >
                See how verification works
              </Link>
            </div>
          </Reveal>

          <Reveal delayMs={120}>
            <div className="mt-16 max-w-3xl">
              <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Every case produces this chain
              </p>
              <CommitmentRail nodes={RAIL_NODES} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
        <Reveal>
          <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">The problem</p>
          <h2 className="mb-4 max-w-xl text-2xl font-bold text-ink">
            Bill-negotiation services ask you to trust them twice
          </h2>
          <p className="max-w-2xl leading-relaxed text-ink-soft">
            Once with your financial credentials, and again with their word for what they actually
            recovered. DoNotPay was fined <strong className="text-ink">$193,000 by the FTC in
            February 2025</strong> for claiming its "AI lawyer" had been tested to a standard it
            never met — the exact failure mode this project exists to make structurally harder to
            repeat.
          </p>
        </Reveal>
      </section>

      <section className="border-y border-rule bg-paper-sunken/50">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
          <Reveal>
            <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
              What actually happens
            </p>
            <h2 className="mb-3 text-2xl font-bold text-ink">Seven steps, one approval boundary</h2>
            <p className="mb-8 max-w-2xl leading-relaxed text-ink-soft">
              Clawback does not send anything on your behalf until you explicitly approve the exact
              message it plans to send. This is the same lifecycle every real case runs through —
              not a simplified marketing version of it.
            </p>
          </Reveal>
          <Reveal delayMs={100}>
            <LifecycleStepper />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
        <Reveal>
          <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
            0G infrastructure
          </p>
          <h2 className="mb-3 text-2xl font-bold text-ink">What 0G actually contributes</h2>
          <p className="mb-8 max-w-2xl leading-relaxed text-ink-soft">
            Each card below reflects this deployment's real, current configuration — not a claim
            made once and left stale. If 0G credentials aren't set, it says so.
          </p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-3">
          <Reveal delayMs={0}>
            <InfrastructureCard component="compute" title="0G Compute">
              <InfraRow label="What it's for">
                Attested inference — your case is analyzed inside a TEE-verifiable path.
              </InfraRow>
              <InfraRow label="What's checked">
                <code className="font-technical text-[0.78rem]">processResponse()</code> returning
                a signed result.
              </InfraRow>
              <InfraRow label="What it doesn't prove">
                That no human intervened elsewhere in the broader pipeline.
              </InfraRow>
            </InfrastructureCard>
          </Reveal>
          <Reveal delayMs={80}>
            <InfrastructureCard component="storage" title="0G Storage">
              <InfraRow label="What it's for">
                Durable storage of the receipt artifact, addressed by its content hash.
              </InfraRow>
              <InfraRow label="What's checked">
                A root hash returned at upload, and a byte-identical download on retrieval.
              </InfraRow>
              <InfraRow label="What it doesn't prove">
                Anything about the underlying case outcome — only that the bytes are intact.
              </InfraRow>
            </InfrastructureCard>
          </Reveal>
          <Reveal delayMs={160}>
            <InfrastructureCard component="chain" title="0G Chain">
              <InfraRow label="What it's for">
                Anchoring the receipt commitment so it can't be quietly rewritten later.
              </InfraRow>
              <InfraRow label="What's checked">
                <code className="font-technical text-[0.78rem]">CaseAnchor.verify()</code> —
                callable by anyone, with no Clawback credentials.
              </InfraRow>
              <InfraRow label="What it doesn't prove">
                That a real merchant honored the request — only that the record wasn't altered.
              </InfraRow>
            </InfrastructureCard>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-rule bg-paper-sunken/50">
        <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
          <Reveal>
            <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
              What this is, and isn't
            </p>
            <h2 className="mb-3 text-2xl font-bold text-ink">Proven vs. not proven</h2>
            <p className="mb-8 max-w-2xl leading-relaxed text-ink-soft">
              Read <Link href="/how-it-works" className="text-signal underline underline-offset-2">
                how privacy verification works
              </Link>{" "}
              for the full breakdown, or{" "}
              <Link href="/cases/new" className="text-signal underline underline-offset-2">
                start a case
              </Link>{" "}
              to see it against a real receipt.
            </p>
          </Reveal>
          <Reveal delayMs={100}>
            <ProofSection
              proven={[
                { proven: true, text: "Receipt commitments are internally consistent and independently recomputable." },
                { proven: true, text: "A configured Compute response passed 0G's own verification mechanism." },
                { proven: true, text: "Unauthorized access to another owner's case is rejected." },
              ]}
              notProven={[
                { proven: false, text: "A real merchant cancellation or a real refund." },
                { proven: false, text: "That no human intervened anywhere in the broader pipeline." },
                { proven: false, text: "That TEE attestation is unique to 0G — several major clouds offer it too." },
              ]}
            />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
        <Reveal>
          <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">Business model</p>
          <h2 className="mb-3 text-2xl font-bold text-ink">You only pay when it works</h2>
          <p className="max-w-2xl leading-relaxed text-ink-soft">
            Clawback charges a percentage of independently verified savings — never a flat fee,
            and never a charge against a case that recovered nothing.
          </p>
        </Reveal>
      </section>
    </main>
  );
}
