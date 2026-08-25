#!/usr/bin/env bash
# setup-ios-env.sh
# Global macOS bootstrap for iOS toolchain after Xcode.app is installed manually.
# Does NOT install Android SDK / JDK / emulator, and does not touch any project.
#
# Usage:
#   setup-rn-ios-env
#   npx -p @bear1210/create-rn-template setup-rn-ios-env
#   RN_SETUP_MIRROR=cn setup-rn-ios-env

set -euo pipefail

############################################################
# Config
############################################################
NODE_MAJOR_MIN=20
SHELL_RC="${HOME}/.zprofile"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/mirrors.sh
source "${SCRIPT_DIR}/lib/mirrors.sh"

log()  { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\n\033[1;33m[warn]\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || die "This script only supports macOS."

detect_and_apply_mirrors

############################################################
# 0) Xcode must already be installed
############################################################
log "Checking Xcode"
[[ -d "/Applications/Xcode.app" ]] || die "Xcode.app not found. Install it from the App Store first."

sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept || true
sudo xcodebuild -runFirstLaunch || true

log "Downloading iOS Simulator platform (long download; safe to re-run)"
xcodebuild -downloadPlatform iOS || warn "iOS platform download failed or already installed; continue."

############################################################
# 1) Homebrew
############################################################
if ! command -v brew >/dev/null 2>&1; then
  log "Installing Homebrew (${MIRROR_REGION})"
  /bin/bash -c "$(curl -fsSL --retry 5 --retry-delay 3 "${BREW_INSTALL_URL}")"
fi

if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
  append_once 'eval "$(/opt/homebrew/bin/brew shellenv)"' "$SHELL_RC"
elif [[ -x /usr/local/bin/brew ]]; then
  eval "$(/usr/local/bin/brew shellenv)"
  append_once 'eval "$(/usr/local/bin/brew shellenv)"' "$SHELL_RC"
else
  die "brew not found after install"
fi

############################################################
# 2) Node + iOS native tooling
############################################################
log "Installing git, node, watchman, cocoapods, ruby"
brew install git node watchman cocoapods ruby

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[[ "${NODE_MAJOR}" -ge "${NODE_MAJOR_MIN}" ]] || die "Node >= ${NODE_MAJOR_MIN} required, found $(node -v)"

apply_npm_mirrors

# Prefer brew Ruby / gem bins when available
BREW_RUBY_PREFIX="$(brew --prefix ruby 2>/dev/null || true)"
if [[ -n "${BREW_RUBY_PREFIX}" ]]; then
  append_once "export PATH=\"${BREW_RUBY_PREFIX}/bin:\$PATH\"" "$SHELL_RC"
  export PATH="${BREW_RUBY_PREFIX}/bin:${PATH}"
  GEM_BIN="$(gem environment gemdir 2>/dev/null)/bin"
  if [[ -d "${GEM_BIN}" ]]; then
    append_once "export PATH=\"${GEM_BIN}:\$PATH\"" "$SHELL_RC"
    export PATH="${GEM_BIN}:${PATH}"
  fi
fi

apply_gem_mirrors

if ! command -v bundle >/dev/null 2>&1; then
  log "Installing bundler"
  gem install bundler
fi

############################################################
# 3) Summary
############################################################
log "iOS environment summary"
echo "mirror:     ${MIRROR_LABEL}"
echo "node:       $(node -v)"
echo "npm:        $(npm -v)"
echo "npm registry: $(npm config get registry 2>/dev/null || echo n/a)"
echo "xcodebuild: $(xcodebuild -version | tr '\n' ' ')"
echo "pod:        $(pod --version 2>/dev/null || echo 'n/a')"
echo "ruby:       $(ruby -v)"
echo "bundle:     $(bundle -v 2>/dev/null || echo 'n/a')"
echo "sim runtimes:"
xcrun simctl list runtimes 2>/dev/null || true
echo "available devices (sample):"
xcrun simctl list devices available 2>/dev/null | head -n 40 || true

cat <<EOF

Done (global iOS toolchain).
Open a new terminal (or: source ${SHELL_RC}).

Then in any RN app:
  npm install
  cd ios && RCT_NEW_ARCH_ENABLED=0 pod install && cd ..
  npm start
  # other terminal:
  npm run ios
EOF
