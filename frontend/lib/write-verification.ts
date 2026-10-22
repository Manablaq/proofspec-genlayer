import type { ChallengeCorrection, ChallengeRecord, SpecRecord, WriteIntent } from "@/lib/types";

export type ObservedWriteState = {
  specCount?: number;
  challengeCount?: number;
  spec?: SpecRecord;
  challenge?: ChallengeRecord;
  correction?: ChallengeCorrection | null;
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
      !["create_spec", "evaluate_spec", "open_challenge", "resolve_challenge",
        "authorize_github_release", "reconsider_insufficient_spec", "expire_challenge",
        "reconsider_upheld_challenge"].includes(p.intent.kind) ||
      !Array.isArray(p.intent.args)) {
    throw new Error("Stored outstanding-write journal is malformed. Preserve it and reconcile manually.");
  }
  return p as PendingWrite;
}

function deriveCertificateResult(criteria: SpecRecord["criteria"]): string | null {
  if (criteria.length === 0 || criteria.some((item) =>
    !["SATISFIED", "VIOLATED", "INSUFFICIENT"].includes(item.effective_result)
  )) return null;
  if (criteria.some((item) => item.effective_result === "INSUFFICIENT")) return "INSUFFICIENT";
  if (criteria.some((item) => item.effective_result === "VIOLATED")) return "REJECTED";
  return "CERTIFIED";
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
      const oldSpec = before.spec;
      const oldChallenge = before.challenge;
      const nextSpec = after.spec;
      const nextChallenge = after.challenge;
      if (!oldSpec || !oldChallenge || !nextSpec || !nextChallenge) {
        throw new Error("Finalized write has no verified expected state transition: challenge readback is missing");
      }
      if (oldChallenge.state !== "PENDING" ||
          oldSpec.pending_challenge_id !== intent.args[0] ||
          nextChallenge.id !== intent.args[0] ||
          nextChallenge.state !== "RESOLVED" ||
          !["UPHELD", "REJECTED", "INSUFFICIENT"].includes(nextChallenge.challenge_outcome) ||
          nextSpec.pending_challenge_id !== 0 ||
          nextSpec.id !== oldSpec.id ||
          nextChallenge.spec_id !== oldSpec.id ||
          nextChallenge.criterion_id !== oldChallenge.criterion_id) {
        fail("challenge-resolution state does not match");
      }
      if (nextChallenge.challenge_outcome === "UPHELD") {
        const criterion = nextSpec.criteria.find((item) => item.id === oldChallenge.criterion_id);
        if (nextSpec.revision !== oldSpec.revision + 1 ||
            nextSpec.initial_certificate_result !== oldSpec.initial_certificate_result ||
            !criterion || criterion.effective_result !== nextChallenge.revised_criterion_result ||
            nextChallenge.counts_toward_challenge_limit !== true ||
            nextChallenge.upheld_revision !== nextSpec.revision ||
            nextSpec.effective_certificate_result !== deriveCertificateResult(nextSpec.criteria)) {
          fail("upheld challenge did not create the expected bounded revision");
        }
      } else if (nextSpec.revision !== oldSpec.revision ||
          nextSpec.effective_certificate_result !== oldSpec.effective_certificate_result ||
          nextChallenge.counts_toward_challenge_limit !== false) {
        fail("rejected or inconclusive challenge unexpectedly changed the certificate");
      }
      return;
    }
    case "authorize_github_release": {
      if (before.spec?.state !== "PENDING" || !after.spec ||
          after.spec.id !== intent.args[0] ||
          after.spec.submitter.toLowerCase() !== account.toLowerCase() ||
          before.spec.release_provenance?.maintainer_authorized !== false ||
          after.spec.release_provenance?.maintainer_authorized !== true ||
          after.spec.release_provenance?.submitter_authority_status !== "GITHUB_PROTECTED_MAIN_MANIFEST_VERIFIED") {
        fail("maintainer authorization proof is not finalized for this submitter and release");
      }
      return;
    }
    case "reconsider_insufficient_spec": {
      const oldSpec = before.spec;
      const nextSpec = after.spec;
      if (!oldSpec || !nextSpec) {
        throw new Error("Finalized write has no verified expected state transition: specification readback is missing");
      }
      if (oldSpec.id !== intent.args[0] || nextSpec.id !== oldSpec.id ||
          oldSpec.state !== "EVALUATED" || oldSpec.effective_certificate_result !== "INSUFFICIENT" ||
          oldSpec.submitter.toLowerCase() !== account.toLowerCase() ||
          nextSpec.state !== "EVALUATED" || nextSpec.revision !== oldSpec.revision + 1 ||
          nextSpec.reconsideration_count !== oldSpec.reconsideration_count + 1 ||
          nextSpec.initial_certificate_result !== oldSpec.initial_certificate_result ||
          nextSpec.criteria.length !== oldSpec.criteria.length ||
          nextSpec.effective_certificate_result !== deriveCertificateResult(nextSpec.criteria)) {
        fail("bounded reconsideration did not advance while preserving the original decision");
      }
      let reconsideredCriterion = false;
      for (const prior of oldSpec.criteria) {
        const current = nextSpec.criteria.find((item) => item.id === prior.id);
        if (!current) {
          throw new Error("Finalized write has no verified expected state transition: reconsidered criterion readback is missing");
        }
        if (current.initial_result !== prior.initial_result ||
            (prior.initial_result !== "INSUFFICIENT" || prior.effective_result !== "INSUFFICIENT") &&
              current.effective_result !== prior.effective_result) {
          fail("reconsideration altered a criterion outside the originally insufficient set");
        }
        if (prior.initial_result === "INSUFFICIENT" && prior.effective_result === "INSUFFICIENT" &&
            current.effective_result !== prior.effective_result) reconsideredCriterion = true;
      }
      if (!reconsideredCriterion) {
        fail("reconsideration did not update any originally insufficient criterion");
      }
      return;
    }
    case "expire_challenge": {
      if (!before.spec || !before.challenge || !after.spec || !after.challenge ||
          before.challenge.id !== intent.args[0] || before.challenge.state !== "PENDING" ||
          before.spec.pending_challenge_id !== intent.args[0] ||
          after.challenge.id !== intent.args[0] || after.challenge.state !== "EXPIRED" ||
          after.challenge.challenge_outcome !== "INSUFFICIENT" ||
          after.challenge.counts_toward_challenge_limit !== false ||
          after.spec.id !== before.spec.id || after.spec.pending_challenge_id !== 0 ||
          after.spec.effective_certificate_result !== before.spec.effective_certificate_result ||
          after.spec.revision !== before.spec.revision) {
        fail("expired challenge did not release pending state without changing the certificate");
      }
      return;
    }
    case "reconsider_upheld_challenge": {
      const oldSpec = before.spec;
      const nextSpec = after.spec;
      const challenge = before.challenge;
      const correction = after.correction;
      if (!oldSpec || !nextSpec || !challenge || !correction) {
        throw new Error("Finalized write has no verified expected state transition: correction readback is missing");
      }
      if (
          challenge.id !== intent.args[0] || challenge.spec_id !== oldSpec.id ||
          challenge.state !== "RESOLVED" || challenge.challenge_outcome !== "UPHELD" ||
          oldSpec.submitter.toLowerCase() !== account.toLowerCase() ||
          oldSpec.effective_certificate_result !== "INSUFFICIENT" ||
          oldSpec.revision !== challenge.upheld_revision ||
          correction.challenge_id !== challenge.id || correction.spec_id !== oldSpec.id ||
          correction.requested_by.toLowerCase() !== account.toLowerCase() ||
          correction.basis_revision !== oldSpec.revision ||
          !["RESTORED", "NOT_RESTORED"].includes(correction.outcome) ||
          correction.result_revision !== nextSpec.revision) {
        fail("bounded correction record does not match the upheld decision and submitter");
      }
      if (correction.outcome === "RESTORED") {
        if (nextSpec.revision !== oldSpec.revision + 1 ||
            nextSpec.initial_certificate_result !== oldSpec.initial_certificate_result ||
            nextSpec.criteria.find((item) => item.id === challenge.criterion_id)?.effective_result !== challenge.basis_result ||
            nextSpec.effective_certificate_result !== deriveCertificateResult(nextSpec.criteria)) {
          fail("restoration did not create a revision linked to the original directional result");
        }
      } else if (nextSpec.revision !== oldSpec.revision ||
          nextSpec.effective_certificate_result !== oldSpec.effective_certificate_result) {
        fail("unsuccessful correction unexpectedly changed the certificate");
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
