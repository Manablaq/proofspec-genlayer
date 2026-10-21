"""R8 real in-consensus publisher gate (stub of GenLayer network, not live finality)."""
import hashlib
import json
import pytest
from test_proofspec_stub_runtime import make_contract, seed_directional_evaluated_spec, StubUserError
from test_publisher_attestation_stub import REPO, OID, URL, BODY, mock_api, stub_consensus


def challenge_case(*, protected=True, manifest_change=None, content=BODY, assessor='CONTRADICTS'):
    m, env, c = make_contract()
    sid = seed_directional_evaluated_spec(c, m)
    spec = c.get_spec(sid)
    criterion = spec['criteria'][0]
    cid = c.open_challenge(sid, 1, URL, 'Exact-release challenge')
    digest = hashlib.sha256(BODY.encode()).hexdigest()
    evidence = {
        'spec_id': int(sid), 'criterion_id': 1, 'source_role': m.COUNTER,
        'status': m.EVIDENCE_AVAILABLE, 'source_status': m.SOURCE_AVAILABLE,
        'url': URL, 'host': 'raw.githubusercontent.com',
        'snapshot_id': m._snapshot_id(int(sid), 1, m.COUNTER, URL, digest),
        'content_sha256': digest, 'content_length': len(BODY), 'content': BODY,
    }
    routes = mock_api(m, spec, criterion, evidence, protected=protected,
                      manifest_change=manifest_change, content=content)
    original = c.get_evidence_snapshot(criterion['primary_snapshot_id'])
    routes[original['url']] = original['content']
    m.gl.nondet.web.render = lambda url, mode='text': routes[url]
    m.gl.nondet.exec_prompt = lambda *_args, **_kwargs: {
        'counter_assessment': assessor,
        'counter_release_status': m.VERSION_MATCHES_RELEASE,
        'counter_version_status': m.VERSION_NOT_APPLICABLE,
        'rationale': 'Exact release contradiction',
    }
    stub_consensus(m)
    return m, c, sid, cid, routes


def test_r8_verified_publisher_is_mandatory_for_upheld_challenge():
    m,c,sid,cid,_=challenge_case()
    result=c.resolve_challenge(cid)
    assert result['challenge_outcome']==m.CHALLENGE_UPHELD
    assert result['counter_publisher_authority_status']=='GITHUB_PROTECTED_MAIN_PINNED_EVIDENCE_MANIFEST_VERIFIED'
    assert result['counter_publisher_proof']['independent_authority_verified'] is False
    assert result['counter_admissibility_reason']=='EXACT_RELEASE_AND_GITHUB_PUBLISHER_PROOF_VERIFIED'
    assert c.get_spec(sid)['effective_certificate_result']==m.INSUFFICIENT
    assert c.get_decision_revision(sid,2)['effective_certificate_result']==m.INSUFFICIENT


@pytest.mark.parametrize('config',[
    {'protected':False},
    {'manifest_change':{'evidence_sha256':'a'*64}},
    {'manifest_change':{'criterion_sha256':'a'*64}},
    {'manifest_change':{'publisher_wallet':'invalid'}},
    {'content':'altered after snapshot'},
])
def test_r8_false_authority_never_downgrades_certificate(config):
    m,c,sid,cid,_=challenge_case(**config)
    with pytest.raises((StubUserError, ValueError, AssertionError, KeyError)):
        c.resolve_challenge(cid)
    assert c.get_spec(sid)['effective_certificate_result']==m.CERTIFIED
    assert c.get_spec(sid)['revision']==1
    assert c.get_challenge(cid)['state']==m.CHALLENGE_PENDING


def test_r8_rejected_counter_does_not_require_publisher_verification():
    m,c,sid,cid,routes=challenge_case(protected=False,assessor='SUPPORTS')
    outcome=c.resolve_challenge(cid)
    assert outcome['challenge_outcome']==m.CHALLENGE_REJECTED
    assert outcome['counter_publisher_proof'] is None
    assert c.get_spec(sid)['effective_certificate_result']==m.CERTIFIED


def test_r8_validator_rejects_changed_manifest_after_leader():
    m,c,sid,cid,routes=challenge_case()
    orig=m.gl.vm.run_nondet
    def disagree(leader,validator):
        result=leader()
        manifest_url=f'https://raw.githubusercontent.com/{REPO}/{OID}/.proofspec/evidence-authority.json'
        manifest=json.loads(routes[manifest_url]);manifest['publisher_wallet']='0x'+'3'*40
        routes[manifest_url]=json.dumps(manifest)
        proposal=m.gl.vm.Return();proposal.calldata=result
        assert validator(proposal) is False
        raise StubUserError('validator rejected changed publisher proof')
    m.gl.vm.run_nondet=disagree
    with pytest.raises(StubUserError,match='validator rejected'):
        c.resolve_challenge(cid)
    assert c.get_spec(sid)['effective_certificate_result']==m.CERTIFIED


def correction_case(*, protected=True, manifest_change=None, content=BODY, counter_reassessment='IRRELEVANT'):
    # This fixture models a previously upheld, immutable historical challenge.
    from test_proofspec_stub_runtime import _r6_seed_upheld
    m, env, c, sid, cid = _r6_seed_upheld()
    spec = c.get_spec(sid)
    criterion = spec['criteria'][0]
    digest = hashlib.sha256(BODY.encode()).hexdigest()
    evidence = {
        'spec_id': int(sid), 'criterion_id': 1, 'source_role': m.CORRECTION,
        'status': m.EVIDENCE_AVAILABLE, 'source_status': m.SOURCE_AVAILABLE,
        'url': URL, 'host':'raw.githubusercontent.com',
        'snapshot_id':m._snapshot_id(int(sid),1,m.CORRECTION,URL,digest),
        'content_sha256':digest,'content_length':len(BODY),'content':BODY,
    }
    routes=mock_api(m,spec,criterion,evidence,protected=protected,
                    manifest_change=manifest_change,content=content)
    m.gl.nondet.web.render=lambda url,mode='text':routes[url]
    m.gl.nondet.exec_prompt=lambda *_args,**_kwargs: {
        'rebuttal_assessment':'SUPPORTS',
        'rebuttal_release_status':'MATCHES_RELEASE',
        'counter_reassessment':counter_reassessment,
        'counter_release_reassessment':'MATCHES_RELEASE',
        'rationale':'Rebuttal proves the original counter was irrelevant for exact release',
    }
    stub_consensus(m)
    return m,c,sid,cid


def test_r8_verified_publisher_required_before_correction_restores():
    m,c,sid,cid=correction_case()
    record=c.reconsider_upheld_challenge(cid,URL,'Correct exact release assessment')
    assert record['outcome']=='RESTORED'
    assert record['publisher_authority_status']=='GITHUB_PROTECTED_MAIN_PINNED_EVIDENCE_MANIFEST_VERIFIED'
    assert record['publisher_proof']['role']==m.CORRECTION
    assert record['publisher_proof']['independent_authority_verified'] is False
    assert c.get_spec(sid)['effective_certificate_result']==m.CERTIFIED
    assert c.get_decision_revision(sid,2)['effective_certificate_result']==m.INSUFFICIENT
    assert c.get_decision_revision(sid,3)['effective_certificate_result']==m.CERTIFIED


@pytest.mark.parametrize('config',[
    {'protected':False},
    {'manifest_change':{'evidence_sha256':'b'*64}},
    {'manifest_change':{'role':'COUNTER'}},
    {'content':'modified rebuttal source'},
])
def test_r8_unverified_rebuttal_cannot_restore(config):
    m,c,sid,cid=correction_case(**config)
    with pytest.raises((StubUserError, ValueError, AssertionError, KeyError)):
        c.reconsider_upheld_challenge(cid,URL,'Attempt restore')
    assert c.get_spec(sid)['effective_certificate_result']==m.INSUFFICIENT
    assert c.get_spec(sid)['revision']==2
    assert not c.challenge_corrections


def test_r8_negative_correction_never_requires_github_proof():
    m,c,sid,cid=correction_case(protected=False,counter_reassessment='CONTRADICTS')
    record=c.reconsider_upheld_challenge(cid,URL,'Rebuttal does not overturn challenge')
    assert record['outcome']=='NOT_RESTORED'
    assert record['publisher_proof'] is None
    assert c.get_spec(sid)['effective_certificate_result']==m.INSUFFICIENT


def test_r8_correction_accepts_distinct_github_repository_on_same_raw_host():
    m,c,sid,cid=correction_case()
    # The original challenge was from a different pinned repository that
    # shares raw.githubusercontent.com as a physical host.
    challenge=c.get_challenge(cid)
    original_counter_url=(
        'https://raw.githubusercontent.com/AnotherOrg/other-evidence/'
        + OID + '/evidence/counter.txt'
    )
    original_counter=c.get_evidence_snapshot(challenge['counter_snapshot_id'])
    original_counter['url']=original_counter_url
    original_counter['host']='raw.githubusercontent.com'
    original_counter['snapshot_id']=m._snapshot_id(sid,1,m.COUNTER,original_counter_url,original_counter['content_sha256'])
    assert m._valid_snapshot_record(original_counter)
    c.evidence_snapshots[original_counter['snapshot_id']]=m._compact_json(original_counter)
    challenge['counter_url']=original_counter_url
    challenge['counter_host']='raw.githubusercontent.com'
    challenge['counter_snapshot_id']=original_counter['snapshot_id']
    c.challenges[cid]=m._compact_json(challenge)
    record=c.reconsider_upheld_challenge(cid,URL,'Correction from independent GitHub repository route')
    assert record['outcome']=='RESTORED'
    assert c.get_spec(sid)['effective_certificate_result']==m.CERTIFIED
    assert m._source_route_identity(original_counter_url)!=m._source_route_identity(URL)


def test_r8_same_github_repository_different_commit_or_path_rejected():
    m,c,sid,cid=correction_case()
    challenge=c.get_challenge(cid)
    challenge['counter_url']=(
        'https://raw.githubusercontent.com/'+REPO+'/'+'a'*40+'/other-claim.txt'
    )
    challenge['counter_host']='raw.githubusercontent.com'
    c.challenges[cid]=m._compact_json(challenge)
    with pytest.raises(StubUserError,match='distinct source host'):
        c.reconsider_upheld_challenge(cid,URL,'Same publisher repository is not distinct')
