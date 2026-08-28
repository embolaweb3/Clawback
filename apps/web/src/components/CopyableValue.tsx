"use client";

import { useState } from "react";

function shorten(value: string, head = 10, tail = 6): string {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/**
 * A copyable, shortened hash/address value — used everywhere the receipt
 * page shows a real commitment, transaction hash, or address. Renders the
 * full value in the `title` attribute and via `aria-label` so it's never
 * only available to sighted mouse users.
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
      // Clipboard access can fail (permissions, insecure context) — the
      // full value is still visible and selectable, so this is a
      // convenience, not the only way to get the value.
    }
  }

  return (
    <span className="copyable">
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="mono copyable-value" title={value}>
          {shorten(value)}
        </a>
      ) : (
        <span className="mono copyable-value" title={value}>
          {shorten(value)}
        </span>
      )}
      <button
        type="button"
        className="copy-btn"
        onClick={copy}
        aria-label={`Copy ${label ?? "value"} to clipboard`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
