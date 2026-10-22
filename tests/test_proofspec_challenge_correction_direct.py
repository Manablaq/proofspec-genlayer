"""R6: bounded correction of upheld challenge with original snapshot preserved.

Inputs are mocked GenLayer Direct Mode fixtures, not independently verified
publisher identity or a live-network release. Fail closed on uncertainty.
"""
from test_proofspec_direct import (
    challenge_payload, evaluate_directional_spec, mock_primary, mock_counter,
    open_challenge, llm_json, mock_pinned_publisher,
)

REBUTTAL = 'https://raw.githubusercontent.com/ReviewOrg/release-rebuttal/0123456789abcdef0123456789abcdef01234567/findings/evidence.txt'


def _upheld(direct_vm, direct_deploy):
    contract, sid, original = evaluate_directional_spec(
        direct_vm, direct_deploy, direction='SUPPORTS'
    )
    cid = open_challenge(contract, sid)
    mock_primary(direct_vm, 'ORIGINAL_PRIMARY_EVIDENCE')
    mock_counter(direct_vm, 'Counter says requirement is absent in release-commit-0123456789abcdef', publisher=True)
    direct_vm.mock_llm(
        r'PROOFSPEC_CHALLENGE_V1',
        challenge_payload(counter_assessment='CONTRADICTS',
                          counter_release_status='MATCHES_RELEASE',
                          rationale='Specific contradiction in this exact release'),
    )
    upheld = contract.resolve_challenge(cid)
    assert upheld['challenge_outcome'] == 'UPHELD'
    assert direct_vm.run_validator() is True
    direct_vm.clear_validators()
    direct_vm.clear_mocks()
    return contract, sid, cid, original, upheld


def _correction_mocks(direct_vm, *, counter_reassessment='IRRELEVANT',
                      rebuttal_assessment='SUPPORTS', rebuttal_release_status='MATCHES_RELEASE',
                      counter_release_reassessment='MATCHES_RELEASE'):
    mock_pinned_publisher(
        direct_vm, 'New exact-release verified correction evidence',
        role='CORRECTION', repo='ReviewOrg/release-rebuttal',
    )
    direct_vm.mock_llm(
        r'PROOFSPEC_CHALLENGE_CORRECTION_V1',
        llm_json(rebuttal_assessment=rebuttal_assessment,
                 rebuttal_release_status=rebuttal_release_status,
                 counter_reassessment=counter_reassessment,
                 counter_release_reassessment=counter_release_reassessment,
                 rationale='Rebuttal proves exact release and authentic counter was misclassified'),
    )


def test_r6_restores_only_after_exact_release_rebuttal_and_counter_reassessment(direct_vm, direct_deploy):
    contract, sid, cid, original, upheld = _upheld(direct_vm, direct_deploy)
    before = contract.get_spec(sid)
    assert before['effective_certificate_result'] == 'INSUFFICIENT'
    _correction_mocks(direct_vm)
    record = contract.reconsider_upheld_challenge(cid, REBUTTAL, 'Reconsider incorrect counter classification')
    assert record['outcome'] == 'RESTORED'
    assert record['basis_revision'] == 2
    assert record['result_revision'] == 3
    assert record['publisher_authority_status'] == 'GITHUB_PROTECTED_MAIN_PINNED_EVIDENCE_MANIFEST_VERIFIED'
    assert record['publisher_proof']['independent_authority_verified'] is False
    assert contract.get_spec(sid)['initial_certificate_result'] == 'CERTIFIED'
    assert contract.get_spec(sid)['effective_certificate_result'] == 'CERTIFIED'
    assert contract.get_decision_revision(sid, 2)['effective_certificate_result'] == 'INSUFFICIENT'
    assert contract.get_decision_revision(sid, 3)['effective_certificate_result'] == 'CERTIFIED'
    assert contract.get_challenge(cid)['counter_snapshot_id'] == upheld['counter_snapshot_id']
    assert contract.verify_evidence_snapshot(upheld['counter_snapshot_id']) is True
    assert contract.verify_evidence_snapshot(record['rebuttal_snapshot_id']) is True
    assert contract.get_challenge_correction(cid)['outcome'] == 'RESTORED'
    assert direct_vm.run_validator() is True


def test_r6_valid_counter_cannot_be_bypassed_by_supporting_rebuttal(direct_vm, direct_deploy):
    contract, sid, cid, original, upheld = _upheld(direct_vm, direct_deploy)
    _correction_mocks(direct_vm, counter_reassessment='CONTRADICTS')
    record = contract.reconsider_upheld_challenge(cid, REBUTTAL, 'Supporting evidence alone is not enough')
    assert record['outcome'] == 'NOT_RESTORED'
    assert contract.get_spec(sid)['revision'] == 2
    assert contract.get_spec(sid)['effective_certificate_result'] == 'INSUFFICIENT'
    assert record['rebuttal_snapshot_id']
    assert direct_vm.run_validator() is True


def test_r6_other_release_cannot_correct_upheld_challenge(direct_vm, direct_deploy):
    contract, sid, cid, original, upheld = _upheld(direct_vm, direct_deploy)
    _correction_mocks(direct_vm, rebuttal_release_status='MISMATCHES_RELEASE')
    record = contract.reconsider_upheld_challenge(cid, REBUTTAL, 'Wrong release')
    assert record['outcome'] == 'NOT_RESTORED'
    assert contract.get_spec(sid)['effective_certificate_result'] == 'INSUFFICIENT'
    assert direct_vm.run_validator() is True


def test_r6_correction_cannot_be_replayed_after_failed_rebuttal(direct_vm, direct_deploy):
    contract, sid, cid, original, upheld = _upheld(direct_vm, direct_deploy)
    _correction_mocks(direct_vm, counter_reassessment='CONTRADICTS')
    contract.reconsider_upheld_challenge(cid, REBUTTAL, 'Unconvincing evidence')
    assert direct_vm.run_validator() is True
    with direct_vm.expect_revert('correction already attempted'):
        contract.reconsider_upheld_challenge(cid, 'https://other-rebuttal.example/release', 'Try again')


def test_r6_validator_rejects_changed_rebuttal_evidence(direct_vm, direct_deploy):
    contract, sid, cid, original, upheld = _upheld(direct_vm, direct_deploy)
    _correction_mocks(direct_vm)
    contract.reconsider_upheld_challenge(cid, REBUTTAL, 'New rebuttal for same release')
    direct_vm.clear_mocks()
    mock_pinned_publisher(direct_vm, 'MUTATED correction bytes',
                          role='CORRECTION', repo='ReviewOrg/release-rebuttal')
    direct_vm.mock_llm(
        r'PROOFSPEC_CHALLENGE_CORRECTION_V1',
        llm_json(rebuttal_assessment='SUPPORTS', rebuttal_release_status='MATCHES_RELEASE',
                 counter_reassessment='IRRELEVANT',
                 counter_release_reassessment='MATCHES_RELEASE',
                 rationale='Counter was misclassified'),
    )
    assert direct_vm.run_validator() is False


def test_r6_unavailable_rebuttal_does_not_change_certificate(direct_vm, direct_deploy):
    contract, sid, cid, original, upheld = _upheld(direct_vm, direct_deploy)
    mock_pinned_publisher(direct_vm, '', role='CORRECTION', repo='ReviewOrg/release-rebuttal')
    record = contract.reconsider_upheld_challenge(cid, REBUTTAL, 'Source is unavailable')
    assert record['outcome'] == 'NOT_RESTORED'
    assert record['rebuttal_snapshot_id'] == ''
    assert contract.get_spec(sid)['effective_certificate_result'] == 'INSUFFICIENT'
    assert direct_vm.run_validator() is True
