"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper-raised/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="font-display text-lg font-extrabold tracking-tight text-ink">
          Claw<span className="text-signal">back</span>
        </Link>
        <div className="flex items-center gap-6">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`hidden text-sm font-medium transition-colors sm:inline-block ${
                  active ? "text-ink" : "text-ink-faint hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/cases/new"
            className="inline-flex items-center rounded-md bg-signal px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Start a case
          </Link>
        </div>
      </nav>
    </header>
  );
}
