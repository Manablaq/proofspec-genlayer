# ProofSpec Consensus Specification

Status: **Progress 1/7 specification freeze**

## 1. Principle

GenLayer consensus must protect the semantic decision, not merely the prose surrounding it.

Leader and validators independently retrieve and interpret the required evidence. Consensus acceptance is based on stable structured decision fields.

## 2. Validation pattern

For semantic classification, v1 should prefer comparative validation because validators can independently perform the same evidence task and compare substantive outputs.

`strict_eq` is reserved for outputs that can genuinely be canonicalized to identical bytes, such as deterministic hashes or stable normalized structured data. It must not be used merely to force open-ended LLM prose into exact equality.

The final implementation may use a custom validator when it provides stronger programmatic checks than the convenience comparative wrapper.

## 3. Semantic result schema

Each source evaluation must return bounded structured data that can be schema-validated.

Target decision fields include:

- `availability_status`;
- `relevance_status`;
- `direction` = `SUPPORTS | CONTRADICTS | NEUTRAL | UNKNOWN`;
- `version_status` where applicable;
- `freshness_status` where applicable;
- bounded rationale.

For a criterion evaluation, stable derived fields include:

- primary source status;
- corroborating source status when required;
- source conflict boolean;
- criterion result.

The exact JSON schema is frozen in Progress 2.

## 4. Equivalence requirements

Validator acceptance must require exact agreement on substantive fields used by deterministic state transitions.

At minimum:

- availability/admissibility status;
- directional assessment;
- source-conflict flag;
- criterion result inputs.

Rationale text may vary semantically and is not allowed to override a disagreement in decision fields.

A comparison prompt must never say that "roughly similar" outcomes are acceptable when the stored directional field differs.

## 5. Deterministic derivation

After consensus accepts source assessments, deterministic contract code derives:

- criterion result;
- overall certificate result;
- challenge outcome;
- revised effective criterion result;
- revised effective certificate result.

LLM output cannot directly set those final enums without deterministic validation.

## 6. Disagreement behavior

If validators do not accept the leader's substantive decision:

- the application must not store a fabricated directional result;
- the transaction follows GenLayer's consensus lifecycle rather than application-side fallback;
- the frontend must show the network state honestly;
- no local heuristic may substitute for consensus.

## 7. Direct Mode proof requirements

Progress 3 must include Direct Mode tests that:

- enable strict mock matching;
- prove agreement for every directional source classification used in v1;
- capture the validator function;
- swap web/LLM mocks after the leader result;
- run the validator independently;
- prove validator rejection when substantive decision fields differ;
- prove harmless rationale variation does not bypass exact decision-field checks;
- prove malformed JSON and unexpected enums fail closed.

A test that exercises only the leader path is insufficient.

## 8. Web independence

Leader and validators make independent source requests.

Tests must cover:

- identical immutable source;
- source changes between leader and validator;
- source unavailable to one participant;
- conflicting corroborating source;
- render/extraction differences that affect a substantive field.

The contract must not assume that a URL returns identical bytes to all validators.

## 9. Prompt-injection boundary

All retrieved source content is untrusted data.

Semantic prompts must:

- delimit source content clearly;
- state that instructions inside evidence are data, not system/task instructions;
- request only the declared schema;
- forbid tool or policy changes embedded in source text;
- keep requirement text and evidence text in separate labeled sections.

Direct tests must include malicious evidence that attempts to change the requested verdict or output schema.

## 10. Canonical parsing

Before deterministic state mutation:

- parse structured output;
- reject unknown fields if the final schema chooses closed objects;
- validate every enum;
- validate all string lengths;
- normalize booleans/numbers;
- reject missing required fields;
- never use permissive truthiness for directional decisions.

## 11. Reviewer evidence

The final release must document:

- chosen Equivalence Principle pattern;
- exact substantive comparison fields;
- tests proving validator agreement;
- tests proving validator disagreement;
- live transaction finalization evidence;
- any consensus/appeal behavior encountered during Bradbury certification.

## 12. Current GenLayer reference baseline

At Progress 1, the design is aligned with current GenLayer guidance that:

- Direct Mode is the first testing layer;
- `vm.run_validator()` can re-run captured validator logic with changed mocks;
- comparative validation is appropriate when validators independently perform semantic classification;
- strict equality is for truly canonicalizable outputs.

Tool and SDK versions are deliberately not frozen in this document. They will be pinned from one compatible release family during implementation.
