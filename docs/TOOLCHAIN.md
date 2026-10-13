# ProofSpec Progress 2 Toolchain

Status: **frozen for Progress 2 local backend certification**

## Runtime and local toolchain

- Python: `3.12.14`
- GenLayer CLI observed during preflight: `0.40.0-rc.3`
- `genlayer-test==0.30.0rc2`
- `genlayer-py==0.19.0rc2`
- `genvm-linter==0.11.1rc2`
- `pytest==8.4.2`
- `pyright==1.1.408`
- GenVM bundle selected for the frozen contract header: `v0.6.0-rc5`
- Contract dependency header: `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`

## Discipline

Progress 2 uses an isolated repository `.venv` created with Python 3.12.14. The repository dependency file contains only the five explicitly pinned top-level development packages above. Transitive packages are installed only as dependencies of those pins.

No hosted-network deployment, wallet signing, funding, blockchain write, frontend dependency, or Vercel configuration belongs to Progress 2.

## Certification commands

`./scripts/check_backend.sh` enforces:

- exact Python and package versions;
- exact contract SHA-256;
- Python compilation;
- `genvm-lint typecheck`;
- `genvm-lint check`;
- static contract guards;
- dependency-free deterministic/stub-runtime behavioral tests.

Progress 3 Direct Mode consensus certification is deliberately excluded from this gate.
