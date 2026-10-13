# ProofSpec Intelligent Contract Specification

Status: **Progress 1/7 specification freeze**

This document freezes the intended contract behavior, not the final Python syntax. Implementation details may change only if they preserve these invariants or are explicitly re-approved in a later specification revision.

## 1. Architecture

v1 uses exactly one GenLayer Intelligent Contract.

Rationale:

- all authoritative state lives in one contract;
- no asynchronous cross-contract dependency is required;
- fewer failure states improve reviewer reproducibility;
- semantic evaluation and deterministic certificate aggregation remain auditable in one place.

## 2. Hard limits

The implementation must enforce deterministic limits before non-deterministic work begins.

Planned v1 limits:

- maximum criteria per specification: 5;
- minimum criteria: 1;
- maximum requirement text: 1,200 UTF-8 characters;
- maximum release label: 160 characters;
- maximum immutable release reference: 512 characters;
- maximum evidence URL: 512 characters;
- maximum challenge note: 600 characters;
- maximum rendered/extracted decision-critical content per source: 8,000 characters;
- maximum challenges per specification: 8;
- maximum pending challenges per specification: 1;
- evidence sources per criterion: 1 for `AUTHORITATIVE_V1`, exactly 2 for `CORROBORATED_V1`.

Exact byte/character handling must be covered by boundary tests before deployment.

## 3. Public views

The contract must expose enough state for a reviewer to reproduce every authoritative decision.

Required view surface:

- `get_protocol_info()`
- `get_spec_count()`
- `get_spec(spec_id)`
- `get_criterion(spec_id, criterion_id)`
- `get_challenge_count()`
- `get_challenge(challenge_id)`
- `get_evidence_snapshot(snapshot_id)`
- `verify_evidence_snapshot(snapshot_id)`

A view may be split for storage/runtime constraints, but no reviewer-critical state may exist only in frontend-local storage.

## 4. Public writes

Required write surface:

### `create_spec(...)`

Creates a validated `PENDING` specification.

Deterministic preconditions include:

- valid bounded strings;
- valid criterion count;
- supported policy identifiers;
- HTTPS evidence;
- URL/host safety rules;
- distinct primary/corroborating hosts where required;
- no duplicate criterion IDs;
- no unsupported fields.

No LLM or web call is needed for creation.

### `evaluate_spec(spec_id)`

Evaluates every criterion using GenLayer non-deterministic web/LLM operations under the Equivalence Principle.

Preconditions:

- specification exists;
- specification is `PENDING`;
- no evaluation has already finalized;
- no pending challenge exists.

On successful consensus, stores:

- normalized source assessments;
- authenticated evidence snapshots;
- criterion results;
- initial and effective certificate results;
- bounded rationale summaries.

An ambiguous or non-consensus execution must not fabricate a result.

### `open_challenge(spec_id, criterion_id, counter_url, note)`

Creates a pending challenge.

Preconditions:

- specification has an initial finalized evaluation;
- criterion exists;
- no other challenge is pending for the specification;
- challenge limit not reached;
- counter URL passes all URL rules;
- normalized counter host is new for that specification.

Creation is deterministic and does not evaluate the counter source.

### `resolve_challenge(challenge_id)`

Authenticates original snapshots, evaluates counter-evidence under consensus, records live-source drift status where implemented, derives challenge outcome, and re-derives effective criterion/certificate state.

The original snapshot remains the decision basis. A mutable live source is never silently substituted for it.

## 5. State model

Conceptual specification states:

- `PENDING`
- `EVALUATED`

Challenge state is tracked separately:

- `PENDING`
- `RESOLVED`

Certificate outcomes:

- `CERTIFIED`
- `REJECTED`
- `INSUFFICIENT`

Criterion outcomes:

- `SATISFIED`
- `VIOLATED`
- `INSUFFICIENT`

Challenge outcomes:

- `REJECTED`
- `UPHELD`
- `INSUFFICIENT`

Source availability/admissibility statuses must distinguish at least:

- `AVAILABLE`
- `UNAVAILABLE`
- `STALE`
- `IRRELEVANT`
- `AMBIGUOUS`
- `INADMISSIBLE`

Challenge live-drift status, if implemented, must distinguish at least:

- `UNCHANGED`
- `MODIFIED`
- `UNAVAILABLE`
- `NOT_CHECKED`

## 6. Evidence snapshot invariant

For each available decision-critical source used in adjudication, the contract stores or exposes enough data to verify:

- snapshot ID;
- canonical source URL;
- normalized host;
- source role;
- bounded content;
- content length;
- SHA-256 content commitment;
- release/version reference when established;
- associated specification and criterion.

`verify_evidence_snapshot(snapshot_id)` must deterministically recompute the commitment and identity fields from stored data.

Unavailable evidence must not create a fake content snapshot.

## 7. Consensus boundary

Non-deterministic code may retrieve web content and perform semantic classification.

Deterministic code must own:

- input validation;
- URL policy;
- limit enforcement;
- enum validation;
- canonical decoding of agreed structured results;
- evidence commitment calculation from agreed bounded content;
- criterion result derivation;
- certificate aggregation;
- challenge state transitions;
- replay/duplicate checks.

The LLM never directly chooses the stored overall certificate status.

## 8. Challenge invariants

- initial results are immutable;
- original snapshot IDs are immutable;
- only effective results may change;
- one new counter source cannot directly reverse a directional criterion;
- an upheld challenge against a directional criterion downgrades it to `INSUFFICIENT`;
- challenge resolution cannot increase certainty when counter-evidence is unavailable or ambiguous;
- a counter host cannot be reused for the same specification;
- challenge history remains queryable.

## 9. Failure behavior

The implementation must fail closed.

Examples:

- malformed semantic JSON -> no successful state transition;
- unexpected enum -> no successful state transition;
- oversized rendered evidence -> `INSUFFICIENT` or deterministic rejection according to the final implementation contract, never silent truncation beyond the declared bound;
- unavailable source -> `INSUFFICIENT`;
- corroborating conflict -> `INSUFFICIENT`;
- validator disagreement -> no fabricated consensus result;
- corrupted original snapshot -> challenge resolution must not proceed as if authenticated.

## 10. Storage and serialization discipline

Before live deployment:

- every stored type must be accepted by GenVM serialization;
- no secrets or environment variables may be stored;
- no filesystem access is permitted;
- no external process execution is permitted;
- no frontend-only state may be authoritative;
- mappings/arrays must be bounded by explicit protocol limits.

## 11. Reviewer contract identity

The final release must freeze and publish:

- exact contract source SHA-256;
- exact dependency/runtime magic comment;
- deployment transaction ID;
- deployed contract address;
- target network identity;
- release commit;
- evidence package manifest.

Those values do not exist at Progress 1 and must not be guessed or pre-filled.
