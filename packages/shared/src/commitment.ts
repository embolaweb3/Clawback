import { createHash } from "node:crypto";

/**
 * Deterministic commitments (build prompt §14).
 *
 * A commitment is only useful when it commits to a specific, reproducible
 * artifact and a verifier can later recompute it from that artifact and
 * get the same value. Every function here is a pure function of its input
 * — no randomness, no ambient state — so `verifyCommitment` in
 * packages/receipts can always recheck one independently of the code path
 * that produced it originally.
 */

/** Canonicalizes an object to a stable JSON string before hashing, so key
 *  order never changes a commitment's value. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`,
  );
  return `{${entries.join(",")}}`;
}

export function commit(artifact: unknown): string {
  const canonical = canonicalize(artifact);
  return "0x" + createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function verifyCommitment(artifact: unknown, expectedCommitment: string): boolean {
  return commit(artifact) === expectedCommitment;
}

/** Chains a new commitment to a prior one, the way each Case's receipt
 *  chains case → action → execution → outcome → receipt (build prompt
 *  §14). Chaining, not just independent hashing, is what makes it
 *  detectable if an earlier step were silently substituted after the
 *  fact — the later commitment simply stops matching. */
export function chain(previousCommitment: string | null, artifact: unknown): string {
  return commit({ previous: previousCommitment, artifact });
}
