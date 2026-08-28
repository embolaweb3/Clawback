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
  if (!status.configured) return "UNCONFIGURED";
  if (status.network === "mainnet") return "0G MAINNET";
  if (status.network === "testnet") return "0G TESTNET";
  return "0G LIVE";
}

export function IntegrationBadge({ component }: { component: "compute" | "storage" | "chain" }) {
  const status = useIntegrationStatus();
  const componentStatus = status?.[component];

  if (!componentStatus) {
    return <span className="pill pill-gold">CHECKING…</span>;
  }

  return (
    <span className={`pill ${componentStatus.configured ? "pill-signal" : "pill-gold"}`}>
      {networkLabel(componentStatus)}
    </span>
  );
}
