"""R8 Direct Mode: verified publisher proof is mandatory at both write boundaries.

Only mocked GitHub data and deterministic GenLayer Direct Mode are exercised.
This is not live external API validation or on-chain finality proof.
"""

import pytest

from test_proofspec_direct import (
    COUNTER,
    challenge_payload,
    evaluate_directional_spec,
    mock_counter,
    mock_pinned_publisher,
    mock_primary,
    open_challenge,
)
from test_proofspec_challenge_correction_direct import (
    REBUTTAL,
    _correction_mocks,
    _upheld,
)

BODY = "Pinned GitHub publisher says the exact release lacks wallet disconnect."
VERIFIED = "GITHUB_PROTECTED_MAIN_PINNED_EVIDENCE_MANIFEST_VERIFIED"


def _pending(direct_vm, direct_deploy):
    contract, sid, _ = evaluate_directional_spec(direct_vm, direct_deploy)
    cid = open_challenge(contract, sid)
    mock_primary(direct_vm, "ORIGINAL_PRIMARY_EVIDENCE")
    return contract, sid, cid


def _assessment(direct_vm):
    direct_vm.mock_llm(
        r"PROOFSPEC_CHALLENGE_V1",
        challenge_payload(counter_assessment="CONTRADICTS",
                          counter_release_status="MATCHES_RELEASE"),
    )


def test_r8_verified_proof_required_for_upheld(direct_vm, direct_deploy):
    contract, sid, cid = _pending(direct_vm, direct_deploy)
    mock_counter(direct_vm, BODY, publisher=True)
    _assessment(direct_vm)
    decision = contract.resolve_challenge(cid)
    assert decision["challenge_outcome"] == "UPHELD"
    assert decision["counter_publisher_authority_status"] == VERIFIED
    assert decision["counter_publisher_proof"]["independent_authority_verified"] is False
    assert decision["counter_admissibility_reason"] == "EXACT_RELEASE_AND_GITHUB_PUBLISHER_PROOF_VERIFIED"
    assert contract.get_spec(sid)["effective_certificate_result"] == "INSUFFICIENT"
    assert direct_vm.run_validator() is True


@pytest.mark.parametrize("tampering", [
    {"protected": False},
    {"manifest_change": {"evidence_sha256": "a" * 64}},
    {"manifest_change": {"release_ref": "unrelated-release"}},
    {"manifest_change": {"role": "CORRECTION"}},
    {"manifest_change": {"publisher_wallet": "unverified"}},
])
def test_r8_invalid_publisher_never_downgrades(direct_vm, direct_deploy, tampering):
    contract, sid, cid = _pending(direct_vm, direct_deploy)
    mock_pinned_publisher(direct_vm, BODY, **tampering)
    _assessment(direct_vm)
    with direct_vm.expect_revert("[EXPECTED]"):
        contract.resolve_challenge(cid)
    spec = contract.get_spec(sid)
    assert spec["revision"] == 1
    assert spec["effective_certificate_result"] == "CERTIFIED"
    assert contract.get_challenge(cid)["state"] == "PENDING"


def test_r8_non_github_counter_cannot_uphold(direct_vm, direct_deploy):
    contract, sid, _ = evaluate_directional_spec(direct_vm, direct_deploy)
    cid = contract.open_challenge(sid, 1, "https://counter.example/release", "unverified counter")
    mock_primary(direct_vm, "ORIGINAL_PRIMARY_EVIDENCE")
    direct_vm.mock_web(r"counter\.example/release", {"status": 200, "body": BODY})
    _assessment(direct_vm)
    with direct_vm.expect_revert("Publisher proof requires pinned raw GitHub evidence"):
        contract.resolve_challenge(cid)
    assert contract.get_spec(sid)["effective_certificate_result"] == "CERTIFIED"


def test_r8_validator_rejects_changed_publisher_manifest(direct_vm, direct_deploy):
    contract, sid, cid = _pending(direct_vm, direct_deploy)
    mock_counter(direct_vm, BODY, publisher=True)
    _assessment(direct_vm)
    contract.resolve_challenge(cid)
    direct_vm.clear_mocks()
    mock_primary(direct_vm, "ORIGINAL_PRIMARY_EVIDENCE")
    mock_pinned_publisher(direct_vm, BODY,
                          manifest_change={"publisher_wallet": "0x" + "3" * 40})
    _assessment(direct_vm)
    assert direct_vm.run_validator() is False


def test_r8_verified_rebuttal_can_restore_with_distinct_repo(direct_vm, direct_deploy):
    contract, sid, cid, _original, upheld = _upheld(direct_vm, direct_deploy)
    _correction_mocks(direct_vm)
    record = contract.reconsider_upheld_challenge(cid, REBUTTAL, "Authentic correction")
    assert record["outcome"] == "RESTORED"
    assert record["publisher_authority_status"] == VERIFIED
    assert record["publisher_proof"]["independent_authority_verified"] is False
    assert contract.get_decision_revision(sid, 2)["effective_certificate_result"] == "INSUFFICIENT"
    assert contract.get_spec(sid)["effective_certificate_result"] == "CERTIFIED"
    assert direct_vm.run_validator() is True


def test_r8_invalid_publisher_rebuttal_cannot_restore(direct_vm, direct_deploy):
    contract, sid, cid, _original, upheld = _upheld(direct_vm, direct_deploy)
    mock_pinned_publisher(
        direct_vm, "New exact-release verified correction evidence",
        role="CORRECTION", repo="ReviewOrg/release-rebuttal", protected=False,
    )
    from test_proofspec_direct import llm_json
    direct_vm.mock_llm(
        r"PROOFSPEC_CHALLENGE_CORRECTION_V1",
        llm_json(rebuttal_assessment="SUPPORTS",
                 rebuttal_release_status="MATCHES_RELEASE",
                 counter_reassessment="IRRELEVANT",
                 counter_release_reassessment="MATCHES_RELEASE",
                 rationale="Rebuttal proves this exact release"),
    )
    with direct_vm.expect_revert("[EXPECTED]"):
        contract.reconsider_upheld_challenge(cid, REBUTTAL, "Unverified rebuttal")
    assert contract.get_spec(sid)["effective_certificate_result"] == "INSUFFICIENT"
    assert contract.get_spec(sid)["revision"] == 2
