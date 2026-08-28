# Clawback

> A private AI advocate that fights your bills, subscriptions, and billing disputes on your
> behalf — and gives you a receipt showing exactly what it can prove, and what it can't.

## 1. The problem

Bill-negotiation services (Rocket Money, Trim, Billshark) work, at real scale, on a contingency
fee — but every one of them asks you to hand over real financial credentials and then trust a
centralized company's word for what it did with them and what it actually recovered. DoNotPay
was fined **$193,000 by the FTC in February 2025** for claiming its "AI lawyer" had been tested
to a standard it never actually met — the exact failure mode this project exists to make
structurally harder to repeat.

## 2. The product

Clawback answers one question: *can I give an AI permission to fight a real bill without
blindly trusting the company operating it with my sensitive financial information?*

The MVP ships exactly one vertical — subscription cancellation / refund advocacy — end to end:

```
Case → Private execution → Proposed action → Explicit approval → Real action → Confirmation → Receipt
```

Nothing is sent without your explicit, recorded approval. Every completed case produces a
receipt with a chain of cryptographic commitments (case → action → execution → outcome →
receipt) that anyone can independently recompute — see [VERIFICATION.md](./VERIFICATION.md).

## 3. What this is NOT claiming

Read [LIMITATIONS.md](./LIMITATIONS.md) before believing any marketing-sounding sentence about
this project. In short: TEE attestation is not unique to 0G (AWS/Azure/GCP all offer it); no
system today can cryptographically rule out a human secretly doing the work; and "verifiable"
here always means one of five very different, precisely labeled things — never a blanket claim.

## 4. Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full data-flow diagram and package map. In
short:

```
apps/web            Next.js app: case creation, approval, receipts UI
packages/shared      Domain types, the case state machine, cryptographic commitments
packages/privacy     At-rest encryption, log redaction, the data-flow registry
packages/providers   The seam to the outside world — sandbox simulator + an unimplemented
                     seam for a real integration
packages/agent       CaseStore + Orchestrator — the only thing allowed to move a case forward
packages/compute     0G Compute wrapper (real @0gfoundation/0g-compute-ts-sdk calls) +
                     an honest local fallback when unconfigured
packages/storage     0G Storage wrapper (real @0gfoundation/0g-storage-ts-sdk calls)
packages/chain       CaseAnchor.sol + an ethers wrapper for on-chain receipt anchoring
packages/payments    Contingency-fee math and a settlement ledger abstraction
packages/receipts    Receipt construction and an INDEPENDENT verifier (build prompt §15)
```

## 5. 0G integration

Every 0G capability used here is called through the real, currently-published SDK — see
inline comments in `packages/compute/src/attestedClient.ts` and
`packages/storage/src/storageClient.ts` referencing the exact `.d.ts` signatures this was
built against (`@0gfoundation/0g-compute-ts-sdk@0.9.0`, `@0gfoundation/0g-storage-ts-sdk@1.2.11`).
Nothing is invented; where the SDK doesn't expose a field (a "model hash," an "enclave
measurement"), this codebase doesn't claim to have one.

All three — 0G Compute, 0G Storage, 0G Chain — are **optional at runtime**: the app runs, and
tests pass, with none of them configured. See `.env.example` and LIMITATIONS.md for exactly
what degrades and how it's disclosed to the user when they're absent.

## 6. Privacy model

See [ARCHITECTURE.md](./ARCHITECTURE.md#privacy-architecture) for the field-by-field data-flow
registry (`packages/shared/src/types.ts`'s `DATA_FLOW_REGISTRY`, enforced by a test that fails
if a new sensitive field is ever added without being classified).

## 7. Verification model

See [VERIFICATION.md](./VERIFICATION.md).

## 8. Setup

Requires Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env
# Generate an encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# paste it into CLAWBACK_ENCRYPTION_KEY in .env

pnpm test            # 65 tests across every package, no 0G credentials required
pnpm --filter @clawback/web dev   # runs the app at http://localhost:3000
```

0G Compute/Storage/Chain env vars are optional — see `.env.example`. Without them, the app
runs entirely honestly in "unconfigured" mode: the sandbox provider stands in for a real
merchant, and every receipt says so.

## 9. Demo flow

1. Open `/cases/new`, describe a real (or the built-in sandbox) subscription problem.
2. Watch the analysis step run, then review the exact message Clawback proposes — nothing has
   been sent yet.
3. Click "Approve & Send." Watch execution happen.
4. See the real (sandboxed, honestly labeled) outcome and the receipt.
5. Open "How was this verified?" to see the independent, recomputed verification report —
   which claims are cryptographic, which are trusted, and which this system admits it can't
   prove at all.

This exact flow was run live against a real `next build` + `next start` production server —
not just unit tests — via `scripts/smoke-test.mjs`:

```bash
pnpm --filter @clawback/web build
pnpm --filter @clawback/web start -- -p 3100   # in one terminal
node scripts/smoke-test.mjs                     # in another
```

The last real run produced a receipt with all five commitments chained, `teeAttested: false`
and `chainTxHash: null` honestly reported (0G Compute/Chain weren't configured for that run),
`allCryptographicChecksPassed: true` from the independent verifier, and a confirmed `403` when
a second, cookie-less request tried to read the first request's case.

## 10. Limitations

Read [LIMITATIONS.md](./LIMITATIONS.md). It says, among other things, that human intervention
cannot currently be cryptographically ruled out, and that TEE attestation is not unique to 0G.
That file is deliberately the least flattering document in this repository — on purpose.
