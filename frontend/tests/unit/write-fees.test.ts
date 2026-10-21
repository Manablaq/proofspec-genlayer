import { describe, expect, it } from "vitest";
import { MAX_PROOFSPEC_FEE_WEI, validateWriteFeeQuote } from "@/lib/write-fees";

describe("R82 bounded GenLayer fee guard", () => {
  const distribution = { leaderTimeunitsAllocation: 100n, validatorTimeunitsAllocation: 200n };
  it("accepts the measured R81 create-spec deposit", () => {
    expect(validateWriteFeeQuote(378_582_000_010_352n, distribution)).toBe(378_582_000_010_352n);
  });
  it("blocks absent, free, over-cap, and unsafe quotes before signing", () => {
    expect(() => validateWriteFeeQuote(0n, distribution)).toThrow();
    expect(() => validateWriteFeeQuote(-1n, distribution)).toThrow();
    expect(() => validateWriteFeeQuote(MAX_PROOFSPEC_FEE_WEI + 1n, distribution)).toThrow();
    expect(() => validateWriteFeeQuote(50n, null)).toThrow();
    expect(() => validateWriteFeeQuote(Number.MAX_SAFE_INTEGER + 2, distribution)).toThrow();
  });
});
