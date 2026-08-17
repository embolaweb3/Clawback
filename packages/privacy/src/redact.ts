import { DATA_FLOW_REGISTRY } from "@clawback/shared";

/**
 * Structured-log redaction (build prompt §18 — "never log secrets").
 *
 * Every field the data-flow registry marks as non-public is stripped
 * before a log line is emitted. This is deliberately a denylist driven by
 * the same registry the privacy architecture is documented with, so a new
 * sensitive field added to SubscriptionCaseInput without a registry entry
 * fails the test in dataFlow.test.ts instead of silently leaking later.
 */
const SENSITIVE_FIELDS = new Set(
  DATA_FLOW_REGISTRY.filter((e) => e.visibility !== "public").map((e) => e.field),
);

export function redact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = SENSITIVE_FIELDS.has(key) ? "[redacted]" : value;
  }
  return out;
}

/** A logger-safe event shape: only identifiers and lifecycle facts, per
 *  build prompt §18. Nothing free-text ever passes through this. */
export interface SafeLogEvent {
  readonly caseId: string;
  readonly executionId?: string;
  readonly receiptId?: string;
  readonly providerId?: string;
  readonly stateTransition?: string;
  readonly timestamp: string;
  readonly durationMs?: number;
  readonly status: string;
}

export function logEvent(event: SafeLogEvent): void {
  // A structured sink (e.g. pino, a log pipeline) would replace this in
  // production; the important property to preserve is the *shape* above,
  // which structurally cannot carry free-text case content.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(event));
}
