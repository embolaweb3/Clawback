import { describe, expect, it } from "vitest";
import { DATA_FLOW_REGISTRY, type SubscriptionCaseInput } from "./types.js";

describe("data-flow registry completeness", () => {
  // A representative literal exercises every key of SubscriptionCaseInput
  // at compile time, so if a field is ever added to the interface without
  // being added here too, this file fails to type-check.
  const sample: SubscriptionCaseInput = {
    merchantName: "",
    accountIdentifierLast4: "",
    subscriptionDetails: "",
    desiredOutcome: "",
    contactChannel: "sandbox",
    contactAddress: "",
  };

  it("has a registry entry for every SubscriptionCaseInput field", () => {
    const registered = new Set(DATA_FLOW_REGISTRY.map((e) => e.field));
    const inputFields = Object.keys(sample).filter((f) => f !== "contactChannel");
    for (const field of inputFields) {
      expect(registered.has(field), `missing DATA_FLOW_REGISTRY entry for "${field}"`).toBe(true);
    }
  });

  it("marks no sensitive input field as publicly visible", () => {
    const sensitiveFields = new Set([
      "merchantName",
      "accountIdentifierLast4",
      "subscriptionDetails",
      "desiredOutcome",
      "contactAddress",
    ]);
    for (const entry of DATA_FLOW_REGISTRY) {
      if (sensitiveFields.has(entry.field)) {
        expect(entry.visibility, `"${entry.field}" must not be public`).not.toBe("public");
      }
    }
  });
});
