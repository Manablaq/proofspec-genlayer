import { describe, expect, it } from "vitest";
import { checkWalletIdentity, classifyFinalizedExecution, refreshStatsAfterFinalizedWrite, validatePendingWrite, verifyWriteTransition } from "@/lib/write-verification";
import type { ChallengeRecord, SpecRecord, WriteIntent } from "@/lib/types";

const account = "0x" + "a".repeat(40);
const spec = (overrides: Partial<SpecRecord> = {}) => ({
  id: 3, state: "PENDING", submitter: account, release_label: "v3", release_ref: "sha3",
  effective_certificate_result: "PENDING", initial_certificate_result: "PENDING",
  pending_challenge_id: 0, revision: 0, reconsideration_count: 0,
  release_provenance: {
    assessment_class: "SELF_SUBMITTED_CONSENSUS_ASSESSMENT",
    reference_kind: "GITHUB_CONTENT_ADDRESSED_COMMIT_LOCATOR",
    maintainer_authorized: false,
    submitter_authority_status: "NOT_VERIFIED",
    reference_existence_verified: false,
    reference_repo_reachability_verified: false
  }, criteria: [], ...overrides
}) as SpecRecord;
const challenge = (overrides: Partial<ChallengeRecord> = {}) => ({
  id: 5, spec_id: 3, criterion_id: 1, state: "PENDING", challenger: account,
  counter_url: "https://proof.example/c", challenge_outcome: "PENDING",
  expires_at: 0, counts_toward_challenge_limit: false, upheld_revision: 0, ...overrides
}) as ChallengeRecord;

describe("Stage 5 finalized-state safeguards", () => {
  it("keeps the finalized result when a subsequent dashboard refresh fails", async () => {
    const warnings: string[] = [];
    await expect(refreshStatsAfterFinalizedWrite(
      async () => { throw new Error("RPC temporarily unavailable"); },
      (warning) => warnings.push(warning)
    )).resolves.toBeUndefined();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("finalized successfully");
    expect(warnings[0]).toContain("do not resubmit");
  });
  it("does not report a warning after a successful finalized-state refresh", async () => {
    const warnings: string[] = [];
    let refreshed = false;
    await refreshStatsAfterFinalizedWrite(
      async () => { refreshed = true; },
      (warning) => warnings.push(warning)
    );
    expect(refreshed).toBe(true);
    expect(warnings).toHaveLength(0);
  });
  it("rejects changed wallet identity or chain", () => {
    expect(() => checkWalletIdentity([account], "0xf22d", account, 61997)).not.toThrow();
    expect(() => checkWalletIdentity(["0x" + "b".repeat(40)], "0xf22d", account, 61997)).toThrow();
    expect(() => checkWalletIdentity([account], "0xf22e", account, 61997)).toThrow();
  });
  it("never equates consensus finality with successful execution", () => {
    expect(classifyFinalizedExecution({statusName:"FINALIZED",txExecutionResultName:"FINISHED_WITH_RETURN"})).toBe("SUCCEEDED");
    expect(classifyFinalizedExecution({statusName:"FINALIZED",txExecutionResultName:"FINISHED_WITH_ERROR"})).toBe("FAILED");
    expect(classifyFinalizedExecution({statusName:"FINALIZED",txExecutionResultName:"NOT_VOTED"})).toBe("UNKNOWN");
    expect(classifyFinalizedExecution({statusName:"PENDING",txExecutionResultName:"FINISHED_WITH_RETURN"})).toBe("UNKNOWN");
    expect(classifyFinalizedExecution(null)).toBe("UNKNOWN");
  });
  it("rejects unknown or corrupt outstanding transactions", () => {
    expect(() => validatePendingWrite({ version: 1, hash: "bad" })).toThrow();
    expect(() => validatePendingWrite(null)).toThrow();
  });
  it("checks newly created spec identity and authorization", () => {
    const i = { kind: "create_spec", functionName: "create_spec", args: ["v3", "sha3", "{}"], summary: "x" } as WriteIntent;
    expect(() => verifyWriteTransition(i, {specCount: 2}, {specCount: 3, spec: spec()}, account)).not.toThrow();
    expect(() => verifyWriteTransition(i, {specCount: 2}, {specCount: 3, spec: spec({submitter: "0x" + "b".repeat(40)})}, account)).toThrow();
    expect(() => verifyWriteTransition(i, {specCount: 2}, {specCount: 4, spec: spec()}, account)).toThrow();
  });
  it("requires evaluate PENDING → EVALUATED with an actual result", () => {
    const i = { kind: "evaluate_spec", functionName: "evaluate_spec", args: [3], summary: "x" } as WriteIntent;
    const after = spec({state: "EVALUATED", initial_certificate_result: "CERTIFIED", effective_certificate_result: "CERTIFIED"});
    expect(() => verifyWriteTransition(i, {spec: spec()}, {spec: after}, account)).not.toThrow();
    expect(() => verifyWriteTransition(i, {spec: after}, {spec: after}, account)).toThrow();
  });
  it("requires new challenge exact identity", () => {
    const i = { kind: "open_challenge", functionName: "open_challenge", args: [3,1,"https://proof.example/c","n"],summary:"x" } as WriteIntent;
    expect(() => verifyWriteTransition(i, {spec: spec(), challengeCount: 4}, {spec: spec({pending_challenge_id:5}),challengeCount:5,challenge:challenge()}, account)).not.toThrow();
    expect(() => verifyWriteTransition(i, {spec: spec(), challengeCount: 4}, {spec: spec({pending_challenge_id:5}),challengeCount:5,challenge:challenge({counter_url:"https://evil.example"})}, account)).toThrow();
  });
  it("requires resolution to close exactly the pending challenge", () => {
    const i = { kind: "resolve_challenge", functionName: "resolve_challenge", args: [5],summary:"x" } as WriteIntent;
    const before = { spec: spec({pending_challenge_id:5}),challenge:challenge() };
    expect(() => verifyWriteTransition(i, before, {spec: spec(),challenge:challenge({state:"RESOLVED",challenge_outcome:"REJECTED"})}, account)).not.toThrow();
    expect(() => verifyWriteTransition(i, before, {spec: spec(),challenge:challenge({state:"PENDING"})}, account)).toThrow();
  });
  it("requires an upheld resolution to create exactly one quota-counted revision", () => {
    const i = { kind: "resolve_challenge", functionName: "resolve_challenge", args: [5],summary:"x" } as WriteIntent;
    const criteria = [{id:1,initial_result:"SATISFIED",effective_result:"SATISFIED"}] as unknown as SpecRecord["criteria"];
    const beforeSpec = spec({state:"EVALUATED",pending_challenge_id:5,revision:1,initial_certificate_result:"CERTIFIED",effective_certificate_result:"CERTIFIED",criteria});
    const beforeChallenge = challenge({});
    const afterSpec = spec({state:"EVALUATED",pending_challenge_id:0,revision:2,initial_certificate_result:"CERTIFIED",effective_certificate_result:"REJECTED",criteria:[{id:1,initial_result:"SATISFIED",effective_result:"VIOLATED"}] as unknown as SpecRecord["criteria"]});
    const afterChallenge = challenge({state:"RESOLVED",challenge_outcome:"UPHELD",revised_criterion_result:"VIOLATED",counts_toward_challenge_limit:true,upheld_revision:2});
    expect(() => verifyWriteTransition(i,{spec:beforeSpec,challenge:beforeChallenge},{spec:afterSpec,challenge:afterChallenge},account)).not.toThrow();
    expect(() => verifyWriteTransition(i,{spec:beforeSpec,challenge:beforeChallenge},{spec:afterSpec,challenge:{...afterChallenge,counts_toward_challenge_limit:false}},account)).toThrow();
    expect(() => verifyWriteTransition(i,{spec:beforeSpec,challenge:beforeChallenge},{spec:spec({...afterSpec,revision:3}),challenge:afterChallenge},account)).toThrow();
  });
  it("verifies maintainer authorization without inferring it from a URL", () => {
    const i = { kind:"authorize_github_release",functionName:"authorize_github_release",args:[3],summary:"x" } as WriteIntent;
    const before = spec({state:"PENDING"});
    const after = spec({state:"PENDING",release_provenance:{...before.release_provenance,maintainer_authorized:true,submitter_authority_status:"GITHUB_PROTECTED_MAIN_MANIFEST_VERIFIED"}});
    expect(() => verifyWriteTransition(i,{spec:before},{spec:after},account)).not.toThrow();
    expect(() => verifyWriteTransition(i,{spec:before},{spec:spec({state:"PENDING"})},account)).toThrow();
  });
  it("requires insufficient reconsideration to preserve the initial result and unrelated criteria", () => {
    const i = {kind:"reconsider_insufficient_spec",functionName:"reconsider_insufficient_spec",args:[3],summary:"x"} as WriteIntent;
    const criteria = [
      {id:1,initial_result:"INSUFFICIENT",effective_result:"INSUFFICIENT"},
      {id:2,initial_result:"VIOLATED",effective_result:"VIOLATED"}
    ];
    const before = spec({state:"EVALUATED",revision:1,reconsideration_count:0,initial_certificate_result:"INSUFFICIENT",effective_certificate_result:"INSUFFICIENT",criteria} as Partial<SpecRecord>);
    const after = spec({state:"EVALUATED",revision:2,reconsideration_count:1,initial_certificate_result:"INSUFFICIENT",effective_certificate_result:"REJECTED",criteria:[
      {id:1,initial_result:"INSUFFICIENT",effective_result:"SATISFIED"},
      {id:2,initial_result:"VIOLATED",effective_result:"VIOLATED"}
    ]} as Partial<SpecRecord>);
    expect(() => verifyWriteTransition(i,{spec:before},{spec:after},account)).not.toThrow();
    const noProgress = spec({...before,revision:2,reconsideration_count:1} as Partial<SpecRecord>);
    expect(() => verifyWriteTransition(i,{spec:before},{spec:noProgress},account)).toThrow();
    const tampered = spec({...after,criteria:[{id:1,initial_result:"SATISFIED",effective_result:"SATISFIED"},{id:2,initial_result:"VIOLATED",effective_result:"VIOLATED"}]} as Partial<SpecRecord>);
    expect(() => verifyWriteTransition(i,{spec:before},{spec:tampered},account)).toThrow();
  });
  it("requires expired challenge recovery to preserve certificate and revision", () => {
    const i = {kind:"expire_challenge",functionName:"expire_challenge",args:[5],summary:"x"} as WriteIntent;
    const beforeSpec = spec({state:"EVALUATED",pending_challenge_id:5,revision:1,effective_certificate_result:"CERTIFIED"});
    const afterSpec = spec({state:"EVALUATED",pending_challenge_id:0,revision:1,effective_certificate_result:"CERTIFIED"});
    const beforeChallenge = challenge({});
    const afterChallenge = challenge({state:"EXPIRED",challenge_outcome:"INSUFFICIENT"});
    expect(() => verifyWriteTransition(i,{spec:beforeSpec,challenge:beforeChallenge},{spec:afterSpec,challenge:afterChallenge},account)).not.toThrow();
    expect(() => verifyWriteTransition(i,{spec:beforeSpec,challenge:beforeChallenge},{spec:spec({...afterSpec,effective_certificate_result:"REJECTED"}),challenge:afterChallenge},account)).toThrow();
  });
  it("verifies bounded correction record and only permits a revision-linked restoration", () => {
    const i = {kind:"reconsider_upheld_challenge",functionName:"reconsider_upheld_challenge",args:[5,"https://rebuttal.example/e","reason"],summary:"x"} as WriteIntent;
    const beforeSpec = spec({state:"EVALUATED",revision:2,initial_certificate_result:"CERTIFIED",effective_certificate_result:"INSUFFICIENT"});
    const upheld = challenge({state:"RESOLVED",challenge_outcome:"UPHELD",upheld_revision:2,basis_result:"SATISFIED"});
    const correction = {challenge_id:5,spec_id:3,requested_by:account,basis_revision:2,outcome:"RESTORED" as const,result_revision:3,rationale:"Counter evidence misclassified",rebuttal_snapshot_id:"snap"};
    const afterSpec = spec({state:"EVALUATED",revision:3,initial_certificate_result:"CERTIFIED",effective_certificate_result:"CERTIFIED",criteria:[{id:1,effective_result:"SATISFIED"} as unknown as SpecRecord["criteria"][number]]});
    expect(() => verifyWriteTransition(i,{spec:beforeSpec,challenge:upheld},{spec:afterSpec,challenge:upheld,correction},account)).not.toThrow();
    expect(() => verifyWriteTransition(i,{spec:beforeSpec,challenge:upheld},{spec:beforeSpec,challenge:upheld,correction:{...correction,requested_by:"0x"+"b".repeat(40)}},account)).toThrow();
  });
});
