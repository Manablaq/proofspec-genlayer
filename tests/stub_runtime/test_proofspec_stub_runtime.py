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
    contract.evidence_snapshots = StubTreeMap()
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
    spec["challenge_count"] = module.MAX_CHALLENGES_PER_SPEC
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
