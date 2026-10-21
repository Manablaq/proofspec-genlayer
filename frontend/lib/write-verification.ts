import type { ChallengeRecord, SpecRecord, WriteIntent } from "@/lib/types";

export type ObservedWriteState = {
  specCount?: number;
  challengeCount?: number;
  spec?: SpecRecord;
  challenge?: ChallengeRecord;
};

export type PendingWrite = {
  version: 1;
  hash: string | null;
  chainId: number;
  contractAddress: string;
  account: string;
  intent: WriteIntent;
  before: ObservedWriteState;
  submittedAt: string;
};

export const PENDING_WRITE_KEY = "proofspec:outstanding-write:v1";

export class UncertainWriteError extends Error {
  readonly hash: string | null;
  constructor(message: string, hash: string | null = null) {
    super(message);
    this.name = "UncertainWriteError";
    this.hash = hash;
  }
}

export function checkWalletIdentity(
  accounts: unknown,
  chain: unknown,
  expectedAccount: string,
  expectedChainId: number
): void {
  if (!Array.isArray(accounts) ||
      typeof accounts[0] !== "string" ||
      accounts[0].toLowerCase() !== expectedAccount.toLowerCase()) {
    throw new Error("Active wallet account changed before signing. Reconnect and review the write.");
  }
  if (typeof chain !== "string" || !/^0x[0-9a-f]+$/i.test(chain) ||
      BigInt(chain) !== BigInt(expectedChainId)) {
    throw new Error("Wallet chain changed before signing. Switch back and review the write.");
  }
}

export function classifyFinalizedExecution(receipt: unknown): "SUCCEEDED" | "FAILED" | "UNKNOWN" {
  if (!receipt || typeof receipt !== "object") return "UNKNOWN";
  const value = receipt as { statusName?: unknown; txExecutionResultName?: unknown };
  if (typeof value.statusName !== "string" ||
      value.statusName.toUpperCase() !== "FINALIZED") return "UNKNOWN";
  if (value.txExecutionResultName === "FINISHED_WITH_RETURN") return "SUCCEEDED";
  if (["FINISHED_WITH_ERROR", "TIMEOUT", "NONDET_DISAGREE", "DETERMINISTIC_VIOLATION"].includes(
    String(value.txExecutionResultName)
  )) return "FAILED";
  return "UNKNOWN";
}

export function validatePendingWrite(value: unknown): PendingWrite {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Stored outstanding-write journal is invalid. Do not resubmit blindly.");
  }
  const p = value as Partial<PendingWrite>;
  if (p.version !== 1 || (p.hash !== null && (typeof p.hash !== "string" || !/^0x[0-9a-f]{64}$/i.test(p.hash))) ||
      typeof p.chainId !== "number" || !Number.isSafeInteger(p.chainId) ||
      typeof p.contractAddress !== "string" || !/^0x[0-9a-f]{40}$/i.test(p.contractAddress) ||
      typeof p.account !== "string" || !/^0x[0-9a-f]{40}$/i.test(p.account) ||
      typeof p.submittedAt !== "string" || typeof p.before !== "object" || !p.before ||
      !p.intent || typeof p.intent !== "object" ||
      !["create_spec", "evaluate_spec", "open_challenge", "resolve_challenge"].includes(p.intent.kind) ||
      !Array.isArray(p.intent.args)) {
    throw new Error("Stored outstanding-write journal is malformed. Preserve it and reconcile manually.");
  }
  return p as PendingWrite;
}

export function verifyWriteTransition(
  intent: WriteIntent,
  before: ObservedWriteState,
  after: ObservedWriteState,
  account: string
): void {
  const fail = (reason: string): never => {
    throw new Error("Finalized write has no verified expected state transition: " + reason);
  };
  switch (intent.kind) {
    case "create_spec": {
      if (before.specCount === undefined ||
          after.specCount !== before.specCount + 1 ||
          !after.spec || after.spec.id !== after.specCount ||
          after.spec.state !== "PENDING" ||
          after.spec.submitter.toLowerCase() !== account.toLowerCase() ||
          after.spec.release_label !== intent.args[0] ||
          after.spec.release_ref !== intent.args[1]) fail("new specification identity does not match");
      return;
    }
    case "evaluate_spec": {
      if (before.spec?.state !== "PENDING" || !after.spec ||
          after.spec.id !== intent.args[0] ||
          after.spec.state !== "EVALUATED" ||
          after.spec.initial_certificate_result === "PENDING" ||
          !["CERTIFIED", "REJECTED", "INSUFFICIENT"].includes(after.spec.effective_certificate_result)) {
        fail("evaluation state does not match");
      }
      return;
    }
    case "open_challenge": {
      if (before.spec?.pending_challenge_id !== 0 ||
          before.challengeCount === undefined || after.challengeCount === undefined ||
          after.challengeCount <= before.challengeCount ||
          !after.spec || !after.challenge ||
          after.spec.pending_challenge_id === 0 ||
          after.spec.pending_challenge_id !== after.challenge.id ||
          after.challenge.spec_id !== intent.args[0] ||
          after.challenge.criterion_id !== intent.args[1] ||
          after.challenge.counter_url !== intent.args[2] ||
          after.challenge.challenger.toLowerCase() !== account.toLowerCase() ||
          after.challenge.state !== "PENDING") {
        fail("new challenge identity does not match");
      }
      return;
    }
    case "resolve_challenge": {
      if (before.challenge?.state !== "PENDING" ||
          before.spec?.pending_challenge_id !== intent.args[0] ||
          !after.spec || !after.challenge ||
          after.challenge.id !== intent.args[0] ||
          after.challenge.state !== "RESOLVED" ||
          after.challenge.challenge_outcome === "PENDING" ||
          after.spec.pending_challenge_id !== 0 ||
          after.spec.id !== before.spec.id) {
        fail("challenge-resolution state does not match");
      }
      return;
    }
  }
}

/** A dashboard read failure after verified finality must never cause a resubmit cue. */
export async function refreshStatsAfterFinalizedWrite(
  refresh: () => Promise<void>,
  reportWarning: (message: string) => void
): Promise<void> {
  try {
    await refresh();
  } catch {
    reportWarning(
      "Transaction finalized successfully, but dashboard statistics could not refresh. " +
      "Refresh the page to update totals; do not resubmit the transaction."
    );
  }
}
