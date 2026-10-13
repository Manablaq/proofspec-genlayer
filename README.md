# ProofSpec

**Semantic release certification on GenLayer.**

ProofSpec is a GenLayer-native application for proving whether a software release satisfies a bounded, human-readable specification using versioned public evidence, validator consensus, immutable evidence snapshots, and challengeable certificates.

## Progress

`PROOFSPEC_PROGRESS=2/7_BACKEND_STATIC_CERTIFIED`

Progress 1 freezes the product, contract, evidence, consensus, threat, reviewer-matrix, release-gate, and network-target specifications before implementation.

Progress 2 implements the single Intelligent Contract backend and passes the pinned local syntax, GenVM type/static, deterministic, and static-guard certification gates. Direct Mode consensus certification remains Progress 3.

No Intelligent Contract, frontend application, dependency set, deployment, funding operation, signing operation, or blockchain write is authorized by this checkpoint.

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

This repository checkpoint is a specification freeze only.

Any later contract implementation, dependency addition, frontend implementation, deployment, funding, signing, blockchain write, Vercel mutation, environment-variable mutation, domain mutation, Git history rewrite, or release promotion requires its own scoped gate and authorization.
