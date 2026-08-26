#!/usr/bin/env bash
# setup-android-env.sh
# Global macOS bootstrap for Android toolchain (no Android Studio, no iOS/Xcode).
# Aligned with RN 0.81.6 template: SDK 36, build-tools 36.0.0, NDK 27.1.12297006.
# Default target: Apple Silicon. For Intel Macs, change ANDROID_SYSTEM_IMAGE to x86_64.
#
# Usage:
#   setup-rn-android-env
#   npx -p @bear1210/create-rn-template setup-rn-android-env
#   RN_SETUP_MIRROR=cn setup-rn-android-env

set -euo pipefail

############################################################
# Config
############################################################
NODE_MAJOR_MIN=20
JDK_VERSION=21
ANDROID_API=36
ANDROID_BUILD_TOOLS="36.0.0"
ANDROID_NDK="27.1.12297006"
ANDROID_HOME_DIR="${HOME}/Library/Android/sdk"
# Apple Silicon:
ANDROID_SYSTEM_IMAGE="system-images;android-${ANDROID_API};google_apis;arm64-v8a"
# Intel Mac alternative:
# ANDROID_SYSTEM_IMAGE="system-images;android-${ANDROID_API};google_apis;x86_64"
AVD_NAME="Pixel_API${ANDROID_API}"
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
# 2) Node / Watchman / Git (needed by RN Android build)
############################################################
log "Installing git, node, watchman"
brew install git node watchman

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[[ "${NODE_MAJOR}" -ge "${NODE_MAJOR_MIN}" ]] || die "Node >= ${NODE_MAJOR_MIN} required, found $(node -v)"

apply_npm_mirrors

############################################################
# 3) JDK for Gradle
############################################################
log "Installing Temurin JDK ${JDK_VERSION}"
brew install --cask "temurin@${JDK_VERSION}"

JAVA_HOME_PATH="$(/usr/libexec/java_home -v "${JDK_VERSION}" 2>/dev/null || true)"
[[ -n "${JAVA_HOME_PATH}" ]] || die "JDK ${JDK_VERSION} not found via /usr/libexec/java_home"

append_once "export JAVA_HOME=\"\$(/usr/libexec/java_home -v ${JDK_VERSION})\"" "$SHELL_RC"
append_once 'export PATH="$JAVA_HOME/bin:$PATH"' "$SHELL_RC"
export JAVA_HOME="${JAVA_HOME_PATH}"
export PATH="${JAVA_HOME}/bin:${PATH}"

java -version

############################################################
# 4) Android command-line tools (no Android Studio)
############################################################
log "Installing Android command-line tools via Homebrew"
brew install --cask android-commandlinetools

mkdir -p "${ANDROID_HOME_DIR}/cmdline-tools"

BREW_CMDLINE_ROOT="$(brew --prefix)/share/android-commandlinetools"
if [[ -x "${BREW_CMDLINE_ROOT}/cmdline-tools/latest/bin/sdkmanager" ]]; then
  if [[ ! -e "${ANDROID_HOME_DIR}/cmdline-tools/latest" ]]; then
    ln -sfn "${BREW_CMDLINE_ROOT}/cmdline-tools/latest" "${ANDROID_HOME_DIR}/cmdline-tools/latest"
  fi
elif [[ -d "${BREW_CMDLINE_ROOT}/cmdline-tools" ]]; then
  if [[ ! -e "${ANDROID_HOME_DIR}/cmdline-tools/latest" ]]; then
    SRC="$(find "${BREW_CMDLINE_ROOT}/cmdline-tools" -type f -path '*/bin/sdkmanager' | head -n1 | sed 's#/bin/sdkmanager##')"
    [[ -n "${SRC}" ]] || die "Could not locate sdkmanager under ${BREW_CMDLINE_ROOT}"
    ln -sfn "${SRC}" "${ANDROID_HOME_DIR}/cmdline-tools/latest"
  fi
else
  die "android-commandlinetools installed, but cmdline-tools path not found under ${BREW_CMDLINE_ROOT}"
fi

append_once "export ANDROID_HOME=\"${ANDROID_HOME_DIR}\"" "$SHELL_RC"
append_once 'export ANDROID_SDK_ROOT="$ANDROID_HOME"' "$SHELL_RC"
append_once 'export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"' "$SHELL_RC"
append_once 'export PATH="$PATH:$ANDROID_HOME/platform-tools"' "$SHELL_RC"
append_once 'export PATH="$PATH:$ANDROID_HOME/emulator"' "$SHELL_RC"

export ANDROID_HOME="${ANDROID_HOME_DIR}"
export ANDROID_SDK_ROOT="${ANDROID_HOME}"
export PATH="${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/emulator"

SDKMANAGER="${ANDROID_HOME}/cmdline-tools/latest/bin/sdkmanager"
AVDMANAGER="${ANDROID_HOME}/cmdline-tools/latest/bin/avdmanager"
[[ -x "${SDKMANAGER}" ]] || die "sdkmanager not found at ${SDKMANAGER}"

############################################################
# 5) Licenses + SDK packages
############################################################
log "Accepting Android SDK licenses"
yes | "${SDKMANAGER}" --sdk_root="${ANDROID_HOME}" --licenses >/dev/null || true

if [[ "${MIRROR_REGION}" == "cn" ]]; then
  warn "Android SDK packages download from Google (dl.google.com). If this step hangs in mainland China, switch network/VPN and re-run."
fi

log "Installing Android SDK packages"
"${SDKMANAGER}" --sdk_root="${ANDROID_HOME}" \
  "platform-tools" \
  "platforms;android-${ANDROID_API}" \
  "build-tools;${ANDROID_BUILD_TOOLS}" \
  "ndk;${ANDROID_NDK}" \
  "emulator" \
  "cmdline-tools;latest" \
  "${ANDROID_SYSTEM_IMAGE}"

############################################################
# 6) Default AVD
############################################################
if "${AVDMANAGER}" list avd 2>/dev/null | grep -q "Name: ${AVD_NAME}"; then
  log "AVD ${AVD_NAME} already exists"
else
  log "Creating AVD ${AVD_NAME}"
  echo no | "${AVDMANAGER}" create avd \
    -n "${AVD_NAME}" \
    -k "${ANDROID_SYSTEM_IMAGE}" \
    -d pixel_6 \
    --force || warn "AVD creation failed; create one later with avdmanager"
fi

############################################################
# 7) Summary
############################################################
log "Android environment summary"
echo "mirror:       ${MIRROR_LABEL}"
echo "node:         $(node -v)"
echo "npm:          $(npm -v)"
echo "npm registry: $(npm config get registry 2>/dev/null || echo n/a)"
echo "java:         $(java -version 2>&1 | head -n1)"
echo "JAVA_HOME:    ${JAVA_HOME}"
echo "ANDROID_HOME: ${ANDROID_HOME}"
echo "adb:          $(adb version 2>/dev/null | head -n1 || echo 'n/a')"
echo "installed packages (filtered):"
"${SDKMANAGER}" --sdk_root="${ANDROID_HOME}" --list_installed 2>/dev/null \
  | grep -E "android-${ANDROID_API}|${ANDROID_BUILD_TOOLS}|${ANDROID_NDK}|platform-tools|emulator" || true
echo "AVDs:"
emulator -list-avds 2>/dev/null || true

cat <<EOF

Done (global Android toolchain).
Open a new terminal (or: source ${SHELL_RC}).

Then in any RN app:
  npm start
  # other terminal:
  emulator -avd ${AVD_NAME} &
  adb wait-for-device
  npm run android
EOF
