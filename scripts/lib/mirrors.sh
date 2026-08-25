#!/usr/bin/env bash
# Shared mirror selection for macOS setup scripts.
# Detects region from public IP (with timeouts) and configures Homebrew / npm / RubyGems.
#
# Override:
#   RN_SETUP_MIRROR=cn|global|auto   (default: auto)

: "${SHELL_RC:=${HOME}/.zprofile}"
: "${RN_SETUP_MIRROR:=auto}"

MIRROR_REGION="global"
MIRROR_COUNTRY=""
MIRROR_LABEL="official"

BREW_INSTALL_URL_OFFICIAL="https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh"
BREW_GIT_REMOTE_CN="https://mirrors.ustc.edu.cn/brew.git"
BREW_BOTTLE_DOMAIN_CN="https://mirrors.ustc.edu.cn/homebrew-bottles"
BREW_API_DOMAIN_CN="${BREW_BOTTLE_DOMAIN_CN}/api"
BREW_INSTALL_URL_CN="https://mirrors.ustc.edu.cn/misc/brew-install.sh"

NPM_REGISTRY_CN="https://registry.npmmirror.com"
GEM_SOURCE_CN="https://gems.ruby-china.com"

append_once() {
  local line="$1"
  local file="$2"
  if ! touch "$file" 2>/dev/null; then
    printf '\n\033[1;33m[warn]\033[0m Cannot write %s; skip persisting: %s\n' "$file" "$line"
    return 0
  fi
  grep -Fqx "$line" "$file" 2>/dev/null || echo "$line" >> "$file" || true
}

_curl_text() {
  curl -fsSL --max-time 4 --connect-timeout 3 "$@" 2>/dev/null || true
}

detect_country_code() {
  local code=""
  # Prefer lightweight country-only endpoints; fail open to empty.
  code="$(_curl_text https://ipinfo.io/country | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]')"
  if [[ ! "${code}" =~ ^[A-Z]{2}$ ]]; then
    code="$(_curl_text https://ifconfig.co/country-iso | tr -d '[:space:]' | tr '[:lower:]' '[:upper:]')"
  fi
  if [[ ! "${code}" =~ ^[A-Z]{2}$ ]]; then
    code="$(_curl_text https://api.country.is/ | sed -n 's/.*"country":"\([A-Z][A-Z]\)".*/\1/p')"
  fi
  printf '%s' "${code}"
}

resolve_mirror_region() {
  case "${RN_SETUP_MIRROR}" in
    cn|CN|china|China)
      MIRROR_REGION="cn"
      MIRROR_COUNTRY="CN"
      MIRROR_LABEL="China mirrors (forced)"
      return
      ;;
    global|GLOBAL|official|OFFICIAL)
      MIRROR_REGION="global"
      MIRROR_COUNTRY=""
      MIRROR_LABEL="official sources (forced)"
      return
      ;;
  esac

  MIRROR_COUNTRY="$(detect_country_code)"
  if [[ "${MIRROR_COUNTRY}" == "CN" ]]; then
    MIRROR_REGION="cn"
    MIRROR_LABEL="China mirrors (detected IP country=CN)"
  else
    MIRROR_REGION="global"
    if [[ -n "${MIRROR_COUNTRY}" ]]; then
      MIRROR_LABEL="official sources (detected IP country=${MIRROR_COUNTRY})"
    else
      MIRROR_LABEL="official sources (IP detect failed; fail-open)"
    fi
  fi
}

apply_homebrew_mirrors() {
  if [[ "${MIRROR_REGION}" == "cn" ]]; then
    export HOMEBREW_BREW_GIT_REMOTE="${BREW_GIT_REMOTE_CN}"
    export HOMEBREW_BOTTLE_DOMAIN="${BREW_BOTTLE_DOMAIN_CN}"
    export HOMEBREW_API_DOMAIN="${BREW_API_DOMAIN_CN}"
    BREW_INSTALL_URL="${BREW_INSTALL_URL_CN}"

    append_once "export HOMEBREW_BREW_GIT_REMOTE=\"${BREW_GIT_REMOTE_CN}\"" "$SHELL_RC"
    append_once "export HOMEBREW_BOTTLE_DOMAIN=\"${BREW_BOTTLE_DOMAIN_CN}\"" "$SHELL_RC"
    append_once "export HOMEBREW_API_DOMAIN=\"${BREW_API_DOMAIN_CN}\"" "$SHELL_RC"
  else
    unset HOMEBREW_BREW_GIT_REMOTE HOMEBREW_BOTTLE_DOMAIN HOMEBREW_API_DOMAIN || true
    BREW_INSTALL_URL="${BREW_INSTALL_URL_OFFICIAL}"
  fi
}

apply_npm_mirrors() {
  if ! command -v npm >/dev/null 2>&1; then
    return
  fi
  if [[ "${MIRROR_REGION}" == "cn" ]]; then
    npm config set registry "${NPM_REGISTRY_CN}"
  else
    # Only reset if previously pointed at npmmirror to avoid clobbering custom registries.
    local current
    current="$(npm config get registry 2>/dev/null || true)"
    if [[ "${current}" == *npmmirror.com* ]] || [[ "${current}" == *taobao.org* ]]; then
      npm config set registry https://registry.npmjs.org
    fi
  fi
}

apply_gem_mirrors() {
  if ! command -v gem >/dev/null 2>&1; then
    return
  fi
  if [[ "${MIRROR_REGION}" == "cn" ]]; then
    gem sources --add "${GEM_SOURCE_CN}" >/dev/null 2>&1 || true
    gem sources --remove https://rubygems.org/ >/dev/null 2>&1 || true
  fi
}

print_mirror_plan() {
  printf '\n\033[1;32m==>\033[0m Mirror plan: %s\n' "${MIRROR_LABEL}"
  if [[ "${MIRROR_REGION}" == "cn" ]]; then
    echo "  Homebrew: USTC"
    echo "  npm:      ${NPM_REGISTRY_CN}"
    echo "  RubyGems: ${GEM_SOURCE_CN}"
    echo "  Android SDK packages still come from Google; use a network path that can reach dl.google.com if downloads stall."
  else
    echo "  Homebrew: official"
    echo "  npm:      registry.npmjs.org (default)"
    echo "  RubyGems: rubygems.org (default)"
  fi
  echo "  Override with RN_SETUP_MIRROR=cn|global|auto"
}

# Main entry used by setup-*.sh
detect_and_apply_mirrors() {
  resolve_mirror_region
  apply_homebrew_mirrors
  print_mirror_plan
}
