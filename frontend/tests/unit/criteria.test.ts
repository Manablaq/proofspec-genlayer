import { describe, expect, it } from "vitest";
import { buildCriteriaJson, emptyCriterion, validateCriterionDrafts } from "@/lib/criteria";

describe("criteria payload construction", () => {
  it("builds the exact contract field names", () => {
    const item = emptyCriterion();
    item.requirement = "Release exposes a reproducible test report.";
    item.primaryUrl = "https://example.com/release";
    const parsed = JSON.parse(buildCriteriaJson([item]));
    expect(parsed).toEqual([
      {
        requirement: "Release exposes a reproducible test report.",
        policy: "AUTHORITATIVE_V1",
        freshness_policy: "NOT_REQUIRED_V1",
        primary_url: "https://example.com/release",
        corroborating_url: ""
      }
    ]);
  });

  it("requires corroboration for CORROBORATED_V1", () => {
    const item = emptyCriterion();
    item.requirement = "Two sources agree.";
    item.primaryUrl = "https://one.example/release";
    item.policy = "CORROBORATED_V1";
    expect(validateCriterionDrafts([item])).toContain("corroborating");
  });
});
