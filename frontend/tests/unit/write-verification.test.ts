import { describe, expect, it } from "vitest";
import { checkWalletIdentity, classifyFinalizedExecution, refreshStatsAfterFinalizedWrite, validatePendingWrite, verifyWriteTransition } from "@/lib/write-verification";
import type { ChallengeRecord, SpecRecord, WriteIntent } from "@/lib/types";

const account = "0x" + "a".repeat(40);
const spec = (overrides: Partial<SpecRecord> = {}) => ({
  id: 3, state: "PENDING", submitter: account, release_label: "v3", release_ref: "sha3",
  effective_certificate_result: "PENDING", initial_certificate_result: "PENDING",
  pending_challenge_id: 0, ...overrides
}) as SpecRecord;
const challenge = (overrides: Partial<ChallengeRecord> = {}) => ({
  id: 5, spec_id: 3, criterion_id: 1, state: "PENDING", challenger: account,
  counter_url: "https://proof.example/c", challenge_outcome: "PENDING", ...overrides
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
});
