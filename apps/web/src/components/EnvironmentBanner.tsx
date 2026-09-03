/**
 * The environment disclosure, elevated to a first-class product state
 * rather than a small legal footnote (build brief: "an important part of
 * the product state," "impossible to miss"). Shown wherever a case's
 * environment is known — during analysis/execution as well as on the
 * final receipt — driven entirely by the real `environment` field, never
 * hardcoded, never shown as "live" unless a real provider actually is.
 *
 * Deliberately scoped to "merchant", never "environment": this field
 * describes only which counterparty handled the case — SandboxSubscription-
 * Provider vs. a real integration. It says nothing about 0G Compute,
 * Storage, or Chain, which are configured and disclosed completely
 * independently (see IntegrationStatus / EvidencePill). An earlier
 * version said "sandbox environment," which reads like a deployment-stage
 * label and could be misread as "this whole deployment, including the
 * real 0G work, is fake" — exactly the kind of word-conflation this
 * project exists to avoid making about itself.
 */
export function EnvironmentBanner({ environment }: { environment: "sandbox" | "live" }) {
  if (environment === "live") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-signal/30 bg-signal-soft px-4 py-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-signal" aria-hidden="true" />
        <p className="text-sm font-semibold text-signal">
          LIVE MERCHANT · A real counterparty integration handled this action.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border-2 border-gold/40 bg-gold-soft px-4 py-3.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-gold">
        <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-hidden="true" />
        Simulated merchant response
      </span>
      <span className="text-sm font-medium text-gold/90">
        No merchant contacted, no real refund occurred — this is about the counterparty only,
        not about 0G Compute/Storage/Chain, which are disclosed independently below.
      </span>
    </div>
  );
}
