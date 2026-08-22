import { ethers } from "ethers";
import { CASE_ANCHOR_ABI } from "./abi.js";
import type { ChainConfig } from "./config.js";

export interface AnchorResult {
  readonly txHash: string;
  readonly blockNumber: number | null;
}

export class AnchorClient {
  private readonly contract: ethers.Contract;
  private readonly provider: ethers.JsonRpcProvider;

  constructor(private readonly config: ChainConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.contract = new ethers.Contract(config.contractAddress, CASE_ANCHOR_ABI, wallet);
  }

  /** Anchors a case's final receipt commitment on-chain. `caseId` and the
   *  commitments are already 0x-prefixed 32-byte hex strings (see
   *  packages/shared/src/commitment.ts) — no additional hashing happens
   *  here. Reverts (and this throws) if the case was already anchored. */
  async anchorReceipt(
    caseId: string,
    receiptCommitment: string,
    previousCommitment: string | null,
  ): Promise<AnchorResult> {
    const tx = await this.contract.anchor!(
      caseId,
      receiptCommitment,
      previousCommitment ?? ethers.ZeroHash,
    );
    const receipt = await tx.wait();
    return { txHash: tx.hash, blockNumber: receipt?.blockNumber ?? null };
  }

  /** The independent check a third party would run — takes only public
   *  RPC access, no Clawback credentials. */
  async verify(caseId: string, expectedReceiptCommitment: string): Promise<boolean> {
    return this.contract.verify!(caseId, expectedReceiptCommitment);
  }
}
