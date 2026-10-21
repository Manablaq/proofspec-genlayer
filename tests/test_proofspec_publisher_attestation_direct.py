"""R7 Direct Mode: validator checks protected-main publisher manifest + source bytes.

No real HTTP; real public GitHub API check and consensus finality still pending.
R7 attestation is independent of certificate state; it is not a gate yet.
"""
import hashlib
import json

from test_proofspec_direct import (
    challenge_payload, evaluate_directional_spec, mock_primary, llm_json,
)

REPO = 'SourceOrg/independent-evidence'
OID = '0123456789abcdef0123456789abcdef01234567'
HEAD = 'f'*40
FILE = 'findings/evidence.txt'
URL = f'https://raw.githubusercontent.com/{REPO}/{OID}/{FILE}'
ROOT = f'https://api.github.com/repos/{REPO}'
BODY = 'For release commit-0123456789abcdef, wallet disconnect is absent.'
WALLET = '0x'+'2'*40


def setup(direct_vm, direct_deploy):
    contract, sid, _ = evaluate_directional_spec(direct_vm, direct_deploy, direction='SUPPORTS')
    cid = contract.open_challenge(sid, 1, URL, 'Counter includes exact release evidence')
    mock_primary(direct_vm, 'ORIGINAL_PRIMARY_EVIDENCE')
    fixtures(direct_vm, contract.get_spec(sid))
    direct_vm.mock_llm(r'PROOFSPEC_CHALLENGE_V1',
                       challenge_payload(counter_assessment='CONTRADICTS',
                                         counter_release_status='MATCHES_RELEASE',
                                         rationale='The pinned source disagrees with the requirement'))
    result = contract.resolve_challenge(cid)
    assert result['challenge_outcome'] == 'UPHELD'
    assert direct_vm.run_validator() is True
    direct_vm.clear_validators()
    direct_vm.clear_mocks()
    return contract, sid, cid


def fixtures(direct_vm, spec, *, protected=True, manifest_change=None, content=BODY):
    branch = {'name': 'main', 'protected': protected, 'commit': {'sha': HEAD}}
    compare = {'status':'ahead', 'base_commit':{'sha':OID}, 'merge_base_commit':{'sha':OID}}
    manifest = {
        'schema': 'proofspec-github-evidence-publisher-v1',
        'repository': REPO,
        'commit_oid': OID,
        'evidence_path': FILE,
        'evidence_sha256': hashlib.sha256(BODY.encode()).hexdigest(),
        'release_ref': spec['release_ref'],
        'criterion_sha256': hashlib.sha256(spec['criteria'][0]['requirement'].encode()).hexdigest(),
        'publisher_wallet': WALLET,
        'role': 'COUNTER',
    }
    if manifest_change:
        manifest.update(manifest_change)
    direct_vm.mock_web(r'api\.github\.com/repos/SourceOrg/independent-evidence/branches/main',
                       {'status':200,'body':json.dumps(branch)})
    direct_vm.mock_web(r'api\.github\.com/repos/SourceOrg/independent-evidence/compare/',
                       {'status':200,'body':json.dumps(compare)})
    direct_vm.mock_web(r'raw\.githubusercontent\.com/SourceOrg/independent-evidence/0123456789abcdef0123456789abcdef01234567/\.proofspec/evidence-authority\.json',
                       {'status':200,'body':json.dumps(manifest)})
    direct_vm.mock_web(r'raw\.githubusercontent\.com/SourceOrg/independent-evidence/0123456789abcdef0123456789abcdef01234567/findings/evidence\.txt',
                       {'status':200,'body':content})


def test_r7_pinned_publisher_proof_is_validated_without_changing_certification(direct_vm, direct_deploy):
    contract, sid, cid = setup(direct_vm, direct_deploy)
    before = contract.get_spec(sid)
    fixtures(direct_vm, before)
    record = contract.attest_github_evidence_publisher(cid, 'COUNTER')
    assert record['effect_on_certificate'] == 'NONE'
    assert record['publisher_proof']['publisher_wallet'] == WALLET
    assert record['publisher_proof']['independent_authority_verified'] is False
    assert contract.get_spec(sid) == before
    assert contract.get_publisher_attestation(cid,'COUNTER') == record
    assert direct_vm.run_validator() is True


def test_r7_wrong_manifest_digest_is_rejected(direct_vm, direct_deploy):
    contract, sid, cid = setup(direct_vm, direct_deploy)
    fixtures(direct_vm, contract.get_spec(sid), manifest_change={'evidence_sha256':'a'*64})
    with direct_vm.expect_revert('manifest not bound'):
        contract.attest_github_evidence_publisher(cid, 'COUNTER')


def test_r7_unprotected_branch_is_rejected(direct_vm, direct_deploy):
    contract, sid, cid = setup(direct_vm, direct_deploy)
    fixtures(direct_vm, contract.get_spec(sid), protected=False)
    with direct_vm.expect_revert('protected-main'):
        contract.attest_github_evidence_publisher(cid, 'COUNTER')


def test_r7_changed_pinned_evidence_bytes_are_rejected(direct_vm, direct_deploy):
    contract, sid, cid = setup(direct_vm, direct_deploy)
    fixtures(direct_vm, contract.get_spec(sid), content='different source bytes')
    with direct_vm.expect_revert('content changed'):
        contract.attest_github_evidence_publisher(cid, 'COUNTER')


def test_r7_validator_catches_changed_publisher_manifest(direct_vm, direct_deploy):
    contract, sid, cid = setup(direct_vm, direct_deploy)
    fixtures(direct_vm, contract.get_spec(sid))
    contract.attest_github_evidence_publisher(cid, 'COUNTER')
    direct_vm.clear_mocks()
    fixtures(direct_vm, contract.get_spec(sid), manifest_change={'publisher_wallet':'0x'+'3'*40})
    assert direct_vm.run_validator() is False
