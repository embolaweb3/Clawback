import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center sm:px-8">
      <h1 className="mb-3 text-2xl font-extrabold text-ink">Case not found.</h1>
      <p className="mb-6 text-ink-soft">Either it doesn't exist, or it belongs to a different browser session.</p>
      <Link
        href="/"
        className="inline-flex items-center rounded-md bg-signal px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Back home
      </Link>
    </main>
  );
}
