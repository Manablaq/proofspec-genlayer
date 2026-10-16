export type CriterionDraft = {
  requirement: string;
  policy: "AUTHORITATIVE_V1" | "CORROBORATED_V1";
  freshnessPolicy: "NOT_REQUIRED_V1" | "RELEASE_BOUND_V1";
  primaryUrl: string;
  corroboratingUrl: string;
};

export const emptyCriterion = (): CriterionDraft => ({
  requirement: "",
  policy: "AUTHORITATIVE_V1",
  freshnessPolicy: "NOT_REQUIRED_V1",
  primaryUrl: "",
  corroboratingUrl: ""
});

export function buildCriteriaJson(criteria: CriterionDraft[]): string {
  return JSON.stringify(criteria.map((item) => ({
    requirement: item.requirement.trim(),
    policy: item.policy,
    freshness_policy: item.freshnessPolicy,
    primary_url: item.primaryUrl.trim(),
    corroborating_url: item.policy === "CORROBORATED_V1" ? item.corroboratingUrl.trim() : ""
  })));
}

export function validateCriterionDrafts(criteria: CriterionDraft[]): string | null {
  if (criteria.length < 1 || criteria.length > 5) {
    return "A specification must contain between 1 and 5 criteria.";
  }
  for (const [index, item] of criteria.entries()) {
    if (!item.requirement.trim()) return `Criterion ${index + 1} needs requirement text.`;
    if (!item.primaryUrl.trim().startsWith("https://")) {
      return `Criterion ${index + 1} needs an HTTPS primary evidence URL.`;
    }
    if (item.policy === "CORROBORATED_V1" && !item.corroboratingUrl.trim().startsWith("https://")) {
      return `Criterion ${index + 1} needs an HTTPS corroborating URL.`;
    }
  }
  return null;
}
