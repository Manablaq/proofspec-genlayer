# Studio Next operator runbook

Status: **HOLD — the deployed contract's publisher-manifest format is self-referential; a local source fix passed focused regressions, but is not deployed. Do not run the ten-write continuation against the current address.**
Scope: **Studio Next / Studio Devnet only**
This runbook does not authorize a wallet signature, transaction broadcast, deployment, funding, or any Bradbury operation.

## Purpose and evidence boundary

Use this runbook to gather a reproducible live lifecycle sample for the current Studio Next deployment and release candidate. The scenarios mirror the frozen [reviewer matrix](REVIEWER_MATRIX.md), but the network is not Bradbury. Studio Devnet can reset; therefore a successful run here demonstrates compatibility and observed behavior only. It cannot be represented as persistent Bradbury certification or as proof that a reviewer requirement for Bradbury has passed.

The runbook does not claim the currently deployed contract has been freshly checked from this workstation. Before any write, the operator must independently confirm the current Studio UI/network, contract bytecode/source fingerprint if available, address, wallet account, and starting counts. If any binding differs from the fingerprint below, stop and reconcile rather than redeploying or substituting another contract.

## Frozen target fingerprint

Values recorded in the current owner scope document:

| Binding | Expected value |
| --- | --- |
| Studio UI/network family | Studio Next / Studio Devnet (`studio-dev`) |
| Chain ID | `61997` |
| Canonical RPC | `https://studio-dev.genlayer.com/api` |
| Current contract | `0x2240176b5fBa877cfD015877b68981D4c47a3659` |
| Contract source SHA-256 | `c37479737913eb65e9585a403ae308c2a8395433895fa80d3c14a6b835fd4816` |
| Recorded deployment transaction | `0x4a3ef9d5a41693c6346d08a94c68231837e8a1c972c5725ead4f49e480cab228` |
| Required frontend mode | `PROOFSPEC_NETWORK=studio-dev`; `PROOFSPEC_E2E_MOCK` unset |

These are expected bindings, not proof of the values currently displayed by Studio or served by the public frontend. The historical October 16 address `0xD11A506B363E131e8fA3eBeC28a21cC8a4375110` belongs to older contract bytes and must not be used for this current-source run.

### Newly discovered deployment blocker (2026-10-22)

The current on-chain address above still runs contract source SHA-256 `c37479737913eb65e9585a403ae308c2a8395433895fa80d3c14a6b835fd4816`. In that source, `proofspec-github-evidence-publisher-v1` requires its manifest to contain the same commit OID as the commit that contains the manifest. Since those manifest bytes are part of that commit, the requirement is self-referential and cannot be satisfied by an ordinary Git commit. This prevents the intended verified-publisher challenge path from completing on the existing instance.

The local candidate removes only that redundant manifest field, keeps the commit OID bound by the immutable raw URL and protected-main ancestry checks, and bumps the manifest schema to v2. Candidate source SHA-256: `a76a30802b7e6a647af5b50ba17bdd95862ee1b756f8f34d8e5e6edea9c85120`. Local backend static/deterministic gate (68 tests), full Direct Mode suite (84 tests), and stub-runtime suite (85 tests), plus typecheck and GenVM lint, pass; no new deployment or live consensus test has been performed. Do not send any of the ten remaining calls to the old address. A fresh deployment and fresh 12-write fixture plan would be required; deployment/broadcast remains subject to scoped approval.

## Read-only preflight result (2026-10-22)

The canonical GenLayer JS client for this project (`genlayer-js` 2.0.0-rc.1), explicitly querying `TransactionHashVariant.LATEST_FINAL`, successfully read the target contract:

- `get_protocol_info`: `proofspec-v1`;
- `get_spec_count`: `1`;
- `get_challenge_count`: `0`;
- spec 1 is already `EVALUATED`, `CERTIFIED`, revision 1, with criterion 1 `SATISFIED`;
- spec 1 label is `ProofSpec R80 live lifecycle`; its existing requirement concerns the `sdkChainFor` Studio Devnet mapping;
- its primary snapshot is `7fdc6e9e91626a93ea4a8cb8a1f7f124c21d060766bacc2aa4cf7190856b8974`; contract `verify_evidence_snapshot` returned `true`.

The public Studio Devnet Explorer history was then reconciled, using an allowlist of transaction fields (not exporting validator node configuration):

| Matrix step | Finalized transaction | Sender / target | Timestamp (UTC) | Reconciled result |
| ---: | --- | --- | --- | --- |
| 1 — Scenario A `create_spec` | `0x521cae1545fae111b2c0021cf53143ddbe12f3877a1b98a161c25f60604f1a42` | `0x7A4a1f1acDa02E984ca80A86F08fb50dd03AC585` → `0x2240176b5fBa877cfD015877b68981D4c47a3659` | `2026-10-21T16:54:06.600341Z` | Explorer status `FINALIZED`; args match stored spec 1. Local R86 receipt records `FINALIZED` / `FINISHED_WITH_RETURN`; file SHA-256 `ce641525689d2685a2490a518b4c551d031d94535f24c156961470ef4cc020f7`. |
| 2 — Scenario A `evaluate_spec(1)` | `0xba7c56ea96cce9d19b3eb168b688166fe749d8e2a4f5374fd56c7f57b564ff68` | same sender and target | `2026-10-21T17:14:01.123456Z` | Explorer status `FINALIZED`; finalized contract readback is `CERTIFIED` / `SATISFIED`; primary snapshot verifies. Local R88B finalized-state artifact SHA-256 `05ac996d01c164744521e214f3cfec4de5ca6a41bc3425ef3a2a50fd132f1290`. |

The recovered `create_spec` inputs are label `ProofSpec R80 live lifecycle`, release ref `https://github.com/Manablaq/proofspec-genlayer/commit/dc2062c6b8be108c8e583a984492a24362347a14`, and one `AUTHORITATIVE_V1` criterion with freshness `NOT_REQUIRED_V1`, using the commit-pinned `frontend/lib/network.ts` as primary evidence. Its proposition is that `sdkChainFor` maps `studio-dev` to GenLayer's `studioDevnet` SDK preset. The current official GenLayer network documentation independently describes the `studio-dev` / `studioDevnet` pairing at `https://docs.genlayer.com/developers/networks`; this is a suitable distinct-host candidate for Scenario A's supporting challenge counter-source, subject to the operator rechecking and recording the rendered content before signing.

The create call's finalized GenLayer receipt is retained in `~/Downloads/PROOFSPEC_R86_CREATE_FINALITY_ykbw8WlI/finalized-transaction.json`; its manifest is `evidence-sha256.txt`. The later R88B state package explicitly says its read-only pass could not independently identify the evaluation tx hash or verify its transaction receipt; the Explorer history now provides the candidate `evaluate_spec(1)` hash and FINALIZED status, while the local R88B package independently records the resulting finalized state and snapshot verification. Original raw wallet submission responses and a locally archived raw evaluation finality response remain unavailable. Keep this gap explicit in any submission. These historical calls can be counted as matrix writes 1–2 for a supplementary Studio Devnet lifecycle, but do not alter the frozen Bradbury target or prove Bradbury behavior.

An independent SHA-256 and snapshot-ID calculation over the exact stored `snapshot.content` reproduced the contract's content digest `fdffe0124ef5fe27dae503c3976544a2d24afa4a766b2fa4f63e45565eb7ae59` and snapshot ID above. A fresh HTTP fetch of the pinned raw GitHub URL is not byte-for-byte identical: GenLayer's `render(url, mode="text")` snapshot normalized source indentation and the trailing newline. For independent verification, hash the exact committed rendered snapshot content; record the fetched raw-response digest separately rather than treating the two representations as interchangeable.

Important CLI distinction: the installed `genlayer call` 0.39.2 command queried `latest-nonfinal` and surfaced `malformed_entry` on these view calls. The frontend's SDK read with `LATEST_FINAL` succeeded. The CLI output was therefore not evidence that the contract's finalized read methods are broken. Use the pinned frontend SDK/finalized view path for this preflight.

**Current plan — HOLD:** the one specification and zero challenges above are finalized state on the *old* contract only. The former suggestion to resume at step 3 is withdrawn because the old contract cannot satisfy Scenario D's verified-publisher path. Do not transact against that address. A newly approved deployment of the v2 candidate would start from zero specifications and zero challenges and require a new, fully frozen 12-write run. The Bradbury certification target remains unchanged and out of scope. No deployment or write has been made for this candidate.

## Before the first signature

1. Open the intended Studio Next workspace and verify the displayed network is Studio Devnet / chain `61997`. Do not use Bradbury or Studionet for this run.
2. Verify the connected wallet address and that it is the intended submitter. Record the full address; never paste a seed phrase or private key into the journal.
3. Only after an explicitly approved v2 Studio Devnet deployment, verify its new address and source fingerprint. Read `get_protocol_info`, `get_spec_count`, and `get_challenge_count` with the pinned GenLayer SDK and `LATEST_FINAL`; save the raw results. Expected starting counts for that fresh instance are zero specs and zero challenges. Plan all 12 matrix writes from Scenario A step 1; do not carry over spec 1 or transaction history from the old address.
4. Freeze the release labels, immutable `release_ref` values, criterion text, policy, freshness policy, and every source URL below. URLs must be real, accessible HTTPS sources suitable for the exact criterion. Record the fetched content/version and independently establish what each fixture supports or contradicts. For the unavailable case, record evidence that the URL is intentionally unavailable and do not imply it is an authentic snapshot.
5. Confirm from current Studio method forms that the ABI matches `contracts/proofspec.py`; use `docs/CONTRACT_SPEC.md` and the exact method signatures listed below. The installed GenLayer CLI 0.39.2 `estimate-fees` command was tested read-only and reported that the active client does not support simulation-derived fee estimates. Do not treat that as a zero-fee estimate or guess a `--fee-value`; these contract methods are nonpayable. For CLI writes, omit `--fee-value` so the client derives the deposit from the configured FeeManager/Studio path, and record the actual submitted value and eventual fee from the receipt. If the Studio UI or client cannot show the derived amount before signing, disclose that uncertainty in the scoped transaction approval and do not claim a pre-sign exact fee quote.
6. Create a local evidence journal from the worksheet below. Save screenshots and raw responses without wallet secrets. No write is eligible until its arguments and expected post-state are filled in and reviewed by the operator.

### Fixture freeze worksheet (complete before signing)

| Fixture | Exact HTTPS URL(s) | Criterion requirement / factual proposition | Version or immutable identifier | Expected result and why |
| --- | --- | --- | --- | --- |
| A primary (historical step 1–2) | `https://raw.githubusercontent.com/Manablaq/proofspec-genlayer/dc2062c6b8be108c8e583a984492a24362347a14/frontend/lib/network.ts` | `sdkChainFor` maps `studio-dev` to the GenLayer `studioDevnet` SDK preset | Git commit `dc2062c6b8be108c8e583a984492a24362347a14`; authenticated rendered snapshot ID `7fdc6e9e91626a93ea4a8cb8a1f7f124c21d060766bacc2aa4cf7190856b8974` | Supports; already evaluated and certified in spec 1 |
| A challenge counter, distinct host | `https://docs.genlayer.com/developers/networks` | Same proposition as A | Re-fetch and record exact rendered bytes, retrieval timestamp, digest, and page version/date before signing | Supports; candidate only until rechecked |
| B primary | `TO BE FROZEN` | `TO BE FROZEN` | `TO BE FROZEN` | Contradicts |
| C1 primary | `TO BE FROZEN` | `TO BE FROZEN` | `TO BE FROZEN` | Supports |
| C1 corroborating, distinct host | `TO BE FROZEN` | Same proposition as C1 | `TO BE FROZEN` | Contradicts |
| C2 primary | `TO BE FROZEN` | `TO BE FROZEN` | `TO BE FROZEN` | Intentionally unavailable |
| D primary | `TO BE FROZEN` | `TO BE FROZEN` | `TO BE FROZEN` | Supports |
| D challenge counter | `TO BE FROZEN` | Same proposition as D | Must be an immutable raw GitHub URL on a protected-main descendant commit. Its commit's evidence-authority manifest must bind the exact file path and content SHA-256, D's exact release ref, criterion SHA-256, publisher wallet, and `COUNTER` role. The release ref itself must be an immutable GitHub commit locator. | Materially contradicts; expected `UPHELD` only if every contract-side publisher and exact-release proof succeeds |

Distinct hosts only establish the contract's host-diversity condition; they do not establish independent ownership or factual independence. A distinct-host counter URL alone cannot produce Scenario D's expected `UPHELD` result on the deployed contract: `contracts/proofspec.py` requires the counter to be bound to the exact immutable release and to pass GitHub protected-main ancestry, pinned evidence-manifest, content-hash, role, and wallet validation. A missing or mismatched proof safely yields `INSUFFICIENT`. Use controlled fixtures only when clearly disclosed as controlled fixtures. The deployed adjudicator's interpretation is not guaranteed by the fixture author's expected result.

## Write sequence and stop gates

Run one write at a time. After each write, wait for its actual finality state, verify the Intelligent Contract execution result, then read back the authoritative finalized state before proceeding. A submitted or outer `ACCEPTED` receipt alone is not success. If a result is pending, timed out, ambiguous, or finalized with execution error, stop and reconcile read-only; never click again or create a substitute transaction to “see if it works.”

| # | Intended method | Scenario / required result before continuing |
| ---: | --- | --- |
| 1 | `create_spec(release_label, release_ref, criteria_json)` | A; **historical finalized** transaction `0x521cae1545fae111b2c0021cf53143ddbe12f3877a1b98a161c25f60604f1a42`; spec ID 1; original raw client response unavailable locally. |
| 2 | `evaluate_spec(spec_id)` | A; **historical finalized** transaction `0xba7c56ea96cce9d19b3eb168b688166fe749d8e2a4f5374fd56c7f57b564ff68`; current readback `CERTIFIED` / `SATISFIED`, snapshot verifies; original raw client response unavailable locally. |
| 3 | `open_challenge(spec_id, criterion_id, counter_url, note)` | A; record challenge ID and pending state. Counter host must be new. |
| 4 | `resolve_challenge(challenge_id)` | A; verify challenge `REJECTED`; effective result remains `CERTIFIED` / `SATISFIED`; original snapshot is preserved. |
| 5 | `create_spec(release_label, release_ref, criteria_json)` | B; capture spec ID and verify `PENDING`. |
| 6 | `evaluate_spec(spec_id)` | B; verify `REJECTED` / `VIOLATED` from available, admissible evidence—not source unavailability. |
| 7 | `create_spec(release_label, release_ref, criteria_json)` | C; two unique criteria: C1 `CORROBORATED_V1` with distinct hosts; C2 `AUTHORITATIVE_V1` with intentionally unavailable primary. |
| 8 | `evaluate_spec(spec_id)` | C; verify C1 conflict and C2 unavailable each fail closed to `INSUFFICIENT`; overall `INSUFFICIENT`; no fabricated snapshot for unavailable content. |
| 9 | `create_spec(release_label, release_ref, criteria_json)` | D; capture spec ID and verify `PENDING`. |
| 10 | `evaluate_spec(spec_id)` | D; verify `CERTIFIED` / `SATISFIED` and original snapshot. |
| 11 | `open_challenge(spec_id, criterion_id, counter_url, note)` | D; capture challenge ID and verify pending. Counter host is new and evidence materially contradicts the criterion. |
| 12 | `resolve_challenge(challenge_id)` | D; verify `UPHELD`, effective criterion and certificate become `INSUFFICIENT`, not `VIOLATED` / `REJECTED`; original snapshot remains intact. |

Any result that differs from the expected post-state is a stop condition. Preserve it as an observed result; do not repeat or repair the run in-place. A new run requires a new explicit plan and clean starting state.

## Per-transaction evidence record

Copy this block for each transaction. Capture it before advancing to the next write.

```text
Run label / scenario / step:
Timestamp (UTC):
Network shown in Studio:
Chain ID:
RPC/profile shown (if available):
Contract address:
Contract source fingerprint / deployment tx:
Wallet sender (full public address):
Method and exact arguments (redact no public evidence inputs):
Pre-write finalized counters and relevant state:
UI fee/value shown and unit:
Transaction hash:
Raw submission response file + SHA-256:
Final lifecycle state and timestamp:
GenLayer execution result (not only outer receipt):
Return value / consensus result:
Raw finalization response file + SHA-256:
Authoritative finalized state readback:
Screenshot or recording reference:
Retry attempted? Must remain NO; if uncertain, stop and reconcile:
Notes / deviations:
```

Never include secrets, recovery phrases, session cookies, or unredacted wallet export material. Keep the journal private until checked for secrets and personally identifying data.

## Snapshot verification

For every available decision-critical snapshot, record the snapshot ID, URL, normalized host, content SHA-256, byte/character length as defined by the contract, and the result of the contract's `verify_evidence_snapshot(snapshot_id)` read. Independently recompute both the content digest and canonical snapshot ID using a separate implementation; do not import the contract helper into the independent verifier. Save the exact bytes used for the digest. For intentionally unavailable evidence, record the source status and absence of a content snapshot; never synthesize content or a digest.

## Final read-only reconciliation

Only after step 12 is conclusively finalized, capture raw `get_spec_count`, `get_challenge_count`, every `get_spec`, `get_criterion`, `get_challenge`, and snapshot verification result needed to prove the matrix. Compare observed results to all expected values in `REVIEWER_MATRIX.md`. Archive the raw readback and compute its SHA-256 before drafting a summary. Do not claim all outcomes passed if a write timed out, execution failed, state differs, a snapshot cannot be independently verified, or any evidence row is incomplete.

## Limits to state in any submission

- This is Studio Devnet evidence, not Bradbury evidence; Studio Devnet may reset.
- The 12-write matrix in `REVIEWER_MATRIX.md` is a frozen Bradbury certification plan. Reusing Studio Devnet steps 1–2 does not change that target; completing steps 3–12 here is supplementary compatibility evidence only.
- Local tests and mocked browser flows do not establish live wallet, consensus, web-source, or persistence behavior.
- A `FINALIZED` network status is insufficient without successful Intelligent Contract execution and verified finalized readback.
- No reviewer acceptance or production readiness is implied by preparing this runbook.
