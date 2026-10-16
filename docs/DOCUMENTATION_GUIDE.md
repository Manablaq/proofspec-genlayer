# ProofSpec Documentation Guide

This guide distinguishes **current observed release evidence** from **frozen requirements** and **dated historical checkpoints**. Earlier records are preserved as written; their original “pending,” “uncommitted,” or “candidate” language describes their checkpoint date, not the current deployment.

## Current release and evidence (read first)

| Document | Purpose |
| --- | --- |
| [`README.md`](../README.md) | Product, release identity, public certificate demonstration, local quickstart, and scope limits. |
| [Production Release Verification](PRODUCTION_RELEASE_VERIFICATION_2026-10-16.md) | R5 Git publication, R7 Vercel deployment, HTTP 200, finalized SDK readback, and three-browser production guest verification. |
| [Reviewer Evidence and Hash-Provenance Index](REVIEWER_EVIDENCE_INDEX_2026-10-16.md) | Transaction hashes, contract source digest, snapshot commitments, evidence provenance, and explicitly missing raw journal archive. |
| [Studio Next-only Submission Scope](STUDIO_NEXT_ONLY_SUBMISSION_SCOPE.md) | Owner's decision not to perform Bradbury testing. This is not evidence that Bradbury passed. |

## Original frozen design (normative requirements, not completion claims)

| Document | Domain |
| --- | --- |
| [Product Specification](PRODUCT_SPEC.md) | User needs, output semantics, and acceptance criteria. |
| [Intelligent Contract Specification](CONTRACT_SPEC.md) | State model, methods, deterministic invariants. |
| [Evidence Model](EVIDENCE_MODEL.md) | HTTPS source rules, snapshot authentication, immutable/versioned evidence. |
| [Consensus Specification](CONSENSUS_SPEC.md) | Validator equivalence and failure-safe semantic comparison. |
| [Threat Model](THREAT_MODEL.md) | Prompt injection, source drift, unauthorized writes, and other security boundaries. |
| [Network Targets](NETWORK_TARGETS.md) | Studio-dev/Studio Next, Studionet, and Bradbury distinction. |
| [Reviewer Matrix](REVIEWER_MATRIX.md) | Planned four-specification/two-challenge/12-write **unexecuted** live matrix. |
| [Release Gates](RELEASE_GATES.md) | Original seven-gate criteria; Bradbury gate and full release completion are **not passed**. |

Do not rewrite these frozen requirements simply to make a partial Studio Next demonstration appear to satisfy the full Bradbury reviewer matrix.

## Dated checkpoint documents (historical records)

| Document | Historical milestone | Not an assertion that… |
| --- | --- | --- |
| [Progress 2](PROGRESS_2.md) | Frozen contract static/backend certification. | Hosted deployment was then verified. |
| [Progress 3](PROGRESS_3.md) | Direct Mode consensus tests. | Live Bradbury outcomes were demonstrated. |
| [Progress 4](PROGRESS_4.md) | Earlier local/frontend testing and pre-release fixes. | Frontend is still uncommitted as of R7. |
| [Studio Next live checkpoint](PROGRESS_5_6_STUDIO_NEXT_CERTIFICATION_2026-10-16.md) | Contract deployment, create and evaluate finality, authenticated snapshot. | Vercel production frontend had already been deployed when that report was written. |
| [Toolchain](TOOLCHAIN.md) | Original backend toolchain pins. | Frontend npm versions are the same as Python/backend pins. |

**Reading rule:** Historical “pending” descriptions are not current status indicators. Consult the newer production verification report and Git release ID before drawing a present-tense conclusion.

## Provenance and security boundaries

- Always distinguish Git commit SHA, contract source SHA-256, transaction hashes, contract snapshot identifiers, and evidence-content SHA-256.
- R5/R7 results are grounded in the recorded release metadata and operator-provided terminal output; unpublished raw logs are **not** automatically a verified evidence archive.
- Retain original operator journals and failed-attempt markers without editing or replaying them; sanitize copies separately before any publication.
- Do not silently claim newly rerun security audits or frontend checker compatibility. Both are explicitly excluded from this scoped R8 work.
- Do not conflate a Studio Devnet single `CERTIFIED` test with all expected Bradbury outcomes.
- Preserve the already verified production URL and its original R7 Git commit until a separately authorized release is ready.

## Scope of this R8 documentation branch

The authorized changes consist solely of refreshed README text, a new production report, a new reviewer evidence index, this documentation guide, and the frontend's stale informational footer. **No historical document, Intelligent Contract, dependency, security-audit record, or `scripts/check_frontend.sh` is modified.** Since item 5 was excluded, the branch is review-only and must not be merged or deployed as a new production release without a separate decision and appropriate release validation.
