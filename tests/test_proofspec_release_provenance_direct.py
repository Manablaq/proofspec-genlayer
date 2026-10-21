"""Supported GenLayer Direct Mode tests for truthful, read-only provenance.

No test in this file asserts that GitHub repository control is established.
"""
from test_proofspec_direct import create_spec, create_single_spec, criterion, deploy


def test_r3_legacy_release_reference_never_claims_maintainer_authority(direct_vm, direct_deploy):
    contract, spec_id = create_single_spec(direct_deploy)
    info = contract.get_protocol_info()
    assert info['maintainer_authorization_supported'] is True
    assert info['reference_existence_checked_onchain'] is False
    spec = contract.get_spec(spec_id)
    prov = contract.get_release_provenance(spec_id)
    assert spec['release_provenance'] == prov
    assert prov['assessment_class'] == 'SELF_SUBMITTED_CONSENSUS_ASSESSMENT'
    assert prov['maintainer_authorized'] is False
    assert prov['submitter_authority_status'] == 'UNVERIFIED'
    assert prov['evidence_publisher_authority_status'] == 'UNVERIFIED'
    assert prov['host_diversity_proves_independence'] is False
    assert prov['reference_kind'] == 'OPAQUE_CALLER_SUPPLIED'
    assert prov['reference_format_valid'] is False
    assert prov['reference_existence_verified'] is False
    assert prov['verification_url'] == ''


def test_r3_exact_git_commit_locator_is_explicitly_unverified(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    oid = '0123456789abcdef' * 2 + '01234567'
    release = 'https://github.com/GenLayer/genlayer-js/commit/' + oid
    spec_id = create_spec(contract, [criterion()], release_ref=release)
    prov = contract.get_release_provenance(spec_id)
    assert prov['reference_kind'] == 'GITHUB_CONTENT_ADDRESSED_COMMIT_LOCATOR'
    assert prov['reference_format_valid'] is True
    assert prov['repository'] == 'GenLayer/genlayer-js'
    assert prov['commit_oid'] == oid
    assert prov['verification_url'] == ('https://api.github.com/repos/GenLayer/genlayer-js/commits/' + oid)
    assert prov['reference_existence_verified'] is False
    assert prov['reference_repo_reachability_verified'] is False
    assert prov['maintainer_authorized'] is False
    assert contract.get_spec(spec_id)['release_provenance'] == prov


def test_r3_github_mutable_or_truncated_references_are_rejected(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    bad = [
        'https://github.com/Owner/repository',
        'https://github.com/Owner/repository/tree/main',
        'https://github.com/Owner/repository/commit/main',
        'https://github.com/Owner/repository/commit/1234',
        'https://github.com/Owner/repository/commit/' + 'f'*39,
        'https://github.com/Owner/repository/commit/' + 'g'*40,
        'https://github.com/-Owner/repository/commit/' + 'a'*40,
    ]
    for release in bad:
        with direct_vm.expect_revert():
            create_spec(contract, [criterion()], release_ref=release)
    assert contract.get_spec_count() == 0


def test_r3_no_implicit_github_release_authorization(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    oid = 'a' * 40
    ref = 'https://github.com/OpenAI/internal-repo/commit/' + oid
    spec_id = create_spec(contract, [criterion()], release_ref=ref)
    provenance = contract.get_release_provenance(spec_id)
    assert provenance['maintainer_authorized'] is False
    assert provenance['submitter_authority_status'] == 'UNVERIFIED'
    assert provenance['evidence_publisher_authority_status'] == 'UNVERIFIED'
    assert provenance['host_diversity_proves_independence'] is False
    # A user can cite a namespace in a URL but cannot authenticate control of it.
