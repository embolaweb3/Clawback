"use client";

import { useEffect, useState } from "react";

export interface ComponentStatus {
  readonly configured: boolean;
  readonly network: "mainnet" | "testnet" | "custom" | null;
  readonly chainId: number | null;
  readonly explorerBase: string | null;
}

export interface StatusResponse {
  readonly compute: ComponentStatus;
  readonly storage: ComponentStatus;
  readonly chain: ComponentStatus & { readonly contractAddress: string | null };
}

/**
 * Fetches /api/status once per mount — this deployment's actual runtime
 * configuration, never hardcoded. `null` while loading.
 */
export function useIntegrationStatus(): StatusResponse | null {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status")
      .then((r) => r.json())
      .then((data: StatusResponse) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        /* leave status null — callers treat that as "unknown", not "live" */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

function networkLabel(status: ComponentStatus): string {
  if (!status.configured) return "Unconfigured";
  if (status.network === "mainnet") return "0G Mainnet";
  if (status.network === "testnet") return "0G Testnet";
  return "0G Live";
}

/**
 * The status pill used everywhere an integration's live/unconfigured
 * state is shown. The pulse on a live badge is restrained on purpose —
 * `motion-safe:` keeps it off entirely under prefers-reduced-motion.
 */
export function PremiumStatusBadge({ component }: { component: "compute" | "storage" | "chain" }) {
  const status = useIntegrationStatus();
  const componentStatus = status?.[component];

  if (!componentStatus) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-ink-faint">
        Checking
      </span>
    );
  }

  const live = componentStatus.configured;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wide ${
        live ? "border-signal/30 bg-signal-soft text-signal" : "border-gold/30 bg-gold-soft text-gold"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? "bg-signal motion-safe:animate-soft-pulse" : "bg-gold"}`}
        aria-hidden="true"
      />
      {networkLabel(componentStatus)}
    </span>
  );
}

export { PremiumStatusBadge as IntegrationBadge };
