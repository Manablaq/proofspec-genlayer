"""Offline adversarial proof tests; no live GitHub or blockchain writes."""
import hashlib
import json

import pytest

from test_proofspec_stub_runtime import make_contract, seed_directional_evaluated_spec, StubUserError

REPO = 'SourceOrg/independent-evidence'
OID = '0123456789abcdef0123456789abcdef01234567'
HEAD = 'f' * 40
FILE = 'findings/evidence.txt'
URL = f'https://raw.githubusercontent.com/{REPO}/{OID}/{FILE}'
ROOT = f'https://api.github.com/repos/{REPO}'
BODY = 'This precise release fails wallet disconnect.'
WALLET = '0x' + '2'*40


def prepare(*, correct_role='COUNTER'):
    m, env, c = make_contract()
    sid = seed_directional_evaluated_spec(c, m)
    spec = c.get_spec(sid)
    criterion = spec['criteria'][0]
    digest = hashlib.sha256(BODY.encode()).hexdigest()
    evidence = {
        'spec_id': int(sid), 'criterion_id': 1, 'source_role': correct_role,
        'status': m.EVIDENCE_AVAILABLE, 'source_status': m.SOURCE_AVAILABLE,
        'url': URL, 'host': 'raw.githubusercontent.com',
        'snapshot_id': m._snapshot_id(int(sid), 1, correct_role, URL, digest),
        'content_sha256': digest, 'content_length': len(BODY), 'content': BODY,
    }
    snapshot = m._snapshot_record(evidence)
    c.evidence_snapshots[snapshot['snapshot_id']] = m._compact_json(snapshot)
    c.challenges[1] = m._compact_json({
        'spec_id': int(sid), 'criterion_id': 1,
        'state': m.CHALLENGE_RESOLVED, 'counter_snapshot_id': snapshot['snapshot_id'],
    })
    if correct_role == m.CORRECTION:
        c.challenge_corrections[1] = m._compact_json({'rebuttal_snapshot_id': snapshot['snapshot_id']})
    return m, c, spec, criterion, evidence


def mock_api(m, spec, criterion, evidence, *, protected=True, ancestry=True,
             manifest_change=None, content=BODY):
    manifest = {
        'schema': m.GITHUB_EVIDENCE_AUTHORITY_SCHEMA,
        'repository': REPO,
        'commit_oid': OID,
        'evidence_path': FILE,
        'evidence_sha256': evidence['content_sha256'],
        'release_ref': spec['release_ref'],
        'criterion_sha256': m._sha256_text(criterion['requirement']),
        'publisher_wallet': WALLET,
        'role': evidence['source_role'],
    }
    if manifest_change:
        manifest.update(manifest_change)
    branch = {'name': 'main', 'protected': protected, 'commit': {'sha': HEAD}}
    compare = {'status':'ahead' if ancestry else 'behind',
               'base_commit': {'sha': OID},
               'merge_base_commit': {'sha': OID if ancestry else 'a'*40}}
    routes = {
        ROOT + '/branches/main': json.dumps(branch),
        ROOT + '/compare/' + OID + '...' + HEAD: json.dumps(compare),
        f'https://raw.githubusercontent.com/{REPO}/{OID}/.proofspec/evidence-authority.json': json.dumps(manifest),
        URL: content,
    }
    def render(url, mode):
        assert mode == 'text'
        if url not in routes:
            raise AssertionError('Unexpected external destination:' + url)
        return routes[url]
    m.gl.nondet.web.render = render
    return routes


def stub_consensus(m):
    def run(leader, validator):
        result = leader()
        envelope = m.gl.vm.Return()
        envelope.calldata = result
        assert validator(envelope) is True
        return result
    m.gl.vm.run_nondet = run


def test_r7_verified_counter_publisher_proof_does_not_rewrite_decision():
    m, c, spec, criterion, evidence = prepare()
    mock_api(m, spec, criterion, evidence)
    stub_consensus(m)
    old_spec = c.get_spec(1)
    record = c.attest_github_evidence_publisher(1, 'COUNTER')
    assert record['publisher_proof']['publisher_wallet'] == WALLET
    assert record['publisher_proof']['independent_authority_verified'] is False
    assert record['effect_on_certificate'] == 'NONE'
    assert c.get_publisher_attestation(1, 'COUNTER') == record
    assert c.get_spec(1) == old_spec
    with pytest.raises(StubUserError, match='already recorded'):
        c.attest_github_evidence_publisher(1, 'COUNTER')


def test_r7_supported_correction_role_has_separate_proof():
    m, c, spec, criterion, evidence = prepare(correct_role='CORRECTION')
    mock_api(m, spec, criterion, evidence)
    stub_consensus(m)
    record = c.attest_github_evidence_publisher(1, 'CORRECTION')
    assert record['publisher_proof']['role'] == 'CORRECTION'
    with pytest.raises(StubUserError, match='does not exist'):
        c.get_publisher_attestation(1, 'COUNTER')


@pytest.mark.parametrize('manifest_change', [
    {'evidence_sha256': 'a'*64},
    {'release_ref': 'different-release'},
    {'criterion_sha256': 'f'*64},
    {'evidence_path': 'some/other/file'},
    {'repository': 'OtherOrg/other'},
    {'commit_oid': 'a'*40},
    {'publisher_wallet': 'not-a-wallet'},
    {'role': 'CORRECTION'},
    {'schema': 'unknown'},
    {'unexpected_field': 'x'},
])
def test_r7_forged_manifest_fails_closed(manifest_change):
    m, c, spec, criterion, evidence = prepare()
    mock_api(m, spec, criterion, evidence, manifest_change=manifest_change)
    stub_consensus(m)
    with pytest.raises(StubUserError):
        c.attest_github_evidence_publisher(1, 'COUNTER')
    with pytest.raises(StubUserError, match='does not exist'):
        c.get_publisher_attestation(1, 'COUNTER')


@pytest.mark.parametrize('protected,ancestry,content', [
    (False, True, BODY),
    (True, False, BODY),
    (True, True, 'changed source bytes'),
])
def test_r7_untrusted_branch_or_changed_bytes_cannot_attest(protected, ancestry, content):
    m, c, spec, criterion, evidence = prepare()
    mock_api(m, spec, criterion, evidence, protected=protected, ancestry=ancestry, content=content)
    stub_consensus(m)
    with pytest.raises(StubUserError):
        c.attest_github_evidence_publisher(1, 'COUNTER')


def test_r7_mutable_github_url_rejected():
    m, c, spec, criterion, evidence = prepare()
    for url in (
        f'https://raw.githubusercontent.com/{REPO}/main/{FILE}',
        f'https://raw.githubusercontent.com/{REPO}/{OID}/../secret.txt',
        f'https://github.com/{REPO}/blob/{OID}/{FILE}',
        f'https://raw.githubusercontent.com/{REPO}/{OID}/.proofspec/evidence-authority.json',
    ):
        with pytest.raises(StubUserError):
            m._pinned_raw_github_locator(url)


def test_r7_unresolved_challenge_and_missing_correction_fail():
    m, c, spec, criterion, evidence = prepare()
    mock_api(m, spec, criterion, evidence)
    stub_consensus(m)
    with pytest.raises(StubUserError):
        c.attest_github_evidence_publisher(1, 'CORRECTION')
    challenge = c.get_challenge(1)
    challenge['state'] = m.CHALLENGE_PENDING
    c.challenges[1] = m._compact_json(challenge)
    with pytest.raises(StubUserError):
        c.attest_github_evidence_publisher(1, 'COUNTER')


def test_r7_no_auth_from_unpinned_source_or_bad_role():
    m, c, spec, criterion, evidence = prepare()
    with pytest.raises(StubUserError):
        m._pinned_raw_github_locator('https://counter.example/test')
    with pytest.raises(StubUserError):
        c.attest_github_evidence_publisher(1, 'PRIMARY')
