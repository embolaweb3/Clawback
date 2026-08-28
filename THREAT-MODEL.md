# Threat model

Precise, per attacker, per surface. "Verifiable" is never used unqualified — every claim below
is tagged with one of five categories (see [VERIFICATION.md](./VERIFICATION.md)):
**cryptographically prevented**, **cryptographically detectable**, **economically discouraged**,
**socially detectable**, or **still fundamentally trusted**.

## 1. The platform operator

**Could the operator read the user's financial information?**
Not while it's inside the attested compute path (`packages/compute`), if 0G Compute is
configured — the operator never receives the raw response, only the model's output and a
signed attestation. At rest, the case's sensitive fields are AES-256-GCM encrypted
(`packages/privacy/src/encryption.ts`) using a key the operator does control — so the honest
answer, stated plainly, is: **the operator could read it if they chose to abuse their own key
and their own decryption code path.** Encryption at rest defends against a stolen database, not
against a dishonest operator with legitimate access to their own systems. Only running the
*entire* analysis and execution pipeline inside a TEE the operator cannot inspect would close
this gap fully, and this MVP does not do that for every step (e.g. the sandbox provider itself
runs in the ordinary application process). **Trusted claim**, disclosed as such.

**Could the operator claim a refund/cancellation happened when it didn't?**
The receipt's `outcomeCommitment` chains to the specific `OutcomeEvidence` object
(`packages/receipts/src/builder.ts`). An operator *could* fabricate a fake `OutcomeEvidence`
and build a consistent-looking receipt from it — the commitment chain proves internal
consistency, not that the underlying claim is true. **Cryptographically detectable only for
internal consistency; the underlying truth of the claim remains a trusted claim** unless
independently corroborated (a real bank/card statement match — not yet wired in this MVP; see
LIMITATIONS.md).

## 2. The compute provider

**Could the provider inspect protected inputs?**
This is exactly what TEE isolation is supposed to prevent, and it's real, if imperfect:
`broker.inference.processResponse()` verifies the *response* signature, not that the input was
never observable to a compromised or malicious enclave operator with physical hardware access
(a known, general limitation of all TEE-based systems, not specific to this codebase).
**Cryptographically detectable** for response tampering; **still fundamentally trusted** with
respect to hardware-level side-channel attacks on the enclave itself.

## 3. Database compromise

**Could an attacker recover raw case information from a stolen database?**
No — every sensitive field is AES-256-GCM encrypted before it's written
(`packages/privacy/src/encryption.ts`), and the encryption key is not stored alongside the
data. **Cryptographically prevented**, contingent on the key itself being kept secret (a
standard, disclosed assumption of any encryption-at-rest scheme).

## 4. Result manipulation

**Could the platform claim a refund/cancellation happened when it did not?**
See "the platform operator" above — the same analysis applies.

## 5. Receipt manipulation

**Could a historical result be silently changed?**
No, if anchored: `packages/chain/contracts/CaseAnchor.sol`'s `anchor()` function reverts on a
second call for the same `caseId` (`AlreadyAnchored`), and the receipt chain
(`packages/receipts/src/verifier.ts`) recomputes every commitment from raw artifacts —
changing any upstream artifact breaks every commitment computed after it.
**Cryptographically prevented**, contingent on the receipt actually being anchored (this MVP
treats anchoring as best-effort — see LIMITATIONS.md on why an unanchored receipt exists only
in Clawback's own store and is weaker).

## 6. User deception

**Could the agent perform an action the user never approved?**
No: `Orchestrator.approveAndExecute` requires an exact `proposalId` match
(`ProposalMismatchError` otherwise) and records an `ApprovalRecord` whose `actionCommitment`
is checked by the independent verifier before execution counts as legitimate.
**Cryptographically detectable** after the fact (the approval commitment either matches the
executed action or it doesn't); **enforced procedurally** before the fact by the state machine
(`EXECUTING` is unreachable without first passing through `APPROVE`).

## 7. Human intervention — the one gap this document does not pretend to close

**Could an operator secretly perform the task and attribute it to the AI?**

**Yes, and there is no cryptography available today, in this codebase or any other, that rules
this out completely.** The furthest this system goes: (a) `broker.inference.processResponse()`
proves *a* TEE-protected model produced *a* signed response; (b) nothing prevents an operator
from also, separately, hand-writing a better answer and swapping it in before the response ever
reaches the attestation step (i.e., attesting to a real but deliberately-weak model call while
a human does the real work elsewhere). Mitigations that exist here reduce, but do not close,
this gap:

- The action ultimately sent is the literal `exactMessage` the user approved, whose
  `actionCommitment` is checked against what was actually executed — an operator who wants to
  substitute a human-written message would have to do so *before* the user approves it, which
  is at least visible to the user reviewing the proposal.
- Every execution step is logged with identifiers only (`packages/privacy/src/redact.ts`), so
  an audit trail exists even though it can't prove authorship.

**This is a permanent, structural limitation, not a bug to be fixed in a later version.**

## 8. Task-giver / counterparty (the merchant) side

**Could a merchant refuse payment, disappear, or dispute a legitimate claim?**
The sandbox provider's `no_response` outcome type exists specifically to model this — a case
that gets no response fails honestly to `EXECUTION_FAILED` rather than hanging or being
silently marked successful (`packages/agent/src/orchestrator.ts`). No fee is ever assessed in
this path (`packages/payments/src/fee.ts`'s `UnverifiedSavingsError`).

## 9. Sybil / fraudulent cases

Out of scope for this MVP's single-user-per-case model — there is no multi-party marketplace
surface (no task-givers, no contenders, no public listings) for a Sybil attack to target. This
is a deliberate simplification relative to earlier, rejected designs in this project's research
history (see the prior research artifacts referenced in the product brief) — a single-sided
personal-advocate product has a much smaller Sybil surface than a marketplace.
