# ProofSpec Release Gates

Status: **Progress 4/7 local frontend checks and public guest-read verification passed; Progress 5/7 Studio Devnet compatibility evidence is partial; Progress 6/7 Bradbury certification not performed; Progress 7/7 submission certification incomplete.**

The current R53 Studio Devnet deployment and its finalized create/evaluate lifecycle are recorded in `docs/STUDIO_NEXT_OPERATOR_RUNBOOK.md`. This is bounded, resettable-network compatibility evidence. The ProofSpec frontend is merged to `main` and deployed READY to Production from commit `08f49c28075d7d0609acadff6e2cb1b440698ac1`; the live runtime configuration and unauthenticated guest read of spec 1 were verified on 2026-10-22. The frozen Bradbury matrix remains excluded by the recorded owner scope and has not passed. Ten supplementary Studio Devnet writes, full Bradbury certification, final evidence packaging, and platform resubmission remain open.

ProofSpec uses seven sequential gates. A later gate cannot be marked complete because an earlier one is "probably fine."

## Global mutation discipline

For any operation that can change Git, Vercel, a GenLayer network, funding state, wallet state, environment variables, or domains:

1. identify exact preconditions;
2. perform read-only preflight;
3. hash/freeze the intended input where appropriate;
4. obtain scoped authorization;
5. perform the minimum mutation;
6. persist raw response/transaction identity;
7. perform read-only reconciliation;
8. never retry an ambiguous mutation until reconciliation proves its outcome.

No force push, rebase, amend, squash, or history rewrite is part of the normal release path.

## Progress 1/7 — specification freeze

Artifacts:

- README;
- product specification;
- contract specification;
- evidence model;
- consensus specification;
- threat model;
- reviewer matrix;
- release gates;
- network targets.

Exit criteria:

- all v1 outcomes defined;
- contract surface defined;
- evidence snapshot rules defined;
- validator comparison fields defined conceptually;
- challenge downgrade rule defined;
- 12-write reviewer matrix frozen;
- network path frozen;
- no implementation code exists.

## Progress 2/7 — contract implementation and static certification

Planned artifacts:

- one Intelligent Contract;
- pinned Python/GenVM dependency line;
- deterministic helpers;
- static guard tests;
- contract behavioral tests that do not require network consensus;
- dependency lock/pin record.

Exit criteria:

- syntax passes;
- `genvm-linter` type/static checks pass with the pinned toolchain;
- storage/serialization constraints pass;
- URL validation boundaries pass;
- deterministic aggregation invariants pass;
- source SHA-256 frozen;
- no deployment performed.

Any change to product semantics requires reopening Progress 1 rather than silently changing the contract.

## Progress 3/7 — Direct Mode consensus certification

Exit criteria:

- Direct Mode suite passes;
- strict mock matching enabled;
- every result path covered;
- leader/validator agreement proven;
- deliberate validator disagreement proven with captured validator execution;
- source mutation/unavailability between participants covered;
- malformed output fails closed;
- prompt injection covered;
- challenge authentication and downgrade rules covered;
- reproducible command and tool versions recorded.

No live deployment is required to pass Progress 3.

## Progress 4/7 — frontend local certification

Planned frontend requirements:

- polished public product;
- guest finalized reads;
- wallet-assisted writes;
- exact network binding;
- pre-sign transaction review;
- duplicate-write locking;
- finalized-state refresh;
- long-running finality UX;
- no fabricated fallback verdict;
- responsive/mobile accessibility;
- browser E2E;
- write-safety tests.

Exit criteria:

- typecheck/lint pass;
- unit/write-safety tests pass;
- production build passes;
- browser matrix passes;
- no live write is needed for browser interaction tests;
- network/contract configuration is injectable without committing secrets.

## Progress 5/7 — Studio-dev release-candidate compatibility

Purpose:

Validate ProofSpec against the next Studio/consensus release family before persistent testnet certification.

Exit criteria:

- exact compatible SDK/CLI/runtime versions pinned;
- `studio-dev` network identity re-read immediately before deployment;
- deployment contract source hash matches Progress 2;
- deployment transaction reconciled;
- execution success verified, not merely finalization;
- bounded compatibility writes/readbacks pass if separately authorized;
- no reliance on Studio-dev state as permanent evidence.

Studio-dev resets are expected; its deployment is compatibility evidence, not the final reviewer contract.

## Progress 6/7 — Bradbury persistent live certification

Purpose:

Create the durable reviewer evidence on the production-like public testnet.

Exit criteria:

- exact contract source and release candidate frozen;
- Bradbury network identity verified;
- fee/funding preflight completed;
- one controlled deployment finalized successfully;
- production frontend bound to that contract;
- exact 12-write reviewer matrix executed;
- every write reconciled before the next;
- final specification count 4 and challenge count 2;
- all three certificate outcomes demonstrated;
- both challenge outcomes demonstrated;
- independent snapshot verification passes;
- raw final readback frozen.

Any ambiguous write stops the sequence until reconciliation.

## Progress 7/7 — release and submission certification

Exit criteria:

- final local contract/test/frontend gates rerun;
- final evidence package manifest verifies every file hash and size;
- evidence package contains no secrets;
- release-facing docs match certified bindings;
- Git default branch contains the certified release;
- production deployment is READY;
- live domain responds;
- repository and deployment are reconciled read-only;
- contract explorer link is verified;
- reviewer notes are under platform limits;
- submission evidence links are immutable where possible;
- release state is frozen after submission.

## Version discipline

Do not mix release families.

Before installing or deploying, record:

- GenVM/Python contract runtime;
- `genlayer-test`;
- `genvm-linter`;
- `genlayer-py` if used;
- GenLayer CLI;
- `genlayer-js` for frontend;
- Studio/consensus release line.

Prerelease environments must use matching prerelease tooling. Floating `latest` is not acceptable evidence for a frozen release.

## Completion rule

`PROOFSPEC_RELEASE_COMPLETE=YES` is allowed only after Progress 7 passes.

Until then, status must name the exact highest completed gate.
