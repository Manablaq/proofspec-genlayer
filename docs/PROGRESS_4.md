# ProofSpec Progress 4/7 — Frontend Local Certification Checkpoint

Status: **Local candidate certified on October 13, 2026; R16B recertified on October 14, 2026; security-advisory clearance and release promotion pending.**
This is a local, uncommitted test result, not a Studio-dev, Bradbury, or hosted production certification.

## Frozen base and safety scope

- Current local and remote `main` HEAD before release promotion:
  `803826a9090fd90b42e6fdae85cc712c50175d76`.
- Frozen Intelligent Contract SHA-256:
  `fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9`.
- Contract remains unmodified; Progress 2 and Progress 3 have already been promoted.
- No real RPC/GenLayer contract execution, wallet signing, blockchain write,
  Studio-dev/Bradbury funding, Vercel deployment, or environment change occurred.
- The frontend browser tests use loopback-only mocked RPC and an injected mock wallet.
- No Progress 4 Git staging, commit, or push has occurred.

## Security-remediated frontend candidate

Exact direct dependency replacements:

| Package | Previous | Local candidate |
| --- | --- | --- |
| `next` | `16.0.0` | `16.4.0` |
| `eslint-config-next` | `16.0.0` | `16.4.0` |
| `react` | `19.2.0` | `19.3.0` |
| `react-dom` | `19.2.0` | `19.3.0` |

All other frozen direct frontend dependencies remain unchanged. R9 verified the
new versions and npm SHA-512 metadata, regenerated the lockfile, and reported
zero production vulnerabilities in npm audit. R13 independently verified the
updated manifest, installed dependencies, and locked package integrities.

- `frontend/package.json` SHA-256:
  `d38384d301a607fbacc68fa66a888e5a5205834c523f72d508d3269481982bff`.
- `frontend/package-lock.json` SHA-256:
  `678f5e7978c141b1b7e04e5c917cfaff32385a555690514e8764159bc197cac5`.
- `frontend/next-env.d.ts` SHA-256:
  `1862ac4bbbc5192d4bf562161df66ea547ed3e67173100656ab606ae9797db2b`.
  Next.js 16.4.0 generated the `root-params.d.ts` type-reference change.
- `frontend/tsconfig.json` SHA-256:
  `00282b274d22c172c5e8e91e8f0471721e98b4a6beab5235f54369e55249a0e5`.
- `frontend/playwright.config.ts` SHA-256:
  `8fd716a3c0cb71eae9d17157e5927aee674fd0eff82c2cf12ad34e569bbf2efb`.
  The per-test Playwright timeout is 120 seconds, with no retry-based masking.

The original idiomatic Next.js `useRouter().push()` certificate navigation was
restored after trace analysis identified the Firefox test deadline, rather than
an established router defect, as the original blocker. The R12 isolated
WebKit guest-certificate test passed 3/3 without retries. The R13 complete
three-browser matrix subsequently passed 12/12 without a source patch.

## R13 verified regressions

R13 exited successfully with `COMMAND_EXIT_CODE=0` and the independent outer
`PROOFSPEC_R13_EXIT_CODE=0`.

| Gate | R13 result |
| --- | --- |
| Node.js `v24.20.0`, npm `11.19.0` | PASS |
| Manifest, lockfile and installed package pins | PASS |
| Production npm audit | PASS; zero reported findings |
| Frontend TypeScript | PASS |
| ESLint with `--max-warnings=0` | PASS |
| Frontend Vitest unit tests | 11/11 PASS |
| Next.js production build | PASS |
| Playwright Chromium / Firefox / WebKit | 12/12 PASS |
| Progress 2 static/backend deterministic tests | 59/59 PASS |
| Progress 3 supported Direct Mode tests | 38/38 PASS |
| Frozen contract and repository path integrity | PASS |
| Unstaged Progress 4 candidate; remote `main` unchanged | VERIFIED |

A warning remains about a `package-lock.json` in the user's home directory
outside this repository; Next.js 16.4.0 disregarded that external lockfile.
No unrelated files should be deleted or edited to silence the warning.

## R15 and R16B corrective certification (completed)

- **R15:** Corrected only `scripts/check_frontend.sh` from the obsolete
  Next.js/React dependency pins to `next@16.4.0`, `eslint-config-next@16.4.0`,
  `react@19.3.0`, and `react-dom@19.3.0`. The official checker passed,
  followed by zero-warning ESLint, zero-finding production npm audit,
  59 backend tests, and 38 Direct Mode tests.
- **R16:** Identified that the committed root `.gitignore` `lib/` rule hid
  required frontend library sources from Git; its 30-path Git candidate did
  not include those sources.
- **R16A:** Verified the presence and SHA-256 fingerprints of the eight ignored
  frontend modules: `criteria.ts`, `format.ts`, `gateway.ts`, `mock-state.ts`,
  `network.ts`, `runtime-config.ts`, `types.ts`, and `write-safety.ts`.
- **R16B:** Added only `!/frontend/lib/` immediately after the root `lib/`
  ignore rule. All eight files became Git-visible; the expected pending
  inventory became 39 paths (2 tracked modifications and 37 untracked files).
  All 41 previously frozen source hashes matched after this one-line fix.
  The official frontend checker passed (11 unit and 12 browser tests),
  as did zero-warning ESLint, production npm audit with zero reported
  vulnerabilities, 59 backend tests, and 38 supported Direct Mode tests.
  Final Git scope and diff checks passed.

Verified SHA-256 checkpoints:

- `scripts/check_frontend.sh` (R15/R16B):
  `d5c3d9bf34d81a7ea29920a624baf2f644c86e153965472aad094a3f87d65d6b`.
- Root `.gitignore` (R16B postimage):
  `8c5e6ff0e1164335041370bd0b0a731f9179f2add9bda26ba3e09a924b086fd9`.

R15 and R16B made no Intelligent Contract modifications, dependency changes
outside the previously certified versions, Git staging/commit/push, wallet
signing, blockchain writes, or deployments. These are **local** certifications
and do not clear new disclosures or establish live-network behavior.

## Frontend behavior and test boundaries

The locally tested frontend supports public read-only certificate exploration,
specification creation with a pre-sign review screen, a chain/network identity
display, finalized-state reads/waiting through the SDK, authenticated evidence
snapshot inspection, challenge history, and error handling that fails closed if
deployment configuration is missing. The test suite checks duplicate-write
locking and responsive/keyboard-navigation behavior using fixture/mock data.
These local tests do **not** prove hosted RPC compatibility, live consensus
finality, real wallet signing, or on-chain transaction correctness.

## Release blockers and remaining steps

1. **Security advisory:** Confirm the authoritative October 14, 2026 Next.js
   security disclosure, check its affected versions against the currently
   certified Next.js/React pins, and apply any applicable security fixes only
   under separate authorization. R16B's zero-finding production npm audit
   does **not** establish immunity to new or unpublished vulnerabilities.
   Security clearance was **not** established by R16B or this documentation
   reconciliation.
2. **Completed fixes (not pending blockers):** R15 updated and ran the official
   frontend checker. R16B made all eight `frontend/lib/` source files
   Git-visible and passed complete local recertification.
3. **Final release review:** Review the final 39-path candidate and source
   hashes again, re-run affected tests if any security patches are needed,
   then request separate explicit authorization for any Git staging, commit,
   or push. Neither R16B nor this documentation update authorizes promotion.
4. **Subsequent stages:** Progress 5 is Studio-dev compatibility and live
   lifecycle validation; Progress 6 is Bradbury persistent-network reviewer
   certification; Progress 7 is final release and submission.

No completion, deployment, or reviewer acceptance is claimed for Stages 5–7.
