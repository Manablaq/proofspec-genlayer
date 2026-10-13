# ProofSpec Progress 2/7 Backend Checkpoint

Status: **local static certification passed; Git commit and push pending**

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

`e13423968e9412aa538f989b86812114d60d029a3e01eceb65fdd1ed557f0984`

The hash above is frozen before the Progress 2 certification run. If the source changes, this checkpoint must be regenerated and re-reviewed rather than silently accepting the new source.

## Exit condition

Progress 2 may be committed only after `./scripts/check_backend.sh` passes under the pinned toolchain and the Git diff is verified to contain only the authorized Progress 2 paths.

The Progress 2 Git commit and push are separate mutation boundaries and are not performed by the local build/certification script.
