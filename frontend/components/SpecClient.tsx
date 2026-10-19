"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusPill } from "@/components/StatusPill";
import { WriteReviewDialog } from "@/components/WriteReviewDialog";
import { useProofSpec } from "@/components/ProofSpecProvider";
import { shortAddress, shortHash } from "@/lib/format";
import type {
  ChallengeRecord,
  EvidenceSnapshot,
  SpecRecord,
  WriteIntent
} from "@/lib/types";

export function SpecClient({ specId }: { specId: number }) {
  const {
    config,
    gateway,
    walletAddress,
    writePhase,
    writeDetail,
    pendingWrite,
    executeWrite,
    clearWriteState
  } = useProofSpec();

  const [spec, setSpec] = useState<SpecRecord | null>(null);
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([]);
  const [snapshot, setSnapshot] = useState<EvidenceSnapshot | null>(null);
  const [snapshotVerified, setSnapshotVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [intent, setIntent] = useState<WriteIntent | null>(null);
  const [counterUrl, setCounterUrl] = useState("");
  const [challengeNote, setChallengeNote] = useState("");
  const [criterionId, setCriterionId] = useState(1);

  const load = useCallback(async () => {
    if (!gateway) return;
    setLoading(true);
    setPageError(null);

    try {
      const loaded = await gateway.getSpec(specId);
      setSpec(loaded);

      const items: ChallengeRecord[] = [];
      for (let id = 1; id <= loaded.latest_challenge_id; id += 1) {
        try {
          const challenge = await gateway.getChallenge(id);
          if (challenge.spec_id === specId) items.push(challenge);
        } catch {
          // Global challenge IDs can belong to another specification.
        }
      }
      setChallenges(items);
    } catch (caught) {
      setPageError(
        caught instanceof Error ? caught.message : "Unable to load finalized certificate."
      );
    } finally {
      setLoading(false);
    }
  }, [gateway, specId]);

  useEffect(() => {
    if (!gateway) return;

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [gateway, load]);

  const canChallenge = useMemo(
    () =>
      spec?.state === "EVALUATED" &&
      spec.pending_challenge_id === 0 &&
      spec.criteria.some((item) =>
        ["SATISFIED", "VIOLATED"].includes(item.effective_result)
      ),
    [spec]
  );

  async function inspectSnapshot(snapshotId: string) {
    if (!gateway || !snapshotId) return;
    setPageError(null);
    try {
      const [record, verified] = await Promise.all([
        gateway.getEvidenceSnapshot(snapshotId),
        gateway.verifyEvidenceSnapshot(snapshotId)
      ]);
      setSnapshot(record);
      setSnapshotVerified(verified);
    } catch (caught) {
      setPageError(caught instanceof Error ? caught.message : "Unable to inspect snapshot.");
    }
  }

  async function confirmWrite() {
    if (!intent) return;
    try {
      await executeWrite(intent);
      await load();
    } catch {
      // Provider exposes the error.
    }
  }

  if (!config?.configured) {
    return (
      <main>
        <Link className="back-link" href="/">← Back to explorer</Link>
        <section className="callout warning">
          <strong>Contract not configured.</strong>
          <span>No certificate is fabricated when a finalized read is unavailable.</span>
        </section>
      </main>
    );
  }

  return (
    <main>
      <Link className="back-link" href="/">← Back to explorer</Link>

      {loading ? <section className="callout">Reading finalized certificate…</section> : null}
      {pageError ? <p className="error-banner">{pageError}</p> : null}

      {spec ? (
        <>
          <section className="certificate-hero">
            <div>
              <p className="eyebrow">Specification #{spec.id}</p>
              <h1>{spec.release_label}</h1>
              <p className="release-ref">{spec.release_ref}</p>
            </div>
            <div className="certificate-result">
              <span>Effective certificate</span>
              <StatusPill value={spec.effective_certificate_result} />
              <small>
                Initial: <strong>{spec.initial_certificate_result}</strong> · Revision {spec.revision}
              </small>
            </div>
          </section>

          <section className="metadata-grid">
            <div><span>Submitter</span><strong>{shortAddress(spec.submitter)}</strong></div>
            <div><span>State</span><strong>{spec.state}</strong></div>
            <div><span>Challenges</span><strong>{spec.challenge_count}</strong></div>
            <div><span>Pending challenge</span><strong>{spec.pending_challenge_id || "None"}</strong></div>
          </section>

          <section className="criteria-list" aria-labelledby="criteria-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Decision basis</p>
                <h2 id="criteria-title">Criteria & evidence</h2>
              </div>
            </div>

            {spec.criteria.map((criterion) => (
              <article className="criterion-card" key={criterion.id}>
                <div className="criterion-head">
                  <span className="criterion-number">0{criterion.id}</span>
                  <div>
                    <h3>{criterion.requirement}</h3>
                    <p>{criterion.policy} · {criterion.freshness_policy}</p>
                  </div>
                  <StatusPill value={criterion.effective_result} />
                </div>

                <div className="evidence-grid">
                  <div>
                    <span>Primary source</span>
                    <a href={criterion.primary_url} target="_blank" rel="noreferrer">
                      {criterion.primary_host}
                    </a>
                    <small>{criterion.primary_source_status} · {criterion.primary_version_status}</small>
                  </div>
                  <div>
                    <span>Content commitment</span>
                    <code>{shortHash(criterion.primary_content_sha256)}</code>
                    <small>{criterion.primary_content_length} characters</small>
                  </div>
                  <div>
                    <span>Authenticated snapshot</span>
                    {criterion.primary_snapshot_id ? (
                      <button
                        className="text-button"
                        onClick={() => void inspectSnapshot(criterion.primary_snapshot_id)}
                      >
                        Inspect {shortHash(criterion.primary_snapshot_id)}
                      </button>
                    ) : (
                      <strong>Not available</strong>
                    )}
                  </div>
                </div>

                {criterion.corroborating_url ? (
                  <div className="secondary-evidence">
                    <span>Corroborating source</span>
                    <a href={criterion.corroborating_url} target="_blank" rel="noreferrer">
                      {criterion.corroborating_host}
                    </a>
                    <small>
                      {criterion.corroborating_source_status} · {criterion.corroborating_version_status}
                    </small>
                  </div>
                ) : null}

                <blockquote>{criterion.rationale || "No finalized rationale recorded."}</blockquote>
              </article>
            ))}
          </section>

          {snapshot ? (
            <section className="panel snapshot-panel" data-testid="snapshot-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Authenticated evidence snapshot</p>
                  <h2>Snapshot inspection</h2>
                </div>
                <StatusPill value={snapshotVerified ? "VERIFIED" : "INVALID"} />
              </div>
              <dl className="snapshot-data">
                <div><dt>Snapshot ID</dt><dd><code>{snapshot.snapshot_id}</code></dd></div>
                <div><dt>SHA-256</dt><dd><code>{snapshot.content_sha256}</code></dd></div>
                <div><dt>Source status</dt><dd>{snapshot.source_status}</dd></div>
                <div><dt>Content length</dt><dd>{snapshot.content_length} characters</dd></div>
              </dl>
              <pre>{snapshot.content}</pre>
            </section>
          ) : null}

          <section className="content-grid">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">History remains visible</p>
                  <h2>Challenge history</h2>
                </div>
              </div>

              {challenges.length ? (
                <div className="challenge-list">
                  {challenges.map((challenge) => (
                    <article key={challenge.id}>
                      <div>
                        <strong>Challenge #{challenge.id}</strong>
                        <StatusPill value={challenge.challenge_outcome} />
                      </div>
                      <p>{challenge.note || "No note supplied."}</p>
                      <small>
                        Criterion {challenge.criterion_id} · {challenge.counter_host} · {challenge.state}
                      </small>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="helper">No challenges recorded for this specification.</p>
              )}
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Wallet-assisted writes</p>
                  <h2>Certificate actions</h2>
                </div>
              </div>

              {!walletAddress ? (
                <p className="helper">Connect a wallet in the header before reviewing any transaction.</p>
              ) : null}

              {spec.state === "PENDING" ? (
                <button
                  className="button button-primary full"
                  disabled={!walletAddress || Boolean(pendingWrite)}
                  onClick={() => {
                    clearWriteState();
                    setIntent({
                      kind: "evaluate_spec",
                      functionName: "evaluate_spec",
                      args: [spec.id],
                      summary: `Evaluate specification #${spec.id}`
                    });
                  }}
                >
                  Review evaluation
                </button>
              ) : null}

              {canChallenge ? (
                <div className="stack-form">
                  <label>
                    <span>Criterion ID</span>
                    <select
                      value={criterionId}
                      onChange={(event) => setCriterionId(Number(event.target.value))}
                    >
                      {spec.criteria
                        .filter((item) => ["SATISFIED", "VIOLATED"].includes(item.effective_result))
                        .map((item) => (
                          <option value={item.id} key={item.id}>Criterion {item.id}</option>
                        ))}
                    </select>
                  </label>
                  <label>
                    <span>Counter-evidence URL</span>
                    <input
                      value={counterUrl}
                      onChange={(event) => setCounterUrl(event.target.value)}
                      placeholder="https://new-host.example/evidence"
                    />
                  </label>
                  <label>
                    <span>Challenge note</span>
                    <textarea
                      value={challengeNote}
                      onChange={(event) => setChallengeNote(event.target.value)}
                      maxLength={600}
                    />
                  </label>
                  <button
                    className="button button-primary"
                    disabled={!walletAddress || Boolean(pendingWrite) || !counterUrl.startsWith("https://")}
                    onClick={() => {
                      clearWriteState();
                      setIntent({
                        kind: "open_challenge",
                        functionName: "open_challenge",
                        args: [spec.id, criterionId, counterUrl.trim(), challengeNote.trim()],
                        summary: `Open challenge against specification #${spec.id}, criterion ${criterionId}`
                      });
                    }}
                  >
                    Review challenge
                  </button>
                </div>
              ) : null}

              {spec.pending_challenge_id ? (
                <button
                  className="button button-primary full"
                  disabled={!walletAddress || Boolean(pendingWrite)}
                  onClick={() => {
                    clearWriteState();
                    setIntent({
                      kind: "resolve_challenge",
                      functionName: "resolve_challenge",
                      args: [spec.pending_challenge_id],
                      summary: `Resolve challenge #${spec.pending_challenge_id}`
                    });
                  }}
                >
                  Review challenge resolution
                </button>
              ) : null}

              <button className="text-button" onClick={() => void load()}>
                Refresh finalized certificate
              </button>
            </section>
          </section>

          <WriteReviewDialog
            open={Boolean(intent)}
            intent={intent}
            config={config}
            phase={writePhase}
            detail={writeDetail}
            onConfirm={() => void confirmWrite()}
            onClose={() => {
              setIntent(null);
              clearWriteState();
            }}
          />
        </>
      ) : null}
    </main>
  );
}
