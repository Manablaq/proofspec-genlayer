# ProofSpec — Submission scope decision (2026-10-16)

**Owner instruction:** Submit based on the verified Studio Next work. No Bradbury deployment or testing is authorized or requested.

This is a scope decision, **not evidence that Bradbury checks passed** and **not a change to the frozen historical requirements** in `docs/RELEASE_GATES.md` or `docs/REVIEWER_MATRIX.md`.

## Current R53/R69–R72 release amendment (2026-10-21)

The October 16 record and transaction history below are preserved as historical evidence and **do not** refer to the current deployed R53 source. This dated amendment supersedes the older contract-address, RPC, and fresh-test instructions in the 2026-10-16 sections below.

- Current contract SHA-256: `c37479737913eb65e9585a403ae308c2a8395433895fa80d3c14a6b835fd4816`; Studio Devnet chain `61997`; current contract `0x2240176b5fBa877cfD015877b68981D4c47a3659`; RPC `https://studio-dev.genlayer.com/api`.
- R53 deployment tx `0x4a3ef9d5a41693c6346d08a94c68231837e8a1c972c5725ead4f49e480cab228` finalized with successful GenVM execution. R60 read-only checks passed; no R53 live create/evaluate/challenge lifecycle has been certified.
- R69 local frontend certification passed on the R70 feature branch: 20/20 Vitest, 12/12 mock-RPC browser E2E, typecheck, lint, build, production dependency audit. R71 authenticated Preview runtime checks passed. R72 current Production-only encrypted variable values were verified in Vercel; the old Production deployment has not been replaced.
- Current Production configuration must use **exactly**: `PROOFSPEC_NETWORK=studio-dev`, `PROOFSPEC_RPC_URL=https://studio-dev.genlayer.com/api`, `PROOFSPEC_CONTRACT_ADDRESS=0x2240176b5fBa877cfD015877b68981D4c47a3659`; leave `PROOFSPEC_E2E_MOCK` unset.
- The historical `0xD11A506B363E131e8fA3eBeC28a21cC8a4375110` on October 16 demonstrated `create_spec(1)`, `evaluate_spec(1)` and `CERTIFIED` using **older contract bytes**. Do not present that lifecycle as R53 evidence.
- Production source promotion, refreshed Vercel deployment, live guest-read checks, and the platform resubmission are **pending**, and require verification of each outcome. Bradbury and the 12-write matrix were excluded by owner scope, **not passed**.
- This amendment does not authorize signing, broadcasting, a contract redeployment, Git merge, or Vercel Production deployment.

## Demonstrated

- Source-hash-matched Intelligent Contract deployed to Studio Next (chain 61997).
- One successful, finalized specification creation and one successful, finalized consensus evaluation.
- A `CERTIFIED` result, satisfied criterion, and authenticated available primary evidence snapshot.
- Read-only reconciliation with raw-response SHA-256 evidence and no ambiguous retry.
- Earlier Progress 2/3 backend/Direct Mode and Progress 4 local frontend tests (refer to those original logs; a new post-security-update certification is still required).

## Not demonstrated / reviewer acceptance risk

- Bradbury persistent production-like certification on chain 4221.
- The 12-write reviewer matrix and all three **live** certificate outcomes and two **live** challenge outcomes.
- Complete production frontend end-to-end live write operation through a browser wallet.
- Long-term persistence guarantees on Studio Devnet/Studio Next, which may reset.

A reviewer requiring Bradbury or the full matrix may reject or request additional evidence. The submission must not claim formal Progress 6/7 Bradbury certification or full Progress 7/7 release completion.

## Submission rules

1. Keep the frozen contract source and Studio Next deployment unchanged.
2. Upgrade the frontend to security-patched Next.js/React versions, regenerate the exact npm lockfile through npm, and rerun typecheck, lint, unit tests, production build, three-browser E2E, and production npm audit.
3. Publish the complete frontend source including **all eight** `frontend/lib/` files; do not publish `node_modules`, `.next`, `.env*`, wallets, secret keys, or unsanitized raw operator journals.
4. Configure the frontend production environment to `PROOFSPEC_NETWORK=studio-dev`, `PROOFSPEC_RPC_URL=https://studio-next.genlayer.com/api`, `PROOFSPEC_CONTRACT_ADDRESS=0xD11A506B363E131e8fA3eBeC28a21cC8a4375110`. Keep `PROOFSPEC_E2E_MOCK` unset.
5. Deploy from a verified clean Git commit, confirm a READY production deployment and test live public guest reads against specification 1 without submitting a write.
6. Submit accurate reviewer notes with Studio Next contract, the three finalized transaction hashes, the evidence snapshot, and explicit limits.

No blockchain write or Bradbury operation is authorized by this document.
