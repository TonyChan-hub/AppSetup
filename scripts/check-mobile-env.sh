#!/usr/bin/env bash
# check-mobile-env.sh
# Diagnose Android / iOS / React Native / Flutter toolchain readiness on macOS.
#
# Usage:
#   check-mobile-env
#   npx -p @bear1210/create-rn-template check-mobile-env
#   check-mobile-env --json

set -euo pipefail

JSON_MODE=0
STRICT_FLUTTER=0
for arg in "$@"; do
  case "$arg" in
    --json) JSON_MODE=1 ;;
    --strict-flutter) STRICT_FLUTTER=1 ;;
    -h|--help)
      cat <<'EOF'
Usage: check-mobile-env [--json] [--strict-flutter]

Checks local macOS toolchain for Android, iOS, React Native, and Flutter.

Exit codes:
  0  all required checks passed (Flutter is optional unless --strict-flutter)
  1  one or more required checks failed
  2  unsupported platform (non-macOS)
EOF
      exit 0
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "check-mobile-env only supports macOS." >&2
  exit 2
fi

NODE_MAJOR_MIN=20
JDK_MAJOR_MIN=17
ANDROID_API_HINT=36

PASS=0
WARN=0
FAIL=0

# rows for --json: status|section|name|detail
RESULTS=()

ok() {
  local section="$1" name="$2" detail="${3:-}"
  PASS=$((PASS + 1))
  RESULTS+=("ok|${section}|${name}|${detail}")
  if [[ "${JSON_MODE}" -eq 0 ]]; then
    printf '  \033[32m[ok]\033[0m      %-22s %s\n' "${name}" "${detail}"
  fi
}

warn() {
  local section="$1" name="$2" detail="${3:-}"
  WARN=$((WARN + 1))
  RESULTS+=("warn|${section}|${name}|${detail}")
  if [[ "${JSON_MODE}" -eq 0 ]]; then
    printf '  \033[33m[warn]\033[0m    %-22s %s\n' "${name}" "${detail}"
  fi
}

fail() {
  local section="$1" name="$2" detail="${3:-}"
  FAIL=$((FAIL + 1))
  RESULTS+=("fail|${section}|${name}|${detail}")
  if [[ "${JSON_MODE}" -eq 0 ]]; then
    printf '  \033[31m[missing]\033[0m %-22s %s\n' "${name}" "${detail}"
  fi
}

section() {
  if [[ "${JSON_MODE}" -eq 0 ]]; then
    printf '\n\033[1;32m==>\033[0m %s\n' "$1"
  fi
}

have_cmd() { command -v "$1" >/dev/null 2>&1; }

cmd_version() {
  local out=""
  out="$("$@" 2>/dev/null | head -n1 | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  # Redact credentials embedded in URLs (e.g. https://user:token@host/...).
  out="$(printf '%s' "${out}" | sed -E 's#(https?://)[^/@[:space:]]+:[^/@[:space:]]+@#\1***:***@#g')"
  printf '%s' "${out}"
}

########################################
# Common
########################################
section "Common"

if have_cmd brew; then
  ok "common" "homebrew" "$(cmd_version brew --version)"
else
  fail "common" "homebrew" "brew not found"
fi

if have_cmd git; then
  ok "common" "git" "$(cmd_version git --version)"
else
  fail "common" "git" "git not found"
fi

if have_cmd node; then
  NODE_VER="$(node -v 2>/dev/null || true)"
  NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
  if [[ "${NODE_MAJOR}" -ge "${NODE_MAJOR_MIN}" ]]; then
    ok "common" "node" "${NODE_VER} (>=${NODE_MAJOR_MIN})"
  else
    fail "common" "node" "${NODE_VER:-missing} (need >=${NODE_MAJOR_MIN})"
  fi
else
  fail "common" "node" "node not found (need >=${NODE_MAJOR_MIN})"
fi

if have_cmd npm; then
  ok "common" "npm" "$(cmd_version npm -v) registry=$(npm config get registry 2>/dev/null || echo n/a)"
else
  fail "common" "npm" "npm not found"
fi

if have_cmd watchman; then
  ok "common" "watchman" "$(cmd_version watchman --version)"
else
  warn "common" "watchman" "recommended for RN file watching"
fi

########################################
# Android
########################################
section "Android"

JAVA_OK=0
if have_cmd java; then
  JAVA_LINE="$(java -version 2>&1 | head -n1)"
  JAVA_HOME_VAL="${JAVA_HOME:-}"
  if [[ -z "${JAVA_HOME_VAL}" ]] && [[ -x /usr/libexec/java_home ]]; then
    JAVA_HOME_VAL="$(/usr/libexec/java_home 2>/dev/null || true)"
  fi
  JAVA_MAJOR="$(java -XshowSettings:properties -version 2>&1 | sed -n 's/.*java\.specification\.version = //p' | head -n1 | tr -d '[:space:]')"
  if [[ -z "${JAVA_MAJOR}" ]]; then
    JAVA_MAJOR="$(printf '%s' "${JAVA_LINE}" | sed -n 's/.* version \"\([0-9][0-9]*\).*/\1/p')"
  fi
  if [[ -n "${JAVA_MAJOR}" && "${JAVA_MAJOR}" -ge "${JDK_MAJOR_MIN}" ]]; then
    ok "android" "jdk" "${JAVA_LINE} (JAVA_HOME=${JAVA_HOME_VAL:-unset})"
    JAVA_OK=1
  else
    fail "android" "jdk" "${JAVA_LINE:-missing} (need JDK >=${JDK_MAJOR_MIN})"
  fi
else
  fail "android" "jdk" "java not found (need JDK >=${JDK_MAJOR_MIN})"
fi

ANDROID_HOME_VAL="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "${ANDROID_HOME_VAL}" && -d "${HOME}/Library/Android/sdk" ]]; then
  ANDROID_HOME_VAL="${HOME}/Library/Android/sdk"
fi

if [[ -n "${ANDROID_HOME_VAL}" && -d "${ANDROID_HOME_VAL}" ]]; then
  ok "android" "ANDROID_HOME" "${ANDROID_HOME_VAL}"
else
  fail "android" "ANDROID_HOME" "not set / sdk dir missing (~/Library/Android/sdk)"
fi

if have_cmd adb; then
  ok "android" "adb" "$(cmd_version adb version)"
else
  fail "android" "adb" "adb not found (install platform-tools)"
fi

SDKMANAGER=""
if [[ -n "${ANDROID_HOME_VAL}" && -x "${ANDROID_HOME_VAL}/cmdline-tools/latest/bin/sdkmanager" ]]; then
  SDKMANAGER="${ANDROID_HOME_VAL}/cmdline-tools/latest/bin/sdkmanager"
elif have_cmd sdkmanager; then
  SDKMANAGER="$(command -v sdkmanager)"
fi

if [[ -n "${SDKMANAGER}" ]]; then
  ok "android" "sdkmanager" "${SDKMANAGER}"
else
  fail "android" "sdkmanager" "cmdline-tools not found"
fi

if [[ -n "${ANDROID_HOME_VAL}" && -d "${ANDROID_HOME_VAL}/platforms" ]]; then
  PLATFORMS="$(ls -1 "${ANDROID_HOME_VAL}/platforms" 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  if [[ -n "${PLATFORMS}" ]]; then
    if printf '%s' "${PLATFORMS}" | grep -q "android-${ANDROID_API_HINT}"; then
      ok "android" "platforms" "${PLATFORMS}"
    else
      warn "android" "platforms" "${PLATFORMS} (template targets android-${ANDROID_API_HINT})"
    fi
  else
    fail "android" "platforms" "no platforms installed"
  fi
else
  fail "android" "platforms" "platforms directory missing"
fi

if [[ -n "${ANDROID_HOME_VAL}" && -d "${ANDROID_HOME_VAL}/build-tools" ]]; then
  BUILD_TOOLS="$(ls -1 "${ANDROID_HOME_VAL}/build-tools" 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  if [[ -n "${BUILD_TOOLS}" ]]; then
    ok "android" "build-tools" "${BUILD_TOOLS}"
  else
    fail "android" "build-tools" "no build-tools installed"
  fi
else
  fail "android" "build-tools" "build-tools directory missing"
fi

if [[ -n "${ANDROID_HOME_VAL}" && -d "${ANDROID_HOME_VAL}/ndk" ]]; then
  NDK_LIST="$(ls -1 "${ANDROID_HOME_VAL}/ndk" 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  if [[ -n "${NDK_LIST}" ]]; then
    ok "android" "ndk" "${NDK_LIST}"
  else
    warn "android" "ndk" "ndk dir empty (needed for many native RN modules)"
  fi
else
  warn "android" "ndk" "not installed (needed for many native RN modules)"
fi

if have_cmd emulator; then
  AVDS="$(emulator -list-avds 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]*$//' || true)"
  if [[ -n "${AVDS}" ]]; then
    ok "android" "emulator" "avds: ${AVDS}"
  else
    warn "android" "emulator" "emulator present but no AVDs"
  fi
else
  warn "android" "emulator" "emulator not found (optional if using a physical device)"
fi

########################################
# iOS
########################################
section "iOS"

if [[ -d /Applications/Xcode.app ]]; then
  ok "ios" "Xcode.app" "/Applications/Xcode.app"
else
  fail "ios" "Xcode.app" "install from App Store"
fi

if have_cmd xcodebuild; then
  ok "ios" "xcodebuild" "$(xcodebuild -version 2>/dev/null | tr '\n' ' ')"
else
  fail "ios" "xcodebuild" "xcodebuild not found (run xcode-select)"
fi

DEVELOPER_DIR="$(xcode-select -p 2>/dev/null || true)"
if [[ -n "${DEVELOPER_DIR}" && "${DEVELOPER_DIR}" == *Xcode.app* ]]; then
  ok "ios" "xcode-select" "${DEVELOPER_DIR}"
else
  fail "ios" "xcode-select" "${DEVELOPER_DIR:-unset} (expect /Applications/Xcode.app/Contents/Developer)"
fi

if have_cmd xcrun; then
  RUNTIME_LINES="$(xcrun simctl list runtimes 2>/dev/null | grep -E 'iOS[ ]' || true)"
  RUNTIME_COUNT="$(printf '%s\n' "${RUNTIME_LINES}" | grep -c 'iOS' || true)"
  if [[ "${RUNTIME_COUNT}" -gt 0 ]]; then
    ok "ios" "simctl" "iOS runtimes: ${RUNTIME_COUNT}"
  else
    # Fallback: available iPhone devices imply a runtime exists
    IPHONE_DEVICES="$(xcrun simctl list devices available 2>/dev/null | grep -c 'iPhone' || true)"
    if [[ "${IPHONE_DEVICES}" -gt 0 ]]; then
      ok "ios" "simctl" "available iPhone simulators: ${IPHONE_DEVICES}"
    else
      warn "ios" "simctl" "no iOS simulator runtimes (xcodebuild -downloadPlatform iOS)"
    fi
  fi
else
  fail "ios" "simctl" "xcrun not found"
fi

if have_cmd pod; then
  ok "ios" "cocoapods" "$(cmd_version pod --version)"
else
  fail "ios" "cocoapods" "pod not found"
fi

if have_cmd ruby; then
  ok "ios" "ruby" "$(cmd_version ruby -v)"
else
  warn "ios" "ruby" "ruby not found (needed for Gemfile/bundler workflows)"
fi

if have_cmd bundle; then
  ok "ios" "bundler" "$(bundle --version 2>/dev/null | head -n1 || echo present)"
else
  warn "ios" "bundler" "bundle not found (optional if using brew pod only)"
fi

########################################
# React Native
########################################
section "React Native"

if have_cmd npx; then
  ok "react-native" "npx" "$(cmd_version npx -v)"
else
  fail "react-native" "npx" "npx not found"
fi

# Prefer local project CLI when present; avoid slow network npx install.
RN_CLI_DETAIL=""
if [[ -x "./node_modules/.bin/react-native" ]]; then
  RN_CLI_DETAIL="$(./node_modules/.bin/react-native --version 2>/dev/null | head -n1 | tr '\n' ' ' | sed 's/[[:space:]]*$//' || true)"
  if [[ -n "${RN_CLI_DETAIL}" ]]; then
    ok "react-native" "react-native-cli" "local: ${RN_CLI_DETAIL}"
  else
    warn "react-native" "react-native-cli" "local binary present but --version failed"
  fi
elif have_cmd react-native; then
  ok "react-native" "react-native-cli" "global: $(cmd_version react-native --version)"
else
  warn "react-native" "react-native-cli" "not on PATH (normal; created apps use local node_modules / npx)"
fi

# Soft signal that core Android/iOS pieces needed by RN exist
if [[ "${JAVA_OK}" -eq 1 && -n "${ANDROID_HOME_VAL:-}" && -d /Applications/Xcode.app ]]; then
  ok "react-native" "native-toolchains" "Android JDK/SDK + Xcode present"
else
  fail "react-native" "native-toolchains" "need working Android JDK/SDK and Xcode for RN apps"
fi

########################################
# Flutter
########################################
section "Flutter"

flutter_status="warn"
if [[ "${STRICT_FLUTTER}" -eq 1 ]]; then
  flutter_status="fail"
fi

if have_cmd flutter; then
  FLUTTER_VER="$(cmd_version flutter --version)"
  ok "flutter" "flutter" "${FLUTTER_VER}"
  warn "flutter" "flutter-doctor" "run \`flutter doctor\` separately for a full report"
else
  if [[ "${flutter_status}" == "fail" ]]; then
    fail "flutter" "flutter" "flutter not found (--strict-flutter)"
  else
    warn "flutter" "flutter" "not installed (optional for RN-only machines)"
  fi
fi

########################################
# Summary
########################################
if [[ "${JSON_MODE}" -eq 1 ]]; then
  printf '{\n'
  printf '  "pass": %s,\n' "${PASS}"
  printf '  "warn": %s,\n' "${WARN}"
  printf '  "fail": %s,\n' "${FAIL}"
  printf '  "checks": [\n'
  local_i=0
  for row in "${RESULTS[@]}"; do
    IFS='|' read -r st sec name detail <<<"${row}"
    # escape quotes in detail
    detail_escaped="${detail//\\/\\\\}"
    detail_escaped="${detail_escaped//\"/\\\"}"
    if [[ ${local_i} -gt 0 ]]; then
      printf ',\n'
    fi
    printf '    {"status":"%s","section":"%s","name":"%s","detail":"%s"}' \
      "${st}" "${sec}" "${name}" "${detail_escaped}"
    local_i=$((local_i + 1))
  done
  printf '\n  ]\n}\n'
else
  printf '\n\033[1;32m==>\033[0m Summary\n'
  echo "  ok=${PASS}  warn=${WARN}  missing=${FAIL}"
  if [[ "${FAIL}" -eq 0 ]]; then
    echo "  Required environment looks ready."
    if [[ "${WARN}" -gt 0 ]]; then
      echo "  Review warnings above (optional tools / Flutter)."
    fi
    echo
    echo "  Fix Android gaps:  npx -p @bear1210/create-rn-template setup-rn-android-env"
    echo "  Fix iOS gaps:      npx -p @bear1210/create-rn-template setup-rn-ios-env"
  else
    echo "  Some required tools are missing."
    echo
    echo "  Fix Android gaps:  npx -p @bear1210/create-rn-template setup-rn-android-env"
    echo "  Fix iOS gaps:      npx -p @bear1210/create-rn-template setup-rn-ios-env"
  fi
fi

if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
