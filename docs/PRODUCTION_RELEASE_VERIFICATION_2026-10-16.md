# ProofSpec — Studio Next Production Release Verification

**Operational checkpoint:** October 16, 2026; documentation reconciliation: October 17, 2026.

**Evidence type:** Verified release metadata and operator-provided R5/R7 read-only terminal outputs; **not** a raw RPC log archive.

**Network boundary:** Studio Next / Studio Devnet (`studio-dev`), chain ID `61997`; **not Bradbury**.

This report reconciles the already certified Studio Next contract with the already deployed frontend. It neither rewrites the frozen earlier checkpoints nor claims a newly executed transaction or browser-wallet write.

## Release identity

| Property | Verified / recorded value |
| --- | --- |
| Repository | [Manablaq/proofspec-genlayer](https://github.com/Manablaq/proofspec-genlayer) |
| Verified frontend release commit | [`62589f216adc3041c2f88b65191cd5afd12c7f5d`](https://github.com/Manablaq/proofspec-genlayer/tree/62589f216adc3041c2f88b65191cd5afd12c7f5d) |
| Immutable source reference used by evaluated specification | `803826a9090fd90b42e6fdae85cc712c50175d76` |
| Contract source path and recorded SHA-256 | `contracts/proofspec.py` — `fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9` |
| Contract address | `0xD11A506B363E131e8fA3eBeC28a21cC8a4375110` |
| RPC | `https://studio-next.genlayer.com/api` |
| Vercel project | `proofspec-genlayer`, ID `prj_y6PSs2naBMi9KZZBQeBzXcjNGY2O` |
| Vercel deployment | `dpl_HbNcTkeH1C66KUKrVpAFzosHzHqh` (`production`, `READY`) |
| Public domain | https://proofspec-genlayer.vercel.app |
| Frontend root and framework | `frontend` / Next.js |

## R5 — Single reviewed Git release

The 43-path audited frontend release was published once, producing Git commit `62589f216adc3041c2f88b65191cd5afd12c7f5d` with immediate parent `803826a9090fd90b42e6fdae85cc712c50175d76`. GitHub `main` was independently reread at the release SHA, and the operator's local status was clean. The publication journal correctly rejected a subsequent duplicate attempt; no repeat of R5 is authorized.

## Previously finalized Studio Next contract lifecycle

The [dated Studio Next checkpoint](PROGRESS_5_6_STUDIO_NEXT_CERTIFICATION_2026-10-16.md) recorded three finalized, successful transactions. These are **historical transaction identities** and must not be retransmitted:

| Action | Recorded transaction hash | Recorded outcome |
| --- | --- | --- |
| Deployment | `0x19010d8b520c5bb04108bcd94ff88594f1beb4fa85295bbe1a21c3d3bbce5aa8` | `FINALIZED`, `MAJORITY_AGREE`, `FINISHED_WITH_RETURN` |
| `create_spec(...)` → specification 1 | `0x4b4776e2788da38faa444073430cf7410f8111e22ac88a47634c5293035afffd` | `FINALIZED`, `MAJORITY_AGREE`, `FINISHED_WITH_RETURN` |
| `evaluate_spec(1)` | `0x0ec67841233bf861e95f2c61faf58e31a99f70f5a679e50aede58e55325c61a1` | `FINALIZED`, `MAJORITY_AGREE`, `FINISHED_WITH_RETURN` |

The earlier report and separate raw operator journals, rather than this document, are the sources for transaction-finality claims. We do not present receipt bytes here or substitute outer EVM receipt status for GenLayer execution results.

## R6B / R7 — Scoped Vercel production release

R6B identified Vercel account `manablaq`, team `mr-albert-s-projects`, and **no existing ProofSpec project**. Following explicit authorization, exactly one project `proofspec-genlayer` was created and linked to the frozen GitHub repository. The project was configured for Next.js with `frontend` as the root and the three public Studio Next runtime values. Vercel returned `READY` for deployment `dpl_HbNcTkeH1C66KUKrVpAFzosHzHqh`, bound to the exact R5 SHA. The previously existing projects and domains were not used as targets.

## R7A — Independent public HTTP checks

The operator ran `curl` against the real production domain. The following public routes each returned **HTTP 200**:

| Route | Result |
| --- | --- |
| `/` | HTTP 200 |
| `/api/runtime-config` | HTTP 200 |
| `/spec/1` | HTTP 200 |

The runtime endpoint reported `configured=true`, `network=studio-dev`, chain ID `61997`, RPC `https://studio-next.genlayer.com/api`, contract `0xD11A506B363E131e8fA3eBeC28a21cC8a4375110`, `mockMode=false`, and `error=null`. These are extracted fields from the operator's result, not a byte-for-byte captured HTTP response. HTTP 200 alone is **not** evidence of on-chain state.

## R7B — Direct finalized contract readbacks

Using `genlayer-js` `2.0.0-rc.1` and `TransactionHashVariant.LATEST_FINAL`, the operator's read-only probe reported:

| Getter / integrity check | Observed result |
| --- | --- |
| `get_spec_count()` | `1` |
| `get_challenge_count()` | `0` |
| `get_spec(1).state` | `EVALUATED` |
| Initial and effective result | `CERTIFIED` |
| Revision | `1` |
| Criterion 1 result | `SATISFIED` |
| Primary evidence | `AVAILABLE` |
| `verify_evidence_snapshot(...)` | `true` |
| Independently recomputed SHA-256 of UTF-8 snapshot content | `db37f823a4e2b2a5446d2c28eb07fef5d9715110fa8f1381d171ad39f00d19e9` |

Authenticated snapshot ID: `f0709a9f292ef5d3c12e2aa30a783eee48670793563c13e2cc159b29982de3f8`.

The independently recomputed digest equaled the stored digest and the previously recorded checkpoint digest. The R7B terminal reported `R7B_FINALIZED_READ=PASS`, `R7B_SNAPSHOT_INTEGRITY=PASS`, and zero blockchain writes.

## R7C — Real production browser checks

A separate headless Playwright check visited the **real production website**, fetched real finalized reads without wallet connection, inspected `/spec/1`, and verified the content displayed in the authenticated snapshot panel. It guarded browser RPC POSTs against write operations.

| Browser engine | Operator-reported outcome | Guarded read calls |
| --- | --- | ---: |
| Chromium | PASS | 5 |
| Firefox | PASS | 5 |
| WebKit | PASS | 5 |

Each browser checked network `61997`; one specification and zero challenges; certificate `CERTIFIED`; state `EVALUATED`; revision `1`; criterion `SATISFIED`; the `VERIFIED` snapshot panel; the full snapshot ID, stored digest, independent rendered-text SHA-256 and content length. The operator transcript reported `R7C_BROWSER_PASS_COUNT=3/3`, `FINAL_RC=0`, and zero Git/Vercel/blockchain mutations. The script did not connect or sign with a wallet.

These results were obtained from operator-provided terminal text. **Raw R7B/R7C transcripts are not yet sanitized, file-hashed, or included in this repository.** No fake manifest or immutable capture is claimed.

## Reproduction and drift rule

For public guest inspection, open https://proofspec-genlayer.vercel.app, confirm Studio Devnet `61997`, view certificate `1`, and inspect its evidence panel without connecting a wallet. To independently verify cryptography, use finalized SDK view calls and hash the returned UTF-8 snapshot content. If Studio Devnet resets or state changes, document the drift and **do not resend prior transactions**.

## Not certified and not authorized here

The original persistent Bradbury gate, four-specification/two-challenge/12-write reviewer matrix, independent live `REJECTED` and `INSUFFICIENT` results, live `REJECTED` and `UPHELD` challenge outcomes, and production wallet-backed writes remain unverified. Security audit and frontend-checker reconciliation are explicitly **excluded** from this R8 documentation scope. Full formal Progress 7/7 and `PROOFSPEC_RELEASE_COMPLETE=YES` must **not** be claimed.
