import { commit, type SubscriptionCaseInput, type TeeAttestationEvidence } from "@clawback/shared";
import { createBroker, runAttestedChat, selectProvider } from "./attestedClient.js";
import { loadComputeConfig, type ComputeConfig } from "./config.js";
import { generateFallbackMessage } from "./localFallbackAnalyzer.js";
import { buildAnalysisPrompt } from "./prompt.js";

/**
 * The single entry point packages/agent calls. Owns the decision of
 * whether a real attested execution is possible and degrades honestly
 * when it isn't — this is the one place in the codebase allowed to
 * decide "unconfigured" vs "attested", so that decision is never made
 * twice, inconsistently, elsewhere.
 */
export interface AnalysisResult {
  readonly message: string;
  readonly teeAttested: boolean;
  readonly attestation: TeeAttestationEvidence | null;
  readonly providerAddress: string | null;
  readonly inputCommitment: string;
  readonly outputCommitment: string;
  readonly degradedReason: string | null;
}

export class ComputeClient {
  private readonly config: ComputeConfig | null;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.config = loadComputeConfig(env);
  }

  get isConfigured(): boolean {
    return this.config !== null;
  }

  async analyze(input: SubscriptionCaseInput): Promise<AnalysisResult> {
    const inputCommitment = commit({
      merchantName: input.merchantName,
      accountIdentifierLast4: input.accountIdentifierLast4,
      subscriptionDetails: input.subscriptionDetails,
      desiredOutcome: input.desiredOutcome,
    });

    if (!this.config) {
      const message = generateFallbackMessage(input);
      return this.buildUnattestedResult(message, inputCommitment, "ZG_COMPUTE_PRIVATE_KEY not set — 0G Compute is unconfigured.");
    }

    try {
      const broker = await createBroker(this.config);
      const providerAddress = await selectProvider(broker, this.config.preferredProviderAddress);
      const { system, user } = buildAnalysisPrompt(input);
      const result = await runAttestedChat(broker, providerAddress, [
        { role: "system", content: system },
        { role: "user", content: user },
      ]);

      const outputCommitment = commit({ content: result.content });
      const teeAttested = result.isValid === true;
      const attestation: TeeAttestationEvidence = {
        providerAddress: result.providerAddress,
        model: result.model,
        chatId: result.chatId,
        isValid: teeAttested,
        verifiedAt: new Date().toISOString(),
      };

      return {
        message: result.content,
        teeAttested,
        attestation,
        providerAddress: result.providerAddress,
        inputCommitment,
        outputCommitment,
        degradedReason: teeAttested
          ? null
          : "0G Compute responded, but broker.inference.processResponse() did not return isValid === true.",
      };
    } catch (error) {
      // Network failure, unfunded ledger, no available provider, etc. —
      // fail closed to the honest local fallback rather than throwing
      // the whole case into an unrecoverable state.
      const message = generateFallbackMessage(input);
      const reason = error instanceof Error ? error.message : String(error);
      return this.buildUnattestedResult(message, inputCommitment, `0G Compute call failed: ${reason}`);
    }
  }

  private buildUnattestedResult(
    message: string,
    inputCommitment: string,
    degradedReason: string,
  ): AnalysisResult {
    return {
      message,
      teeAttested: false,
      attestation: null,
      providerAddress: null,
      inputCommitment,
      outputCommitment: commit({ content: message }),
      degradedReason,
    };
  }
}
