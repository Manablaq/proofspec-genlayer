#!/bin/zsh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"

EXPECTED_HEAD="803826a9090fd90b42e6fdae85cc712c50175d76"
EXPECTED_CONTRACT_SHA256="fea208c2f7e840b293cc274a0dc814377f6c86723c772d7e403bd9721e6ee1e9"
EXPECTED_NODE="v24.20.0"
EXPECTED_NPM="11.19.0"

cd "$ROOT"

echo "===== PROOFSPEC PROGRESS 4 FRONTEND LOCAL CERTIFICATION ====="

HEAD_NOW="$(git rev-parse HEAD)"
CONTRACT_SHA="$(shasum -a 256 contracts/proofspec.py | awk '{print $1}')"

echo "EXPECTED_HEAD=$EXPECTED_HEAD"
echo "ACTUAL_HEAD=$HEAD_NOW"
echo "EXPECTED_CONTRACT_SHA256=$EXPECTED_CONTRACT_SHA256"
echo "ACTUAL_CONTRACT_SHA256=$CONTRACT_SHA"

BRANCH_NOW="$(git branch --show-current)"
test "$BRANCH_NOW" = "main" || {
  echo "STOP=PROGRESS4_BRANCH_MISMATCH"
  exit 1
}

if test "$HEAD_NOW" = "$EXPECTED_HEAD"; then
  echo "PROGRESS4_HEAD_GATE=FROZEN_BASE_PASS"
else
  HEAD_PARENT_LINE="$(git rev-list --parents -n 1 HEAD)"
  test "$HEAD_PARENT_LINE" = "$HEAD_NOW $EXPECTED_HEAD" || {
    echo "STOP=PROGRESS4_NOT_IMMEDIATE_RELEASE_COMMIT"
    exit 1
  }
  echo "PROGRESS4_HEAD_GATE=IMMEDIATE_RELEASE_COMMIT_PASS"
fi

test "$CONTRACT_SHA" = "$EXPECTED_CONTRACT_SHA256" || {
  echo "STOP=PROGRESS4_CONTRACT_HASH_MISMATCH"
  exit 1
}

NODE_NOW="$(node --version)"
NPM_NOW="$(npm --version)"

echo "EXPECTED_NODE_VERSION=$EXPECTED_NODE"
echo "ACTUAL_NODE_VERSION=$NODE_NOW"
echo "EXPECTED_NPM_VERSION=$EXPECTED_NPM"
echo "ACTUAL_NPM_VERSION=$NPM_NOW"

test "$NODE_NOW" = "$EXPECTED_NODE" || {
  echo "STOP=NODE_VERSION_MISMATCH"
  exit 1
}

test "$NPM_NOW" = "$EXPECTED_NPM" || {
  echo "STOP=NPM_VERSION_MISMATCH"
  exit 1
}

cd "$FRONTEND"

test -f package-lock.json || {
  echo "STOP=PACKAGE_LOCK_MISSING"
  exit 1
}

node <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const expected = {
  dependencies: {
    "genlayer-js": "2.0.0-rc.1",
    "next": "16.4.2",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  },
  devDependencies: {
    "@playwright/test": "1.64.0",
    "@types/node": "24.19.2",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "eslint": "9.39.1",
    "eslint-config-next": "16.4.2",
    "typescript": "5.9.3",
    "vitest": "5.0.4"
  }
};

for (const section of Object.keys(expected)) {
  const actual = pkg[section] || {};
  const wanted = expected[section];
  const actualKeys = Object.keys(actual).sort();
  const wantedKeys = Object.keys(wanted).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(wantedKeys)) {
    throw new Error(`STOP=DIRECT_DEPENDENCY_SET_MISMATCH:${section}`);
  }
  for (const [name, version] of Object.entries(wanted)) {
    if (actual[name] !== version) {
      throw new Error(
        `STOP=DIRECT_DEPENDENCY_VERSION_MISMATCH:${name}:expected=${version}:actual=${actual[name]}`
      );
    }
  }
}
console.log("PROGRESS4_DIRECT_DEPENDENCY_GATE=PASS");
NODE

node <<'NODE'
const fs = require("fs");
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
if (lock.lockfileVersion !== 3) {
  throw new Error(`STOP=PACKAGE_LOCK_VERSION_MISMATCH:${lock.lockfileVersion}`);
}
const root = lock.packages?.[""];
if (!root) throw new Error("STOP=PACKAGE_LOCK_ROOT_MISSING");

const expected = {
  dependencies: {
    "genlayer-js": "2.0.0-rc.1",
    "next": "16.4.2",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  },
  devDependencies: {
    "@playwright/test": "1.64.0",
    "@types/node": "24.19.2",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "eslint": "9.39.1",
    "eslint-config-next": "16.4.2",
    "typescript": "5.9.3",
    "vitest": "5.0.4"
  }
};

for (const [section, values] of Object.entries(expected)) {
  for (const [name, version] of Object.entries(values)) {
    if (root[section]?.[name] !== version) {
      throw new Error(`STOP=LOCK_ROOT_VERSION_MISMATCH:${name}`);
    }
  }
}
console.log("PROGRESS4_PACKAGE_LOCK_ROOT_GATE=PASS");
NODE

npm ls --depth=0
echo "PROGRESS4_INSTALLED_DEPENDENCY_GATE=PASS"

npm run typecheck
echo "PROGRESS4_TYPECHECK_GATE=PASS"

npm run lint
echo "PROGRESS4_LINT_GATE=PASS"

npm run test:unit
echo "PROGRESS4_UNIT_WRITE_SAFETY_GATE=PASS"

npm run build
echo "PROGRESS4_PRODUCTION_BUILD_GATE=PASS"

npm run test:e2e
echo "PROGRESS4_BROWSER_MATRIX_GATE=PASS"

echo "PROOFSPEC_PROGRESS4_FRONTEND_LOCAL_CERTIFICATION=PASS"
echo "LIVE_GENLAYER_CONTRACT_CALL_PERFORMED=NO"
echo "LIVE_BLOCKCHAIN_WRITE_PERFORMED=NO"
echo "REAL_WALLET_SIGNATURE_PERFORMED=NO"
echo "VERCEL_MUTATION_PERFORMED=NO"
