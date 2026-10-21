"use client";

import { reviewRows } from "@/lib/write-safety";
import type { RuntimeConfig, WriteIntent, WritePhase } from "@/lib/types";

export function WriteReviewDialog({
  open,
  intent,
  config,
  phase,
  detail,
  onConfirm,
  onClose
}: {
  open: boolean;
  intent: WriteIntent | null;
  config: RuntimeConfig | null;
  phase: WritePhase;
  detail: string | null;
  onConfirm(): void;
  onClose(): void;
}) {
  if (!open || !intent) return null;

  const busy =
    phase === "requesting-wallet" ||
    phase === "submitting" ||
    phase === "submitted" ||
    phase === "finalizing" ||
    phase === "verifying";

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="transaction-review-title">
        <div className="dialog-head">
          <div>
            <p className="eyebrow">Pre-sign review</p>
            <h2 id="transaction-review-title">Review transaction</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close transaction review"
            onClick={onClose}
            disabled={busy}
          >
            ×
          </button>
        </div>

        <div className="review-grid">
          <div>
            <span>Network</span>
            <strong>{config?.network ?? "Unconfigured"}</strong>
          </div>
          <div>
            <span>Chain ID</span>
            <strong>{config?.chainId ?? "—"}</strong>
          </div>
          <div className="review-wide">
            <span>Contract</span>
            <code>{config?.contractAddress ?? "Not configured"}</code>
          </div>
          {reviewRows(intent).map(([label, value]) => (
            <div className="review-wide" key={label}>
              <span>{label}</span>
              <code>{value}</code>
            </div>
          ))}
        </div>

        <div className="finality-track" aria-live="polite">
          <span className={`finality-step ${phase !== "idle" ? "active" : ""}`}>1 · Wallet</span>
          <span className={`finality-step ${["submitting", "submitted", "finalizing", "finalized"].includes(phase) ? "active" : ""}`}>
            2 · Submitted
          </span>
          <span className={`finality-step ${["finalizing", "verifying", "finalized"].includes(phase) ? "active" : ""}`}>
            3 · Finality
          </span>
          <span className={`finality-step ${phase === "finalized" ? "active" : ""}`}>4 · Finalized</span>
        </div>

        {detail ? <p className="callout compact">{detail}</p> : null}
        {phase === "failed" ? <p className="error-banner">Transaction failed verification; inspect the transaction ID and error.</p> : null}
        {phase === "uncertain" ? <p className="error-banner">Outcome uncertain: do not sign again. Resume transaction verification instead.</p> : null}

        <div className="dialog-actions">
          <button className="button button-quiet" onClick={onClose} disabled={busy}>
            {phase === "finalized" ? "Done" : "Cancel"}
          </button>
          <button
            className="button button-primary"
            onClick={onConfirm}
            disabled={busy || phase === "finalized" || phase === "uncertain"}
            data-testid="confirm-write"
          >
            {busy ? "Write in progress…" : "Confirm & sign"}
          </button>
        </div>
      </section>
    </div>
  );
}
