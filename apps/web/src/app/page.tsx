import Link from "next/link";
import { LifecycleStepper } from "@/components/LifecycleStepper";
import { IntegrationBadge } from "@/components/IntegrationStatus";

export default function HomePage() {
  return (
    <main className="shell-wide">
      <section className="hero">
        <p className="section-eyebrow">Private billing advocate</p>
        <h1>A private AI advocate for billing disputes, with a verifiable evidence trail.</h1>
        <p className="lede" style={{ maxWidth: "56ch" }}>
          Clawback fights subscription and billing disputes on your behalf — and instead of
          asking you to trust its word for what happened, it gives you a receipt whose claims
          anyone can independently recompute.
        </p>
        <div className="hero-actions">
          <Link href="/cases/new" className="btn btn-primary">
            Start a case
          </Link>
          <Link href="/how-it-works" className="btn btn-secondary">
            See how verification works
          </Link>
        </div>
      </section>

      <section className="section">
        <p className="section-eyebrow">The problem</p>
        <h2>Bill-negotiation services ask you to trust them twice</h2>
        <p className="section-lede">
          Once with your financial credentials, and again with their word for what they actually
          recovered. DoNotPay was fined <strong>$193,000 by the FTC in February 2025</strong> for
          claiming its "AI lawyer" had been tested to a standard it never met — the exact failure
          mode this project exists to make structurally harder to repeat.
        </p>
      </section>

      <section className="section">
        <p className="section-eyebrow">What actually happens</p>
        <h2>Seven steps, one approval boundary</h2>
        <p className="section-lede">
          Clawback does not send anything on your behalf until you explicitly approve the exact
          message it plans to send. This is the same lifecycle every real case runs through —
          not a simplified marketing version of it.
        </p>
        <LifecycleStepper />
      </section>

      <section className="section">
        <p className="section-eyebrow">0G infrastructure</p>
        <h2>What 0G actually contributes</h2>
        <p className="section-lede">
          Each card below reflects this deployment's real, current configuration — not a claim
          made once and left stale. If 0G credentials aren't set, it says so.
        </p>
        <div className="evidence-grid">
          <div className="evidence-card">
            <h3>
              0G Compute <IntegrationBadge component="compute" />
            </h3>
            <dl>
              <dt>What it's for</dt>
              <dd>Attested inference — your case is analyzed inside a TEE-verifiable path.</dd>
              <dt>What's checked</dt>
              <dd><code>broker.inference.processResponse()</code> returning a signed result.</dd>
              <dt>What it doesn't prove</dt>
              <dd>That no human intervened elsewhere in the broader pipeline.</dd>
            </dl>
          </div>
          <div className="evidence-card">
            <h3>
              0G Storage <IntegrationBadge component="storage" />
            </h3>
            <dl>
              <dt>What it's for</dt>
              <dd>Durable storage of the receipt artifact, addressed by its content hash.</dd>
              <dt>What's checked</dt>
              <dd>A root hash returned at upload, and a byte-identical download on retrieval.</dd>
              <dt>What it doesn't prove</dt>
              <dd>Anything about the underlying case outcome — only that the bytes are intact.</dd>
            </dl>
          </div>
          <div className="evidence-card">
            <h3>
              0G Chain <IntegrationBadge component="chain" />
            </h3>
            <dl>
              <dt>What it's for</dt>
              <dd>Anchoring the receipt commitment so it can't be quietly rewritten later.</dd>
              <dt>What's checked</dt>
              <dd>
                <code>CaseAnchor.verify()</code> — callable by anyone, with no Clawback credentials.
              </dd>
              <dt>What it doesn't prove</dt>
              <dd>That a real merchant honored the request — only that the record wasn't altered.</dd>
            </dl>
          </div>
        </div>
      </section>

      <section className="section">
        <p className="section-eyebrow">What this is, and isn't</p>
        <h2>Proven vs. not proven</h2>
        <p className="section-lede">
          Read <Link href="/how-it-works">how privacy verification works</Link> for the full
          breakdown, or <Link href="/cases/new">start a case</Link> to see it against a real
          receipt.
        </p>
        <div className="proof-columns">
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Proven</h3>
            <ul className="proof-list">
              <li>
                <span className="proof-mark proof-mark--yes" aria-hidden="true">✓</span>
                Receipt commitments are internally consistent and independently recomputable.
              </li>
              <li>
                <span className="proof-mark proof-mark--yes" aria-hidden="true">✓</span>
                A configured Compute response passed 0G's own verification mechanism.
              </li>
              <li>
                <span className="proof-mark proof-mark--yes" aria-hidden="true">✓</span>
                Unauthorized access to another owner's case is rejected.
              </li>
            </ul>
          </div>
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Not proven</h3>
            <ul className="proof-list">
              <li>
                <span className="proof-mark proof-mark--no" aria-hidden="true">✕</span>
                A real merchant cancellation or a real refund.
              </li>
              <li>
                <span className="proof-mark proof-mark--no" aria-hidden="true">✕</span>
                That no human intervened anywhere in the broader pipeline.
              </li>
              <li>
                <span className="proof-mark proof-mark--no" aria-hidden="true">✕</span>
                That TEE attestation is unique to 0G — several major clouds offer it too.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <p className="section-eyebrow">Business model</p>
        <h2>You only pay when it works</h2>
        <p className="section-lede">
          Clawback charges a percentage of independently verified savings — never a flat fee,
          and never a charge against a case that recovered nothing.
        </p>
      </section>
    </main>
  );
}
