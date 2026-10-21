#!/bin/zsh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="62589f216adc3041c2f88b65191cd5afd12c7f5d"
CONTRACT="c37479737913eb65e9585a403ae308c2a8395433895fa80d3c14a6b835fd4816"

cd "$ROOT"
echo '===== PROOFSPEC R16 FRONTEND RELEASE CHECKER ====='

BASE_COMMIT="$(git merge-base "$BASE" HEAD)"
test "$BASE_COMMIT" = "$BASE" || { echo 'STOP=R17_WRONG_HISTORY'; exit 1; }
BRANCH="$(git branch --show-current)"
case "$BRANCH" in
  fix/proofspec-reviewer-r1|main) ;;
  *) echo 'STOP=R17_UNEXPECTED_BRANCH'; exit 1 ;;
esac
if test "$(git rev-parse HEAD)" = "$BASE"; then
  test "$BRANCH" = 'fix/proofspec-reviewer-r1' || { echo 'STOP=R17_BASE_BRANCH_NOT_RELEASE_WORKTREE'; exit 1; }
fi

test -x "$ROOT/.venv/bin/python" || { echo 'STOP=R17_PINNED_PYTHON_MISSING'; exit 1; }
PYTHON="$ROOT/.venv/bin/python"
PYTHONDONTWRITEBYTECODE=1 "$PYTHON" -B - <<'PYCHECK'
from pathlib import Path
import hashlib,sys
root=Path.cwd()
expected={'contracts/proofspec.py': 'c37479737913eb65e9585a403ae308c2a8395433895fa80d3c14a6b835fd4816', 'frontend/components/ProofSpecProvider.tsx': '98ed36ee0a9378c53d3017ddebebd2592769ef3c9448fa9374c5c199d608d444', 'frontend/components/SpecClient.tsx': '5f930c07a1794197015fcfa5e2944a8734ebe680003dff89a8c4b7082cb08840', 'frontend/components/WriteReviewDialog.tsx': 'dcf10abe807211540a4c3b1c9e0126eb1b543516701799ab15c23455982fce4d', 'frontend/lib/gateway.ts': '704a094c0a47979dca57438096ca4afd28a11cc52def475efc3e2cfd3bb8a2f8', 'frontend/lib/types.ts': '641fcbca51e6b2cf4c397ff7cde40f318531d137ce864a09d0f8896f0c5c75cd', 'frontend/lib/write-verification.ts': '56ecc6507eb5baba05748a2da145455f3ae7b7ace8dc1f496da5f4fc1f240960', 'frontend/tests/unit/write-verification.test.ts': '9f41557915062fc724d40e87e73dbc2d8d6e5da35a1e58d9fa821cec0ad3911a', 'tests/stub_runtime/test_proofspec_stub_runtime.py': '5e5702190988e168833e85f2801181f94a56778899ce50f3dc0e9954893e67d3', 'tests/stub_runtime/test_publisher_attestation_stub.py': 'e30247a4ffe1a209d428e628bd4954d26d9f779a3e9632d388b9954a4776f736', 'tests/stub_runtime/test_publisher_enforcement_stub.py': '2647aad133df59903515ecfc62e69fca55ed4d050ccbce0b6a7ab06a8a5c417e', 'tests/test_contract_static.py': 'da8a71e657f656842a9620b3ccdbc108e129aad0a2d4e19b2219c0f3aa7a4ef0', 'tests/test_proofspec_challenge_capacity_direct.py': 'c8488f98f23d002619f699bdbc6e5b07f80cc1bd4565db66df6949a38dc55aaa', 'tests/test_proofspec_challenge_correction_direct.py': 'aaf4be7fc54f1c9aa83543087ad55e49165ad63dd6efe4e14f07eb80199c1810', 'tests/test_proofspec_counter_release_admissibility_direct.py': '56892ea2914d4efefcfc1de150024e5cd977fe278b23953ed5114aa3c04ada54', 'tests/test_proofspec_direct.py': 'b1ed3793ee695c3633f71ddedb51446233f5eca756358611d63f07821b91b505', 'tests/test_proofspec_publisher_attestation_direct.py': '8fdfddaefd87a70c11f030d996c5f3cd249daf24be1f6020d2e0a7c8354411fa', 'tests/test_proofspec_publisher_enforcement_direct.py': 'fd4a6a0e9ec666d0b4d7b8e0f9b47e2f3c438cd95533ba7efb428f4191771a64', 'tests/test_proofspec_reconsideration_direct.py': '2c544025be65031f7e3f5ae6bfc3c50c673440165076228b4f2b0ad16c7a9880', 'tests/test_proofspec_release_provenance_direct.py': '221883aa0e77f67ea5562f3d355619aecfd861e59892acff8c5b688ee0a5a31f', 'tests/test_proofspec_repository_authority_direct.py': 'e4a21f05acafa3a2ee1301bfdc3e7e4981e5e37fa73a58cf1ad423a3365ee4ec'}
for name, digest in sorted(expected.items()):
  p=root/name
  if not p.is_file() or p.is_symlink():
    sys.exit('STOP=R17_SOURCE_MISSING_OR_SYMLINK:'+name)
  if hashlib.sha256(p.read_bytes()).hexdigest()!=digest:
    sys.exit('STOP=R17_SOURCE_HASH_MISMATCH:'+name)
print('R17_R16_21_SOURCE_HASHES=PASS')
print('R17_R8_CONTRACT_SHA256=PASS')
PYCHECK

# Ensure the test harness has not been changed to use a real wallet or RPC.
test "$(git hash-object frontend/playwright.config.ts)" = '4890b2d94f69983bbe2ab0fedf286cfc60041341' || { echo 'STOP=R17_MOCK_HARNESS_MODIFIED'; exit 1; }
test "$(git hash-object frontend/app/api/mock-rpc/route.ts)" = '9d8d07e80a613152a5d46301ce451a47597f3981' || { echo 'STOP=R17_MOCK_ROUTE_MODIFIED'; exit 1; }

test "$(node --version)" = 'v24.20.0' || { echo 'STOP=R17_NODE_VERSION'; exit 1; }
test "$(npm --version)" = '11.19.0' || { echo 'STOP=R17_NPM_VERSION'; exit 1; }

cd "$ROOT/frontend"
node <<'JSLOCK'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json','utf8'));
if(lock.lockfileVersion!==3 || !lock.packages?.[''])throw new Error('STOP=R17_LOCKFILE_INVALID');
const expected={
  dependencies:{'genlayer-js':'2.0.0-rc.1','next':'16.4.2','react':'19.3.1','react-dom':'19.3.1'},
  devDependencies:{'@playwright/test':'1.64.0','@types/node':'24.19.2','@types/react':'19.2.17','@types/react-dom':'19.2.3','eslint':'9.39.1','eslint-config-next':'16.4.2','typescript':'5.9.3','vitest':'5.0.4'}
};
for(const [kind, pins] of Object.entries(expected)){
  if(JSON.stringify(Object.keys(pkg[kind]||{}).sort())!==JSON.stringify(Object.keys(pins).sort()))throw Error('STOP=R17_DEPENDENCY_SET:'+kind);
  for(const [name,version] of Object.entries(pins)){
    if(pkg[kind][name]!==version || lock.packages[''][kind]?.[name]!==version)throw Error('STOP=R17_DEPENDENCY_PIN:'+name);
  }
}
console.log('R17_DEPENDENCY_AND_LOCK_PINS=PASS');
JSLOCK
npm ls --depth=0
echo 'R17_INSTALLED_DEPS=PASS'
npm run typecheck
echo 'R17_TYPECHECK=PASS'
npm run lint
echo 'R17_LINT=PASS'
npm run test:unit
echo 'R17_UNIT_TESTS=PASS'
npm run build
echo 'R17_PRODUCTION_BUILD=PASS'
npm run test:e2e
echo 'R17_THREE_BROWSER_E2E=PASS'
npm audit --omit=dev --audit-level=high
echo 'R17_PRODUCTION_DEPENDENCY_AUDIT=PASS'
echo 'R17_FRONTEND_LOCAL_CERTIFICATION=PASS'
echo 'R17_NEW_R8_DEPLOYMENT=NOT_PERFORMED'
echo 'R17_GIT_COMMITS_PUSHES=0'
echo 'R17_VERCEL_MUTATIONS=0'
echo 'R17_BLOCKCHAIN_WRITES=0'
echo 'FINAL_RC=0'
