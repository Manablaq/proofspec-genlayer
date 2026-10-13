# ProofSpec Progress 2/7 Backend Checkpoint

Status: **backend re-certified after frozen-spec conformance correction; Progress 3 promotion pending**

Base commit:

`3215e1d4fe54e409dee02f377fe28d6a4b454a17`

## Implemented scope

Progress 2 implements the single-contract backend defined by the frozen Progress 1 specifications:

- one `ProofSpec` Intelligent Contract;
- 1-5 bounded required criteria;
- `AUTHORITATIVE_V1` and `CORROBORATED_V1`;
- explicit `NOT_REQUIRED_V1` and `RELEASE_BOUND_V1` release/freshness policies;
- deterministic `CERTIFIED`, `REJECTED`, and `INSUFFICIENT` aggregation;
- deterministic `SATISFIED`, `VIOLATED`, and `INSUFFICIENT` criterion derivation;
- HTTPS-only evidence validation with credential, query, fragment, custom-port, malformed-host, and IP-literal rejection;
- bounded decision-critical evidence with no silent truncation;
- contextual SHA-256 snapshot commitments;
- authenticated snapshot reads and verification;
- one pending challenge per specification;
- maximum eight challenges;
- specification-wide challenge-host replay prevention;
- deterministic counter-evidence downgrade behavior;
- challenge basis anchored to authenticated original snapshots;
- live original-source drift recorded separately from historical evidence;
- prompt-injection delimiters and schema-constrained semantic interfaces;
- validator comparison code that checks substantive fields and evidence identity.

## Progress 2 test boundary

This checkpoint performs only syntax, static/type/lint, serialization-oriented source checks, and deterministic/stub-runtime behavioral tests.

It does **not** claim:

- Direct Mode leader/validator consensus certification;
- hosted Studio-dev compatibility;
- Bradbury deployment or lifecycle proof;
- frontend completion;
- live-network evidence.

Those belong to later gates.

## Contract candidate

Contract source:

`contracts/proofspec.py`

Expected SHA-256:

`fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9`

The hash above is frozen before the Progress 2 certification run. If the source changes, this checkpoint must be regenerated and re-reviewed rather than silently accepting the new source.

## Exit condition

Progress 2 may be committed only after `./scripts/check_backend.sh` passes under the pinned toolchain and the Git diff is verified to contain only the authorized Progress 2 paths.

The Progress 2 Git commit and push are separate mutation boundaries and are not performed by the local build/certification script.


## Frozen-spec conformance correction

Before Progress 3 promotion, a read-only reconciliation against the frozen
Progress 1 specification identified two implementation-conformance gaps in the
original Progress 2 candidate.

The corrected contract:

- accepts any non-empty normalized requirement and release reference up to the
  frozen maximum lengths instead of adding implementation-only minimum lengths;
- exposes an explicit decision-critical source-status taxonomy containing
  `AVAILABLE`, `UNAVAILABLE`, `STALE`, `IRRELEVANT`, `AMBIGUOUS`, and
  `INADMISSIBLE`, plus `NOT_APPLICABLE` for an absent optional source;
- derives `STALE` from release-bound version mismatch;
- derives `AMBIGUOUS` from release-bound version unverifiability;
- derives `IRRELEVANT` from validator-agreed semantic irrelevance;
- derives `INADMISSIBLE` when rendered evidence exceeds the declared bounded
  content limit;
- persists the derived source status with available authenticated snapshots and
  includes it in validator evidence-consensus identity.

The content bound is measured in rendered-text characters after outer
whitespace stripping. SHA-256 commitments are computed over the exact UTF-8
bytes of that same bounded text.

Corrected contract SHA-256:

`fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9`

The frozen Progress 1 specification documents were not modified.
