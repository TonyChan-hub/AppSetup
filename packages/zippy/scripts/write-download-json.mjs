#!/usr/bin/env node
/**
 * Build download.json for the docs site from macOS bundle DMG artifacts.
 * Usage: node scripts/write-download-json.mjs <version> <bundle-root> <release-tag> <repo>
 */
import fs from 'node:fs';
import path from 'node:path';

const [version, bundleRoot, tag, repo] = process.argv.slice(2);
if (!version || !bundleRoot || !tag || !repo) {
  console.error(
    'Usage: write-download-json.mjs <version> <bundle-root> <release-tag> <owner/repo>',
  );
  process.exit(1);
}

function collectDmgs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.dmg'))
    .map((name) => path.join(dir, name));
}

const dmgPaths = [
  ...collectDmgs(path.join(bundleRoot, 'dmg')),
  ...collectDmgs(bundleRoot),
].filter((filePath, index, all) => {
  // Deduplicate by basename if the same file appears in both places.
  const base = path.basename(filePath);
  return all.findIndex((candidate) => path.basename(candidate) === base) === index;
});

function archFromName(name) {
  const lower = name.toLowerCase();
  if (lower.includes('aarch64') || lower.includes('arm64')) return 'aarch64';
  if (lower.includes('x86_64') || lower.includes('x64') || lower.includes('amd64')) {
    return 'x86_64';
  }
  return 'universal';
}

function labelForArch(arch) {
  switch (arch) {
    case 'aarch64':
      return 'macOS (Apple Silicon)';
    case 'x86_64':
      return 'macOS (Intel)';
    default:
      return 'macOS';
  }
}

const assets = dmgPaths.map((filePath) => {
  const name = path.basename(filePath);
  const arch = archFromName(name);
  const { size } = fs.statSync(filePath);
  return {
    name,
    arch,
    label: labelForArch(arch),
    size,
    url: `https://github.com/${repo}/releases/download/${tag}/${name}`,
  };
});

if (!assets.length) {
  console.error(`No .dmg artifacts found under ${bundleRoot}`);
  process.exit(1);
}

const manifest = {
  product: 'Zippy',
  version,
  tag,
  platform: 'macos',
  publishedAt: new Date().toISOString(),
  releasesUrl: `https://github.com/${repo}/releases/tag/${tag}`,
  assets,
};

const outDirs = [
  path.join(bundleRoot, 'dmg'),
  bundleRoot,
].filter((dir) => fs.existsSync(dir) || dir === bundleRoot);

for (const dir of outDirs) {
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, 'download.json');
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
}
