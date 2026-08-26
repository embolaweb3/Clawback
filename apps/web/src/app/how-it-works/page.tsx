export default function HowItWorksPage() {
  return (
    <main className="shell">
      <h1>How privacy verification works</h1>
      <p className="lede">Plainly, and without overselling any of it.</p>

      <div className="card">
        <h2>What we can prove</h2>
        <p>
          When your case runs through an attested execution path, we get back a signed
          confirmation of which model handled it and that its response wasn't tampered with.
          Anyone can independently recompute the commitments on your receipt and confirm they
          match — that check doesn't require trusting Clawback's word for it.
        </p>
      </div>

      <div className="card">
        <h2>What we can't prove</h2>
        <p>
          No system today — ours included — can cryptographically rule out a human quietly
          doing the work behind the scenes instead of the AI. We tell you plainly, on every
          receipt, when a claim is a trusted claim rather than a proof.
        </p>
      </div>

      <div className="card">
        <h2>What "attested" actually means here</h2>
        <p>
          It doesn't mean unbreakable, and it isn't unique to any one company's hardware —
          several major cloud providers offer similar guarantees. What matters is that the
          settlement and the record live on a neutral network, not inside the same company
          that's asking you to trust it.
        </p>
      </div>

      <div className="card">
        <h2>Every receipt shows its work</h2>
        <p>
          Open "How was this verified?" on any receipt to see exactly which claims are
          cryptographically checkable, which are trusted claims from a counterparty, and which
          this system is honest enough to say it simply can't prove.
        </p>
      </div>
    </main>
  );
}
