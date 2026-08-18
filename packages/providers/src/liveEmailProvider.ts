import type { ProviderActionRequest, ProviderActionResult, SubscriptionProvider } from "./types.js";

/**
 * The seam for a real integration — deliberately NOT implemented.
 *
 * A production version of this class would, at minimum:
 *   1. send `request.exactMessage` from a Clawback-controlled mailbox to
 *      the merchant's real support address over SMTP/an email API;
 *   2. poll or webhook-receive the merchant's reply;
 *   3. parse the reply for a concrete, auditable outcome (refund amount,
 *      cancellation confirmation number) rather than trusting free text;
 *   4. fail closed to `outcomeType: "no_response"` after a bounded
 *      timeout rather than blocking a case forever.
 *
 * None of that is safe to fabricate in this environment — it would mean
 * either lying about a real email being sent, or silently talking to a
 * real merchant on the operator's behalf with no way to verify the
 * outcome honestly. Per the build prompt (§3, §23): isolate the boundary,
 * make the limitation obvious, never fake it. See LIMITATIONS.md.
 */
export class LiveEmailSubscriptionProvider implements SubscriptionProvider {
  readonly source = "live" as const;

  async sendAction(_request: ProviderActionRequest): Promise<ProviderActionResult> {
    throw new NotImplementedError(
      "LiveEmailSubscriptionProvider is an intentionally unimplemented seam. " +
        "Wire a real transactional-email provider and reply-parsing pipeline here " +
        "before using Clawback against real merchants. See LIMITATIONS.md.",
    );
  }
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}
