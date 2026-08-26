import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <h1>Fight the bill. Keep your data private. Get the receipt.</h1>
      <p className="lede">
        Clawback uses a private, attested AI advocate to fight subscriptions and billing
        disputes on your behalf — and gives you a receipt showing exactly what happened,
        including the parts it can't prove.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", margin: "1.5rem 0 2.5rem" }}>
        <Link href="/cases/new" className="btn btn-primary">
          Fight my first bill
        </Link>
        <Link href="/how-it-works" className="btn btn-secondary">
          How privacy verification works
        </Link>
      </div>

      <div className="card">
        <h2>Tell us what happened. We'll investigate the bill and prepare the next action.</h2>
        <p>
          You approve the exact message before anything is sent. Nothing goes out on your
          behalf silently.
        </p>
      </div>

      <div className="card">
        <h2>You only pay when it works</h2>
        <p>
          Clawback charges a percentage of verified savings — never a flat fee, never a
          charge for a case that doesn't recover anything.
        </p>
      </div>
    </main>
  );
}
