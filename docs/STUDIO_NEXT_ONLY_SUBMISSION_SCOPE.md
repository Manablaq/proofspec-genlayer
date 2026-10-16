# ProofSpec — Submission scope decision (2026-10-16)

**Owner instruction:** Submit based on the verified Studio Next work. No Bradbury deployment or testing is authorized or requested.

This is a scope decision, **not evidence that Bradbury checks passed** and **not a change to the frozen historical requirements** in `docs/RELEASE_GATES.md` or `docs/REVIEWER_MATRIX.md`.

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
