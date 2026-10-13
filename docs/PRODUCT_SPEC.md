# ProofSpec Product Specification

Status: **Progress 1/7 specification freeze**

## 1. Product statement

ProofSpec certifies whether a specific software release satisfies a bounded set of human-readable requirements by evaluating public evidence through GenLayer validator consensus.

A ProofSpec certificate is tied to a release identity, a frozen criterion set, explicit evidence policies, authenticated evidence snapshots, and a challenge history. The certificate must remain explainable after the web changes.

## 2. Problem

Software releases are often declared complete through screenshots, mutable documentation, self-reported checklists, or links whose content can later change. Conventional smart contracts can preserve a hash, but they cannot independently interpret whether a repository file, release note, deployment record, or other web source actually satisfies a natural-language requirement.

ProofSpec solves the semantic part while keeping the authoritative state transition bounded and auditable.

## 3. Primary users

- protocol and dApp teams certifying release requirements;
- grant or bounty reviewers validating deliverables;
- DAOs verifying milestone completion;
- auditors publishing bounded release attestations;
- marketplaces or registries that need challengeable software-quality evidence.

## 4. v1 product boundaries

v1 certifies public software-release evidence only.

In scope:

- public HTTPS evidence;
- immutable or versioned repository artifacts;
- public deployment records;
- public technical documentation;
- bounded semantic criteria;
- one or two evidence sources per criterion;
- challengeable certificate state;
- finalized public read access.

Out of scope:

- private repositories or authenticated evidence;
- arbitrary file uploads as authoritative evidence;
- secret scanning that requires private credentials;
- package signing or code signing;
- EVM contract execution as evidence;
- cross-chain settlement;
- payments, escrow, NFTs, or token incentives;
- automatic remediation of a failed release;
- unrestricted web crawling.

## 5. Core entities

### Specification

A specification contains:

- immutable specification ID;
- submitter address;
- release label;
- immutable release reference;
- 1 to 5 required criteria;
- evidence policy per criterion;
- creation state;
- initial certificate result;
- effective certificate result;
- challenge count;
- pending challenge ID, if any.

### Criterion

Each criterion contains:

- criterion ID within the specification;
- requirement text;
- primary evidence URL;
- optional corroborating evidence URL;
- evidence policy;
- initial criterion result;
- effective criterion result;
- evidence snapshot references;
- validator-agreed rationale summary.

All v1 criteria are required. Advisory criteria are intentionally deferred.

### Evidence

Evidence is a bounded, authenticated record described in `EVIDENCE_MODEL.md`.

### Challenge

A challenge targets one criterion and introduces one new counter-evidence source plus a bounded note. It cannot erase the original result or replace the original authenticated evidence.

## 6. Evidence policies

### `AUTHORITATIVE_V1`

One primary source is required.

- admissible primary supports the requirement -> `SATISFIED`;
- admissible primary contradicts the requirement -> `VIOLATED`;
- unavailable, stale, irrelevant, ambiguous, or inadmissible primary -> `INSUFFICIENT`.

### `CORROBORATED_V1`

Primary and corroborating sources are required and must use distinct normalized hosts.

- both support -> `SATISFIED`;
- both contradict -> `VIOLATED`;
- directional conflict -> `INSUFFICIENT`;
- either source unavailable, stale, irrelevant, ambiguous, or inadmissible -> `INSUFFICIENT`.

Distinct hosts are a diversity rule, not proof of independent ownership or editorial independence.

## 7. Deterministic certificate aggregation

The Intelligent Contract derives the specification result from agreed criterion results.

1. If any criterion is `INSUFFICIENT`, overall result is `INSUFFICIENT`.
2. Otherwise, if any criterion is `VIOLATED`, overall result is `REJECTED`.
3. Otherwise all criteria are `SATISFIED`, so overall result is `CERTIFIED`.

This ordering prevents the application from claiming a definitive rejection while any required criterion is unresolved.

## 8. Lifecycle

### Create

The submitter creates a specification with all criteria and evidence URLs. Deterministic validation runs before state is accepted.

New specifications start as `PENDING`.

### Evaluate

`evaluate_spec(spec_id)` performs validator-consensus evidence evaluation for every criterion and stores authenticated snapshots for every available decision-critical source.

A successful evaluation stores:

- per-source status;
- per-criterion result;
- evidence snapshot IDs;
- initial certificate result;
- effective certificate result;
- bounded rationale data.

### Challenge

`open_challenge(spec_id, criterion_id, counter_url, note)` creates one pending challenge against a finalized criterion.

The counter source must:

- be HTTPS;
- pass URL validation;
- use a host not already used by that specification's original sources or earlier challenges;
- satisfy all evidence size and admissibility rules.

### Resolve challenge

`resolve_challenge(challenge_id)` evaluates the new source while authenticating the original evidence snapshots.

Challenge outcomes:

- `REJECTED` — counter-evidence supports the existing criterion result or is not sufficient to disturb it;
- `UPHELD` — counter-evidence materially contradicts a directional existing result;
- `INSUFFICIENT` — the counter source cannot be safely adjudicated.

A single counter-source challenge cannot directly flip `SATISFIED` to `VIOLATED` or `VIOLATED` to `SATISFIED`. An upheld challenge downgrades the targeted effective criterion result to `INSUFFICIENT`, after which the overall certificate is re-derived.

## 9. Historical integrity

ProofSpec stores both initial and effective results.

A later challenge never overwrites:

- initial criterion result;
- initial certificate result;
- original snapshot IDs;
- original source commitments.

The public interface must display the transition history.

## 10. Frontend product requirements

The eventual frontend must support:

- public guest reads with no wallet;
- release/specification explorer;
- certificate detail page;
- criterion-level evidence inspection;
- evidence snapshot hash display;
- challenge history;
- wallet-assisted writes;
- explicit network display and switching;
- transaction review before signing;
- finalized-state refresh;
- honest error states with no fabricated verdict;
- mobile and keyboard accessibility;
- reviewer-facing links to immutable evidence.

## 11. Success definition

v1 is release-ready only when all seven gates in `RELEASE_GATES.md` pass and the Bradbury live reviewer matrix in `REVIEWER_MATRIX.md` is frozen with reproducible evidence.
