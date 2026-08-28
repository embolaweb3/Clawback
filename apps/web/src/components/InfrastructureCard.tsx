import type { ReactNode } from "react";
import { PremiumStatusBadge } from "./IntegrationStatus";

function ComputeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M19 19l-2-2M19 5l-2 2M5 19l2-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StorageIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ChainIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="3" y="9" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="14" y="9" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 12.5h4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

const ICONS = { compute: ComputeIcon, storage: StorageIcon, chain: ChainIcon } as const;

export function InfrastructureCard({
  component,
  title,
  children,
}: {
  component: "compute" | "storage" | "chain";
  title: string;
  children: ReactNode;
}) {
  const Icon = ICONS[component];
  return (
    <div className="group relative rounded-xl border border-rule bg-paper-raised p-6 shadow-card transition-[border-color,box-shadow] hover:border-rule-strong hover:shadow-raised">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-soft text-signal">
          <Icon />
        </span>
        <PremiumStatusBadge component={component} />
      </div>
      <h3 className="mb-3 font-display text-base font-bold text-ink">{title}</h3>
      <div className="space-y-3 text-sm text-ink-soft">{children}</div>
    </div>
  );
}

export function InfraRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}
