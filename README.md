# ProofSpec

**Consensus-backed, challengeable software release certification on GenLayer.** ProofSpec evaluates bounded release requirements against public evidence, records validator-agreed outcomes, and preserves authenticated evidence snapshots for later inspection.

**Live application:** https://proofspec-genlayer.vercel.app

**Verified frontend release:** [`62589f216adc3041c2f88b65191cd5afd12c7f5d`](https://github.com/Manablaq/proofspec-genlayer/tree/62589f216adc3041c2f88b65191cd5afd12c7f5d)

**Network:** Studio Next / Studio Devnet (`studio-dev`), chain ID `61997`

**Intelligent Contract:** `0xD11A506B363E131e8fA3eBeC28a21cC8a4375110`

**RPC:** `https://studio-next.genlayer.com/api`

> **Scope:** This is a verified Studio Next release-candidate demonstration, **not** a completed Bradbury certification or full seven-gate release. The planned 12-write reviewer matrix has not been executed. Studio Devnet state may reset. Production frontend wallet writes have not been certified.

## Verified milestones

| Layer | Verified result | Boundary |
| --- | --- | --- |
| Intelligent Contract | Frozen source certified by earlier static/backend and Direct Mode tests | Those local tests do not themselves prove live execution |
| Studio Next lifecycle | Deployed contract, created specification 1, finalized one successful evaluation | Only the live `CERTIFIED` scenario is demonstrated |
| Evidence authentication | Snapshot verification returned `true`; independent content SHA-256 matched | State is held on a development preview network |
| Production frontend | Vercel deployment `dpl_HbNcTkeH1C66KUKrVpAFzosHzHqh` reached `READY` on the exact release commit | Deployment alone does not prove wallet-write functionality |
| Public HTTP | `/`, `/api/runtime-config`, and `/spec/1` returned HTTP 200 | HTTP 200 alone does not prove live contract reads |
| Live browser guest reads | Chromium, Firefox, and WebKit each passed real finalized certificate and snapshot inspection | No browser wallet signing or blockchain writes were performed |

The latest read-only checkpoint on Studio Next reported **one** specification, **zero** challenges, specification 1 `EVALUATED` at revision `1`, effective certificate `CERTIFIED`, criterion 1 `SATISFIED`, and primary evidence `AVAILABLE`.

For exact verification results see the [Production Release Verification](docs/PRODUCTION_RELEASE_VERIFICATION_2026-10-16.md). For transaction identities and hash provenance see the [Reviewer Evidence Index](docs/REVIEWER_EVIDENCE_INDEX_2026-10-16.md).

## How certification works

ProofSpec accepts up to five required criteria per specification. Each criterion has one HTTPS primary source and optionally a corroborating source. GenLayer validators assess bounded public evidence and compare decision-critical semantic results using the Equivalence Principle. Contract logic derives the overall certificate deterministically:

| Result | Meaning |
| --- | --- |
| `CERTIFIED` | Every required criterion is supported by admissible evidence. |
| `REJECTED` | A criterion is positively contradicted and none remains unresolved. |
| `INSUFFICIENT` | Evidence or consensus cannot justify a directional verdict. |

Criteria individually resolve to `SATISFIED`, `VIOLATED`, or `INSUFFICIENT`. Available evidence is held in SHA-256-authenticated snapshots. Challenges retain original authenticated evidence so later source drift cannot silently rewrite the prior decision. These behaviors have local test coverage; the complete live challenge matrix has **not** been demonstrated.

## View the live certificate without a wallet

1. Visit [ProofSpec](https://proofspec-genlayer.vercel.app).
2. Check that the network indicator shows Studio Devnet / chain `61997` and the recorded checkpoint counts are one specification and zero challenges.
3. Open certificate **1**. The previously verified state is `EVALUATED`, revision `1`, `CERTIFIED`, with criterion 1 `SATISFIED`.
4. Choose **Inspect** for the primary evidence snapshot. The authenticated snapshot panel should show `VERIFIED` and its recorded SHA-256 digest.

These steps are read-only. Do not connect a wallet, create another specification, retry an earlier transaction, or file a challenge merely to reproduce the evidence. If Studio Devnet has reset, report state drift rather than fabricating continuity.

## Local frontend development

Use Node.js `24.x` and the committed npm lockfile. The verified frontend release pins Next.js `16.4.2`, React `19.3.1`, and `genlayer-js` `2.0.0-rc.1`.

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run dev
```

`npm run test:e2e` runs the **local mocked-RPC** Playwright suite after a production build. It must not be confused with the separate real production Chromium/Firefox/WebKit guest-read tests recorded in the release report. Local test fixture actions do not prove live wallet signing.

Never commit `.env.local`, passwords, wallet keys, private tokens, generated builds, or raw operator journals.

## Production environment reference

The Vercel project `proofspec-genlayer` uses framework **Next.js** and project root directory **`frontend`**. Its production runtime is configured with:

```dotenv
PROOFSPEC_NETWORK=studio-dev
PROOFSPEC_RPC_URL=https://studio-next.genlayer.com/api
PROOFSPEC_CONTRACT_ADDRESS=0xD11A506B363E131e8fA3eBeC28a21cC8a4375110
```

`PROOFSPEC_E2E_MOCK` must remain **unset** in production. The published runtime configuration returned `configured: true`, `mockMode: false`, and chain ID `61997`. These are public routing values, not wallet credentials.

## Documentation

Start with the [Documentation Guide](docs/DOCUMENTATION_GUIDE.md). The frozen [Product](docs/PRODUCT_SPEC.md), [Contract](docs/CONTRACT_SPEC.md), [Consensus](docs/CONSENSUS_SPEC.md), [Evidence](docs/EVIDENCE_MODEL.md), and [Threat Model](docs/THREAT_MODEL.md) documents explain the design. The [Reviewer Matrix](docs/REVIEWER_MATRIX.md) and [Release Gates](docs/RELEASE_GATES.md) define **original requirements**, not claims those requirements were completed.

The [Studio Next-only Submission Decision](docs/STUDIO_NEXT_ONLY_SUBMISSION_SCOPE.md) documents the deliberate scope limitation. The [R7 Production Release Verification](docs/PRODUCTION_RELEASE_VERIFICATION_2026-10-16.md) and [Reviewer Evidence Index](docs/REVIEWER_EVIDENCE_INDEX_2026-10-16.md) describe evidence actually obtained later.

## Explicit limits and release discipline

There is **no** completed Bradbury chain `4221` reviewer certification, no verified four-spec/two-challenge/12-write live matrix, no live `REJECTED` or `INSUFFICIENT` release verdict, no live `REJECTED` or `UPHELD` challenge, and no real-wallet production browser write certification. Reviewer acceptance is not guaranteed.

Historical reports remain date-specific records and must not be silently rewritten. This documentation update is prepared separately from the verified R7 deployment; it does not authorize contract, wallet, blockchain, Vercel, security-audit or checker modifications. **Do not mark `PROOFSPEC_RELEASE_COMPLETE=YES` or formal Progress 7/7 complete.**
