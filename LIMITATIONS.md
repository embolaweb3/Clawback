# Limitations

Deliberately the least flattering document in this repository. If a sales conversation about
Clawback ever contradicts something on this page, this page is right and the sales conversation
is wrong.

## 1. Human intervention cannot currently be cryptographically ruled out.

No system today — this one included — can prove an operator didn't secretly perform a task by
hand and attribute it to the AI. See THREAT-MODEL.md §7 for the full analysis. This is
permanent, not a bug scheduled for a later release.

## 2. TEE attestation is not unique to 0G.

AWS Nitro Enclaves, Azure Confidential Computing, and Google Confidential Space all ship
production TEE attestation today, including composite CPU+GPU attestation for AI inference. A
centralized competitor could replicate the attestation mechanism itself using any of them.

**What 0G actually, narrowly, contributes here:** a settlement and record layer not solely
controlled by the same company asking you to trust it, and a compute marketplace not tied to
one specific cloud vendor's commercial incentives around your data. That is a real, but modest,
claim — not "0G makes this uniquely possible."

## 3. "Verifiable earnings" is five different claims, not one.

See VERIFICATION.md. Never trust a sentence about this product that uses "verified" without
saying which of the five categories it means.

## 4. The live merchant integration does not exist.

`packages/providers/src/liveEmailProvider.ts` is an intentionally unimplemented seam. The only
`SubscriptionProvider` this repository ships is `SandboxSubscriptionProvider` — a deterministic
simulator, never disguised as a real merchant. Every receipt it produces is labeled
`environment: "sandbox"`, and `assertNoSandboxLeakage()` throws if that label is ever wrong.
Building a real integration requires, at minimum: a transactional email/chat channel Clawback
controls, a reply-parsing pipeline that extracts a concrete, auditable outcome rather than
trusting free text, and a bounded timeout policy — none of which is safe to fabricate.

## 5. "Verified savings" is currently just "a counterparty said so."

`verifyClaimedSavings()` in `packages/agent/src/orchestrator.ts` treats any claimed amount with
a non-null confirmation string as "verified" — which is a real, if modest, bar (a bare
unconfirmed number is never counted), but it is not the same as matching a real bank or card
statement line, which this MVP does not implement. Do not describe `verifiedSavingsCents` as
independently, objectively verified until that corroboration step exists.

## 6. 0G Compute, Storage, and Chain are all optional, and often unconfigured in practice.

Running this app without any of the `ZG_*` environment variables set is fully supported and
fully honest: analysis falls back to a deterministic local template
(`teeAttested: false`, disclosed), storage/chain anchoring are skipped
(`anchor.storageRootHash` / `anchor.chainTxHash` stay `null`, disclosed), and nothing pretends
otherwise. This was a deliberate design requirement (build prompt §4), not a shortcut.

## 7. CaseAnchor.sol deployment is operator-provided, not shipped by this repository.

The contract ships as source (`packages/chain/contracts/CaseAnchor.sol`) and a deployment
script template (`packages/chain/scripts/deploy.ts`). This repository's own `git history`
contains no deployment — no address is hardcoded anywhere in tracked code. A live instance has
been deployed and exercised (0G mainnet, chain ID 16661, address `0x91b58e90B9FeCe02952865C1337d64f9ceeC1A25`,
compiled from this exact unmodified source), with real `anchor()`/`verify()` calls confirmed
against it, but that deployment lives only in a gitignored `.env` (`ZG_CHAIN_ANCHOR_CONTRACT_ADDRESS`),
not in this repository. Anyone running this codebase without that variable set gets full, honest
degradation: `createAnchorClient()` returns `null` and `anchor.chainTxHash` stays `null`.

## 8. Persistence is file-based, and the settlement ledger is in-memory.

`FileCaseStore` writes one JSON file per case — fine for a demo, not for concurrent production
traffic (no locking, no transactions). `LocalSettlementLedger` doesn't persist at all across a
server restart. Both have a clean interface (`CaseStore`, `SettlementLedger`) a real deployment
would implement against Postgres/a real payment processor without touching `Orchestrator`.

## 9. There is no real authentication.

`getOrCreateOwnerId()` issues an anonymous per-browser cookie. It's enough to make ownership
checks meaningful for a demo; it is not a login system, and losing the cookie means losing
access to your own case history.

## 10. The package name for 0G Storage was ambiguous in public documentation at build time.

Two names appeared during research: the deprecated `@0glabs/0g-ts-sdk@0.3.3` and the current
`@0gfoundation/0g-storage-ts-sdk@1.2.11`. This codebase verified both against the live npm
registry and used the actively-maintained one — but if 0G renames or re-publishes either
package again, `packages/storage/package.json`'s version pin is the first thing to check.

## 11. The "no human assistance" claim about the AI's proposed message is honest, not absolute.

The local fallback template (`generateFallbackMessage`) is a fixed, non-AI text generator by
design, used only when 0G Compute is unconfigured, and is never mislabeled as an attested model
output (`teeAttested` stays `false` for it). When 0G Compute IS configured, the message comes
from whatever model the selected provider serves — this codebase does not control or guarantee
which model that is beyond requiring the provider to be TEE-verifiable at all
(`selectProvider()`'s filter on `verifiability`).

## 12. The Compute provider top-up amount is untested at cold-start scale.

`packages/compute/src/attestedClient.ts`'s `DEFAULT_TOPUP_NEURON` (0.001 0G) is below the 0G
Compute SDK's own `MIN_TRANSFER_AMOUNT_OG` (1 0G) — but that SDK constant is documented in the
SDK's own source as a *recommended* floor for `transferFund`, not an enforced one: the SDK logs
a warning and proceeds rather than throwing. This exact amount has been confirmed live, twice, on
0G testnet, against an already-funded provider sub-account, with a real TEE-attested response
(`processResponse() === true`) both times. What that live evidence does *not* cover: a
brand-new provider sub-account starting from zero balance, where a 0.001 0G transfer could leave
it under that specific provider's own on-chain locked-balance requirement and get inference
requests rejected. Fixing this properly (e.g., sizing the top-up based on whether the sub-account
already exists) is a real behavior change, not a one-line constant edit, and is out of scope for
this MVP.
