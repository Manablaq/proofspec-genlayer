# ProofSpec Evidence Model

Status: **Progress 1/7 specification freeze**

## 1. Design goal

A ProofSpec decision must remain auditable even if the live web changes after adjudication.

The authoritative object is therefore not merely a URL. It is a source identity plus the bounded content snapshot actually used for the decision.

## 2. Source roles

Each criterion may use:

- `PRIMARY` — required source;
- `CORROBORATING` — second source required by `CORROBORATED_V1`;
- `COUNTER` — challenge source.

## 3. Evidence record

A decision-critical evidence record conceptually contains:

- specification ID;
- criterion ID;
- source role;
- canonical HTTPS URL;
- normalized host;
- authority label when available;
- immutable/version reference when available;
- source availability/admissibility status;
- bounded content;
- content length;
- SHA-256 content commitment;
- snapshot ID;
- validator-agreed semantic assessment;
- bounded rationale.

The implementation may split this across storage structures as long as the public read surface can reconstruct the record.

## 4. Immutable and versioned evidence preference

Preferred sources are those whose exact content can be addressed later, for example:

- repository raw files pinned to a commit SHA;
- release artifacts pinned to a version and digest;
- immutable deployment or transaction records;
- versioned documentation snapshots.

A mutable URL may still be admissible when product requirements demand it, but its authenticated snapshot becomes the historical decision basis.

The UI must never imply that a mutable source is immutable merely because it was snapshotted.

## 5. Canonical URL policy

Only public HTTPS URLs are admissible.

The final contract must reject or fail closed on at least:

- non-HTTPS schemes;
- credentials in URLs;
- localhost or loopback names;
- private/link-local IP literals;
- malformed hosts;
- unsupported ports;
- fragments when they change evidence identity ambiguously;
- URLs whose normalized form exceeds the bound.

Query parameters require special care because they can contain secrets, tracking values, or mutable selectors. v1 should reject query parameters unless Progress 2 establishes a narrow, deterministic allowlist with tests.

## 6. Host diversity

`CORROBORATED_V1` requires distinct normalized hosts.

Host diversity is only a mechanical anti-duplication rule. It is not proof that two sources have independent ownership, editorial control, or factual origin.

Reviewer documentation must say this explicitly.

## 7. Bounded content

Decision-critical content must be bounded before semantic evaluation is persisted.

Target maximum: 8,000 characters per source.

The implementation must define one exact rule for over-limit content before Progress 2 exits. Acceptable designs include:

- deterministic extraction of a bounded relevant section under explicit rules; or
- fail closed as `INSUFFICIENT`.

Silently evaluating uncommitted tail content is forbidden.

The stored snapshot must correspond exactly to the content the semantic decision used.

## 8. Snapshot commitment

Each available source snapshot receives:

- `content_sha256 = SHA256(exact_bounded_content_bytes)`;
- deterministic metadata serialization;
- `snapshot_id` derived from stable identity fields and the content commitment.

The exact canonical serialization for `snapshot_id` is frozen during Progress 2 and covered by independent test vectors.

The evidence package must independently recompute all snapshot commitments without importing contract helper code.

## 9. Unavailable evidence

Unavailable evidence must produce an explicit status and no fabricated content snapshot.

Examples include:

- DNS/network failure;
- HTTP failure according to final status policy;
- render failure;
- blocked or inaccessible source;
- empty/unusable decision content.

An unavailable required source produces criterion `INSUFFICIENT`.

## 10. Freshness

Freshness is criterion-specific and must not rely on a vague phrase such as "recent."

Before implementation, each source policy used by a release must define whether freshness is:

- irrelevant because the source is immutable/versioned;
- established by a version/release identifier;
- established by a validator-agreed publication timestamp under an explicit maximum age;
- unverifiable, in which case the source is `INSUFFICIENT` for a freshness-sensitive criterion.

No mutable source may be called fresh solely because it was fetched recently.

## 11. Corroboration

For `CORROBORATED_V1`, validators independently assess both sources.

- two supporting assessments -> `SATISFIED`;
- two contradicting assessments -> `VIOLATED`;
- disagreement -> source conflict -> `INSUFFICIENT`;
- missing/unavailable/admissibility failure -> `INSUFFICIENT`.

The contract, not the LLM, derives that mapping.

## 12. Challenge evidence and original-snapshot authentication

Challenge resolution must authenticate the original snapshot before using it as the historical decision basis.

The counter source is evaluated separately.

If the original live URL is re-fetched for drift detection:

- unchanged content -> record `UNCHANGED`;
- different content -> record `MODIFIED`;
- unavailable -> record `UNAVAILABLE`.

The re-fetched live content never silently replaces the original authenticated snapshot.

## 13. Evidence package requirements

The final reviewer package must preserve:

- release bindings;
- frozen reviewer matrix;
- each write request/arguments;
- raw submission response where available;
- raw finalization response captured before reviewer-facing normalization;
- transaction ID;
- final execution status;
- finalized authoritative readback;
- source snapshots;
- independent SHA-256 recomputation;
- contract-side snapshot verification results;
- package manifest with size and SHA-256 for every evidence file.

Raw response bodies must be persisted before JSON decoding or normalization whenever the client interface exposes the raw bytes/text.

## 14. No hidden evidence

A certificate must not depend on:

- private API keys;
- private repositories;
- operator-only screenshots;
- frontend local storage;
- evidence content not represented by the authenticated snapshot.

A reviewer should be able to inspect the public source identity and the exact bounded evidence preserved by the release.
