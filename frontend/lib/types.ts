export type NetworkName = "studio-dev" | "bradbury";

export type RuntimeConfig =
  | {
      configured: false;
      network: NetworkName | null;
      contractAddress: null;
      rpcUrl: null;
      chainId: number | null;
      explorerUrl: string | null;
      mockMode: false;
      error: string;
    }
  | {
      configured: true;
      network: NetworkName;
      contractAddress: `0x${string}`;
      rpcUrl: string;
      chainId: number;
      explorerUrl: string | null;
      mockMode: boolean;
      error: null;
    };

export type CriterionRecord = {
  id: number;
  requirement: string;
  policy: string;
  freshness_policy: string;
  primary_url: string;
  primary_host: string;
  corroborating_url: string;
  corroborating_host: string;
  initial_result: string;
  effective_result: string;
  primary_assessment: string;
  corroborating_assessment: string;
  primary_version_status: string;
  corroborating_version_status: string;
  source_conflict: boolean;
  rationale: string;
  primary_evidence_status: string;
  primary_source_status: string;
  primary_snapshot_id: string;
  primary_content_sha256: string;
  primary_content_length: number;
  corroborating_evidence_status: string;
  corroborating_source_status: string;
  corroborating_snapshot_id: string;
  corroborating_content_sha256: string;
  corroborating_content_length: number;
};

export type SpecRecord = {
  id: number;
  protocol_version: string;
  submitter: string;
  release_label: string;
  release_ref: string;
  state: string;
  initial_certificate_result: string;
  effective_certificate_result: string;
  criteria: CriterionRecord[];
  revision: number;
  reconsideration_count: number;
  challenge_count: number;
  latest_challenge_id: number;
  pending_challenge_id: number;
  release_provenance: ReleaseProvenance;
};

export type ReleaseProvenance = {
  assessment_class: string;
  reference_kind: string;
  maintainer_authorized: boolean;
  submitter_authority_status: string;
  reference_existence_verified: boolean;
  reference_repo_reachability_verified: boolean;
};

export type ChallengeRecord = {
  id: number;
  spec_id: number;
  criterion_id: number;
  challenger: string;
  counter_url: string;
  counter_host: string;
  note: string;
  state: string;
  challenge_outcome: string;
  basis_result: string;
  prior_certificate_result: string;
  revised_criterion_result: string;
  counter_assessment: string;
  counter_version_status: string;
  rationale: string;
  original_primary_snapshot_id: string;
  original_corroborating_snapshot_id: string;
  original_snapshot_consistent: boolean;
  primary_live_status: string;
  corroborating_live_status: string;
  original_source_drift: boolean;
  counter_evidence_status: string;
  counter_source_status: string;
  counter_snapshot_id: string;
  counter_content_sha256: string;
  counter_content_length: number;
  expires_at: number;
  counts_toward_challenge_limit: boolean;
  upheld_revision: number;
};

export type ChallengeCorrection = {
  challenge_id: number;
  spec_id: number;
  requested_by: string;
  basis_revision: number;
  outcome: "RESTORED" | "NOT_RESTORED";
  result_revision: number;
  rationale: string;
  rebuttal_snapshot_id: string;
};

export type EvidenceSnapshot = {
  version: string;
  snapshot_id: string;
  spec_id: number;
  criterion_id: number;
  source_role: string;
  source_status: string;
  url: string;
  host: string;
  content_sha256: string;
  content_length: number;
  content: string;
};

export type WriteIntent =
  | { kind: "create_spec"; functionName: "create_spec"; args: [string, string, string]; summary: string }
  | { kind: "evaluate_spec"; functionName: "evaluate_spec"; args: [number]; summary: string }
  | { kind: "open_challenge"; functionName: "open_challenge"; args: [number, number, string, string]; summary: string }
  | { kind: "resolve_challenge"; functionName: "resolve_challenge"; args: [number]; summary: string }
  | { kind: "authorize_github_release"; functionName: "authorize_github_release"; args: [number]; summary: string }
  | { kind: "reconsider_insufficient_spec"; functionName: "reconsider_insufficient_spec"; args: [number]; summary: string }
  | { kind: "expire_challenge"; functionName: "expire_challenge"; args: [number]; summary: string }
  | { kind: "reconsider_upheld_challenge"; functionName: "reconsider_upheld_challenge"; args: [number, string, string]; summary: string };

export type WritePhase =
  | "idle"
  | "requesting-wallet"
  | "submitting"
  | "submitted"
  | "finalizing"
  | "verifying"
  | "uncertain"
  | "finalized"
  | "failed";

export type WriteResult = { hash: string; receipt: unknown };
