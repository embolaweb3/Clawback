import { ethers } from "ethers";
import {
  createZGComputeNetworkBroker,
  type ZGComputeNetworkBroker,
} from "@0gfoundation/0g-compute-ts-sdk";
import type { ComputeConfig } from "./config.js";

/**
 * A thin, honest wrapper around @0gfoundation/0g-compute-ts-sdk.
 *
 * Every method call here maps to a real, verified SDK method — see the
 * inline references to the package's own .d.ts files. Nothing on this
 * page invents a field the SDK doesn't expose. In particular:
 *
 *   - `processResponse` (broker.inference.processResponse) is the ONLY
 *     source of the `isValid` boolean this codebase calls "TEE-attested".
 *     Per the SDK's own docs, it returns `boolean | null` — null when no
 *     chatID was available, which this wrapper treats as NOT attested,
 *     never as an assumed pass.
 *   - There is no "model hash" or "enclave measurement" field exposed by
 *     this SDK version's public API. The receipt therefore never claims
 *     one. If a future SDK version exposes `getSignerRaDownloadLink` /
 *     `getChatSignatureDownloadLink` output usefully, extend
 *     TeeAttestationEvidence deliberately — do not backfill it silently.
 */

export interface ChatMessage {
  readonly role: "system" | "user";
  readonly content: string;
}

export interface AttestedChatResult {
  readonly content: string;
  readonly providerAddress: string;
  readonly model: string;
  readonly chatId: string | null;
  readonly isValid: boolean | null;
}

/** A minimal, non-zero top-up used only when a provider sub-account is
 *  under-funded. Kept small and constant for MVP — see LIMITATIONS.md on
 *  why this isn't a dynamic budgeting system yet. Units are neuron
 *  (the SDK's smallest unit), matching `transferFund`'s documented units.
 *
 *  This amount is well below the SDK's `MIN_TRANSFER_AMOUNT_OG` (1 0G,
 *  see @0gfoundation/0g-compute-ts-sdk's ledger.js), which the SDK's own
 *  source labels a *recommended* floor for `transferFund` — it logs a
 *  warning and proceeds, it does not throw. The value the SDK actually
 *  throws on (`MIN_LEDGER_BALANCE_OG`) gates a different operation,
 *  first-time Ledger creation, which this path doesn't hit once a Ledger
 *  already exists. Confirmed live on 0G testnet: this exact top-up
 *  succeeded end-to-end (real attested inference, `processResponse() ===
 *  true`) against an already-funded provider sub-account. The disclosed
 *  risk this does NOT cover: transferring 0.001 0G to a *brand-new*
 *  provider sub-account starting from zero could leave it under a given
 *  provider's own locked-balance floor and get requests rejected — see
 *  LIMITATIONS.md §12. */
const DEFAULT_TOPUP_NEURON = BigInt(1) * BigInt(10 ** 15); // 0.001 0G

export async function createBroker(config: ComputeConfig): Promise<ZGComputeNetworkBroker> {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  return createZGComputeNetworkBroker(wallet);
}

/** Picks a TEE-verifiable provider (per `ServiceStructOutput.verifiability`
 *  being non-empty) — Clawback never routes sensitive analysis through a
 *  provider that doesn't offer TEE verifiability at all. */
export async function selectProvider(
  broker: ZGComputeNetworkBroker,
  preferredAddress: string | null,
): Promise<string> {
  const services = await broker.inference.listService();
  const verifiable = services.filter((s) => s.verifiability && s.verifiability.length > 0);
  if (preferredAddress) {
    const match = verifiable.find((s) => s.provider.toLowerCase() === preferredAddress.toLowerCase());
    if (match) return match.provider;
  }
  const first = verifiable[0];
  if (!first) {
    throw new Error(
      "No TEE-verifiable 0G Compute providers are currently available. " +
        "Clawback refuses to fall back to a non-verifiable provider for sensitive analysis.",
    );
  }
  return first.provider;
}

async function ensureFunded(broker: ZGComputeNetworkBroker, providerAddress: string): Promise<void> {
  try {
    await broker.ledger.getLedger();
  } catch {
    // No ledger yet for this wallet — this call requires the wallet to
    // already hold 0G testnet tokens; it is not created here silently.
    throw new Error(
      "No 0G Compute ledger exists for this wallet yet. Fund it first with " +
        "broker.ledger.addLedger(<balance>) using a wallet that holds 0G testnet tokens.",
    );
  }
  await broker.ledger.transferFund(providerAddress, "inference", DEFAULT_TOPUP_NEURON);
}

export async function runAttestedChat(
  broker: ZGComputeNetworkBroker,
  providerAddress: string,
  messages: ChatMessage[],
): Promise<AttestedChatResult> {
  await ensureFunded(broker, providerAddress);

  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
  const headers = await broker.inference.getRequestHeaders(providerAddress);

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ messages, model }),
  });

  if (!response.ok) {
    throw new Error(`0G Compute provider returned HTTP ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    id?: string;
    usage?: unknown;
    choices?: { message?: { content?: string } }[];
  };

  const chatId = response.headers.get("ZG-Res-Key") ?? data.id ?? null;
  const content = data.choices?.[0]?.message?.content ?? "";
  const usageContent = data.usage ? JSON.stringify(data.usage) : "";

  // processResponse returns null when no chatID is available — treated
  // as "not attested", never coerced to true.
  const isValid = chatId
    ? await broker.inference.processResponse(providerAddress, chatId, usageContent)
    : null;

  return { content, providerAddress, model, chatId, isValid };
}
