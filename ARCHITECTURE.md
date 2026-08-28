# Architecture

## Package map

```
apps/web/                 Next.js app (App Router)
  src/app/                pages + API routes
  src/lib/server/         the one place real dependencies are wired together

packages/shared/          domain types, CaseState machine, cryptographic commitments
packages/privacy/         AES-256-GCM at-rest encryption, log redaction, DATA_FLOW_REGISTRY
packages/providers/       SubscriptionProvider interface + SandboxSubscriptionProvider
packages/compute/         0G Compute wrapper (real SDK) + honest local fallback
packages/storage/         0G Storage wrapper (real SDK)
packages/chain/           CaseAnchor.sol + ethers wrapper (not deployed by this repo)
packages/payments/        contingency-fee math + settlement ledger abstraction
packages/receipts/        receipt builder + INDEPENDENT verifier
packages/agent/           CaseStore + Orchestrator (the only thing that moves a case forward)
```

Dependency direction is strictly one-way: `agent` depends on everything else; nothing depends
on `agent`. `receipts`' verifier deliberately does not import `receipts`' builder's internals.

## Data-flow diagram

```
User
 │  plaintext: merchant, account (last 4), subscription details, desired outcome
 ▼
Clawback frontend (apps/web)
 │  encrypts sensitive fields immediately (packages/privacy) before persisting
 │  the CaseRecord — see FileCaseStore
 ▼
Orchestrator.submitCase
 │  decrypts ONLY in-memory, for the duration of this call, to build the
 │  analysis prompt
 ▼
ComputeClient.analyze  ──configured──▶  0G Compute (attested)
       │
       └──unconfigured──▶  local deterministic fallback (packages/compute/localFallbackAnalyzer.ts)
 │
 │  the AI's proposed message is itself encrypted at rest
 ▼
User reviews + explicitly approves (ApprovalRecord recorded BEFORE execution)
 ▼
Orchestrator.approveAndExecute
 │  decrypts input again, transiently, to hand to SubscriptionProvider
 ▼
SubscriptionProvider.sendAction  ──shipped──▶  SandboxSubscriptionProvider (deterministic simulator)
       │
       └──NOT shipped──▶  LiveEmailSubscriptionProvider (intentionally unimplemented)
 ▼
OutcomeEvidence recorded (claimed vs. verified savings kept as SEPARATE fields, never conflated)
 ▼
Receipt built (packages/receipts) — commitments chained case→action→execution→outcome→receipt
 │
 ├─ best-effort ──▶ 0G Storage (full artifact, if configured)
 └─ best-effort ──▶ 0G Chain (commitment only, via CaseAnchor.sol, if configured)
 ▼
Fee assessed ONLY against verifiedSavingsCents (packages/payments — UnverifiedSavingsError
otherwise), recorded in the settlement ledger
```

## Privacy architecture — field by field

`packages/shared/src/types.ts`'s `DATA_FLOW_REGISTRY` is the single source of truth, enforced
by `packages/shared/src/dataFlow.test.ts` (fails if a new `SubscriptionCaseInput` field is ever
added without a registry entry). Summary:

| Field | Who can see it | How long it persists | Commitment |
| --- | --- | --- | --- |
| `merchantName` | attested compute only | encrypted at rest | `caseCommitment` |
| `accountIdentifierLast4` | attested compute only | encrypted at rest | `caseCommitment` |
| `subscriptionDetails` | attested compute only | encrypted at rest | `caseCommitment` |
| `desiredOutcome` | attested compute only | encrypted at rest | `caseCommitment` |
| `contactAddress` | attested compute only | encrypted at rest | `caseCommitment` |
| the exact proposed message | user only | encrypted at rest | `actionCommitment` |
| claimed savings amount | public | permanent, public | `outcomeCommitment` |

"Attested compute only" is the aspiration this MVP partially delivers: when 0G Compute is
configured, the raw fields are handed to the attested path and the operator never sees the
model's raw response; when it isn't, the local fallback template runs in-process, and the
receipt honestly reports `teeAttested: false` rather than pretending otherwise. See
THREAT-MODEL.md §1 for the honest statement of what encryption-at-rest does and doesn't defend
against.

## Persistence

`FileCaseStore` (one JSON file per case under `CLAWBACK_DATA_DIR`) is a deliberately small-scale
choice for an MVP, not a production database. Swapping it for Postgres means implementing the
same three-method `CaseStore` interface (`create`, `get`, `transition`) — nothing in
`Orchestrator` or the API routes would need to change. `LocalSettlementLedger` is in-memory only
today (fee records don't survive a server restart) — flagged explicitly in LIMITATIONS.md as
the next thing to fix before this could run as a real, continuously-up service.

## Authentication

There isn't a real one. `apps/web/src/lib/server/identity.ts` issues a per-browser anonymous
UUID in an httpOnly cookie, which is enough to make `CaseStore`'s ownership checks meaningful
(one browser can't read or approve another's case) without building a login system this MVP
doesn't need yet. See LIMITATIONS.md.
