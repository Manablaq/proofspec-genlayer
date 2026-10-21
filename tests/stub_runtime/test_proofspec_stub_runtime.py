import hashlib
import importlib.util
import json
import sys
import types
from pathlib import Path

import pytest


CONTRACT_PATH = Path(__file__).resolve().parents[2] / "contracts" / "proofspec.py"


class StubUserError(Exception):
    pass


class StubU256(int):
    def __new__(cls, value=0):
        return int.__new__(cls, int(value))


class StubTreeMap(dict):
    pass


class StubPublic:
    @staticmethod
    def view(fn):
        return fn

    @staticmethod
    def write(fn):
        return fn


class StubContract:
    pass


class StubEnvironment:
    def __init__(self):
        self.nondet_calls = 0

    def render(self, *_args, **_kwargs):
        self.nondet_calls += 1
        raise AssertionError("Progress 2 deterministic tests must not perform nondeterministic web calls")

    def exec_prompt(self, *_args, **_kwargs):
        self.nondet_calls += 1
        raise AssertionError("Progress 2 deterministic tests must not perform LLM calls")

    def run_nondet(self, *_args, **_kwargs):
        self.nondet_calls += 1
        raise AssertionError("Progress 2 does not perform Direct Mode consensus certification")


def load_contract():
    env = StubEnvironment()

    vm_mod = types.ModuleType("genlayer.vm")
    vm_mod.UserError = StubUserError
    vm_mod.Return = type("StubReturn", (), {})
    vm_mod.run_nondet = env.run_nondet

    types_mod = types.ModuleType("genlayer.types")
    types_mod.u256 = StubU256

    genlayer_mod = types.ModuleType("genlayer")
    genlayer_mod.contract = types.SimpleNamespace(Contract=StubContract)
    genlayer_mod.public = StubPublic()
    genlayer_mod.vm = vm_mod
    genlayer_mod.storage = types.SimpleNamespace(TreeMap=StubTreeMap)
    genlayer_mod.nondet = types.SimpleNamespace(
        web=types.SimpleNamespace(render=env.render),
        exec_prompt=env.exec_prompt,
    )
    genlayer_mod.message = types.SimpleNamespace(
        sender_address="0x1111111111111111111111111111111111111111"
    )

    module_names = ("genlayer", "genlayer.vm", "genlayer.types")
    previous = {name: sys.modules.get(name) for name in module_names}
    sys.modules["genlayer"] = genlayer_mod
    sys.modules["genlayer.vm"] = vm_mod
    sys.modules["genlayer.types"] = types_mod

    try:
        spec = importlib.util.spec_from_file_location(
            "proofspec_contract_under_test",
            CONTRACT_PATH,
        )
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    finally:
        for name, old in previous.items():
            if old is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = old

    return module, env


def make_contract():
    module, env = load_contract()
    contract = module.ProofSpec()
    contract.specs = StubTreeMap()
    contract.challenges = StubTreeMap()
    contract.spec_fingerprints = StubTreeMap()
    contract.challenge_host_fingerprints = StubTreeMap()
    contract.challenge_url_attempts = StubTreeMap()
    contract.evidence_snapshots = StubTreeMap()
    contract.decision_history = StubTreeMap()
    contract.challenge_corrections = StubTreeMap()
    contract.publisher_attestations = StubTreeMap()
    return module, env, contract


def criterion(
    requirement="Release implements finalized state reads.",
    policy="AUTHORITATIVE_V1",
    freshness_policy="NOT_REQUIRED_V1",
    primary_url="https://evidence.example/release",
    corroborating_url="",
):
    return {
        "requirement": requirement,
        "policy": policy,
        "freshness_policy": freshness_policy,
        "primary_url": primary_url,
        "corroborating_url": corroborating_url,
    }


def criteria_json(*items):
    return json.dumps(list(items), separators=(",", ":"))


def create_default_spec(contract, module):
    return contract.create_spec(
        "ProofSpec release candidate",
        "release-commit-0123456789abcdef",
        criteria_json(criterion()),
    )


def seed_directional_evaluated_spec(
    contract,
    module,
    result=None,
):
    if result is None:
        result = module.SATISFIED

    spec_id = create_default_spec(contract, module)
    spec = contract.get_spec(spec_id)
    criterion_record = spec["criteria"][0]

    content = "Authenticated release evidence body."
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    evidence = {
        "spec_id": int(spec_id),
        "criterion_id": 1,
        "source_role": module.PRIMARY,
        "status": module.EVIDENCE_AVAILABLE,
        "source_status": module.SOURCE_AVAILABLE,
        "url": criterion_record["primary_url"],
        "host": criterion_record["primary_host"],
        "snapshot_id": module._snapshot_id(
            int(spec_id),
            1,
            module.PRIMARY,
            criterion_record["primary_url"],
            digest,
        ),
        "content_sha256": digest,
        "content_length": len(content),
        "content": content,
    }
    snapshot = module._snapshot_record(evidence)
    contract.evidence_snapshots[snapshot["snapshot_id"]] = module._compact_json(snapshot)

    criterion_record["initial_result"] = result
    criterion_record["effective_result"] = result
    criterion_record["primary_assessment"] = (
        module.SUPPORTS if result == module.SATISFIED else module.CONTRADICTS
    )
    criterion_record["primary_version_status"] = module.VERSION_NOT_APPLICABLE
    criterion_record["primary_evidence_status"] = module.EVIDENCE_AVAILABLE
    criterion_record["primary_source_status"] = module.SOURCE_AVAILABLE
    criterion_record["primary_snapshot_id"] = snapshot["snapshot_id"]
    criterion_record["primary_content_sha256"] = digest
    criterion_record["primary_content_length"] = len(content)

    spec["criteria"][0] = criterion_record
    spec["state"] = module.SPEC_EVALUATED
    spec["initial_certificate_result"] = (
        module.CERTIFIED if result == module.SATISFIED else module.REJECTED
    )
    spec["effective_certificate_result"] = spec["initial_certificate_result"]
    spec["revision"] = 1
    contract.specs[spec_id] = module._compact_json(spec)
    return spec_id


def test_protocol_info_freezes_core_limits_and_outcomes():
    module, env, contract = make_contract()
    info = contract.get_protocol_info()
    assert info["protocol_version"] == "proofspec-v1"
    assert info["policies"] == [module.AUTHORITATIVE_V1, module.CORROBORATED_V1]
    assert info["certificate_results"] == [
        module.CERTIFIED,
        module.REJECTED,
        module.INSUFFICIENT,
    ]
    assert info["max_criteria"] == 5
    assert info["source_statuses"] == [
        module.SOURCE_AVAILABLE,
        module.SOURCE_UNAVAILABLE,
        module.SOURCE_STALE,
        module.SOURCE_IRRELEVANT,
        module.SOURCE_AMBIGUOUS,
        module.SOURCE_INADMISSIBLE,
        module.SOURCE_NOT_APPLICABLE,
    ]
    assert info["max_source_text_chars"] == 8000
    assert info["max_challenges_per_spec"] == 8
    assert env.nondet_calls == 0


def test_create_spec_normalizes_requirement_and_starts_pending():
    module, env, contract = make_contract()
    payload = criterion(requirement="  Release   waits for finalized state.  ")
    spec_id = contract.create_spec(
        "  Release   1  ",
        "commit-0123456789",
        criteria_json(payload),
    )
    spec = contract.get_spec(spec_id)
    assert int(spec_id) == 1
    assert spec["release_label"] == "Release 1"
    assert spec["criteria"][0]["requirement"] == "Release waits for finalized state."
    assert spec["state"] == module.SPEC_PENDING
    assert spec["initial_certificate_result"] == module.UNRESOLVED
    assert spec["effective_certificate_result"] == module.UNRESOLVED
    assert env.nondet_calls == 0


def test_create_spec_accepts_exactly_five_criteria():
    module, _env, contract = make_contract()
    items = []
    for i in range(5):
        items.append(
            criterion(
                requirement=f"Release requirement number {i} is satisfied.",
                primary_url=f"https://evidence-{i}.example/release",
            )
        )
    spec_id = contract.create_spec(
        "Five criteria",
        "commit-0123456789",
        criteria_json(*items),
    )
    assert len(contract.get_spec(spec_id)["criteria"]) == 5


def test_create_spec_rejects_more_than_five_criteria():
    module, _env, contract = make_contract()
    items = []
    for i in range(6):
        items.append(
            criterion(
                requirement=f"Release requirement number {i} is satisfied.",
                primary_url=f"https://evidence-{i}.example/release",
            )
        )
    with pytest.raises(StubUserError, match="Too many criteria"):
        contract.create_spec(
            "Six criteria",
            "commit-0123456789",
            criteria_json(*items),
        )


def test_duplicate_requirement_is_rejected():
    module, _env, contract = make_contract()
    one = criterion(
        requirement="Release has finalized reads.",
        primary_url="https://one.example/release",
    )
    two = criterion(
        requirement="  Release   has finalized reads. ",
        primary_url="https://two.example/release",
    )
    with pytest.raises(StubUserError, match="Duplicate criterion requirement"):
        contract.create_spec(
            "Duplicate requirements",
            "commit-0123456789",
            criteria_json(one, two),
        )


def test_unknown_criterion_field_is_rejected():
    module, _env, contract = make_contract()
    item = criterion()
    item["model_override"] = "CERTIFIED"
    with pytest.raises(StubUserError, match="unsupported field"):
        contract.create_spec(
            "Bad payload",
            "commit-0123456789",
            criteria_json(item),
        )


@pytest.mark.parametrize(
    "url, message",
    [
        ("http://example.com/release", "must use HTTPS"),
        ("https://localhost/release", "public DNS host"),
        ("https://127.0.0.1/release", "IP literal evidence hosts"),
        ("https://user:pass@example.com/release", "cannot contain credentials"),
        ("https://example.com:443/release", "custom ports or IP literals"),
        ("https://example.com/release?token=secret", "query parameters"),
        ("https://example.com/release#proof", "fragments"),
        ("https://-bad.example/release", "host is malformed"),
        ("https://example..com/release", "host is malformed"),
    ],
)
def test_unsafe_evidence_urls_are_rejected(url, message):
    module, _env, contract = make_contract()
    with pytest.raises(StubUserError, match=message):
        contract.create_spec(
            "Unsafe source",
            "commit-0123456789",
            criteria_json(criterion(primary_url=url)),
        )


def test_authoritative_policy_rejects_hidden_corroborating_source():
    module, _env, contract = make_contract()
    with pytest.raises(StubUserError, match="cannot include corroborating"):
        contract.create_spec(
            "Bad authoritative",
            "commit-0123456789",
            criteria_json(
                criterion(
                    corroborating_url="https://other.example/release",
                )
            ),
        )


def test_corroborated_policy_requires_distinct_hosts():
    module, _env, contract = make_contract()
    with pytest.raises(StubUserError, match="distinct source hosts"):
        contract.create_spec(
            "Same host",
            "commit-0123456789",
            criteria_json(
                criterion(
                    policy="CORROBORATED_V1",
                    primary_url="https://proof.example/a",
                    corroborating_url="https://proof.example/b",
                )
            ),
        )


def test_corroborated_policy_accepts_distinct_hosts():
    module, _env, contract = make_contract()
    spec_id = contract.create_spec(
        "Distinct hosts",
        "commit-0123456789",
        criteria_json(
            criterion(
                policy="CORROBORATED_V1",
                primary_url="https://primary.example/a",
                corroborating_url="https://corroborating.example/b",
            )
        ),
    )
    item = contract.get_spec(spec_id)["criteria"][0]
    assert item["primary_host"] == "primary.example"
    assert item["corroborating_host"] == "corroborating.example"


def test_duplicate_release_specification_is_rejected():
    module, _env, contract = make_contract()
    create_default_spec(contract, module)
    with pytest.raises(StubUserError, match="Duplicate release specification"):
        create_default_spec(contract, module)


def test_malformed_criteria_json_is_rejected():
    module, _env, contract = make_contract()
    with pytest.raises(StubUserError, match="invalid JSON"):
        contract.create_spec("Bad JSON", "commit-0123456789", "not-json")


def test_release_bound_source_requires_version_match():
    module, _env = load_contract()
    assert module._source_is_usable(
        module.EVIDENCE_AVAILABLE,
        module.FRESHNESS_RELEASE_BOUND_V1,
        module.VERSION_MATCHES_RELEASE,
    )
    assert not module._source_is_usable(
        module.EVIDENCE_AVAILABLE,
        module.FRESHNESS_RELEASE_BOUND_V1,
        module.VERSION_MISMATCHES_RELEASE,
    )
    assert not module._source_is_usable(
        module.EVIDENCE_AVAILABLE,
        module.FRESHNESS_RELEASE_BOUND_V1,
        module.VERSION_UNVERIFIABLE,
    )


def test_authoritative_derivation_is_directional_and_fail_closed():
    module, _env = load_contract()
    common = (
        module.AUTHORITATIVE_V1,
        module.FRESHNESS_NOT_REQUIRED_V1,
        module.EVIDENCE_AVAILABLE,
    )
    assert module._derive_criterion_result(
        *common,
        module.SUPPORTS,
        module.VERSION_NOT_APPLICABLE,
        module.EVIDENCE_NOT_APPLICABLE,
        module.NOT_APPLICABLE,
        module.VERSION_NOT_APPLICABLE,
    ) == module.SATISFIED
    assert module._derive_criterion_result(
        *common,
        module.CONTRADICTS,
        module.VERSION_NOT_APPLICABLE,
        module.EVIDENCE_NOT_APPLICABLE,
        module.NOT_APPLICABLE,
        module.VERSION_NOT_APPLICABLE,
    ) == module.VIOLATED
    assert module._derive_criterion_result(
        *common,
        module.IRRELEVANT,
        module.VERSION_NOT_APPLICABLE,
        module.EVIDENCE_NOT_APPLICABLE,
        module.NOT_APPLICABLE,
        module.VERSION_NOT_APPLICABLE,
    ) == module.INSUFFICIENT


def test_corroborated_conflict_derives_insufficient():
    module, _env = load_contract()
    result = module._derive_criterion_result(
        module.CORROBORATED_V1,
        module.FRESHNESS_NOT_REQUIRED_V1,
        module.EVIDENCE_AVAILABLE,
        module.SUPPORTS,
        module.VERSION_NOT_APPLICABLE,
        module.EVIDENCE_AVAILABLE,
        module.CONTRADICTS,
        module.VERSION_NOT_APPLICABLE,
    )
    assert result == module.INSUFFICIENT
    assert module._source_conflict(module.SUPPORTS, module.CONTRADICTS)


def test_certificate_aggregation_prioritizes_insufficient_over_rejection():
    module, _env = load_contract()
    assert module._derive_certificate_result(
        [module.SATISFIED, module.SATISFIED]
    ) == module.CERTIFIED
    assert module._derive_certificate_result(
        [module.SATISFIED, module.VIOLATED]
    ) == module.REJECTED
    assert module._derive_certificate_result(
        [module.VIOLATED, module.INSUFFICIENT]
    ) == module.INSUFFICIENT


def test_snapshot_identity_is_context_bound_and_independently_verifiable():
    module, _env = load_contract()
    content = "bounded release evidence"
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    snapshot_id = module._snapshot_id(
        7,
        2,
        module.PRIMARY,
        "https://evidence.example/release",
        digest,
    )
    evidence = {
        "spec_id": 7,
        "criterion_id": 2,
        "source_role": module.PRIMARY,
        "status": module.EVIDENCE_AVAILABLE,
        "source_status": module.SOURCE_AVAILABLE,
        "url": "https://evidence.example/release",
        "host": "evidence.example",
        "snapshot_id": snapshot_id,
        "content_sha256": digest,
        "content_length": len(content),
        "content": content,
    }
    snapshot = module._snapshot_record(evidence)
    assert module._valid_snapshot_record(snapshot)
    assert snapshot["content_sha256"] == digest
    assert snapshot_id != module._snapshot_id(
        7,
        3,
        module.PRIMARY,
        "https://evidence.example/release",
        digest,
    )


def test_snapshot_verification_rejects_tampered_content():
    module, _env = load_contract()
    content = "original"
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    evidence = {
        "spec_id": 1,
        "criterion_id": 1,
        "source_role": module.PRIMARY,
        "status": module.EVIDENCE_AVAILABLE,
        "source_status": module.SOURCE_AVAILABLE,
        "url": "https://evidence.example/release",
        "host": "evidence.example",
        "snapshot_id": module._snapshot_id(
            1,
            1,
            module.PRIMARY,
            "https://evidence.example/release",
            digest,
        ),
        "content_sha256": digest,
        "content_length": len(content),
        "content": content,
    }
    snapshot = module._snapshot_record(evidence)
    snapshot["content"] = "tampered"
    snapshot["content_length"] = len("tampered")
    assert module._valid_snapshot_record(snapshot) is False


def test_open_challenge_records_authenticated_basis_without_nondet():
    module, env, contract = make_contract()
    spec_id = seed_directional_evaluated_spec(contract, module)
    challenge_id = contract.open_challenge(
        spec_id,
        1,
        "https://counter.example/release",
        "Counter evidence",
    )
    challenge = contract.get_challenge(challenge_id)
    spec = contract.get_spec(spec_id)
    assert challenge["basis_result"] == module.SATISFIED
    assert challenge["original_primary_snapshot_id"]
    assert challenge["challenge_outcome"] == module.CHALLENGE_PENDING
    assert spec["pending_challenge_id"] == int(challenge_id)
    assert env.nondet_calls == 0


def test_challenge_must_use_new_host_across_entire_spec():
    module, _env, contract = make_contract()
    spec_id = seed_directional_evaluated_spec(contract, module)
    with pytest.raises(StubUserError, match="new evidence host"):
        contract.open_challenge(
            spec_id,
            1,
            "https://evidence.example/other",
            "Same host",
        )


def test_only_one_pending_challenge_per_specification():
    module, _env, contract = make_contract()
    spec_id = seed_directional_evaluated_spec(contract, module)
    contract.open_challenge(
        spec_id,
        1,
        "https://counter-one.example/release",
        "First",
    )
    with pytest.raises(StubUserError, match="already has a pending challenge"):
        contract.open_challenge(
            spec_id,
            1,
            "https://counter-two.example/release",
            "Second",
        )


def test_challenge_host_cannot_be_reused_even_with_new_path():
    module, _env, contract = make_contract()
    spec_id = seed_directional_evaluated_spec(contract, module)
    contract.open_challenge(
        spec_id,
        1,
        "https://counter.example/one",
        "First",
    )

    spec = contract.get_spec(spec_id)
    spec["pending_challenge_id"] = 0
    contract.specs[spec_id] = module._compact_json(spec)

    with pytest.raises(StubUserError, match="Duplicate challenge host"):
        contract.open_challenge(
            spec_id,
            1,
            "https://counter.example/two",
            "Second",
        )


def test_insufficient_criterion_cannot_be_challenged_to_increase_certainty():
    module, _env, contract = make_contract()
    spec_id = seed_directional_evaluated_spec(contract, module)
    spec = contract.get_spec(spec_id)
    spec["criteria"][0]["effective_result"] = module.INSUFFICIENT
    spec["effective_certificate_result"] = module.INSUFFICIENT
    contract.specs[spec_id] = module._compact_json(spec)

    with pytest.raises(StubUserError, match="Only directional criteria"):
        contract.open_challenge(
            spec_id,
            1,
            "https://counter.example/release",
            "Cannot upgrade uncertainty",
        )


def test_challenge_limit_is_enforced_before_creation():
    module, _env, contract = make_contract()
    spec_id = seed_directional_evaluated_spec(contract, module)
    spec = contract.get_spec(spec_id)
    spec["qualified_challenge_count"] = module.MAX_CHALLENGES_PER_SPEC
    contract.specs[spec_id] = module._compact_json(spec)

    with pytest.raises(StubUserError, match="challenge limit reached"):
        contract.open_challenge(
            spec_id,
            1,
            "https://counter.example/release",
            "Overflow",
        )


def test_upheld_counter_evidence_only_downgrades_directional_certainty():
    module, _env = load_contract()
    outcome, revised = module._derive_challenge_outcome(
        module.SATISFIED,
        module.EVIDENCE_AVAILABLE,
        module.CONTRADICTS,
        module.FRESHNESS_NOT_REQUIRED_V1,
        module.VERSION_NOT_APPLICABLE,
    )
    assert outcome == module.CHALLENGE_UPHELD
    assert revised == module.INSUFFICIENT

    outcome, revised = module._derive_challenge_outcome(
        module.VIOLATED,
        module.EVIDENCE_AVAILABLE,
        module.SUPPORTS,
        module.FRESHNESS_NOT_REQUIRED_V1,
        module.VERSION_NOT_APPLICABLE,
    )
    assert outcome == module.CHALLENGE_UPHELD
    assert revised == module.INSUFFICIENT


def test_supporting_counter_evidence_is_rejected_not_promoted():
    module, _env = load_contract()
    outcome, revised = module._derive_challenge_outcome(
        module.SATISFIED,
        module.EVIDENCE_AVAILABLE,
        module.SUPPORTS,
        module.FRESHNESS_NOT_REQUIRED_V1,
        module.VERSION_NOT_APPLICABLE,
    )
    assert outcome == module.CHALLENGE_REJECTED
    assert revised == module.SATISFIED


def test_unusable_counter_evidence_is_insufficient():
    module, _env = load_contract()
    outcome, revised = module._derive_challenge_outcome(
        module.SATISFIED,
        module.EVIDENCE_UNAVAILABLE,
        module.UNAVAILABLE,
        module.FRESHNESS_NOT_REQUIRED_V1,
        module.VERSION_UNVERIFIABLE,
    )
    assert outcome == module.CHALLENGE_INSUFFICIENT
    assert revised == module.SATISFIED


def test_release_bound_counter_with_unverifiable_version_cannot_uphold():
    module, _env = load_contract()
    outcome, revised = module._derive_challenge_outcome(
        module.SATISFIED,
        module.EVIDENCE_AVAILABLE,
        module.CONTRADICTS,
        module.FRESHNESS_RELEASE_BOUND_V1,
        module.VERSION_UNVERIFIABLE,
    )
    assert outcome == module.CHALLENGE_INSUFFICIENT
    assert revised == module.SATISFIED


def test_note_limit_is_enforced():
    module, _env, contract = make_contract()
    spec_id = seed_directional_evaluated_spec(contract, module)
    with pytest.raises(StubUserError, match="note is too long"):
        contract.open_challenge(
            spec_id,
            1,
            "https://counter.example/release",
            "x" * (module.MAX_NOTE_CHARS + 1),
        )


def test_get_criterion_rejects_out_of_range_id():
    module, _env, contract = make_contract()
    spec_id = create_default_spec(contract, module)
    with pytest.raises(StubUserError, match="Criterion does not exist"):
        contract.get_criterion(spec_id, 2)


def test_nonempty_short_release_ref_and_requirement_are_allowed():
    module, _env, contract = make_contract()
    spec_id = contract.create_spec(
        "R",
        "x",
        criteria_json(
            criterion(
                requirement="y",
                primary_url="https://short.example/evidence",
            )
        ),
    )
    spec = contract.get_spec(spec_id)
    assert spec["release_ref"] == "x"
    assert spec["criteria"][0]["requirement"] == "y"


def test_empty_release_ref_and_requirement_remain_invalid():
    module, _env, contract = make_contract()
    with pytest.raises(StubUserError, match="Release reference is required"):
        contract.create_spec("Release", "   ", criteria_json(criterion()))

    with pytest.raises(StubUserError, match="Criterion requirement is required"):
        contract.create_spec(
            "Release",
            "x",
            criteria_json(criterion(requirement="   ")),
        )


def test_frozen_source_status_taxonomy_maps_fail_closed_conditions():
    module, _env = load_contract()

    assert module._derive_source_status(
        module.EVIDENCE_AVAILABLE,
        module.SUPPORTS,
        module.FRESHNESS_NOT_REQUIRED_V1,
        module.VERSION_NOT_APPLICABLE,
    ) == module.SOURCE_AVAILABLE

    assert module._derive_source_status(
        module.EVIDENCE_UNAVAILABLE,
        module.UNAVAILABLE,
        module.FRESHNESS_NOT_REQUIRED_V1,
        module.VERSION_UNVERIFIABLE,
    ) == module.SOURCE_UNAVAILABLE

    assert module._derive_source_status(
        module.EVIDENCE_AVAILABLE,
        module.SUPPORTS,
        module.FRESHNESS_RELEASE_BOUND_V1,
        module.VERSION_MISMATCHES_RELEASE,
    ) == module.SOURCE_STALE

    assert module._derive_source_status(
        module.EVIDENCE_AVAILABLE,
        module.IRRELEVANT,
        module.FRESHNESS_NOT_REQUIRED_V1,
        module.VERSION_NOT_APPLICABLE,
    ) == module.SOURCE_IRRELEVANT

    assert module._derive_source_status(
        module.EVIDENCE_AVAILABLE,
        module.SUPPORTS,
        module.FRESHNESS_RELEASE_BOUND_V1,
        module.VERSION_UNVERIFIABLE,
    ) == module.SOURCE_AMBIGUOUS

    assert module._derive_source_status(
        module.EVIDENCE_TOO_LARGE,
        module.CONTENT_TOO_LARGE,
        module.FRESHNESS_NOT_REQUIRED_V1,
        module.VERSION_UNVERIFIABLE,
    ) == module.SOURCE_INADMISSIBLE


def test_utf8_commitment_uses_bytes_while_content_bound_uses_characters():
    module, _env = load_contract()
    content = "évidence"
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    evidence = {
        "spec_id": 1,
        "criterion_id": 1,
        "source_role": module.PRIMARY,
        "status": module.EVIDENCE_AVAILABLE,
        "source_status": module.SOURCE_AVAILABLE,
        "url": "https://unicode.example/release",
        "host": "unicode.example",
        "snapshot_id": module._snapshot_id(
            1, 1, module.PRIMARY, "https://unicode.example/release", digest
        ),
        "content_sha256": digest,
        "content_length": len(content),
        "content": content,
    }
    assert len(content.encode("utf-8")) > len(content)
    assert module._valid_evidence_candidate(evidence)
    snapshot = module._snapshot_record(evidence)
    assert snapshot["content_length"] == len(content)
    assert snapshot["content_sha256"] == digest
    assert snapshot["source_status"] == module.SOURCE_AVAILABLE


def test_r2_timeout_is_bounded_and_preserves_original_certificate(monkeypatch):
    module, env, contract = make_contract()
    clock = [100000]
    monkeypatch.setattr(module, "_challenge_now", lambda: clock[0])
    spec_id = seed_directional_evaluated_spec(contract, module)
    challenge_id = contract.open_challenge(
        spec_id, 1, "https://counter.example/first", "first challenge"
    )
    pending = contract.get_challenge(challenge_id)
    assert pending["opened_at"] == 100000
    assert pending["expires_at"] == 186400
    assert pending["counts_toward_challenge_limit"] is False
    assert contract.get_spec(spec_id)["pending_challenge_id"] == challenge_id
    with pytest.raises(StubUserError, match="not expired"):
        contract.expire_challenge(challenge_id)
    clock[0] = 186400
    with pytest.raises(StubUserError, match="expired; call expire_challenge"):
        contract.resolve_challenge(challenge_id)
    expired = contract.expire_challenge(challenge_id)
    assert expired["state"] == "EXPIRED"
    assert expired["challenge_outcome"] == "INSUFFICIENT"
    assert expired["counts_toward_challenge_limit"] is False
    spec = contract.get_spec(spec_id)
    assert spec["pending_challenge_id"] == 0
    assert spec["effective_certificate_result"] == "CERTIFIED"
    assert spec["qualified_challenge_count"] == 0
    assert spec["revision"] == 1
    assert env.nondet_calls == 0
    with pytest.raises(StubUserError, match="not pending"):
        contract.expire_challenge(challenge_id)


def test_r2_duplicate_and_unavailable_attempt_budgets(monkeypatch):
    module, env, contract = make_contract()
    clock = [25000]
    monkeypatch.setattr(module, "_challenge_now", lambda: clock[0])
    spec_id = seed_directional_evaluated_spec(contract, module)
    ids = []
    for n in range(2):
        cid = contract.open_challenge(
            spec_id, 1, "https://recoverable.example/counter", "retry source"
        )
        ids.append(cid)
        with pytest.raises(StubUserError, match="already has a pending challenge"):
            contract.open_challenge(
                spec_id, 1, "https://different.example/counter", "blocked"
            )
        clock[0] += 86400
        contract.expire_challenge(cid)
    assert ids == [1, 2]
    with pytest.raises(StubUserError, match="Counter URL retry limit reached"):
        contract.open_challenge(
            spec_id, 1, "https://recoverable.example/counter", "attempt 3"
        )
    cid = contract.open_challenge(
        spec_id, 1, "https://recoverable.example/different-immutable-version", "new evidence"
    )
    assert int(cid) == 3
    assert contract.get_spec(spec_id)["qualified_challenge_count"] == 0
    assert env.nondet_calls == 0


def test_r2_only_qualified_uses_global_capacity():
    module, env, contract = make_contract()
    spec_id = seed_directional_evaluated_spec(contract, module)
    spec = contract.get_spec(spec_id)
    spec["challenge_count"] = 100  # Failed/expired historic attempts don't consume slots.
    spec["qualified_challenge_count"] = 0
    contract.specs[spec_id] = module._compact_json(spec)
    cid = contract.open_challenge(
        spec_id, 1, "https://fresh.example/release", "legitimate"
    )
    assert cid == 1
    assert contract.get_spec(spec_id)["challenge_count"] == 101
    assert contract.get_spec(spec_id)["qualified_challenge_count"] == 0
    assert env.nondet_calls == 0


def _r6_seed_upheld():
    module, env, contract = make_contract()
    spec_id = seed_directional_evaluated_spec(contract, module)
    challenge_id = contract.open_challenge(
        spec_id, 1, 'https://counter.example/release', 'counter alleges violation'
    )
    challenge = contract.get_challenge(challenge_id)
    counter_content = 'Original immutable counter source claims contradiction.'
    counter_sha = hashlib.sha256(counter_content.encode('utf-8')).hexdigest()
    counter_evidence = {
        'spec_id': int(spec_id), 'criterion_id': 1,
        'source_role': module.COUNTER,
        'status': module.EVIDENCE_AVAILABLE,
        'source_status': module.SOURCE_AVAILABLE,
        'url': challenge['counter_url'], 'host': challenge['counter_host'],
        'snapshot_id': module._snapshot_id(int(spec_id), 1, module.COUNTER,
                                          challenge['counter_url'], counter_sha),
        'content_sha256': counter_sha,
        'content_length': len(counter_content), 'content': counter_content,
    }
    counter_snapshot = module._snapshot_record(counter_evidence)
    contract.evidence_snapshots[counter_snapshot['snapshot_id']] = module._compact_json(counter_snapshot)
    challenge['state'] = module.CHALLENGE_RESOLVED
    challenge['challenge_outcome'] = module.CHALLENGE_UPHELD
    challenge['counter_assessment'] = module.CONTRADICTS
    challenge['counter_release_status'] = module.VERSION_MATCHES_RELEASE
    challenge['counter_snapshot_id'] = counter_snapshot['snapshot_id']
    challenge['upheld_revision'] = 2
    contract.challenges[challenge_id] = module._compact_json(challenge)
    spec = contract.get_spec(spec_id)
    spec['criteria'][0]['effective_result'] = module.INSUFFICIENT
    spec['effective_certificate_result'] = module.INSUFFICIENT
    spec['pending_challenge_id'] = 0
    spec['revision'] = 2
    contract.specs[spec_id] = module._compact_json(spec)
    contract._record_decision_revision(spec, 'UPHELD_CHALLENGE', 1)
    return module, env, contract, spec_id, challenge_id


def _r6_mock_correction(module, contract, spec_id, restore=True):
    url = 'https://independent-rebuttal.example/release'
    content = 'Exact release body with distinct-host rebuttal.'
    digest = hashlib.sha256(content.encode('utf-8')).hexdigest()
    evidence = {
        'spec_id': int(spec_id), 'criterion_id': 1,
        'source_role': module.CORRECTION,
        'status': module.EVIDENCE_AVAILABLE, 'source_status': module.SOURCE_AVAILABLE,
        'url': url, 'host': 'independent-rebuttal.example',
        'snapshot_id': module._snapshot_id(int(spec_id), 1, module.CORRECTION, url, digest),
        'content_sha256': digest, 'content_length': len(content), 'content': content,
    }
    result = {
        'outcome': 'RESTORED' if restore else 'NOT_RESTORED',
        'rebuttal_evidence': evidence,
        'rebuttal_assessment': module.SUPPORTS,
        'rebuttal_release_status': module.VERSION_MATCHES_RELEASE,
        'counter_reassessment': module.IRRELEVANT if restore else module.CONTRADICTS,
        'counter_release_reassessment': module.VERSION_MATCHES_RELEASE,
        'publisher_authority_status': ('GITHUB_PROTECTED_MAIN_PINNED_EVIDENCE_MANIFEST_VERIFIED' if restore else 'UNVERIFIED'),
        # Synthetic proof ONLY: the state-transition stub mocks consensus.
        # The standalone R8 publisher-proof tests exercise real validation.
        'publisher_proof': ({
            'publisher_authority_status': 'GITHUB_PROTECTED_MAIN_PINNED_EVIDENCE_MANIFEST_VERIFIED',
            'independent_authority_verified': False,
            'role': module.CORRECTION,
            'evidence_url': url,
            'evidence_sha256': digest,
            'release_ref': contract.get_spec(spec_id)['release_ref'],
            'criterion_sha256': module._sha256_text(contract.get_spec(spec_id)['criteria'][0]['requirement']),
        } if restore else None),
        'rationale': 'Original counter snapshot irrelevant to this exact requirement.',
    }
    module._correction_consensus = lambda *_args: result
    return url


def test_r6_stub_valid_correction_restores_but_preserves_counter_and_history():
    module, env, contract, sid, cid = _r6_seed_upheld()
    counter = contract.get_challenge(cid)['counter_snapshot_id']
    url = _r6_mock_correction(module, contract, sid)
    record = contract.reconsider_upheld_challenge(cid, url, 'Please correct a misclassified counter')
    assert record['outcome'] == 'RESTORED'
    assert record['publisher_authority_status'] == 'GITHUB_PROTECTED_MAIN_PINNED_EVIDENCE_MANIFEST_VERIFIED'
    assert contract.get_spec(sid)['revision'] == 3
    assert contract.get_spec(sid)['initial_certificate_result'] == module.CERTIFIED
    assert contract.get_spec(sid)['effective_certificate_result'] == module.CERTIFIED
    assert contract.get_decision_revision(sid, 2)['effective_certificate_result'] == module.INSUFFICIENT
    assert contract.get_decision_revision(sid, 3)['effective_certificate_result'] == module.CERTIFIED
    assert contract.get_challenge_correction(cid)['challenge_counter_snapshot_id'] == counter
    assert contract.get_challenge(cid)['counter_snapshot_id'] == counter
    assert contract.verify_evidence_snapshot(counter) is True
    assert contract.verify_evidence_snapshot(record['rebuttal_snapshot_id']) is True
    assert env.nondet_calls == 0
    with pytest.raises(StubUserError, match='correction already attempted'):
        contract.reconsider_upheld_challenge(cid, url, 'cannot retry')


def test_r6_stub_counter_still_relevant_cannot_restore():
    module, env, contract, sid, cid = _r6_seed_upheld()
    url = _r6_mock_correction(module, contract, sid, restore=False)
    record = contract.reconsider_upheld_challenge(cid, url, 'counter remains relevant')
    assert record['outcome'] == 'NOT_RESTORED'
    assert contract.get_spec(sid)['effective_certificate_result'] == module.INSUFFICIENT
    assert contract.get_spec(sid)['revision'] == 2
    assert contract.get_challenge_correction(cid)['outcome'] == 'NOT_RESTORED'
    with pytest.raises(StubUserError, match='correction already attempted'):
        contract.reconsider_upheld_challenge(cid, url, 'cannot retry either')


def test_r6_stub_not_upheld_and_stale_revision_are_rejected():
    module, env, contract = make_contract()
    sid = seed_directional_evaluated_spec(contract, module)
    cid = contract.open_challenge(sid, 1, 'https://counter.example/release', 'pending')
    with pytest.raises(StubUserError, match='Only upheld challenges'):
        contract.reconsider_upheld_challenge(cid, 'https://outside.example/release', 'not yet upheld')
    module, env, contract, sid, cid = _r6_seed_upheld()
    url = _r6_mock_correction(module, contract, sid)
    spec = contract.get_spec(sid)
    spec['revision'] = 3
    contract.specs[sid] = module._compact_json(spec)
    with pytest.raises(StubUserError, match='Stale upheld challenge revision'):
        contract.reconsider_upheld_challenge(cid, url, 'stale')


def test_r6_stub_unauthorized_and_reused_source_rejected():
    module, env, contract, sid, cid = _r6_seed_upheld()
    url = _r6_mock_correction(module, contract, sid)
    module.gl.message.sender_address = '0x2222222222222222222222222222222222222222'
    with pytest.raises(StubUserError, match='Only specification submitter'):
        contract.reconsider_upheld_challenge(cid, url, 'not authorized')
    module.gl.message.sender_address = '0x1111111111111111111111111111111111111111'
    with pytest.raises(StubUserError, match='distinct source host'):
        contract.reconsider_upheld_challenge(cid, 'https://counter.example/different', 'same host')
    with pytest.raises(StubUserError, match='distinct source host'):
        contract.reconsider_upheld_challenge(cid, 'https://evidence.example/different', 'primary host')


def test_r6_stub_tampered_original_counter_cannot_be_corrected():
    module, env, contract, sid, cid = _r6_seed_upheld()
    url = _r6_mock_correction(module, contract, sid)
    counter_id = contract.get_challenge(cid)['counter_snapshot_id']
    corrupted = contract.get_evidence_snapshot(counter_id)
    corrupted['content'] = 'forged counter bytes'
    contract.evidence_snapshots[counter_id] = module._compact_json(corrupted)
    with pytest.raises(StubUserError, match='Required evidence snapshot is invalid'):
        contract.reconsider_upheld_challenge(cid, url, 'tampered')
    assert not contract.challenge_corrections


def test_r6_stub_model_cannot_forcibly_restore_a_valid_counter():
    module, env, contract, sid, cid = _r6_seed_upheld()
    url = _r6_mock_correction(module, contract, sid, restore=False)
    old = module._correction_consensus
    def forged(*args):
        result = old(*args)
        return {**result, 'outcome': 'RESTORED'}
    module._correction_consensus = forged
    with pytest.raises(StubUserError, match='Invalid correction consensus result'):
        contract.reconsider_upheld_challenge(cid, url, 'forged success')
    assert contract.get_spec(sid)['effective_certificate_result'] == module.INSUFFICIENT
    assert not contract.challenge_corrections
