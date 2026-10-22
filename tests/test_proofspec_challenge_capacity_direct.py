"""Reviewer Stage 2 Direct Mode challenge-capacity regressions.

Use the project's strict Direct Mode fixtures and pinned GenVM runner.
These tests DO NOT create any network transactions.
"""
import pytest

from test_proofspec_direct import (
    evaluate_directional_spec,
    mock_primary,
    mock_counter,
    challenge_payload,
    open_challenge,
)


@pytest.fixture(autouse=True)
def _guard_strict_direct(direct_vm):
    direct_vm.strict_mocks = True
    direct_vm.check_pickling = True
    yield


def test_unavailable_counter_does_not_consume_qualified_capacity(direct_vm, direct_deploy):
    contract, spec_id, _ = evaluate_directional_spec(direct_vm, direct_deploy)
    first_id = open_challenge(contract, spec_id)
    mock_primary(direct_vm, "ORIGINAL_PRIMARY_EVIDENCE")
    mock_counter(direct_vm, "")
    challenge = contract.resolve_challenge(first_id)
    assert challenge["challenge_outcome"] == "INSUFFICIENT"
    assert challenge["counts_toward_challenge_limit"] is False
    assert contract.get_spec(spec_id)["qualified_challenge_count"] == 0
    assert direct_vm.run_validator() is True
    direct_vm.clear_validators()
    direct_vm.clear_mocks()

    # A previously unavailable source can be retried from the same host/URL.
    second_id = open_challenge(contract, spec_id)
    assert int(second_id) == int(first_id) + 1
    assert contract.get_spec(spec_id)["pending_challenge_id"] == int(second_id)
    assert contract.get_spec(spec_id)["qualified_challenge_count"] == 0
    assert contract.get_spec(spec_id)["challenge_count"] == 2


def test_upheld_counter_consumes_exactly_one_qualified_slot(direct_vm, direct_deploy):
    contract, spec_id, _ = evaluate_directional_spec(direct_vm, direct_deploy)
    challenge_id = open_challenge(contract, spec_id)
    mock_primary(direct_vm, "ORIGINAL_PRIMARY_EVIDENCE")
    mock_counter(direct_vm, "Counter evidence contradicts this release requirement.", publisher=True)
    direct_vm.mock_llm(
        r"PROOFSPEC_CHALLENGE_V1",
        challenge_payload(counter_assessment="CONTRADICTS"),
    )
    challenge = contract.resolve_challenge(challenge_id)
    assert challenge["challenge_outcome"] == "UPHELD"
    assert challenge["counts_toward_challenge_limit"] is True
    assert contract.get_spec(spec_id)["qualified_challenge_count"] == 1
    assert contract.get_spec(spec_id)["challenge_count"] == 1
    assert contract.get_spec(spec_id)["revision"] == 2
    assert direct_vm.run_validator() is True


def test_rejected_counter_preserves_capacity(direct_vm, direct_deploy):
    contract, spec_id, _ = evaluate_directional_spec(direct_vm, direct_deploy)
    challenge_id = open_challenge(contract, spec_id)
    mock_primary(direct_vm, "ORIGINAL_PRIMARY_EVIDENCE")
    mock_counter(direct_vm, "Counter source also supports this release requirement.")
    direct_vm.mock_llm(
        r"PROOFSPEC_CHALLENGE_V1",
        challenge_payload(counter_assessment="SUPPORTS"),
    )
    challenge = contract.resolve_challenge(challenge_id)
    assert challenge["challenge_outcome"] == "REJECTED"
    assert challenge["counts_toward_challenge_limit"] is False
    assert contract.get_spec(spec_id)["qualified_challenge_count"] == 0
    assert contract.get_spec(spec_id)["effective_certificate_result"] == "CERTIFIED"
    assert direct_vm.run_validator() is True


def test_unexpired_pending_challenge_cannot_be_aborted(direct_vm, direct_deploy):
    contract, spec_id, _ = evaluate_directional_spec(direct_vm, direct_deploy)
    challenge_id = open_challenge(contract, spec_id)
    challenge = contract.get_challenge(challenge_id)
    assert challenge["expires_at"] - challenge["opened_at"] == 86400
    assert challenge["opened_revision"] == 1
    with direct_vm.expect_revert("Challenge has not expired"):
        contract.expire_challenge(challenge_id)
    assert contract.get_spec(spec_id)["pending_challenge_id"] == int(challenge_id)
