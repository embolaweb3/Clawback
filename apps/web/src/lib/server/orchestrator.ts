import { resolve } from "node:path";
import { FileCaseStore, KvCaseStore, Orchestrator, loadKvConfig, type CaseStore } from "@clawback/agent";
import { ComputeClient } from "@clawback/compute";
import { SandboxSubscriptionProvider } from "@clawback/providers";
import { LocalSettlementLedger } from "@clawback/payments";
import { createStorageClient } from "@clawback/storage";
import { createAnchorClient } from "@clawback/chain";

/**
 * The one place the whole app wires real dependencies together. Every
 * 0G-related client here is created via its package's `createXClient(env)`
 * factory, which returns null rather than throwing when unconfigured —
 * see each package's LIMITATIONS.md entry. Nothing is faked to look
 * configured when it isn't.
 *
 * The only SubscriptionProvider shipped is the sandbox — see
 * @clawback/providers/liveEmailProvider.ts for why a live one isn't
 * wired here yet.
 */
let orchestratorSingleton: Orchestrator | null = null;
let encryptionKeySingleton: string | null = null;

function requireEncryptionKey(): string {
  if (!encryptionKeySingleton) {
    const key = process.env.CLAWBACK_ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        "CLAWBACK_ENCRYPTION_KEY is not set. See .env.example for how to generate one.",
      );
    }
    encryptionKeySingleton = key;
  }
  return encryptionKeySingleton;
}

/** Prefers a Redis-backed store (Vercel Marketplace Upstash integration)
 *  when configured — the durable option for a serverless deployment,
 *  where FileCaseStore's local-disk state is invisible to any other
 *  instance (see LIMITATIONS.md §8). Falls back to FileCaseStore so local
 *  development and any non-serverless deployment need nothing extra. */
function buildCaseStore(): CaseStore {
  const kvConfig = loadKvConfig(process.env);
  if (kvConfig) return new KvCaseStore(kvConfig);

  // resolve(), not join(): CLAWBACK_DATA_DIR may be an absolute override
  // (e.g. /tmp/clawback-data on a serverless host with a read-only
  // filesystem). join() would silently concatenate it onto cwd instead
  // of honoring it.
  const dataDir = resolve(process.cwd(), process.env.CLAWBACK_DATA_DIR ?? ".clawback-data");
  return new FileCaseStore(dataDir);
}

export function getOrchestrator(): Orchestrator {
  if (orchestratorSingleton) return orchestratorSingleton;

  const store = buildCaseStore();
  const compute = new ComputeClient(process.env);
  const provider = new SandboxSubscriptionProvider();
  const settlementLedger = new LocalSettlementLedger();
  const storageClient = createStorageClient(process.env);
  const anchorClient = createAnchorClient(process.env);

  orchestratorSingleton = new Orchestrator({
    store,
    compute,
    provider,
    encryptionKey: requireEncryptionKey(),
    settlementLedger,
    storageClient,
    anchorClient,
  });
  return orchestratorSingleton;
}

export function computeConfigured(): boolean {
  return new ComputeClient(process.env).isConfigured;
}
