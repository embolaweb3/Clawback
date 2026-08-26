import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell">
      <h1>Case not found.</h1>
      <p>Either it doesn't exist, or it belongs to a different browser session.</p>
      <Link href="/" className="btn btn-primary">
        Back home
      </Link>
    </main>
  );
}
