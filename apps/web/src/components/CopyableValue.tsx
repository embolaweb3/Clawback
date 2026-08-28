"use client";

import { useState } from "react";

function shorten(value: string, head = 8, tail = 6): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true" className="animate-reveal">
        <path d="M3 8.5 6.2 12 13 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 10.5V3.9a1 1 0 0 1 1-1H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A copyable, shortened hash/address value — every real hash, address, or
 * transaction ID in the app renders through this component. Full value is
 * always in `title`, so it's never only available via the copy button.
 */
export function CopyableValue({
  value,
  href,
  label,
}: {
  value: string;
  href?: string | null;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail silently (permissions, insecure
      // context) — the full value stays visible/selectable regardless.
    }
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-rule bg-paper px-2 py-1">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          title={value}
          className="min-w-0 truncate font-mono text-[0.8rem] text-signal underline decoration-signal-soft decoration-2 underline-offset-2"
        >
          {shorten(value)}
        </a>
      ) : (
        <span title={value} className="min-w-0 truncate font-mono text-[0.8rem] text-ink">
          {shorten(value)}
        </span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label ?? "value"} to clipboard`}
        className={`inline-flex shrink-0 items-center justify-center rounded p-1 transition-colors ${
          copied ? "text-signal" : "text-ink-faint hover:text-ink"
        }`}
      >
        <CopyIcon copied={copied} />
      </button>
    </span>
  );
}
