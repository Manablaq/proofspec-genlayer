# ProofSpec — Reviewer Evidence and Hash-Provenance Index

**Reconciled:** October 17, 2026.

**Evidence window:** Existing Studio Next lifecycle and October 16 R5/R7 operational reports.

**Classification:** Sanitized **index** of public identifiers and recorded checks. This is **not** an archive of original raw RPC bytes, an independently verified receipt set, or Bradbury certification.

## Public identity / commitment ledger

| ID | Item | Identity and evidence provenance |
| --- | --- | --- |
| E01 | Git release | [`62589f216adc3041c2f88b65191cd5afd12c7f5d`](https://github.com/Manablaq/proofspec-genlayer/tree/62589f216adc3041c2f88b65191cd5afd12c7f5d); reread as GitHub `main` and recorded as the exact Vercel deployment source. |
| E02 | Frozen Intelligent Contract source SHA-256 | `fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9` for `contracts/proofspec.py`; recorded in local static/Direct Mode and Studio Next checkpoint evidence. |
| E03 | Studio Next deployed contract | `0xD11A506B363E131e8fA3eBeC28a21cC8a4375110` on chain `61997`; checked in runtime config and direct finalized reads. |
| E04 | Deployment transaction ID | `0x19010d8b520c5bb04108bcd94ff88594f1beb4fa85295bbe1a21c3d3bbce5aa8`; historical P6 report records finality and execution success. |
| E05 | Create-spec transaction ID | `0x4b4776e2788da38faa444073430cf7410f8111e22ac88a47634c5293035afffd`; historical P6 report records finality and execution success. |
| E06 | Evaluate-spec transaction ID | `0x0ec67841233bf861e95f2c61faf58e31a99f70f5a679e50aede58e55325c61a1`; historical P6 report plus direct R7B readback of `CERTIFIED`. |
| E07 | Snapshot identifier | `f0709a9f292ef5d3c12e2aa30a783eee48670793563c13e2cc159b29982de3f8`; contract getter and three production browsers matched. |
| E08 | Snapshot content SHA-256 | `db37f823a4e2b2a5446d2c28eb07fef5d9715110fa8f1381d171ad39f00d19e9`; R7B and all three R7C browsers independently computed matching SHA-256s. |
| E09 | Vercel project / deployment | `prj_y6PSs2naBMi9KZZBQeBzXcjNGY2O` / `dpl_HbNcTkeH1C66KUKrVpAFzosHzHqh`; `READY` production deployment bound to E01. |
| E10 | Public frontend | https://proofspec-genlayer.vercel.app; R7A HTTP 200 on `/`, `/api/runtime-config`, `/spec/1`; `mockMode=false`. |
| E11 | Production browser evidence | Chromium, Firefox, WebKit each `PASS` with 5 guarded, allowed read-only RPC calls, real snapshot content and digest; from R7C terminal output. |

**Do not conflate hashes:** E01 is a Git commit SHA; E04–E06 are transaction hashes; E07 is a contract-defined snapshot identifier; E02 and E08 are SHA-256 content digests. Transaction hashes alone are not copies of underlying receipts. Snapshot ID and content SHA-256 are separately validated concepts.

## Read-only reproduction commands

From a checkout that contains the frozen release, independently rehash the **actual committed Intelligent Contract source** (not this report's printed value):

```bash
git show 62589f216adc3041c2f88b65191cd5afd12c7f5d:contracts/proofspec.py | shasum -a 256
```

The expected hex digest is `fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9`.

Confirm the original release object exists:

```bash
git cat-file -e 62589f216adc3041c2f88b65191cd5afd12c7f5d^{commit}
```

Retrieve public deployment configuration without signing or submitting a transaction:

```bash
curl --fail --silent --show-error https://proofspec-genlayer.vercel.app/api/runtime-config
```

For E07/E08, use `genlayer-js` with `TransactionHashVariant.LATEST_FINAL` to read `get_evidence_snapshot(snapshot_id)` and `verify_evidence_snapshot(snapshot_id)`. SHA-256 must be calculated over the returned snapshot `content` encoded as UTF-8 bytes; verify both the content commitment and contract verification result. R7B executed this check; R7C independently hashed the rendered content in three browsers.

## Local original journals: referenced but not published

The dated Studio Next certification checkpoint records the following operator-local evidence locations:

- `~/Downloads/PROOFSPEC_P6_11_SINGLE_SEND_JOURNAL.jsonl`
- `~/Downloads/PROOFSPEC_P6_18H_SINGLE_SEND_JOURNAL.jsonl`
- `~/Downloads/PROOFSPEC_P6_19_READONLY_FINALITY_EVIDENCE/`

Original journal bytes and local R5/R7 terminal transcripts remain **unpublished**. The verified metadata-only [R8F evidence index ZIP](evidence/proofspec_r8f_sanitized_evidence_index.zip) contains the 29 original relative filenames, file sizes, and SHA-256 hashes. Its ZIP SHA-256 is `323a5409c454c68c33eec8b94b427781324dcdc3e6122eb917560af452c29f18` (7,093 bytes). This ZIP contains **no raw RPC requests/responses, execution journal bodies, or secrets**; it is not independent proof of the original execution or a sanitized release of the raw evidence. R8E source verification, R8G package verification, and R8H disclosure audit are operator-side checks, not independent reviewer certification.

Before publishing any raw journals or RPC response bytes, collect copies of the original bytes without editing originals; inventory and hash the originals; inspect for wallet secrets/tokens; sanitize **new copies**; independently hash the sanitized package and publish its separate digest manifest only after verifying it. Redacted copies necessarily have different hashes than originals. Do not upload or reveal unreviewed operator journals.

## Authoritative documents and date boundaries

- [Production Release Verification](PRODUCTION_RELEASE_VERIFICATION_2026-10-16.md) — recent R5/R7 deployment and operator readback summary.
- [Historical Studio Next contract certificate](PROGRESS_5_6_STUDIO_NEXT_CERTIFICATION_2026-10-16.md) — deployment, create and evaluate transaction identities and finality.
- [Studio Next-only Submission Scope](STUDIO_NEXT_ONLY_SUBMISSION_SCOPE.md) — authorized network choice and disclosure obligations.
- [Original Reviewer Matrix](REVIEWER_MATRIX.md) — still-unexecuted four-spec/two-challenge/twelve-write test plan.
- [Original Release Gates](RELEASE_GATES.md) — planned full seven-gate requirements, not evidence of completion.

## Completion boundary

Demonstrated: one successful live Studio Next `CERTIFIED` path, authenticated evidence, a `READY` Vercel production frontend, and three-browser read-only guest verification.

**Not demonstrated:** Bradbury persistence, the full 12-write reviewer matrix, live `REJECTED`/`INSUFFICIENT` certificate outcomes, live challenge `REJECTED`/`UPHELD` outcomes, real wallet/browser write finality, or publication of independently verified sanitized raw journals. Reviewer acceptance cannot be guaranteed. **Do not use `PROOFSPEC_RELEASE_COMPLETE=YES` or claim full Progress 7/7.**
