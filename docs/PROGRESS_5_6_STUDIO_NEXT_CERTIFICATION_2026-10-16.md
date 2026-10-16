# ProofSpec — Studio Next live certification evidence (2026-10-16)

## Scope and contract identity

- Repository: `Manablaq/proofspec-genlayer`.
- Evaluated release reference: `803826a9090fd90b42e6fdae85cc712c50175d76` (the immutable evidence release reference; not the future frontend submission commit).
- Intelligent Contract source: `contracts/proofspec.py`, SHA-256 `fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9`.
- Studio Next RPC: `https://studio-next.genlayer.com/api` (Studio Devnet family, chain ID `61997`).
- Deployed contract: `0xD11A506B363E131e8fA3eBeC28a21cC8a4375110`.
- Sender: `0x5bb49021001200fe8156a81c7fcf097e535e7181`.
- This is Studio preview network evidence, **not** a Bradbury deployment and not persistent Bradbury certification.

## Finalized deployment and two-write lifecycle

| Action | Hash | Verifiable result |
| --- | --- | --- |
| Deployment | `0x19010d8b520c5bb04108bcd94ff88594f1beb4fa85295bbe1a21c3d3bbce5aa8` | FINALIZED, MAJORITY_AGREE, FINISHED_WITH_RETURN; deployed code matches the frozen source |
| `create_spec(...)` at sender nonce 16 | `0x4b4776e2788da38faa444073430cf7410f8111e22ac88a47634c5293035afffd` | FINALIZED, MAJORITY_AGREE, FINISHED_WITH_RETURN; `get_spec(1)` began PENDING |
| `evaluate_spec(1)` at sender nonce 17 | `0x0ec67841233bf861e95f2c61faf58e31a99f70f5a679e50aede58e55325c61a1` | FINALIZED, MAJORITY_AGREE, FINISHED_WITH_RETURN; sender nonce latest and pending both 18 after finality |

Read-only P6.19 reconciliation, executed 2026-10-16, returned `P6_19_EVALUATE_SPEC_ONE_LIFECYCLE=PASS` with 13 RPC reads and zero writes. The finalized specification and criterion state:

- `get_spec(1).state = EVALUATED`, revision `1`.
- Initial and effective certificate result: `CERTIFIED`.
- Criterion 1 result: `SATISFIED`.
- Primary evidence status: `AVAILABLE`.
- Primary snapshot ID: `f0709a9f292ef5d3c12e2aa30a783eee48670793563c13e2cc159b29982de3f8`.
- Snapshot content SHA-256: `db37f823a4e2b2a5446d2c28eb07fef5d9715110fa8f1381d171ad39f00d19e9`.
- Contract-side `verify_evidence_snapshot(...)`: `true`, with separate readback and local content-hash verification.
- Finalized counts at this checkpoint: one specification, zero challenges.

The raw transaction and readback evidence was journaled on the operator's Mac in `~/Downloads/PROOFSPEC_P6_11_SINGLE_SEND_JOURNAL.jsonl`, `~/Downloads/PROOFSPEC_P6_18H_SINGLE_SEND_JOURNAL.jsonl`, and `~/Downloads/PROOFSPEC_P6_19_READONLY_FINALITY_EVIDENCE/`. **Those bytes are not automatically included in GitHub by this summary.** Their manifests/hashes should be published as a separate, verified, sanitized reviewer evidence bundle if needed.

## Failure investigation and single-send boundaries

- P6.13 encountered an HTTP 503 and a distinct Python Cloudflare Error 1010; Studio Next subsequently accepted the identical Node.js `eth_chainId` request.
- P6.18 stopped before signing/broadcast because a fresh fee estimate differed from the frozen quote.
- The bounded-fee proposal preserved a maximum deposit of `243715800005176` wei and execution budget per round `121857900000000` wei, with explicit metering-drift arithmetic checks.
- P6.18E signed locally but did not broadcast because a decoded zero `gasPrice` appeared as `undefined`; offline viem reproduction and an RLP-checked correction passed.
- P6.18H is the **only confirmed broadcast of the evaluate-spec write**. Earlier P6.18/P6.18E one-shot attempts were consumed but did not broadcast and must never be rerun.
- The P6.19 readback established final success. Do not attempt to resubmit any of these transactions.

## Limits

This checkpoint proves the Studio Next create-and-evaluate certification path with one successful `CERTIFIED` result. It does **not** prove the complete frozen four-specification/two-challenge/twelve-write reviewer matrix, independent live `REJECTED`/`INSUFFICIENT` scenarios, challenge `REJECTED`/`UPHELD` outcomes, Bradbury deployment, or a production frontend deployment. Local mock-based frontend tests are separate from the GenLayer live consensus results.
