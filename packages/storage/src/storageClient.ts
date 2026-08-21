import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ethers } from "ethers";
import { Indexer, ZgFile } from "@0gfoundation/0g-storage-ts-sdk";
import type { StorageConfig } from "./config.js";

/**
 * A thin, honest wrapper around @0gfoundation/0g-storage-ts-sdk.
 *
 * The SDK's own methods return `[result, error]` tuples (Go-style) rather
 * than throwing — this wrapper preserves that signal instead of silently
 * discarding `error`, and never invents a rootHash/txHash when the SDK
 * reports failure. See ZgFile.merkleTree() and Indexer.upload()'s real
 * .d.ts signatures, referenced inline below.
 */

export interface StoredArtifact {
  readonly rootHash: string;
  readonly txHash: string;
}

export class StorageClient {
  constructor(private readonly config: StorageConfig) {}

  /** Persists an arbitrary JSON-serializable artifact (a receipt, an
   *  attestation blob, an execution record) to 0G Storage and returns
   *  its content-addressed root hash — the thing packages/receipts
   *  anchors on-chain and later re-fetches for independent verification. */
  async uploadJson(artifact: unknown): Promise<StoredArtifact> {
    const provider = new ethers.JsonRpcProvider(this.config.evmRpcUrl);
    const signer = new ethers.Wallet(this.config.privateKey, provider);
    const indexer = new Indexer(this.config.indexerRpc);

    const dir = await mkdtemp(join(tmpdir(), "clawback-storage-"));
    const filePath = join(dir, "artifact.json");
    await writeFile(filePath, JSON.stringify(artifact), "utf8");

    try {
      const file = await ZgFile.fromFilePath(filePath);
      try {
        const [result, uploadErr] = await indexer.upload(file, this.config.evmRpcUrl, signer);
        if (uploadErr) {
          throw new Error(`0G Storage upload failed: ${uploadErr.message}`);
        }
        if ("rootHashes" in result) {
          // Multi-fragment upload — take the first fragment's identifiers;
          // artifacts this small should never actually hit this branch,
          // but the SDK's return type allows it, so it's handled honestly
          // rather than assumed away.
          return { rootHash: result.rootHashes[0]!, txHash: result.txHashes[0]! };
        }
        return { rootHash: result.rootHash, txHash: result.txHash };
      } finally {
        await file.close();
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  /** Downloads and parses a previously-stored artifact by root hash, with
   *  Merkle proof verification enabled (the SDK's `proof` argument). */
  async downloadJson<T>(rootHash: string): Promise<T> {
    const indexer = new Indexer(this.config.indexerRpc);
    const dir = await mkdtemp(join(tmpdir(), "clawback-storage-dl-"));
    const filePath = join(dir, "artifact.json");
    try {
      const err = await indexer.download(rootHash, filePath, true);
      if (err) {
        throw new Error(`0G Storage download failed: ${err.message}`);
      }
      const { readFile } = await import("node:fs/promises");
      const contents = await readFile(filePath, "utf8");
      return JSON.parse(contents) as T;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
