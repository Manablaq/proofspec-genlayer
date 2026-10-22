# ProofSpec Reviewer Matrix

Status: **Frozen plan; live Bradbury matrix NOT EXECUTED**

This file freezes the shape of the final reviewer demonstration before implementation. Exact fixture URLs, contract address, transaction IDs, source hashes, fee profile, and release commit will be filled only after those values exist.

## 1. Matrix objective

The final persistent Bradbury certification must demonstrate, from the production frontend, all three certificate outcomes plus both challenge outcomes and the critical evidence failure modes.

The planned matrix uses exactly:

- 4 specifications;
- 2 challenges;
- 12 authorized lifecycle writes.

No extra write may be added casually to make the evidence "look better."

## 2. Scenario A — successful certification + rejected challenge

Write 1: `create_spec`

- one required criterion;
- policy: `AUTHORITATIVE_V1`;
- primary evidence: immutable/versioned fixture that supports the requirement.

Write 2: `evaluate_spec`

Expected:

- source available and admissible;
- criterion `SATISFIED`;
- certificate `CERTIFIED`;
- primary evidence snapshot exists and verifies.

Write 3: `open_challenge`

- counter source uses a new host;
- counter evidence also supports the existing requirement.

Write 4: `resolve_challenge`

Expected:

- challenge `REJECTED`;
- effective criterion remains `SATISFIED`;
- effective certificate remains `CERTIFIED`;
- original authenticated snapshot remains the decision basis.

## 3. Scenario B — explicit rejected release

Write 5: `create_spec`

- one required criterion;
- policy: `AUTHORITATIVE_V1`;
- primary immutable/versioned evidence explicitly contradicts the requirement.

Write 6: `evaluate_spec`

Expected:

- source available and admissible;
- criterion `VIOLATED`;
- certificate `REJECTED`;
- evidence snapshot verifies independently.

This scenario proves that `REJECTED` is not simulated by an unavailable source.

## 4. Scenario C — conflict + unavailable evidence -> insufficient

Write 7: `create_spec`

Use two required criteria in one specification.

Criterion C1:

- policy: `CORROBORATED_V1`;
- primary source supports;
- corroborating source contradicts;
- distinct normalized hosts.

Criterion C2:

- policy: `AUTHORITATIVE_V1`;
- primary source deliberately unavailable.

Write 8: `evaluate_spec`

Expected:

- C1 source conflict -> `INSUFFICIENT`;
- C2 unavailable -> `INSUFFICIENT`;
- overall certificate `INSUFFICIENT`;
- C1 available source snapshots verify;
- C2 has no fabricated content snapshot.

This one specification proves both conflict and unavailable-source fail-closed behavior.

## 5. Scenario D — certification + upheld challenge

Write 9: `create_spec`

- one required criterion;
- policy: `AUTHORITATIVE_V1`;
- primary immutable/versioned evidence supports.

Write 10: `evaluate_spec`

Expected:

- criterion `SATISFIED`;
- certificate `CERTIFIED`;
- original snapshot verifies.

Write 11: `open_challenge`

- new-host counter source materially contradicts the criterion.
- counter URL is an immutable `raw.githubusercontent.com/<owner>/<repo>/<full-commit>/<path>` locator;
- that evidence commit must be present in the repository's protected `main` ancestry;
- its immutable evidence-authority manifest must bind the exact evidence path and SHA-256, nominated release ref, criterion SHA-256, publisher wallet, and `COUNTER` role;
- the nominated release ref must be an immutable GitHub commit locator and the counter's release assessment must match that exact release.

The evidence manifest uses schema `proofspec-github-evidence-publisher-v2`. It intentionally does not repeat `commit_oid`: the full commit OID is already bound by the immutable evidence URL, GitHub ancestry proof, and manifest fetched from that same commit. Requiring a manifest to contain the OID of its own containing commit would be self-referential because the manifest bytes contribute to that OID.

These conditions are enforced by the deployed contract before an upheld counter can affect a certificate. A contradictory URL on a different host alone is not sufficient. If source availability, protected-main proof, manifest validation, exact-release binding, or validator agreement is missing, the expected safe result is `INSUFFICIENT`, not `UPHELD`.

Write 12: `resolve_challenge`

Expected:

- challenge `UPHELD`;
- counter assessment contradicts the original directional result;
- effective criterion becomes `INSUFFICIENT`;
- effective certificate becomes `INSUFFICIENT`;
- direct flip to `VIOLATED`/`REJECTED` does not occur;
- original authenticated snapshot remains preserved.

An upheld result also records the verified publisher-manifest proof. The publisher proof is a GitHub repository-control check only; it does not prove factual correctness, independent ownership, or editorial independence.

## 6. Required evidence for every write

Before each write:

- freeze method name;
- freeze exact arguments;
- freeze sender;
- freeze network identity;
- freeze contract address;
- record current finalized counts/state relevant to the operation.

At submission:

- preserve the raw client/RPC submission response before reviewer-facing normalization whenever accessible;
- record transaction ID immediately;
- persist exact UTF-8/raw response body before JSON decoding when the client path exposes it;
- wait for the intended GenLayer lifecycle state;
- preserve raw finalization response before normalization;
- record final execution result, not only outer receipt/finality;
- read authoritative finalized contract state after the write;
- capture frontend state proving the finalized result;
- journal whether any retry occurred.

## 7. Snapshot verification evidence

For every available decision-critical source:

- snapshot ID;
- content SHA-256;
- content length;
- source URL and normalized host;
- contract-side `verify_evidence_snapshot(...) == true`;
- independent local SHA-256 recomputation;
- independent local snapshot-ID recomputation using the frozen canonical algorithm.

Independent verification code must not import the contract helper that it is supposed to verify.

## 8. Consensus evidence

The release package must link the Direct Mode tests proving:

- leader/validator agreement;
- deliberate validator disagreement;
- source mutation between leader and validator;
- unavailable source to one validator;
- malformed semantic output;
- prompt injection;
- challenge resolution against authenticated original snapshots.

## 9. Controlled-fixture disclosure

Reviewer fixtures may be hosted by the project for reproducibility, but documentation must label them as controlled fixtures.

Distinct hosts used for contract host-diversity tests do not imply independent ownership or factual corroboration.

## 10. Final readback

After write 12, perform one read-only final certification pass that captures:

- specification count = 4;
- challenge count = 2;
- Scenario A `CERTIFIED`, challenge `REJECTED`;
- Scenario B `REJECTED`;
- Scenario C `INSUFFICIENT`;
- Scenario D effective `INSUFFICIENT`, challenge `UPHELD`;
- every expected snapshot verification result;
- release bindings.

The raw readback is frozen before writing a human-readable summary.

## 11. Write boundary

This matrix is a plan, not standing authorization.

Every deployment, funding operation, signing operation, and batch of live writes requires separately scoped authorization after preflight. If a write may have crossed the submission boundary and the client result is ambiguous, no retry is allowed until read-only reconciliation proves the previous outcome.
