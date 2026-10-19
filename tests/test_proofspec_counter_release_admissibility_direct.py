"""R5 Direct Mode: exact-release semantic admissibility and conservative results.

This suite uses deliberately mocked GenLayer web and LLM inputs; it does NOT
independently authenticate a publisher or test live GenVM/GitHub reachability.
"""
from test_proofspec_direct import (
    challenge_payload,
    evaluate_directional_spec,
    mock_primary,
    mock_counter,
    open_challenge,
)


def _setup(direct_vm, direct_deploy, *, counter_body="Counter release evidence"):
    contract, sid, before = evaluate_directional_spec(
        direct_vm, direct_deploy, direction="SUPPORTS"
    )
    cid = open_challenge(contract, sid)
    mock_primary(direct_vm, "ORIGINAL_PRIMARY_EVIDENCE")
    mock_counter(direct_vm, counter_body)
    return contract, sid, cid, before


def test_r5_unverifiable_release_cannot_uphold_even_for_not_required_policy(
    direct_vm, direct_deploy
):
    contract, sid, cid, before = _setup(direct_vm, direct_deploy)
    direct_vm.mock_llm(
        r"PROOFSPEC_CHALLENGE_V1",
        challenge_payload(counter_assessment="CONTRADICTS",
                          counter_release_status="UNVERIFIABLE"),
    )
    result = contract.resolve_challenge(cid)
    spec = contract.get_spec(sid)
    assert result["counter_source_status"] == "AVAILABLE"
    assert result["counter_release_status"] == "UNVERIFIABLE"
    assert result["counter_admissibility_reason"] == "EXACT_RELEASE_NOT_VERIFIED"
    assert result["challenge_outcome"] == "INSUFFICIENT"
    assert result["revised_criterion_result"] == "SATISFIED"
    assert spec["effective_certificate_result"] == "CERTIFIED"
    assert spec["revision"] == before["revision"]
    assert result["counter_snapshot_id"]
    assert contract.verify_evidence_snapshot(result["counter_snapshot_id"]) is True
    assert direct_vm.run_validator() is True


def test_r5_different_release_counter_cannot_downgrade_certified(
    direct_vm, direct_deploy
):
    contract, sid, cid, _before = _setup(direct_vm, direct_deploy)
    direct_vm.mock_llm(
        r"PROOFSPEC_CHALLENGE_V1",
        challenge_payload(counter_assessment="CONTRADICTS",
                          counter_release_status="MISMATCHES_RELEASE"),
    )
    result = contract.resolve_challenge(cid)
    assert result["challenge_outcome"] == "INSUFFICIENT"
    assert result["counter_release_status"] == "MISMATCHES_RELEASE"
    assert contract.get_spec(sid)["effective_certificate_result"] == "CERTIFIED"
    assert direct_vm.run_validator() is True


def test_r8_same_release_counter_upholds_only_with_verified_publisher(
    direct_vm, direct_deploy
):
    contract, sid, cid, before = _setup(direct_vm, direct_deploy)
    direct_vm.mock_llm(
        r"PROOFSPEC_CHALLENGE_V1",
        challenge_payload(counter_assessment="CONTRADICTS",
                          counter_release_status="MATCHES_RELEASE",
                          rationale="Counter contradicts wallet disconnect for exact release."),
    )
    result = contract.resolve_challenge(cid)
    assert result["challenge_outcome"] == "UPHELD"
    assert result["counter_release_status"] == "MATCHES_RELEASE"
    assert result["counter_publisher_authority_status"] == "GITHUB_PROTECTED_MAIN_PINNED_EVIDENCE_MANIFEST_VERIFIED"
    assert result["counter_publisher_proof"]["independent_authority_verified"] is False
    assert result["counter_admissibility_reason"] == "EXACT_RELEASE_AND_GITHUB_PUBLISHER_PROOF_VERIFIED"
    spec = contract.get_spec(sid)
    assert spec["criteria"][0]["initial_result"] == "SATISFIED"
    assert spec["effective_certificate_result"] == "INSUFFICIENT"
    assert spec["revision"] == before["revision"] + 1
    assert contract.get_decision_revision(sid, before["revision"])["effective_certificate_result"] == "CERTIFIED"
    assert direct_vm.run_validator() is True


def test_r5_validator_disagrees_on_exact_release_status(direct_vm, direct_deploy):
    contract, sid, cid, _before = _setup(direct_vm, direct_deploy)
    direct_vm.mock_llm(
        r"PROOFSPEC_CHALLENGE_V1",
        challenge_payload(counter_assessment="CONTRADICTS",
                          counter_release_status="MATCHES_RELEASE"),
    )
    result = contract.resolve_challenge(cid)
    assert result["challenge_outcome"] == "UPHELD"
    direct_vm.clear_mocks()
    mock_primary(direct_vm, "ORIGINAL_PRIMARY_EVIDENCE")
    mock_counter(direct_vm, "Counter release evidence")
    direct_vm.mock_llm(
        r"PROOFSPEC_CHALLENGE_V1",
        challenge_payload(counter_assessment="CONTRADICTS",
                          counter_release_status="UNVERIFIABLE"),
    )
    assert direct_vm.run_validator() is False


def test_r5_missing_exact_release_classification_fails_closed(
    direct_vm, direct_deploy
):
    contract, sid, cid, _before = _setup(direct_vm, direct_deploy)
    # Explicitly omit the new field through a manually serialized mock.
    from test_proofspec_direct import llm_json
    direct_vm.mock_llm(
        r"PROOFSPEC_CHALLENGE_V1",
        llm_json(counter_assessment="CONTRADICTS",
                 counter_version_status="NOT_APPLICABLE", rationale="missing release identity"),
    )
    with direct_vm.expect_revert("Invalid release-version status"):
        contract.resolve_challenge(cid)
    assert contract.get_challenge(cid)["state"] == "PENDING"
