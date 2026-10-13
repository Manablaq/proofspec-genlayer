# ProofSpec Network Targets

Status: **Progress 1/7 specification freeze**

Reference baseline checked against official GenLayer documentation on 2026-10-13. Network details must be re-read immediately before any funding, signing, deployment, or live write because release-candidate infrastructure can change.

## 1. Direct Mode

Purpose:

- primary contract-development test layer;
- deterministic and semantic unit tests;
- validator agreement/disagreement testing;
- no network deployment.

Properties:

- Python 3.12+;
- in-memory contract execution;
- `mock_web` / `mock_llm`;
- captured validator execution for disagreement tests.

Direct Mode is mandatory before any hosted-network deployment.

## 2. Studio development preview

Canonical name for this project: `studio-dev`.

Purpose:

- validate the release-candidate Studio and consensus stack;
- prove compatibility before persistent public-testnet certification.

Current official baseline:

- web app: `https://studio-dev.genlayer.com`;
- canonical GenLayer RPC: `https://studio-dev.genlayer.com/api`;
- chain ID: `61997`;
- currency: `GEN`;
- explorer: `https://explorer-studio-dev.genlayer.com`;
- network/profile name: matching release-candidate `studio-dev` / `studioDevnet`.

Important:

- Studio-dev is not Studionet;
- Studionet uses chain ID `61999`;
- `studio-next.genlayer.com`, if exposed as an alias, does not create a separate canonical network;
- Studio-dev may reset or redeploy without preserving state;
- final reviewer evidence must not depend on Studio-dev persistence.

## 3. Bradbury testnet

Purpose:

- final persistent production-like certification;
- real AI/LLM workloads;
- durable reviewer contract and transaction history.

Current official baseline:

- GenLayer RPC: `https://rpc-bradbury.genlayer.com`;
- chain ID: `4221`;
- currency: `GEN`;
- explorer: `https://explorer-bradbury.genlayer.com`;
- CLI network: `testnet-bradbury`;
- test-suite network naming may use the documented Bradbury preset for the pinned tool version.

Bradbury is the target for the final 12-write reviewer matrix.

## 4. Studionet

Current official baseline:

- RPC: `https://studio.genlayer.com/api`;
- chain ID: `61999`.

Studionet is not part of the required ProofSpec release path. It may be used later for collaboration only under separate scope. It must never be substituted for Studio-dev merely because an installed CLI lacks the release-candidate profile.

## 5. Network verification before writes

Before every deployment or authorized live-write batch, print and freeze:

- network alias;
- RPC URL;
- chain ID;
- explorer;
- wallet/sender address;
- contract address when applicable;
- current source SHA-256;
- current Git commit;
- tool/SDK versions;
- fee profile or fee estimate assumptions.

If any value differs from the authorized fingerprint, stop before signing.

## 6. Transaction lifecycle rule

Submission is not success.

For each deployment/write:

- capture transaction ID;
- preserve raw client/RPC response where exposed;
- follow the GenLayer lifecycle to the intended finality point;
- verify the execution outcome/return;
- read finalized contract state;
- do not use only an outer EVM receipt as proof of Intelligent Contract success.

For durable completion and accounting, use finalization-aware client APIs rather than treating a short polling timeout as failure.

## 7. Retry rule

If a client errors after a transaction may have been submitted:

- assume the authorization may have been consumed;
- do not resubmit;
- reconcile the transaction and finalized state read-only;
- only a new, explicit decision after reconciliation may authorize another write.

## 8. Version pinning

Progress 1 intentionally does not guess package versions.

During Progress 2/5, use one documented compatible release family and pin the exact versions. For Studio-dev, the installed tooling must explicitly support the release-candidate `studio-dev` / `studioDevnet` definition.

Do not relabel `studionet` to point at Studio-dev.

## 9. Official reference pages

- `https://docs.genlayer.com/developers/networks`
- `https://docs.genlayer.com/developers/intelligent-contracts/testing`
- `https://docs.genlayer.com/developers/intelligent-contracts/tools/genlayer-studio`
- `https://docs.genlayer.com/developers/intelligent-contracts/deploying/network-configuration`
- `https://docs.genlayer.com/developers/intelligent-contracts/deploying`
- `https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle`
