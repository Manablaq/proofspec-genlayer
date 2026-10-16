#!/bin/zsh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON="${PYTHON:-$ROOT/.venv/bin/python}"
EXPECTED_HEAD="803826a9090fd90b42e6fdae85cc712c50175d76"
EXPECTED_CONTRACT_SHA256="fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9"
EXPECTED_DIRECT_REQUIREMENTS_SHA256="9bd25a4d46fade1310d8a1b38c2ed4fa1b0b04e126a1318d5b14d216551e495d"
GENVM_VERSION_EXPECTED="v0.6.0-rc5"

export GENVM_VERSION="$GENVM_VERSION_EXPECTED"
unset GENVM_PREBUILT_DIR

echo "===== PROOFSPEC PROGRESS 3 DIRECT MODE CONSENSUS CERTIFICATION ====="

test -x "$PYTHON" || {
  echo "STOP=VENV_PYTHON_NOT_FOUND"
  exit 1
}

ACTUAL_HEAD="$(git rev-parse HEAD)"
ACTUAL_CONTRACT_SHA256="$(shasum -a 256 contracts/proofspec.py | awk '{print $1}')"
ACTUAL_DIRECT_REQUIREMENTS_SHA256="$(shasum -a 256 requirements-direct.txt | awk '{print $1}')"

echo "EXPECTED_HEAD=$EXPECTED_HEAD"
echo "ACTUAL_HEAD=$ACTUAL_HEAD"
echo "EXPECTED_CONTRACT_SHA256=$EXPECTED_CONTRACT_SHA256"
echo "ACTUAL_CONTRACT_SHA256=$ACTUAL_CONTRACT_SHA256"
echo "EXPECTED_DIRECT_REQUIREMENTS_SHA256=$EXPECTED_DIRECT_REQUIREMENTS_SHA256"
echo "ACTUAL_DIRECT_REQUIREMENTS_SHA256=$ACTUAL_DIRECT_REQUIREMENTS_SHA256"
echo "GENVM_VERSION=$GENVM_VERSION"

BRANCH_NOW="$(git branch --show-current)"
test "$BRANCH_NOW" = "main" || {
  echo "STOP=PROGRESS3_BRANCH_MISMATCH"
  exit 1
}

if test "$ACTUAL_HEAD" = "$EXPECTED_HEAD"; then
  echo "PROGRESS3_HEAD_GATE=FROZEN_BASE_PASS"
else
  HEAD_PARENT_LINE="$(git rev-list --parents -n 1 HEAD)"
  test "$HEAD_PARENT_LINE" = "$ACTUAL_HEAD $EXPECTED_HEAD" || {
    echo "STOP=PROGRESS3_NOT_IMMEDIATE_RELEASE_COMMIT"
    exit 1
  }
  echo "PROGRESS3_HEAD_GATE=IMMEDIATE_RELEASE_COMMIT_PASS"
fi

test "$ACTUAL_CONTRACT_SHA256" = "$EXPECTED_CONTRACT_SHA256" || {
  echo "STOP=PROGRESS3_CONTRACT_HASH_MISMATCH"
  exit 1
}

test "$ACTUAL_DIRECT_REQUIREMENTS_SHA256" = "$EXPECTED_DIRECT_REQUIREMENTS_SHA256" || {
  echo "STOP=PROGRESS3_DIRECT_REQUIREMENTS_HASH_MISMATCH"
  exit 1
}

"$PYTHON" - <<'PY'
import importlib.util
import os
from importlib.metadata import version

expected = {
    "genlayer-test": "0.30.0rc2",
    "genlayer-py": "0.19.0rc2",
    "genvm-linter": "0.11.1rc2",
    "pytest": "8.4.2",
    "pyright": "1.1.408",
    "cloudpickle": "3.1.2",
}
for dist, want in expected.items():
    got = version(dist)
    print(f"{dist}={got}")
    if got != want:
        raise SystemExit(
            f"STOP=TOOLCHAIN_VERSION_MISMATCH package={dist} expected={want} actual={got}"
        )

if os.environ.get("GENVM_VERSION") != "v0.6.0-rc5":
    raise SystemExit(
        f"STOP=GENVM_VERSION_MISMATCH actual={os.environ.get('GENVM_VERSION')}"
    )

for module in ("gltest", "gltest.direct.pytest_plugin", "cloudpickle"):
    spec = importlib.util.find_spec(module)
    print(f"{module}_SPEC={spec}")
    if spec is None:
        raise SystemExit(f"STOP=DIRECT_MODE_MODULE_NOT_FOUND module={module}")

print("PROGRESS3_DIRECT_MODE_IMPORT_GATE=PASS")
print("PROGRESS3_DIRECT_MODE_RUNTIME_GATE=PASS")
print("PROGRESS3_CLOUDPICKLE_GATE=PASS")
PY

PATH="$ROOT/.venv/bin:$PATH" \
PYTHON="$PYTHON" \
"$ROOT/scripts/check_backend.sh"

echo "PROGRESS2_REGRESSION_GATE=PASS"

"$PYTHON" -m py_compile tests/test_proofspec_direct.py
echo "PROGRESS3_TEST_SYNTAX_GATE=PASS"

PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
"$PYTHON" -m pytest \
  -q \
  -p gltest.direct.pytest_plugin \
  -W error::RuntimeWarning \
  tests/test_proofspec_direct.py

echo "PROOFSPEC_DIRECT_MODE_SUITE=PASS"
echo "STRICT_MOCKS_REQUIRED=YES"
echo "UNUSED_RUNTIME_MOCK_WARNINGS_ARE_ERRORS=YES"
echo "PICKLING_VALIDATION_REQUIRED=YES"
echo "CLOUDPICKLE_VERSION=3.1.2"
echo "GENVM_RUNTIME_PIN=v0.6.0-rc5"
echo "REAL_NETWORK_CONTRACT_EXECUTION_PERFORMED=NO"
echo "BLOCKCHAIN_WRITE_PERFORMED=NO"
echo "PROOFSPEC_PROGRESS3_LOCAL_CERTIFICATION=PASS"
