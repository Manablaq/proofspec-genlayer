import type {
  ChallengeRecord,
  EvidenceSnapshot,
  SpecRecord,
  WriteIntent
} from "@/lib/types";

type MockState = {
  specs: Record<number, SpecRecord>;
  challenges: Record<number, ChallengeRecord>;
  snapshots: Record<string, EvidenceSnapshot>;
  specCount: number;
  challengeCount: number;
  txCount: number;
};

const content =
  "# ProofSpec release evidence\nThe release includes the bounded requirement and reproducible verification.";
const contentHash =
  "8d8b97a1c43fc909be63fa36fd50a15a17d79a04eb9257993835d723d6cc9d1a";

function fixture(): MockState {
  const snapshotId =
    "snapshot-000000000000000000000000000000000000000000000000000000000001";

  const spec: SpecRecord = {
    id: 1,
    protocol_version: "proofspec-v1",
    submitter: "0x2222222222222222222222222222222222222222",
    release_label: "ProofSpec RC",
    release_ref: "github:Manablaq/proofspec-genlayer@803826a",
    state: "EVALUATED",
    initial_certificate_result: "CERTIFIED",
    effective_certificate_result: "CERTIFIED",
    revision: 1,
    challenge_count: 1,
    latest_challenge_id: 1,
    pending_challenge_id: 0,
    criteria: [
      {
        id: 1,
        requirement: "The release exposes reproducible frontend verification.",
        policy: "AUTHORITATIVE_V1",
        freshness_policy: "RELEASE_BOUND_V1",
        primary_url: "https://github.com/example/proofspec/blob/immutable/release.md",
        primary_host: "github.com",
        corroborating_url: "",
        corroborating_host: "",
        initial_result: "SATISFIED",
        effective_result: "SATISFIED",
        primary_assessment: "SUPPORTS",
        corroborating_assessment: "NOT_APPLICABLE",
        primary_version_status: "MATCHES_RELEASE",
        corroborating_version_status: "NOT_APPLICABLE",
        source_conflict: false,
        rationale: "The immutable release evidence directly supports the requirement.",
        primary_evidence_status: "AVAILABLE",
        primary_source_status: "AVAILABLE",
        primary_snapshot_id: snapshotId,
        primary_content_sha256: contentHash,
        primary_content_length: content.length,
        corroborating_evidence_status: "NOT_APPLICABLE",
        corroborating_source_status: "NOT_APPLICABLE",
        corroborating_snapshot_id: "",
        corroborating_content_sha256: "",
        corroborating_content_length: 0
      }
    ]
  };

  const challenge: ChallengeRecord = {
    id: 1,
    spec_id: 1,
    criterion_id: 1,
    challenger: "0x3333333333333333333333333333333333333333",
    counter_url: "https://review.example/evidence/release",
    counter_host: "review.example",
    note: "Independent review confirms the same release evidence.",
    state: "RESOLVED",
    challenge_outcome: "REJECTED",
    basis_result: "SATISFIED",
    prior_certificate_result: "CERTIFIED",
    revised_criterion_result: "SATISFIED",
    counter_assessment: "SUPPORTS",
    counter_version_status: "MATCHES_RELEASE",
    rationale: "Counter evidence did not disturb the certified result.",
    original_primary_snapshot_id: snapshotId,
    original_corroborating_snapshot_id: "",
    original_snapshot_consistent: true,
    primary_live_status: "UNCHANGED",
    corroborating_live_status: "NOT_APPLICABLE",
    original_source_drift: false,
    counter_evidence_status: "AVAILABLE",
    counter_source_status: "AVAILABLE",
    counter_snapshot_id: "",
    counter_content_sha256: "",
    counter_content_length: 0
  };

  const snapshot: EvidenceSnapshot = {
    version: "proofspec-snapshot-v1",
    snapshot_id: snapshotId,
    spec_id: 1,
    criterion_id: 1,
    source_role: "PRIMARY",
    source_status: "AVAILABLE",
    url: spec.criteria[0].primary_url,
    host: "github.com",
    content_sha256: contentHash,
    content_length: content.length,
    content
  };

  return {
    specs: { 1: spec },
    challenges: { 1: challenge },
    snapshots: { [snapshotId]: snapshot },
    specCount: 1,
    challengeCount: 1,
    txCount: 0
  };
}

declare global {
  var __PROOFSPEC_MOCK_STATE__: MockState | undefined;
}

export function mockState(): MockState {
  if (!globalThis.__PROOFSPEC_MOCK_STATE__) {
    globalThis.__PROOFSPEC_MOCK_STATE__ = fixture();
  }
  return globalThis.__PROOFSPEC_MOCK_STATE__;
}

export function resetMockState(): MockState {
  globalThis.__PROOFSPEC_MOCK_STATE__ = fixture();
  return globalThis.__PROOFSPEC_MOCK_STATE__;
}

function newSnapshotId(specId: number, criterionId: number): string {
  return `snapshot-${String(specId).padStart(58, "0")}-${criterionId}`;
}

export function applyMockWrite(
  intent: WriteIntent,
  account: string
): { returnValue: unknown } {
  const state = mockState();

  if (intent.kind === "create_spec") {
    const id = state.specCount + 1;
    const [releaseLabel, releaseRef, criteriaJson] = intent.args;
    const rawCriteria = JSON.parse(criteriaJson) as Array<Record<string, string>>;

    state.specs[id] = {
      id,
      protocol_version: "proofspec-v1",
      submitter: account,
      release_label: releaseLabel,
      release_ref: releaseRef,
      state: "PENDING",
      initial_certificate_result: "UNRESOLVED",
      effective_certificate_result: "UNRESOLVED",
      revision: 0,
      challenge_count: 0,
      latest_challenge_id: 0,
      pending_challenge_id: 0,
      criteria: rawCriteria.map((criterion, index) => ({
        id: index + 1,
        requirement: criterion.requirement,
        policy: criterion.policy,
        freshness_policy: criterion.freshness_policy,
        primary_url: criterion.primary_url,
        primary_host: new URL(criterion.primary_url).hostname,
        corroborating_url: criterion.corroborating_url || "",
        corroborating_host: criterion.corroborating_url
          ? new URL(criterion.corroborating_url).hostname
          : "",
        initial_result: "UNRESOLVED",
        effective_result: "UNRESOLVED",
        primary_assessment: "UNRESOLVED",
        corroborating_assessment: "UNRESOLVED",
        primary_version_status: "NOT_APPLICABLE",
        corroborating_version_status: "NOT_APPLICABLE",
        source_conflict: false,
        rationale: "",
        primary_evidence_status: "NOT_APPLICABLE",
        primary_source_status: "NOT_APPLICABLE",
        primary_snapshot_id: "",
        primary_content_sha256: "",
        primary_content_length: 0,
        corroborating_evidence_status: "NOT_APPLICABLE",
        corroborating_source_status: "NOT_APPLICABLE",
        corroborating_snapshot_id: "",
        corroborating_content_sha256: "",
        corroborating_content_length: 0
      }))
    };
    state.specCount = id;
    return { returnValue: id };
  }

  if (intent.kind === "evaluate_spec") {
    const id = intent.args[0];
    const spec = state.specs[id];
    if (!spec) throw new Error("Mock specification does not exist.");

    spec.state = "EVALUATED";
    spec.initial_certificate_result = "CERTIFIED";
    spec.effective_certificate_result = "CERTIFIED";
    spec.revision = 1;

    for (const criterion of spec.criteria) {
      criterion.initial_result = "SATISFIED";
      criterion.effective_result = "SATISFIED";
      criterion.primary_assessment = "SUPPORTS";
      criterion.primary_version_status =
        criterion.freshness_policy === "RELEASE_BOUND_V1"
          ? "MATCHES_RELEASE"
          : "NOT_APPLICABLE";
      criterion.primary_evidence_status = "AVAILABLE";
      criterion.primary_source_status = "AVAILABLE";
      criterion.rationale = "Mocked evidence supports this criterion.";

      const snapshotId = newSnapshotId(id, criterion.id);
      const body = `Mock evidence for specification ${id}, criterion ${criterion.id}.`;
      const digest =
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      criterion.primary_snapshot_id = snapshotId;
      criterion.primary_content_sha256 = digest;
      criterion.primary_content_length = body.length;

      state.snapshots[snapshotId] = {
        version: "proofspec-snapshot-v1",
        snapshot_id: snapshotId,
        spec_id: id,
        criterion_id: criterion.id,
        source_role: "PRIMARY",
        source_status: "AVAILABLE",
        url: criterion.primary_url,
        host: criterion.primary_host,
        content_sha256: digest,
        content_length: body.length,
        content: body
      };
    }
    return { returnValue: spec };
  }

  if (intent.kind === "open_challenge") {
    const [specId, criterionId, counterUrl, note] = intent.args;
    const spec = state.specs[specId];
    if (!spec) throw new Error("Mock specification does not exist.");

    const id = state.challengeCount + 1;
    const challenge: ChallengeRecord = {
      id,
      spec_id: specId,
      criterion_id: criterionId,
      challenger: account,
      counter_url: counterUrl,
      counter_host: new URL(counterUrl).hostname,
      note,
      state: "PENDING",
      challenge_outcome: "PENDING",
      basis_result: spec.criteria[criterionId - 1]?.effective_result || "SATISFIED",
      prior_certificate_result: spec.effective_certificate_result,
      revised_criterion_result: spec.criteria[criterionId - 1]?.effective_result || "SATISFIED",
      counter_assessment: "UNRESOLVED",
      counter_version_status: "NOT_APPLICABLE",
      rationale: "",
      original_primary_snapshot_id: spec.criteria[criterionId - 1]?.primary_snapshot_id || "",
      original_corroborating_snapshot_id:
        spec.criteria[criterionId - 1]?.corroborating_snapshot_id || "",
      original_snapshot_consistent: true,
      primary_live_status: "NOT_CHECKED",
      corroborating_live_status: "NOT_CHECKED",
      original_source_drift: false,
      counter_evidence_status: "NOT_APPLICABLE",
      counter_source_status: "NOT_APPLICABLE",
      counter_snapshot_id: "",
      counter_content_sha256: "",
      counter_content_length: 0
    };
    state.challenges[id] = challenge;
    state.challengeCount = id;
    spec.challenge_count += 1;
    spec.latest_challenge_id = id;
    spec.pending_challenge_id = id;
    return { returnValue: id };
  }

  const challenge = state.challenges[intent.args[0]];
  if (!challenge) throw new Error("Mock challenge does not exist.");
  challenge.state = "RESOLVED";
  challenge.challenge_outcome = "REJECTED";
  challenge.counter_assessment = "SUPPORTS";
  challenge.rationale = "Mock counter evidence does not disturb the existing result.";
  const spec = state.specs[challenge.spec_id];
  if (spec) spec.pending_challenge_id = 0;
  return { returnValue: challenge };
}
