#!/usr/bin/env bash
# Pack zippy_flutter and copy the zip into create-flutter-template/vendor/.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PKG_ROOT="$(cd "$HERE/.." && pwd)"
MONOREPO="$(cd "$PKG_ROOT/../.." && pwd)"
PACK="$MONOREPO/packages/zippy_flutter/scripts/pack.sh"
VENDOR="$PKG_ROOT/vendor"

bash "$PACK"
mkdir -p "$VENDOR"
rm -f "$VENDOR"/zippy_flutter-*.zip
cp "$MONOREPO/packages/zippy_flutter/dist"/zippy_flutter-*.zip "$VENDOR/"
ls -lh "$VENDOR"/zippy_flutter-*.zip
