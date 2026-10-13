#!/bin/zsh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON="${PYTHON:-$ROOT/.venv/bin/python}"
GENVM_VERSION_EXPECTED="v0.6.0-rc5"
CONTRACT_SHA256_EXPECTED="e13423968e9412aa538f989b86812114d60d029a3e01eceb65fdd1ed557f0984"

export GENVM_VERSION="$GENVM_VERSION_EXPECTED"
export PYTEST_DISABLE_PLUGIN_AUTOLOAD=1

echo "===== PROOFSPEC PROGRESS 2 BACKEND STATIC CERTIFICATION ====="

test -x "$PYTHON" || {
  echo "STOP=PYTHON_NOT_FOUND"
  exit 1
}

"$PYTHON" - <<'PY'
import sys
from importlib.metadata import version

if sys.version_info[:3] != (3, 12, 14):
    raise SystemExit(
        f"STOP=PYTHON_VERSION_MISMATCH expected=3.12.14 actual={sys.version.split()[0]}"
    )

expected = {
    "genlayer-test": "0.30.0rc2",
    "genlayer-py": "0.19.0rc2",
    "genvm-linter": "0.11.1rc2",
    "pytest": "8.4.2",
    "pyright": "1.1.408",
}

for distribution, wanted in expected.items():
    actual = version(distribution)
    print(f"{distribution}={actual}")
    if actual != wanted:
        raise SystemExit(
            f"STOP=TOOLCHAIN_VERSION_MISMATCH package={distribution} expected={wanted} actual={actual}"
        )

print("PINNED_TOOLCHAIN_GATE=PASS")
PY

ACTUAL_CONTRACT_SHA256="$(shasum -a 256 contracts/proofspec.py | awk '{print $1}')"
echo "EXPECTED_CONTRACT_SHA256=$CONTRACT_SHA256_EXPECTED"
echo "ACTUAL_CONTRACT_SHA256=$ACTUAL_CONTRACT_SHA256"

test "$ACTUAL_CONTRACT_SHA256" = "$CONTRACT_SHA256_EXPECTED" || {
  echo "STOP=CONTRACT_SHA256_MISMATCH"
  exit 1
}

echo "CONTRACT_HASH_GATE=PASS"
echo "GENVM_VERSION=$GENVM_VERSION"

"$PYTHON" -m py_compile \
  contracts/proofspec.py \
  tests/test_contract_static.py \
  tests/stub_runtime/test_proofspec_stub_runtime.py

echo "PYTHON_COMPILE_GATE=PASS"

command -v genvm-lint >/dev/null 2>&1 || {
  echo "STOP=GENVM_LINT_NOT_FOUND"
  exit 1
}

genvm-lint typecheck contracts/proofspec.py
echo "GENVM_TYPECHECK_GATE=PASS"

genvm-lint check contracts/proofspec.py
echo "GENVM_STATIC_CHECK_GATE=PASS"

"$PYTHON" -m pytest -q \
  tests/test_contract_static.py \
  tests/stub_runtime/test_proofspec_stub_runtime.py

echo "PROOFSPEC_STATIC_AND_DETERMINISTIC_TESTS=PASS"
echo "PROGRESS3_DIRECT_MODE_CONSENSUS_CERTIFICATION_PERFORMED=NO"
echo "BLOCKCHAIN_WRITE_PERFORMED=NO"
echo "PROOFSPEC_PROGRESS2_BACKEND_LOCAL_CERTIFICATION=PASS"
