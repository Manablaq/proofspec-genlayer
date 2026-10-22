# Studio Devnet controlled fixture plan

Status: **Local plan only. No fixture has been published and no transaction has been sent.**

This is a resettable Studio Devnet compatibility test, not Bradbury certification. Every intentionally false statement below is a controlled adversarial fixture, not a factual assertion. Distinct URL hosts do not imply independent ownership or truth.

## Release identifiers to freeze after merge

- `R`: full Git commit OID of the approved v2 ProofSpec release on protected `main`.
- `E`: full Git commit OID of a later protected-`main` commit containing the controlled evidence files and v2 publisher manifest. `E` must descend from `R`.
- `release_ref`: `https://github.com/Manablaq/proofspec-genlayer/commit/R`.
- Product source: `https://raw.githubusercontent.com/Manablaq/proofspec-genlayer/R/frontend/lib/network.ts`.
- Evidence fixture sources: `https://raw.githubusercontent.com/Manablaq/proofspec-genlayer/E/docs/fixtures/studio-dev-c1-counter.txt` and `.../studio-dev-d-counter.txt`.

Do not replace `R` or `E` with branch names, abbreviations, or the old deployed R53 commit. `E`'s publisher manifest refers to `R`, not `E`; schema v2 deliberately has no self-referential `commit_oid` field. Its URL and GitHub ancestry proof bind `E`.

## Frozen criterion text

These strings are exact; do not edit after computing the D criterion SHA-256.

1. **A:** `In the nominated release, sdkChainFor maps the studio-dev network to GenLayer's studioDevnet SDK preset.`
   - Policy `AUTHORITATIVE_V1`; freshness `RELEASE_BOUND_V1`; primary URL is the pinned `network.ts` at `R`.
   - Expected evaluation `SATISFIED` / `CERTIFIED`.
   - Challenge counter URL: `https://docs.genlayer.com/developers/networks` (supports the mapping); challenge should be `REJECTED`.

2. **B:** `In the nominated release, sdkChainFor maps the studio-dev network to GenLayer's testnetBradbury preset.`
   - Policy `AUTHORITATIVE_V1`; freshness `RELEASE_BOUND_V1`; primary URL is the pinned `network.ts` at `R`.
   - This is intentionally false; the pinned source explicitly selects `studioDevnet` for `studio-dev`. Expected `VIOLATED` / `REJECTED`.

3. **C1:** `The GenLayer Studio development preview uses chain ID 61997.`
   - Policy `CORROBORATED_V1`; freshness `NOT_REQUIRED_V1`.
   - Primary URL `https://docs.genlayer.com/developers/networks` supports it.
   - Corroborating URL is the pinned C1 controlled counter fixture at `E`, which explicitly says `61998` and labels that statement deliberately false for the conflict test.
   - Expected conflict -> `INSUFFICIENT`.

4. **C2:** `The nominated release contains the marker PROOFSPEC_UNAVAILABLE_FIXTURE_PRESENT_V1.`
   - Policy `AUTHORITATIVE_V1`; freshness `RELEASE_BOUND_V1`.
   - Primary URL `https://raw.githubusercontent.com/Manablaq/proofspec-genlayer/R/docs/fixtures/does-not-exist.txt` is deliberately absent. Verify the actual 404 immediately before using it; do not create the path.
   - Expected unavailable evidence -> `INSUFFICIENT`, with no content snapshot.

5. **D:** `In the nominated release, sdkChainFor maps the studio-dev network to GenLayer's studioDevnet SDK preset.`
   - Policy `AUTHORITATIVE_V1`; freshness `RELEASE_BOUND_V1`; primary URL is the pinned `network.ts` at `R`.
   - Expected initial `SATISFIED` / `CERTIFIED`.
   - Challenge counter is the pinned D controlled fixture at `E`. Before publishing, fill its release line with `R`; it must explicitly state that, for nominated release `R`, `studio-dev` maps to `testnetBradbury`, and visibly label that as a deliberately false controlled counter fixture.
   - Its `.proofspec/evidence-authority.json` manifest must use schema `proofspec-github-evidence-publisher-v2` and exactly bind repository `Manablaq/proofspec-genlayer`, path `docs/fixtures/studio-dev-d-counter.txt`, SHA-256 of the exact trimmed UTF-8 file contents, `release_ref` above, SHA-256 of the exact normalized D criterion, the approved public publisher wallet, and role `COUNTER`. It must not contain a `commit_oid` key.
   - Expected only when exact-release assessment, protected-main ancestry, v2 manifest, semantic contradiction, and validator consensus all succeed: challenge `UPHELD`; effective result and certificate `INSUFFICIENT`. Any missing proof should fail closed, not be retried.

## Criterion payload templates

Replace `R` and `E` only after the two protected-main commits exist. Keep compact JSON in the actual `create_spec` argument.

```json
[{"requirement":"In the nominated release, sdkChainFor maps the studio-dev network to GenLayer's studioDevnet SDK preset.","policy":"AUTHORITATIVE_V1","freshness_policy":"RELEASE_BOUND_V1","primary_url":"https://raw.githubusercontent.com/Manablaq/proofspec-genlayer/R/frontend/lib/network.ts","corroborating_url":""}]
```

```json
[{"requirement":"In the nominated release, sdkChainFor maps the studio-dev network to GenLayer's testnetBradbury preset.","policy":"AUTHORITATIVE_V1","freshness_policy":"RELEASE_BOUND_V1","primary_url":"https://raw.githubusercontent.com/Manablaq/proofspec-genlayer/R/frontend/lib/network.ts","corroborating_url":""}]
```

```json
[{"requirement":"The GenLayer Studio development preview uses chain ID 61997.","policy":"CORROBORATED_V1","freshness_policy":"NOT_REQUIRED_V1","primary_url":"https://docs.genlayer.com/developers/networks","corroborating_url":"https://raw.githubusercontent.com/Manablaq/proofspec-genlayer/E/docs/fixtures/studio-dev-c1-counter.txt"},{"requirement":"The nominated release contains the marker PROOFSPEC_UNAVAILABLE_FIXTURE_PRESENT_V1.","policy":"AUTHORITATIVE_V1","freshness_policy":"RELEASE_BOUND_V1","primary_url":"https://raw.githubusercontent.com/Manablaq/proofspec-genlayer/R/docs/fixtures/does-not-exist.txt","corroborating_url":""}]
```

```json
[{"requirement":"In the nominated release, sdkChainFor maps the studio-dev network to GenLayer's studioDevnet SDK preset.","policy":"AUTHORITATIVE_V1","freshness_policy":"RELEASE_BOUND_V1","primary_url":"https://raw.githubusercontent.com/Manablaq/proofspec-genlayer/R/frontend/lib/network.ts","corroborating_url":""}]
```

## Fresh-instance transaction order

The old R53 instance is not a valid target. After a separately approved v2 Studio Devnet deployment, first verify its address/source fingerprint and finalized starting counts `0` specs / `0` challenges. Then execute one call at a time, reconciling finality, GenVM execution result, and finalized state after every call:

| Call | Exact method / IDs | Expected post-state |
|---:|---|---|
| 1 | `create_spec("ProofSpec Studio matrix A", release_ref, A_JSON)` | spec 1 `PENDING` |
| 2 | `evaluate_spec(1)` | spec 1 `CERTIFIED`, criterion `SATISFIED` |
| 3 | `open_challenge(1, 1, "https://docs.genlayer.com/developers/networks", "Controlled Studio Devnet documentation counter-check")` | challenge 1 `PENDING` |
| 4 | `resolve_challenge(1)` | challenge 1 `REJECTED`; spec 1 remains certified |
| 5 | `create_spec("ProofSpec Studio matrix B", release_ref, B_JSON)` | spec 2 `PENDING` |
| 6 | `evaluate_spec(2)` | spec 2 `REJECTED`, criterion `VIOLATED` |
| 7 | `create_spec("ProofSpec Studio matrix C", release_ref, C_JSON)` | spec 3 `PENDING` |
| 8 | `evaluate_spec(3)` | both criteria and spec 3 `INSUFFICIENT`; C2 has no snapshot |
| 9 | `create_spec("ProofSpec Studio matrix D", release_ref, D_JSON)` | spec 4 `PENDING` |
| 10 | `evaluate_spec(4)` | spec 4 `CERTIFIED`, criterion `SATISFIED` |
| 11 | `open_challenge(4, 1, "https://raw.githubusercontent.com/Manablaq/proofspec-genlayer/E/docs/fixtures/studio-dev-d-counter.txt", "Controlled, manifest-bound counter for release R")` | challenge 2 `PENDING` |
| 12 | `resolve_challenge(2)` | challenge 2 `UPHELD`; spec 4 effectively `INSUFFICIENT` |

The installed CLI can derive its fee deposit when `--fee-value` is omitted, but its `estimate-fees` simulation path is unsupported. Record the actual submitted value and receipt fee; do not describe a zero or exact pre-sign estimate. Any timeout, pending/ambiguous submission, or unexpected state stops the sequence; reconcile read-only and never retry blindly.

## Gate before publishing or signing

This plan is not transaction authorization. Freeze `R`, `E`, the D evidence bytes/hash and manifest, all four JSON arguments, exact URLs, deployment address/source hash, signer, and fee handling after the source fix is merged and deployed. Review all of those values before any chain write. Do not publish the false controlled statements as ordinary GenLayer documentation.
