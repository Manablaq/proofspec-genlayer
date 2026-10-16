"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateSpecForm } from "@/components/CreateSpecForm";
import { useProofSpec } from "@/components/ProofSpecProvider";

export function HomeClient() {
  const router = useRouter();
  const { config, loading, error, specCount, challengeCount, refreshStats } = useProofSpec();
  const [specId, setSpecId] = useState("1");

  function explore(event: FormEvent) {
    event.preventDefault();
    const id = Number(specId);
    if (Number.isInteger(id) && id > 0) router.push(`/spec/${id}`);
  }

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Consensus-backed software evidence</p>
          <h1>
            Release claims,
            <span> made auditable.</span>
          </h1>
          <p className="hero-lede">
            ProofSpec binds human-readable release requirements to bounded public
            evidence, GenLayer validator consensus, authenticated snapshots, and
            challenge history.
          </p>

          <div className="hero-actions">
            <a className="button button-primary" href="#explorer">Explore certificates</a>
            <a className="button button-quiet" href="#create">Publish a specification</a>
          </div>
        </div>

        <aside className="hero-proof" aria-label="ProofSpec trust model">
          <div className="proof-line">
            <span>01</span>
            <div>
              <strong>Bound the requirement</strong>
              <p>1–5 required criteria with explicit evidence policy.</p>
            </div>
          </div>
          <div className="proof-line">
            <span>02</span>
            <div>
              <strong>Authenticate the evidence</strong>
              <p>Exact content commitments survive later web drift.</p>
            </div>
          </div>
          <div className="proof-line">
            <span>03</span>
            <div>
              <strong>Challenge without erasing history</strong>
              <p>Initial and effective results remain independently visible.</p>
            </div>
          </div>
        </aside>
      </section>

      {loading ? (
        <section className="callout">Reading runtime configuration…</section>
      ) : !config?.configured ? (
        <section className="callout warning" data-testid="unconfigured-state">
          <strong>Contract not configured.</strong>
          <span>
            Public verdicts are intentionally unavailable until an exact network
            and deployed ProofSpec address are injected at runtime.
          </span>
        </section>
      ) : (
        <section className="runtime-strip">
          <div>
            <span>Finalized specifications</span>
            <strong data-testid="spec-count">{specCount ?? "—"}</strong>
          </div>
          <div>
            <span>Recorded challenges</span>
            <strong data-testid="challenge-count">{challengeCount ?? "—"}</strong>
          </div>
          <div>
            <span>Read mode</span>
            <strong>latest-final</strong>
          </div>
          <button className="text-button" onClick={() => void refreshStats()}>
            Refresh finalized state
          </button>
        </section>
      )}

      {error ? <p className="error-banner page-error">{error}</p> : null}

      <section className="content-grid" id="explorer">
        <section className="panel explorer-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Public guest access</p>
              <h2>Certificate explorer</h2>
            </div>
          </div>

          <form className="explore-form" onSubmit={explore}>
            <label>
              <span>Specification ID</span>
              <input
                inputMode="numeric"
                min="1"
                value={specId}
                onChange={(event) => setSpecId(event.target.value)}
                aria-label="Specification ID"
              />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={!config?.configured}
            >
              Open certificate
            </button>
          </form>

          <p className="helper">
            Reads are available without a wallet and request finalized contract state only.
          </p>
        </section>

        <aside className="panel principles-panel">
          <p className="eyebrow">What a verdict means</p>
          <dl className="result-legend">
            <div>
              <dt>CERTIFIED</dt>
              <dd>Every required criterion is supported.</dd>
            </div>
            <div>
              <dt>REJECTED</dt>
              <dd>At least one criterion is contradicted with none unresolved.</dd>
            </div>
            <div>
              <dt>INSUFFICIENT</dt>
              <dd>Evidence is unavailable, stale, conflicting, or unsafe to decide.</dd>
            </div>
          </dl>
        </aside>
      </section>

      <div id="create">
        <CreateSpecForm />
      </div>
    </main>
  );
}
