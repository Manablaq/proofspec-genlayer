import type {
  ChallengeCorrection,
  ChallengeRecord,
  EvidenceSnapshot,
  SpecRecord,
  WriteIntent
} from "@/lib/types";

type MockState = {
  specs: Record<number, SpecRecord>;
  challenges: Record<number, ChallengeRecord>;
  corrections: Record<number, ChallengeCorrection>;
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
    reconsideration_count: 0,
    challenge_count: 1,
    latest_challenge_id: 1,
    pending_challenge_id: 0,
    release_provenance: {
      assessment_class: "SELF_SUBMITTED_CONSENSUS_ASSESSMENT",
      reference_kind: "GITHUB_CONTENT_ADDRESSED_COMMIT_LOCATOR",
      maintainer_authorized: false,
      submitter_authority_status: "NOT_VERIFIED",
      reference_existence_verified: false,
      reference_repo_reachability_verified: false
    },
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
    counter_content_length: 0,
    expires_at: 0,
    counts_toward_challenge_limit: false,
    upheld_revision: 0
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
    corrections: {},
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

export function seedMockScenario(
  scenario: "insufficient-reconsideration" | "expired-challenge" | "upheld-correction" | "release-authorization",
  submitter: string
): MockState {
  const state = resetMockState();
  const spec = state.specs[1];
  const challenge = state.challenges[1];
  spec.submitter = submitter;

  if (scenario === "insufficient-reconsideration") {
    delete state.challenges[1];
    state.challengeCount = 0;
    spec.challenge_count = 0;
    spec.latest_challenge_id = 0;
    spec.criteria[0].initial_result = "INSUFFICIENT";
    spec.criteria[0].effective_result = "INSUFFICIENT";
    spec.effective_certificate_result = "INSUFFICIENT";
    spec.initial_certificate_result = "INSUFFICIENT";
    spec.revision = 1;
    spec.reconsideration_count = 0;
  } else if (scenario === "expired-challenge") {
    spec.pending_challenge_id = challenge.id;
    challenge.state = "PENDING";
    challenge.challenge_outcome = "PENDING";
    challenge.expires_at = Math.floor(Date.now() / 1000) - 60;
  } else if (scenario === "upheld-correction") {
    spec.initial_certificate_result = "CERTIFIED";
    spec.effective_certificate_result = "INSUFFICIENT";
    spec.revision = 2;
    spec.criteria[0].initial_result = "SATISFIED";
    spec.criteria[0].effective_result = "INSUFFICIENT";
    challenge.state = "RESOLVED";
    challenge.challenge_outcome = "UPHELD";
    challenge.basis_result = "SATISFIED";
    challenge.revised_criterion_result = "INSUFFICIENT";
    challenge.counts_toward_challenge_limit = true;
    challenge.upheld_revision = 2;
    challenge.note = "Counterevidence was upheld for this test scenario.";
  } else {
    spec.state = "PENDING";
    spec.initial_certificate_result = "PENDING";
    spec.effective_certificate_result = "PENDING";
    spec.revision = 0;
  }

  return state;
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
      reconsideration_count: 0,
      challenge_count: 0,
      latest_challenge_id: 0,
      pending_challenge_id: 0,
      release_provenance: {
        assessment_class: "SELF_SUBMITTED_CONSENSUS_ASSESSMENT",
        reference_kind: "GITHUB_CONTENT_ADDRESSED_COMMIT_LOCATOR",
        maintainer_authorized: false,
        submitter_authority_status: "NOT_VERIFIED",
        reference_existence_verified: false,
        reference_repo_reachability_verified: false
      },
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

  if (intent.kind === "authorize_github_release") {
    const spec = state.specs[intent.args[0]];
    if (!spec || spec.submitter.toLowerCase() !== account.toLowerCase() || spec.state !== "PENDING") {
      throw new Error("Mock release authorization is not available for this wallet/specification.");
    }
    spec.release_provenance.maintainer_authorized = true;
    spec.release_provenance.assessment_class = "GITHUB_MANIFEST_MAINTAINER_AUTHORIZED_ASSESSMENT";
    spec.release_provenance.submitter_authority_status = "GITHUB_PROTECTED_MAIN_MANIFEST_VERIFIED";
    spec.release_provenance.reference_existence_verified = true;
    spec.release_provenance.reference_repo_reachability_verified = true;
    return { returnValue: spec.release_provenance };
  }

  if (intent.kind === "reconsider_insufficient_spec") {
    const spec = state.specs[intent.args[0]];
    if (!spec || spec.submitter.toLowerCase() !== account.toLowerCase() ||
        spec.effective_certificate_result !== "INSUFFICIENT" || spec.reconsideration_count >= 2) {
      throw new Error("Mock bounded reconsideration is not available.");
    }
    for (const criterion of spec.criteria) {
      if (criterion.initial_result === "INSUFFICIENT" && criterion.effective_result === "INSUFFICIENT") {
        criterion.effective_result = "SATISFIED";
        criterion.rationale = "Mock reconsideration recovered the previously unavailable evidence.";
      }
    }
    spec.reconsideration_count += 1;
    spec.revision += 1;
    spec.effective_certificate_result = spec.criteria.some((item) => item.effective_result === "VIOLATED")
      ? "REJECTED"
      : spec.criteria.some((item) => item.effective_result === "INSUFFICIENT") ? "INSUFFICIENT" : "CERTIFIED";
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
      counter_content_length: 0,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      counts_toward_challenge_limit: false,
      upheld_revision: 0
    };
    state.challenges[id] = challenge;
    state.challengeCount = id;
    spec.challenge_count += 1;
    spec.latest_challenge_id = id;
    spec.pending_challenge_id = id;
    return { returnValue: id };
  }

  if (intent.kind === "expire_challenge") {
    const challenge = state.challenges[intent.args[0]];
    if (!challenge || challenge.state !== "PENDING" || Date.now() < challenge.expires_at * 1000) {
      throw new Error("Mock challenge has not expired.");
    }
    challenge.state = "EXPIRED";
    challenge.challenge_outcome = "INSUFFICIENT";
    challenge.counts_toward_challenge_limit = false;
    const spec = state.specs[challenge.spec_id];
    if (spec) spec.pending_challenge_id = 0;
    return { returnValue: challenge };
  }

  if (intent.kind === "reconsider_upheld_challenge") {
    const [challengeId] = intent.args;
    const challenge = state.challenges[challengeId];
    const spec = challenge ? state.specs[challenge.spec_id] : undefined;
    if (!challenge || !spec || challenge.challenge_outcome !== "UPHELD" ||
        spec.submitter.toLowerCase() !== account.toLowerCase()) {
      throw new Error("Mock bounded correction is not available.");
    }
    const criterion = spec.criteria.find((item) => item.id === challenge.criterion_id);
    if (!criterion) throw new Error("Mock challenge criterion does not exist.");
    criterion.effective_result = challenge.basis_result;
    spec.revision += 1;
    spec.effective_certificate_result = spec.criteria.some((item) => item.effective_result === "VIOLATED")
      ? "REJECTED"
      : spec.criteria.some((item) => item.effective_result === "INSUFFICIENT") ? "INSUFFICIENT" : "CERTIFIED";
    const correction: ChallengeCorrection = {
      challenge_id: challengeId,
      spec_id: spec.id,
      requested_by: account,
      basis_revision: challenge.upheld_revision,
      outcome: "RESTORED",
      result_revision: spec.revision,
      rationale: "Mock rebuttal restores the authenticated original directional finding.",
      rebuttal_snapshot_id: `mock-rebuttal-snapshot-${challengeId}`
    };
    state.corrections[challengeId] = correction;
    return { returnValue: correction };
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
