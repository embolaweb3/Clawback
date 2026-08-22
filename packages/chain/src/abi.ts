/** Mirrors packages/chain/contracts/CaseAnchor.sol exactly. Keep in sync
 *  by hand for now — see ARCHITECTURE.md for why this repo doesn't run a
 *  full Hardhat/Foundry typechain pipeline for a single small contract. */
export const CASE_ANCHOR_ABI = [
  "function anchor(bytes32 caseId, bytes32 receiptCommitment, bytes32 previousCommitment) external",
  "function verify(bytes32 caseId, bytes32 expectedReceiptCommitment) external view returns (bool)",
  "function getAnchor(bytes32 caseId) external view returns (tuple(bytes32 receiptCommitment, bytes32 previousCommitment, address anchoredBy, uint64 anchoredAt))",
  "event ReceiptAnchored(bytes32 indexed caseId, bytes32 indexed receiptCommitment, bytes32 previousCommitment, address indexed anchoredBy, uint64 anchoredAt)",
  "error AlreadyAnchored(bytes32 caseId)",
  "error EmptyCommitment()",
] as const;
