

# Clawback

> A private AI advocate that fights your bills, subscriptions, and billing disputes on your behalf — and gives you a receipt showing exactly what it can prove, and what it can't.

## 1. The problem

Bill-negotiation services (Rocket Money, Trim, Billshark) work, at real scale, on a contingency fee — but every one of them asks you to hand over real financial credentials and then trust a centralized company's word for what it did with them and what it actually recovered. DoNotPay was fined **$193,000 by the FTC in February 2025** for claiming its "AI lawyer" had been tested to a standard it never actually met — the exact failure mode this project exists to make structurally harder to repeat.

## 2. The product

Clawback answers one question: *can I give an AI permission to fight a real bill without blindly trusting the company operating it with my sensitive financial information?*

The MVP ships exactly one vertical — subscription cancellation / refund advocacy — with the complete execution and verification infrastructure:

```text
Case → Private execution → Proposed action → Explicit approval → Execution → Outcome → Receipt
```

Nothing is sent without your explicit, recorded approval. Every completed case produces a receipt with a chain of cryptographic commitments:

```text
case → action → execution → outcome → receipt
```

The complete chain can be independently recomputed and verified — see [VERIFICATION.md](./VERIFICATION.md).

The merchant-facing action is currently a deterministic sandbox integration. The infrastructure is built so that a real provider can be connected through the provider seam, but this MVP does **not** claim that a real merchant was contacted or that a real refund occurred.

## 3. What this is NOT claiming

Read [LIMITATIONS.md](./LIMITATIONS.md) before believing any marketing-sounding sentence about this project.

In short:

* TEE attestation is not unique to 0G; AWS/Azure/GCP offer comparable primitives.
* No system today can cryptographically rule out a human secretly doing the work.
* Encryption at rest does not mean the platform operator can never access plaintext.
* A cryptographically verified receipt proves the integrity of the recorded execution evidence; it does not independently prove that a merchant issued a refund.
* The merchant-facing cancellation/refund action remains sandboxed in this MVP.

"Verifiable" here always means one of several precisely labeled properties — never a blanket claim.

## 4. Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full data-flow diagram and package map.

In short:

```text
apps/web
  Next.js app: case creation, approval, receipts UI

packages/shared
  Domain types, case state machine, cryptographic commitments

packages/privacy
  At-rest encryption, log redaction, data-flow registry

packages/providers
  Outside-world seam: sandbox simulator + real-provider interface

packages/agent
  CaseStore + Orchestrator — the only component allowed to move a case forward

packages/compute
  0G Compute wrapper using the real @0gfoundation/0g-compute-ts-sdk

packages/storage
  0G Storage wrapper using the real @0gfoundation/0g-storage-ts-sdk

packages/chain
  CaseAnchor.sol + ethers wrapper for on-chain receipt anchoring

packages/payments
  Contingency-fee math and settlement ledger abstraction

packages/receipts
  Receipt construction and an independent verifier
```

## 5. 0G integration

Clawback uses all three relevant 0G primitives:

* **0G Compute** for externally verifiable inference execution.
* **0G Storage** for durable storage of receipt-related artifacts.
* **0G Chain** for anchoring receipt commitments on-chain.

The integrations use the actual published SDKs installed in this repository:

```text
@0gfoundation/0g-compute-ts-sdk@0.9.0
@0gfoundation/0g-storage-ts-sdk@1.2.11
```

The Compute and Storage adapters were implemented against the SDKs' actual TypeScript declarations rather than guessed interfaces. Where the SDK does not expose a property such as a model hash or enclave measurement, Clawback does not invent one.

### Live 0G verification

These integrations have now been exercised against real networks rather than only type-checked.

**0G Compute — testnet**

A real Compute ledger was funded and real inference requests were executed. The selected provider was:

```text
0xa48f01287233509FD694a22Bf840225062E67836
```

using:

```text
qwen/qwen2.5-omni-7b
```

The 0G Compute verification mechanism returned:

```text
processResponse() === true
teeAttested === true
```

This proves that the response was accepted by 0G Compute's verification mechanism for that provider/service. It does **not** prove that no human intervened elsewhere in the broader pipeline.

**0G Storage — testnet**

Real upload transactions were executed and returned real storage root hashes. The stored artifact was independently downloaded and compared against the original bytes:

```text
BYTE_IDENTICAL = true
```

**0G Chain — mainnet**

`CaseAnchor.sol` is deployed on 0G mainnet:

```text
Chain ID: 16661

Contract:
0x91b58e90B9FeCe02952865C1337d64f9ceeC1A25

Deployment transaction:
0xb1c76fa6ed08a86b94dd4870f27d941c02ac22b45b476614b0b26d0f4a234336

Deployment block:
42882257
```

Real receipt commitments have been anchored through the deployed contract. The contract's `verify()` function independently returns `true` for the genuine commitment and `false` for altered commitments. Re-anchoring an already anchored case is rejected.

### Reproducibility

The live transactions above were executed with funded operator-held wallets that are **not** included in this repository. No private keys or transaction-signing credentials are shipped.

The application also supports honest unconfigured operation. If 0G credentials are absent, the relevant component degrades visibly rather than pretending that a live 0G operation occurred.

The frontend surfaces this directly: `GET /api/status` reports each integration's actual runtime configuration (configured/unconfigured, and mainnet/testnet when known), and the landing page, "How privacy verification works," and every receipt page read from it live — there is no hardcoded "LIVE" badge anywhere in the UI.

See [.env.example](./.env.example) and [LIMITATIONS.md](./LIMITATIONS.md) for the exact configuration and remaining limitations.

## 6. Privacy model

See [ARCHITECTURE.md](./ARCHITECTURE.md#privacy-architecture) for the field-by-field data-flow registry (`DATA_FLOW_REGISTRY`), enforced by tests so that new sensitive fields cannot silently bypass classification.

Sensitive case fields are encrypted at rest.

Clawback does **not** claim that the application operator can never access plaintext. The stronger guarantee would require the entire sensitive pipeline to execute inside a TEE that the operator cannot inspect, which this MVP does not provide platform-wide.

## 7. Verification model

See [VERIFICATION.md](./VERIFICATION.md).

Every completed case contains a cryptographically linked receipt:

```text
Case
  ↓
Action
  ↓
Execution
  ↓
Outcome
  ↓
Receipt
```

The verifier recomputes these commitments independently rather than trusting the frontend's displayed values.

The receipt verification also covers the final `status` through the `receiptCommitment`, closing the receipt-forgery gap identified during the pre-submission security audit.

## 8. Setup

Requires Node 20+ and pnpm.

```bash
pnpm install

cp .env.example .env

# Generate an encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Paste it into CLAWBACK_ENCRYPTION_KEY in .env

pnpm test
pnpm run build

pnpm --filter @clawback/web dev
```

`pnpm test` runs the full test suite without requiring 0G credentials.

`pnpm run build` performs the repository's production verification workflow, including TypeScript compilation, tests, and the Next.js production build.

0G Compute/Storage/Chain credentials are optional for local development. Without them, Clawback runs in honest unconfigured mode and explicitly reports the missing live capability rather than fabricating attestation, storage, or chain evidence.

## 9. Demo flow

1. Open `/cases/new` and describe a subscription problem.
2. Watch the analysis step run.
3. Review the exact action Clawback proposes — nothing has been sent yet.
4. Click **Approve & Send**.
5. See the resulting sandbox outcome and receipt.
6. Open **How was this verified?** to inspect the independently recomputed verification report.
7. Inspect the 0G-backed evidence when live credentials are configured.

The production lifecycle has been exercised against a real `next build` + `next start` server using the actual Orchestrator.

The live 0G run additionally exercised:

```text
Case
  ↓
Approval
  ↓
0G Compute inference
  ↓
0G Storage artifact
  ↓
0G mainnet anchor
  ↓
Cryptographic receipt
  ↓
Independent verification
```

The merchant-facing operation remains sandboxed. The receipt therefore correctly reports:

```text
environment = "sandbox"
```

No real merchant cancellation or refund is claimed.

## 10. Security evidence

The final pre-submission audit included hostile mutation testing against a genuine live receipt.

The following mutations were all detected:

```text
✓ Case field modification
✓ Approval/action commitment modification
✓ Approved message modification
✓ Execution artifact modification
✓ Outcome / savings modification
✓ Status modification
✓ Receipt commitment forgery
```

Every mutation resulted in:

```text
allCryptographicChecksPassed === false
```

The genuine receipt independently verified as:

```text
allCryptographicChecksPassed === true
```

Authorization was also tested through the real production HTTP server:

```text
Owner      → HTTP 200
Stranger   → HTTP 403
Data leak  → false
```

## 11. Test and verification status

The final verified repository state includes:

```text
74/74 tests passing
tsc -b: clean
Next.js production build: clean
Live production smoke test: passed
Live HTTP authorization isolation: passed
0G Compute: live verified
0G Storage: live verified
0G Chain mainnet anchoring: live verified
Independent on-chain verification: passed
Receipt tamper suite: 7/7 attacks detected
```

The repository contains no committed `.env` files or private credentials.

## 12. Limitations

Read [LIMITATIONS.md](./LIMITATIONS.md).

That document is deliberately the least flattering document in this repository — on purpose.

The important limitations remain:

* The merchant-facing cancellation/refund provider is sandboxed.
* No real refund or bank confirmation is claimed.
* Human intervention cannot be cryptographically ruled out.
* TEE attestation is not unique to 0G.
* Platform-wide plaintext confidentiality is not claimed.
* A cryptographic receipt proves integrity of recorded evidence, not that a real-world counterparty honored an action.

Clawback is designed to make these distinctions explicit rather than hide them.


