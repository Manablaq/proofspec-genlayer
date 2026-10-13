# ProofSpec Progress 3/7 Direct Mode Consensus Checkpoint

Status: **Direct Mode consensus certification passed locally; Git commit and push pending**

Base commit:

`3297fb1e7a0d41a35ffb5fbcf7452cfa3c607b1e`

Frozen contract SHA-256:

`fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9`

Direct Mode GenVM runtime:

`v0.6.0-rc5`

Contract `py-genlayer` dependency:

`5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`

Direct Mode serialization supplement:

`cloudpickle==3.1.2`

Wheel SHA-256:

`9acb47f6afd73f60dc1df93bb801b472f05ff42fa6c84167d25cb206be1fbf4a`

## Runtime binding

The Progress 3 Direct Mode command explicitly exports `GENVM_VERSION=v0.6.0-rc5` before contract loading.

The frozen contract depends on the `py-genlayer` runner above. Read-only runtime reconciliation established that this runner is present in the cached GenVM `v0.6.0-rc5` tree while the default-selected `v0.6.0-rc9` tree contains a different runner. Progress 3 therefore binds Direct Mode to the same `v0.6.0-rc5` runtime already used by the Progress 2 static-certification gate instead of modifying the contract dependency.

## Direct Mode dependency supplement

`gltest` Direct Mode performs optional leader/validator closure serialization validation when `direct_vm.check_pickling = True`. That code path requires `cloudpickle`.

Progress 3 keeps the Progress 2 dependency set frozen in `requirements.txt` and records the Direct Mode-only supplement separately in `requirements-direct.txt`. Installation is constrained to:

- `cloudpickle==3.1.2`;
- wheel distribution only;
- no dependency installation;
- exact SHA-256 verification through pip `--require-hashes`;
- the public PyPI simple index.

## Scope

Progress 3 certifies the already-frozen Progress 2 Intelligent Contract through GenLayer Direct Mode. The contract source and Progress 2 dependency pins are not modified.

The suite requires:

- `genlayer-test==0.30.0rc2`;
- `genlayer-py==0.19.0rc2`;
- `genvm-linter==0.11.1rc2`;
- `cloudpickle==3.1.2` as the Direct Mode serialization supplement;
- GenVM `v0.6.0-rc5`;
- the `gltest.direct.pytest_plugin` Direct Mode plugin;
- `direct_vm.strict_mocks = True`;
- `direct_vm.check_pickling = True`;
- RuntimeWarning promotion to test failure so unused strict mocks and pickling warnings cannot be ignored;
- mocked web and LLM inputs only;
- no Studio, RPC, wallet, signing, funding, or blockchain write.

## Consensus coverage

The Direct Mode suite covers:

- `CERTIFIED`, `REJECTED`, and `INSUFFICIENT`;
- `SATISFIED`, `VIOLATED`, and `INSUFFICIENT`;
- authoritative evidence;
- corroborated evidence;
- directional source conflict;
- unavailable evidence;
- oversized evidence without silent truncation;
- release-bound evidence matching, mismatch, and unverifiable status;
- multi-criterion deterministic aggregation;
- independent evidence snapshot SHA-256 and snapshot-ID recomputation;
- prompt-injection evidence treated as untrusted data;
- malformed semantic JSON and invalid enums failing closed;
- leader/validator agreement;
- validator rejection on directional disagreement;
- validator rejection on release-version disagreement;
- validator rejection when evidence bytes differ;
- validator rejection when the source is unavailable to the validator;
- validator acceptance when only non-authoritative rationale wording changes;
- rejected challenges;
- upheld challenges;
- insufficient challenges;
- challenges against both satisfied and violated criteria;
- deterministic challenge outcome derivation that ignores model attempts to choose the outcome;
- challenge resolution anchored to authenticated original snapshots when the live source changes;
- challenge resolution anchored to authenticated original snapshots when the live source becomes unavailable;
- validator rejection on counter-evidence direction disagreement;
- validator rejection on changed counter-evidence bytes;
- release-bound challenge freshness enforcement.

## Reproducible commands

Install the Direct Mode-only supplement:

```bash
.venv/bin/python -m pip install \
  --no-deps \
  --only-binary=:all: \
  --require-hashes \
  --index-url https://pypi.org/simple \
  -r requirements-direct.txt
```

Then run:

```bash
PATH="$PWD/.venv/bin:$PATH" ./scripts/check_direct_mode.sh
```

The certification script pins `GENVM_VERSION=v0.6.0-rc5`, reruns the complete Progress 2 backend certification, and then executes only the explicitly loaded Direct Mode pytest plugin with plugin autoload disabled.

## Network boundary

The dependency installation contacts PyPI only for the exact hashed wheel. Direct Mode contract execution itself uses mocked web/LLM inputs and performs no hosted-network contract execution.

This checkpoint does not claim:

- Studio-dev deployment or compatibility;
- Bradbury deployment or finality;
- frontend completion;
- production deployment;
- live reviewer-matrix execution.

Those remain later release gates.

## Exit condition

Progress 3 may be committed only after:

- the frozen Progress 2 contract hash matches;
- `requirements.txt` remains byte-for-byte unchanged;
- the pinned Progress 2 toolchain matches;
- `requirements-direct.txt` contains only the authorized hashed `cloudpickle==3.1.2` supplement;
- GenVM runtime `v0.6.0-rc5` is selected for Direct Mode;
- the full Progress 2 backend gate passes again;
- the Direct Mode suite passes with RuntimeWarnings promoted to errors;
- the Git diff contains only the five authorized Progress 3 paths.


## Pre-promotion frozen-spec reconciliation

After the first 38/38 Direct Mode pass and before any Progress 3 Git commit,
the implementation was re-read against the frozen Progress 1 specification.

That reconciliation found and corrected the source-status taxonomy and
implementation-only minimum-length restrictions described in
`docs/PROGRESS_2.md`.

The corrected contract was then subjected again to the complete Progress 2
backend gate and complete Progress 3 Direct Mode gate. Progress 3 is eligible
for promotion only from this corrected contract hash:

`fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9`

No Progress 1 specification document was changed, and no hosted-network or
blockchain operation was performed by this correction.
