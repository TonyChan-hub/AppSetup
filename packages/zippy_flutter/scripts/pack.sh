#!/usr/bin/env bash
# Pack zippy_flutter into a single zip for dropping into host apps (e.g. tcg-scanner).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
VERSION="$(awk '/^version:/{print $2; exit}' "$ROOT/pubspec.yaml")"
DIST="$ROOT/dist"
STAGE="$(mktemp -d)"
ZIP_NAME="zippy_flutter-${VERSION}.zip"

mkdir -p "$DIST"
mkdir -p "$STAGE/zippy_flutter"
rsync -a \
  --exclude '.dart_tool/' \
  --exclude 'build/' \
  --exclude 'example/' \
  --exclude 'dist/' \
  --exclude '.idea/' \
  --exclude '*.iml' \
  --exclude 'pubspec.lock' \
  --exclude '.flutter-plugins' \
  --exclude '.flutter-plugins-dependencies' \
  --exclude '.packages' \
  --exclude '**/build/' \
  --exclude 'scripts/' \
  "$ROOT/" "$STAGE/zippy_flutter/"

(cd "$STAGE" && zip -qr "$DIST/$ZIP_NAME" zippy_flutter)
rm -rf "$STAGE"
echo "Wrote $DIST/$ZIP_NAME"
ls -lh "$DIST/$ZIP_NAME"
