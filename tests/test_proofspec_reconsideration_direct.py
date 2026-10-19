"""Reviewer R1 supported Direct Mode regression: unresolved-criterion recovery.

These tests use the project's existing strict Direct Mode fixtures and mocks.
Do not substitute stub-runtime results for consensus verification.
"""
import pytest

from test_proofspec_direct import (
    create_single_spec,
    create_spec,
    criterion,
    deploy,
    eval_payload,
    mock_primary,
)


def test_insufficient_reconsideration_certifies_and_preserves_revision(direct_vm, direct_deploy):
    contract, spec_id = create_single_spec(direct_deploy)
    mock_primary(direct_vm, "")
    original = contract.evaluate_spec(spec_id)
    assert original["initial_certificate_result"] == "INSUFFICIENT"
    assert original["revision"] == 1
    assert direct_vm.run_validator() is True
    direct_vm.clear_validators()
    direct_vm.clear_mocks()

    first_history = contract.get_decision_revision(spec_id, 1)
    assert first_history["effective_certificate_result"] == "INSUFFICIENT"
    assert first_history["criteria"][0]["primary_snapshot_id"] == ""
    assert first_history["previous_revision"] == 0

    body = "Wallet disconnect is implemented in this exact release."
    mock_primary(direct_vm, body)
    direct_vm.mock_llm(
        r"PROOFSPEC_EVALUATE_CRITERION_V1",
        eval_payload(primary_assessment="SUPPORTS", rationale="Newly available proof"),
    )
    recovered = contract.reconsider_insufficient_spec(spec_id)
    assert recovered["effective_certificate_result"] == "CERTIFIED"
    assert recovered["initial_certificate_result"] == "INSUFFICIENT"
    assert recovered["criteria"][0]["initial_result"] == "INSUFFICIENT"
    assert recovered["criteria"][0]["effective_result"] == "SATISFIED"
    assert recovered["revision"] == 2
    assert recovered["reconsideration_count"] == 1
    snapshot = recovered["criteria"][0]["primary_snapshot_id"]
    assert snapshot
    assert contract.verify_evidence_snapshot(snapshot) is True
    assert direct_vm.run_validator() is True
    prior = contract.get_decision_revision(spec_id, 1)
    current = contract.get_decision_revision(spec_id, 2)
    assert prior == first_history
    assert current["previous_revision"] == 1
    assert current["reason"] == "INSUFFICIENT_RECONSIDERATION"
    assert current["criteria"][0]["primary_snapshot_id"] == snapshot
    with direct_vm.expect_revert("Only inconclusive specifications"):
        contract.reconsider_insufficient_spec(spec_id)


def test_reconsideration_only_fetches_originally_unresolved_criterion(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    spec_id = create_spec(
        contract,
        [
            criterion("Valid adverse judgment must remain.",
                      primary_url="https://criterion-a.example/evidence"),
            criterion("Temporarily unavailable source.",
                      primary_url="https://criterion-b.example/evidence"),
        ],
    )
    direct_vm.mock_web(r"criterion-a\.example/evidence", {"status": 200, "body": "Contradiction"})
    direct_vm.mock_web(r"criterion-b\.example/evidence", {"status": 200, "body": ""})
    direct_vm.mock_llm(
        r"Valid adverse judgment must remain\.",
        eval_payload(primary_assessment="CONTRADICTS", rationale="Adverse finding"),
    )
    initial = contract.evaluate_spec(spec_id)
    assert [c["initial_result"] for c in initial["criteria"]] == ["VIOLATED", "INSUFFICIENT"]
    assert initial["effective_certificate_result"] == "INSUFFICIENT"
    first_snapshot_id = initial["criteria"][0]["primary_snapshot_id"]
    assert first_snapshot_id
    assert direct_vm.run_validator() is True
    direct_vm.clear_validators()
    direct_vm.clear_mocks()

    # Deliberately omit the criterion A web/LLM mocks, so strict mocks fail
    # if reconsideration ever tries to revisit its adverse determination.
    direct_vm.mock_web(r"criterion-b\.example/evidence", {"status": 200, "body": "Recovered"})
    direct_vm.mock_llm(
        r"Temporarily unavailable source\.",
        eval_payload(primary_assessment="SUPPORTS", rationale="Restored evidence"),
    )
    result = contract.reconsider_insufficient_spec(spec_id)
    assert result["initial_certificate_result"] == "INSUFFICIENT"
    assert result["effective_certificate_result"] == "REJECTED"
    assert [c["effective_result"] for c in result["criteria"]] == ["VIOLATED", "SATISFIED"]
    assert result["criteria"][0]["primary_snapshot_id"] == first_snapshot_id
    assert direct_vm.run_validator() is True
    assert contract.get_decision_revision(spec_id, 1)["criteria"][1]["effective_result"] == "INSUFFICIENT"


def test_reconsideration_budget_consumes_inconclusive_finalizations(direct_vm, direct_deploy):
    contract, spec_id = create_single_spec(direct_deploy)
    mock_primary(direct_vm, "")
    assert contract.evaluate_spec(spec_id)["effective_certificate_result"] == "INSUFFICIENT"
    assert direct_vm.run_validator() is True
    direct_vm.clear_validators()
    direct_vm.clear_mocks()
    for count in (1, 2):
        mock_primary(direct_vm, "")
        result = contract.reconsider_insufficient_spec(spec_id)
        assert result["effective_certificate_result"] == "INSUFFICIENT"
        assert result["reconsideration_count"] == count
        assert result["revision"] == count + 1
        assert direct_vm.run_validator() is True
        direct_vm.clear_validators()
        direct_vm.clear_mocks()
    assert contract.get_decision_revision(spec_id, 3)["reason"] == "INSUFFICIENT_RECONSIDERATION"
    with direct_vm.expect_revert("Reconsideration limit reached"):
        contract.reconsider_insufficient_spec(spec_id)
    assert contract.get_spec(spec_id)["revision"] == 3


def test_valid_rejected_verdict_is_not_reconsiderable(direct_vm, direct_deploy):
    contract, spec_id = create_single_spec(direct_deploy)
    mock_primary(direct_vm, "Release contradicts requirement")
    direct_vm.mock_llm(
        r"PROOFSPEC_EVALUATE_CRITERION_V1",
        eval_payload(primary_assessment="CONTRADICTS"),
    )
    initial = contract.evaluate_spec(spec_id)
    assert initial["effective_certificate_result"] == "REJECTED"
    assert direct_vm.run_validator() is True
    with direct_vm.expect_revert("Only inconclusive specifications"):
        contract.reconsider_insufficient_spec(spec_id)
    assert contract.get_spec(spec_id)["revision"] == 1
