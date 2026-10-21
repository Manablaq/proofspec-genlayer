"""Fail-closed GitHub release authorization checks in supported Direct Mode.

GitHub API and raw file requests are explicitly mocked. This does not prove
that GenVM can reach public GitHub in a live network; live verification is
required separately before treating the new mode as production-certified.
"""
import json

from test_proofspec_direct import create_spec, criterion, deploy

OID = '0123456789abcdef0123456789abcdef01234567'
HEAD = 'fedcba9876543210fedcba9876543210fedcba98'
REPO = 'ExampleOrg/example-repository'
RELEASE = f'https://github.com/{REPO}/commit/{OID}'
API = f'https://api.github.com/repos/{REPO}'
BRANCH = f'{API}/branches/main'
COMPARE = f'{API}/compare/{OID}...{HEAD}'
MANIFEST = f'https://raw.githubusercontent.com/{REPO}/{OID}/.proofspec/authority.json'


def setup(direct_deploy):
    contract = deploy(direct_deploy)
    sid = create_spec(contract, [criterion()], release_ref=RELEASE)
    wallet = contract.get_spec(sid)['submitter']
    return contract, sid, wallet


def fixtures(direct_vm, wallet, *, protected=True, compare='ahead', manifest_wallet=None):
    branch = {'name': 'main', 'protected': protected, 'commit': {'sha': HEAD}}
    comparison = {
        'status': compare,
        'base_commit': {'sha': OID},
        'merge_base_commit': {'sha': OID if compare in ('ahead', 'identical') else 'a'*40},
    }
    attestation = {
        'schema': 'proofspec-github-protected-main-authority-v1',
        'repository': REPO,
        'maintainer_wallet': wallet if manifest_wallet is None else manifest_wallet,
    }
    direct_vm.mock_web(r'api\.github\.com/repos/ExampleOrg/example-repository/branches/main',
                       {'status': 200, 'body': json.dumps(branch, separators=(',', ':'))})
    direct_vm.mock_web(r'api\.github\.com/repos/ExampleOrg/example-repository/compare/',
                       {'status': 200, 'body': json.dumps(comparison, separators=(',', ':'))})
    direct_vm.mock_web(r'raw\.githubusercontent\.com/ExampleOrg/example-repository/',
                       {'status': 200, 'body': json.dumps(attestation, separators=(',', ':'))})


def test_r4_legacy_release_has_no_unearned_authority(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    sid = create_spec(contract, [criterion()])
    with direct_vm.expect_revert('Immutable GitHub commit required'):
        contract.authorize_github_release(sid)
    assert contract.get_release_provenance(sid)['maintainer_authorized'] is False


def test_r4_protected_branch_and_immutable_manifest_authorize_wallet(direct_vm, direct_deploy):
    contract, sid, wallet = setup(direct_deploy)
    fixtures(direct_vm, wallet)
    result = contract.authorize_github_release(sid)
    assert result['maintainer_authorized'] is True
    assert result['reference_existence_verified'] is True
    assert result['reference_repo_reachability_verified'] is True
    assert result['assessment_class'] == 'GITHUB_MANIFEST_MAINTAINER_AUTHORIZED_ASSESSMENT'
    assert result['submitter_authority_status'] == 'GITHUB_PROTECTED_MAIN_MANIFEST_VERIFIED'
    assert result['evidence_publisher_authority_status'] == 'UNVERIFIED'
    assert result['github_authority_proof']['branch_head_commit'] == HEAD
    assert result['github_authority_proof']['manifest_url'] == MANIFEST
    assert result['github_authority_proof']['authorized_wallet'] == wallet.lower()
    assert contract.get_release_provenance(sid) == result
    assert contract.get_spec(sid)['state'] == 'PENDING'
    assert direct_vm.run_validator() is True


def test_r4_unprotected_main_is_rejected(direct_vm, direct_deploy):
    contract, sid, wallet = setup(direct_deploy)
    fixtures(direct_vm, wallet, protected=False)
    with direct_vm.expect_revert():
        contract.authorize_github_release(sid)
    assert contract.get_release_provenance(sid)['maintainer_authorized'] is False


def test_r4_unmerged_pr_commit_is_not_authorized(direct_vm, direct_deploy):
    contract, sid, wallet = setup(direct_deploy)
    fixtures(direct_vm, wallet, compare='behind')
    with direct_vm.expect_revert():
        contract.authorize_github_release(sid)
    assert contract.get_release_provenance(sid)['maintainer_authorized'] is False


def test_r4_unrelated_wallet_is_not_authorized(direct_vm, direct_deploy):
    contract, sid, wallet = setup(direct_deploy)
    fixtures(direct_vm, wallet, manifest_wallet='0x'+'a'*40)
    with direct_vm.expect_revert():
        contract.authorize_github_release(sid)
    assert contract.get_release_provenance(sid)['maintainer_authorized'] is False


def test_r4_replay_reauthorization_is_blocked(direct_vm, direct_deploy):
    contract, sid, wallet = setup(direct_deploy)
    fixtures(direct_vm, wallet)
    contract.authorize_github_release(sid)
    assert direct_vm.run_validator() is True
    direct_vm.clear_validators()
    direct_vm.clear_mocks()
    with direct_vm.expect_revert('already recorded'):
        contract.authorize_github_release(sid)


def test_r4_validator_disagrees_on_protected_branch_head(direct_vm, direct_deploy):
    contract, sid, wallet = setup(direct_deploy)
    fixtures(direct_vm, wallet)
    contract.authorize_github_release(sid)
    direct_vm.clear_mocks()
    branch = {'name':'main','protected':True,'commit':{'sha':'a'*40}}
    direct_vm.mock_web(r'api\.github\.com/repos/ExampleOrg/example-repository/branches/main',
                       {'status':200,'body':json.dumps(branch)})
    assert direct_vm.run_validator() is False
