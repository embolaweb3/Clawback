import { describe, expect, it } from "vitest";
import { computeFee, UnverifiedSavingsError } from "./fee.js";

describe("contingency fee", () => {
  it("refuses to compute a fee against unverified savings", () => {
    expect(() => computeFee({ verifiedSavingsCents: null })).toThrow(UnverifiedSavingsError);
  });

  it("charges nothing when verified savings is zero", () => {
    const fee = computeFee({ verifiedSavingsCents: 0 });
    expect(fee.feeCents).toBe(0);
    expect(fee.netToUserCents).toBe(0);
  });

  it("computes 40% of verified savings by default", () => {
    const fee = computeFee({ verifiedSavingsCents: 10_000 }); // $100.00
    expect(fee.feeCents).toBe(4_000);
    expect(fee.netToUserCents).toBe(6_000);
  });

  it("honors a custom fee rate", () => {
    const fee = computeFee({ verifiedSavingsCents: 10_000 }, 3000); // 30%
    expect(fee.feeCents).toBe(3_000);
    expect(fee.netToUserCents).toBe(7_000);
  });

  it("never lets the fee exceed the verified savings", () => {
    const fee = computeFee({ verifiedSavingsCents: 100 }, 4000);
    expect(fee.feeCents).toBeLessThanOrEqual(100);
    expect(fee.netToUserCents).toBeGreaterThanOrEqual(0);
  });
});
