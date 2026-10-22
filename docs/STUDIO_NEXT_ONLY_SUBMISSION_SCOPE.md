# ProofSpec — Submission scope decision (2026-10-16)

**Owner instruction:** Submit based on the verified Studio Next work. No Bradbury deployment or testing is authorized or requested.

This is a scope decision, **not evidence that Bradbury checks passed** and **not a change to the frozen historical requirements** in `docs/RELEASE_GATES.md` or `docs/REVIEWER_MATRIX.md`.

## Current R53/R69–R72 release amendment (2026-10-21)

The October 16 record and transaction history below are preserved as historical evidence and **do not** refer to the current deployed R53 source. This dated amendment supersedes the older contract-address, RPC, and fresh-test instructions in the 2026-10-16 sections below.

- Current contract SHA-256: `c37479737913eb65e9585a403ae308c2a8395433895fa80d3c14a6b835fd4816`; Studio Devnet chain `61997`; current contract `0x2240176b5fBa877cfD015877b68981D4c47a3659`; RPC `https://studio-dev.genlayer.com/api`.
- R53 deployment tx `0x4a3ef9d5a41693c6346d08a94c68231837e8a1c972c5725ead4f49e480cab228` finalized with successful GenVM execution. Current finalized state is one specification and zero challenges. Spec 1 is `EVALUATED` / `CERTIFIED`, revision 1, with a satisfied criterion and verified authenticated snapshot. The finalized create/evaluate calls are documented in `docs/STUDIO_NEXT_OPERATOR_RUNBOOK.md`.
- The current candidate includes reviewer-response frontend changes. Fresh local checks passed: TypeScript, lint, 31 unit tests, production build, and 24 mocked E2E tests across Chromium, Firefox, and WebKit. GenLayer backend static/deterministic and Direct Mode results are recorded in `docs/REVIEW_RESPONSE_2026-10-21.md`. The known unpatched `braces` path was removed by replacing `eslint-config-next`; after network access was granted, full `npm audit` and `npm audit --omit=dev` both reported zero vulnerabilities.
- R71 authenticated Preview runtime checks and R72 Production-only encrypted variable inspection are historical records for their recorded source/deployment state. The existing Production deployment has not been replaced with this candidate.
- Current Production configuration must use **exactly**: `PROOFSPEC_NETWORK=studio-dev`, `PROOFSPEC_RPC_URL=https://studio-dev.genlayer.com/api`, `PROOFSPEC_CONTRACT_ADDRESS=0x2240176b5fBa877cfD015877b68981D4c47a3659`; leave `PROOFSPEC_E2E_MOCK` unset.
- The historical `0xD11A506B363E131e8fA3eBeC28a21cC8a4375110` on October 16 demonstrated `create_spec(1)`, `evaluate_spec(1)` and `CERTIFIED` using **older contract bytes**. Do not present that lifecycle as R53 evidence.
- Production source promotion, refreshed Vercel deployment, live guest-read checks, and platform resubmission are **pending**, and require verification of each outcome. Bradbury and the 12-write matrix were excluded by owner scope, **not passed**.
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
2. Keep the pinned Next.js/React runtime versions. The candidate removes the vulnerable `eslint-config-next` → `@next/eslint-plugin-next` → `braces` path and replaces it with direct TypeScript, React, React Hooks, and JSX accessibility lint configs. Fresh local typecheck, lint, unit, production-build, and three-browser mocked E2E checks pass. Full `npm audit` and `npm audit --omit=dev` both report zero vulnerabilities for the current lockfile.
3. Publish the complete frontend source including **all eight** `frontend/lib/` files; do not publish `node_modules`, `.next`, `.env*`, wallets, secret keys, or unsanitized raw operator journals.
4. For the current R53 candidate, configure the frontend production environment to exactly `PROOFSPEC_NETWORK=studio-dev`, `PROOFSPEC_RPC_URL=https://studio-dev.genlayer.com/api`, and `PROOFSPEC_CONTRACT_ADDRESS=0x2240176b5fBa877cfD015877b68981D4c47a3659`. Keep `PROOFSPEC_E2E_MOCK` unset. The older `studio-next` / `0xD11A...` binding below is historical only and must not be copied into current settings.
5. Production deployment is still pending and is not authorized by this scope record. After the owner separately authorizes promotion, deploy from a verified clean Git commit, confirm a READY deployment, and test live public guest reads against specification 1 without submitting a write. Reconcile the deployed commit, runtime configuration, domain, and finalized contract reads before submission.
6. Submit accurate reviewer notes with the current Studio Devnet contract and chain, deployment transaction, finalized create/evaluate transaction hashes, verified evidence snapshot ID, local test results, and explicit limits. State plainly that Studio Devnet is resettable and Bradbury/the full 12-write matrix were not completed; do not claim Progress 6/7, Progress 7/7, or reviewer acceptance.

No blockchain write or Bradbury operation is authorized by this document.
