# ProofSpec

**Semantic release certification on GenLayer.**

ProofSpec is a GenLayer-native application for proving whether a software release satisfies a bounded, human-readable specification using versioned public evidence, validator consensus, immutable evidence snapshots, and challengeable certificates.

## Current Studio Devnet release candidate (2026-10-21)

**Status:** Release candidate verified in Vercel Preview; production source promotion and submission remain pending. This section supersedes the old deploy/configuration instructions below, but the October 16 checkpoint remains valid historical evidence about a *different* contract.

- Current frozen Intelligent Contract: `contracts/proofspec.py` SHA-256 `c37479737913eb65e9585a403ae308c2a8395433895fa80d3c14a6b835fd4816`.
- Current Studio Devnet (chain `61997`) contract: `0x2240176b5fBa877cfD015877b68981D4c47a3659`; RPC `https://studio-dev.genlayer.com/api`.
- Deployment transaction `0x4a3ef9d5a41693c6346d08a94c68231837e8a1c972c5725ead4f49e480cab228` was reconciled as FINALIZED / FINISHED_WITH_RETURN. R60 read-only compatibility checks passed; counts at that checkpoint were zero specifications and zero challenges.
- Frontend: R69 local certification passed (20/20 unit tests, 12/12 mock-RPC/browser E2E, typecheck, lint, build and zero reported high-or-higher production dependency vulnerabilities). R71 Vercel Preview runtime binding passed at commit `b471bf493b6d6a551f51ebfb951b0d812e834cfa`. R72 verified three separate encrypted, Production-only variables with correct values.
- **Not yet completed:** merge to GitHub `main`, a new Production deployment, Production runtime and finalized guest-read certification, a live R53 write lifecycle, Bradbury persistent certification, and the 12-write reviewer matrix. The owner elected Studio Devnet-only submission; reviewer acceptance is not guaranteed.
- The historical October 16 contract `0xD11A506B363E131e8fA3eBeC28a21cC8a4375110` used older contract source and had a *separate* certified evaluation. That certificate **must not** be attributed to the current R53 contract.

See `docs/STUDIO_NEXT_ONLY_SUBMISSION_SCOPE.md` for the current release boundaries. Do not interpret the historical release-path and safety sections below as current promotion status.

## Progress — Studio Next live checkpoint (2026-10-16)

`PROOFSPEC_STUDIO_NEXT_LIVE=FINALIZED_CERTIFIED`; `PROOFSPEC_BRADBURY_CERTIFICATION=NOT_PERFORMED`.

The frozen single Intelligent Contract has passed backend static tests and Direct Mode consensus certification. The locally developed frontend passed its earlier mock-RPC unit and browser tests; the final security-patched frontend release requires fresh checks and production deployment confirmation.

On Studio Next (Studio Devnet family, chain 61997), contract `0xD11A506B363E131e8fA3eBeC28a21cC8a4375110` successfully finalized deployment, `create_spec(1)`, and `evaluate_spec(1)`. The latter achieved `MAJORITY_AGREE`, `FINISHED_WITH_RETURN`, `CERTIFIED`, a `SATISFIED` criterion and an independently verified primary evidence snapshot. See `docs/PROGRESS_5_6_STUDIO_NEXT_CERTIFICATION_2026-10-16.md`.

**Submission scope:** The owner elected to proceed **without Bradbury testing**. This is a deliberate departure from the frozen persistent Bradbury gate and 12-write reviewer matrix; those requirements are **not complete** and reviewer acceptance cannot be guaranteed. See `docs/STUDIO_NEXT_ONLY_SUBMISSION_SCOPE.md`. No new Intelligent Contract or blockchain transactions are requested by this release.

## Core result model

A ProofSpec release certificate has one of three effective outcomes:

- `CERTIFIED` — every required criterion is supported by admissible evidence.
- `REJECTED` — at least one required criterion is positively contradicted by admissible evidence and no criterion is unresolved.
- `INSUFFICIENT` — evidence is unavailable, stale, conflicting, inadmissible, ambiguous, or validator consensus cannot safely support a directional result.

Criterion-level results are:

- `SATISFIED`
- `VIOLATED`
- `INSUFFICIENT`

The overall result is derived deterministically from validator-agreed criterion results. An LLM never directly chooses the stored overall certificate status.

## Why GenLayer

Release certification depends on semantic interpretation of public web evidence such as immutable repository files, release notes, deployment records, technical documentation, and other versioned sources. These inputs cannot be reduced to a conventional deterministic oracle value without losing the reasoning step.

ProofSpec uses GenLayer Intelligent Contract non-determinism for independent web retrieval and semantic classification, then applies the Equivalence Principle to stable decision fields before deterministic contract logic derives the certificate.

## v1 scope

v1 intentionally uses one Intelligent Contract and a bounded evidence model:

- up to 5 required criteria per specification;
- one primary evidence source per criterion;
- one optional corroborating source per criterion;
- HTTPS-only evidence;
- versioned or immutable sources preferred;
- bounded content snapshots with SHA-256 commitments;
- one pending challenge per specification;
- at most 8 challenges per specification;
- challenge evidence must use a new source host;
- original authenticated evidence remains the decision basis during challenge resolution;
- mutable-source drift is recorded explicitly rather than silently replacing original evidence.

## Release path

The planned certification path is:

`Direct Mode -> Studio-dev release-candidate validation -> Bradbury persistent live certification -> production frontend`

Studio-dev is treated as temporary release-candidate infrastructure. Bradbury is the persistent production-like testnet used for the final live reviewer matrix.

## Specification documents

- `docs/PRODUCT_SPEC.md`
- `docs/CONTRACT_SPEC.md`
- `docs/EVIDENCE_MODEL.md`
- `docs/CONSENSUS_SPEC.md`
- `docs/THREAT_MODEL.md`
- `docs/REVIEWER_MATRIX.md`
- `docs/RELEASE_GATES.md`
- `docs/NETWORK_TARGETS.md`

## Safety boundary

The committed repository remains at Progress 3. The present uncommitted candidate additionally includes the locally certified Progress 4 frontend. That local certification does not establish hosted-network finality or reviewer readiness.

Any later frontend implementation, deployment, funding, signing, blockchain write, Vercel mutation, environment-variable mutation, domain mutation, Git history rewrite, or release promotion requires its own scoped gate and authorization.
