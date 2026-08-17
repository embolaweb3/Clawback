import { describe, expect, it } from "vitest";
import { redact } from "./redact.js";

describe("log redaction", () => {
  it("strips fields the data-flow registry marks non-public", () => {
    const out = redact({
      caseId: "case_123",
      merchantName: "Acme",
      accountIdentifierLast4: "4242",
      status: "EXECUTING",
    });
    expect(out.caseId).toBe("case_123");
    expect(out.status).toBe("EXECUTING");
    expect(out.merchantName).toBe("[redacted]");
    expect(out.accountIdentifierLast4).toBe("[redacted]");
  });

  it("leaves fields not present in the input untouched (no false positives)", () => {
    const out = redact({ caseId: "case_1" });
    expect(Object.keys(out)).toEqual(["caseId"]);
  });
});
