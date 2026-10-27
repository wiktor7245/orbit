#!/bin/bash
set -e
source "${REACT_NATIVE_PATH}/scripts/find-node-for-xcode.sh"
export PROJECT_ROOT="$PODS_ROOT/../../"
export CLI_PROJECT="$PROJECT_ROOT/../cli/"

cd $CLI_PROJECT
yarn archive

# Skip codesigning when xcodebuild was invoked with CODE_SIGNING_ALLOWED=NO
# (CI E2E builds — the runner has no Developer ID cert in its keychain).
if [ "${CODE_SIGNING_ALLOWED}" != "NO" ]; then
  if security find-identity -v -p codesigning | grep -q "650 Industries, Inc. (C8D8QTF339)"; then
    yarn codesign
  else
    # Local build without Expo's Developer ID: sign ad-hoc so the binaries still run.
    echo "Developer ID not found, signing CLI ad-hoc"
    codesign --sign - --entitlements ./macos/entitlements.plist --force ./dist/orbit-cli-arm64 ./dist/orbit-cli-x64
  fi
fi

cd $PROJECT_ROOT
yarn update-cli
