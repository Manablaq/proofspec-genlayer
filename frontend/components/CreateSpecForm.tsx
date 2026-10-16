"use client";

import { useState } from "react";
import {
  buildCriteriaJson,
  emptyCriterion,
  validateCriterionDrafts,
  type CriterionDraft
} from "@/lib/criteria";
import type { WriteIntent } from "@/lib/types";
import { useProofSpec } from "@/components/ProofSpecProvider";
import { WriteReviewDialog } from "@/components/WriteReviewDialog";

export function CreateSpecForm() {
  const {
    config,
    walletAddress,
    writePhase,
    writeDetail,
    executeWrite,
    clearWriteState
  } = useProofSpec();
  const [releaseLabel, setReleaseLabel] = useState("");
  const [releaseRef, setReleaseRef] = useState("");
  const [criteria, setCriteria] = useState<CriterionDraft[]>([emptyCriterion()]);
  const [intent, setIntent] = useState<WriteIntent | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function updateCriterion(index: number, patch: Partial<CriterionDraft>) {
    setCriteria((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  function prepareReview() {
    setFormError(null);
    if (!releaseLabel.trim()) {
      setFormError("Release label is required.");
      return;
    }
    if (!releaseRef.trim()) {
      setFormError("Immutable release reference is required.");
      return;
    }

    const criterionError = validateCriterionDrafts(criteria);
    if (criterionError) {
      setFormError(criterionError);
      return;
    }

    setIntent({
      kind: "create_spec",
      functionName: "create_spec",
      args: [releaseLabel.trim(), releaseRef.trim(), buildCriteriaJson(criteria)],
      summary: `Create specification for ${releaseLabel.trim()}`
    });
    clearWriteState();
  }

  async function confirmWrite() {
    if (!intent) return;
    try {
      await executeWrite(intent);
      setReleaseLabel("");
      setReleaseRef("");
      setCriteria([emptyCriterion()]);
    } catch {
      // Provider exposes the user-facing error state.
    }
  }

  return (
    <section className="panel create-panel" aria-labelledby="create-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Publish a bounded specification</p>
          <h2 id="create-title">Create release specification</h2>
        </div>
        <span className="limit-chip">{criteria.length}/5 criteria</span>
      </div>

      <div className="form-grid two">
        <label>
          <span>Release label</span>
          <input
            aria-label="Release label"
            value={releaseLabel}
            onChange={(event) => setReleaseLabel(event.target.value)}
            placeholder="ProofSpec v1.0"
            maxLength={160}
          />
        </label>
        <label>
          <span>Immutable release reference</span>
          <input
            aria-label="Immutable release reference"
            value={releaseRef}
            onChange={(event) => setReleaseRef(event.target.value)}
            placeholder="github:owner/repo@commit"
            maxLength={512}
          />
        </label>
      </div>

      <div className="criteria-stack">
        {criteria.map((criterion, index) => (
          <fieldset className="criterion-editor" key={index}>
            <legend>Criterion {index + 1}</legend>

            <label>
              <span>Requirement</span>
              <textarea
                aria-label={index === 0 ? "Requirement" : `Requirement ${index + 1}`}
                value={criterion.requirement}
                onChange={(event) =>
                  updateCriterion(index, { requirement: event.target.value })
                }
                placeholder="Describe exactly what this release must satisfy."
                maxLength={1200}
              />
            </label>

            <div className="form-grid two">
              <label>
                <span>Evidence policy</span>
                <select
                  aria-label={index === 0 ? "Evidence policy" : `Evidence policy ${index + 1}`}
                  value={criterion.policy}
                  onChange={(event) =>
                    updateCriterion(index, {
                      policy: event.target.value as CriterionDraft["policy"]
                    })
                  }
                >
                  <option value="AUTHORITATIVE_V1">AUTHORITATIVE_V1</option>
                  <option value="CORROBORATED_V1">CORROBORATED_V1</option>
                </select>
              </label>

              <label>
                <span>Freshness policy</span>
                <select
                  aria-label={index === 0 ? "Freshness policy" : `Freshness policy ${index + 1}`}
                  value={criterion.freshnessPolicy}
                  onChange={(event) =>
                    updateCriterion(index, {
                      freshnessPolicy: event.target.value as CriterionDraft["freshnessPolicy"]
                    })
                  }
                >
                  <option value="NOT_REQUIRED_V1">NOT_REQUIRED_V1</option>
                  <option value="RELEASE_BOUND_V1">RELEASE_BOUND_V1</option>
                </select>
              </label>
            </div>

            <label>
              <span>Primary evidence URL</span>
              <input
                aria-label={index === 0 ? "Primary evidence URL" : `Primary evidence URL ${index + 1}`}
                value={criterion.primaryUrl}
                onChange={(event) =>
                  updateCriterion(index, { primaryUrl: event.target.value })
                }
                placeholder="https://github.com/owner/repo/blob/commit/file"
                maxLength={512}
              />
            </label>

            {criterion.policy === "CORROBORATED_V1" ? (
              <label>
                <span>Corroborating evidence URL</span>
                <input
                  aria-label={index === 0 ? "Corroborating evidence URL" : `Corroborating evidence URL ${index + 1}`}
                  value={criterion.corroboratingUrl}
                  onChange={(event) =>
                    updateCriterion(index, {
                      corroboratingUrl: event.target.value
                    })
                  }
                  placeholder="https://independent.example/release-record"
                  maxLength={512}
                />
              </label>
            ) : null}

            {criteria.length > 1 ? (
              <button
                type="button"
                className="text-button danger"
                onClick={() =>
                  setCriteria((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
              >
                Remove criterion
              </button>
            ) : null}
          </fieldset>
        ))}
      </div>

      <div className="form-actions split">
        <button
          type="button"
          className="button button-quiet"
          onClick={() =>
            setCriteria((current) =>
              current.length < 5 ? [...current, emptyCriterion()] : current
            )
          }
          disabled={criteria.length >= 5}
        >
          Add criterion
        </button>

        <button
          type="button"
          className="button button-primary"
          onClick={prepareReview}
          disabled={!config?.configured || !walletAddress}
        >
          Review transaction
        </button>
      </div>

      {!walletAddress && config?.configured ? (
        <p className="helper">Connect a wallet before reviewing a write.</p>
      ) : null}
      {!config?.configured ? (
        <p className="helper">
          Writes remain locked until an exact network and deployed contract address are configured.
        </p>
      ) : null}
      {formError ? <p className="error-banner">{formError}</p> : null}

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
    </section>
  );
}
