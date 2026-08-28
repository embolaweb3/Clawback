# Verification model

"Verifiable AI work" is not one claim — it's several, and they don't all clear the same bar.
This document exists so nobody reading this repository has to take that on faith; every claim
below is backed by a specific file and function.

## The five categories

Used consistently across `THREAT-MODEL.md`, `packages/shared/src/types.ts`'s
`EvidenceStrength`, and `packages/receipts/src/verifier.ts`'s `VerificationCheck`:

| Category | Meaning |
| --- | --- |
| **Cryptographically verifiable** | Backed by math a third party can independently recheck (a recomputed hash matching an on-chain commitment). |
| **TEE-attested** | Backed by a TEE-signed response per `broker.inference.processResponse()` — real, but depends on trusting the TEE vendor's hardware root of trust. |
| **Economically enforced** | Backed by a real economic action costly to fake (funds moving), not self-proving alone. |
| **Trusted claim** | Believed, not provable — e.g., a counterparty's own confirmation. Always labeled as such, never silently upgraded. |
| **Not independently verifiable** | Explicitly documented as unsolved — most importantly, that a human didn't secretly do the work. |

## What gets checked, and how

`packages/receipts/src/verifier.ts`'s `verifyReceipt()` is intentionally independent of
`builder.ts`'s internal call graph — it recomputes every commitment from raw artifacts using
only the same pure `commit`/`chain` functions, and answers exactly these questions:

1. **Does the stored case artifact match its commitment?** — cryptographically verifiable.
2. **Was the executed action explicitly approved?** — cryptographically verifiable (an
   `ApprovalRecord` with a matching `actionCommitment` must exist).
3. **Does the approved action match the commitment chained into the receipt?** — cryptographically verifiable.
4. **Does the recorded execution match the commitment chained into the receipt?** — cryptographically verifiable.
5. **Was the sensitive analysis executed inside a TEE-attested path?** — TEE-attested if true; **not independently verifiable** if 0G Compute was unconfigured for that run (never silently assumed true).
6. **Does the recorded outcome match the commitment chained into the receipt?** — cryptographically verifiable.
7. **Was the claimed savings amount independently verified, or only claimed?** — trusted claim at best in this MVP (see LIMITATIONS.md on why real corroboration, e.g. a bank statement match, isn't wired in yet).
8. **Was this receipt anchored on a public chain?** — cryptographically verifiable if `anchor.chainTxHash` is set; **not independently verifiable** otherwise.
9. **Is the environment (`sandbox` vs. `live`) disclosed accurately?** — enforced mechanically by `assertNoSandboxLeakage()`, which refuses to emit a receipt that mislabels a sandboxed result as live.

## The chain, end to end

```
task/case committed (hash)
    → TEE execution (if 0G Compute configured)
    → signed attestation (broker.inference.processResponse)
    → output committed (hash, chained to the action)
    → execution evidence committed (chained to the action)
    → outcome evidence committed (chained to the execution)
    → receipt committed (chained to the outcome)
    → [best-effort] uploaded to 0G Storage, root hash referenced
    → [best-effort] anchored on-chain via CaseAnchor.sol
```

Any single-link substitution breaks every commitment computed after it — see
`packages/shared/src/commitment.test.ts`'s "chains so that an earlier substitution breaks every
later commitment" test, and `packages/receipts/src/verifier.test.ts`'s tampering-detection
tests, both of which assert this property directly rather than describing it only in prose.

## What this does NOT prove

See `THREAT-MODEL.md` §7. No combination of the mechanisms above rules out an operator secretly
performing the work by hand. State this plainly to anyone who asks "is this fully verifiable" —
the honest answer is "five specific things are; one important thing structurally isn't, on any
stack, today."
