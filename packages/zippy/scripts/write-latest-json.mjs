#!/usr/bin/env node
/**
 * Build latest.json for tauri-plugin-updater from macOS bundle artifacts.
 * Usage: node scripts/write-latest-json.mjs <version> <artifact-dir> <release-tag> <repo>
 */
import fs from 'node:fs';
import path from 'node:path';

const [version, artifactDir, tag, repo] = process.argv.slice(2);
if (!version || !artifactDir || !tag || !repo) {
  console.error(
    'Usage: write-latest-json.mjs <version> <artifact-dir> <release-tag> <owner/repo>',
  );
  process.exit(1);
}

const files = fs.readdirSync(artifactDir);
const platforms = {};

function findArtifact(suffixes) {
  return files.find((name) => suffixes.some((suffix) => name.endsWith(suffix)));
}

const pairs = [
  {
    platform: 'darwin-aarch64',
    archive: findArtifact(['_aarch64.app.tar.gz', '-aarch64.app.tar.gz', '.app.tar.gz']),
  },
  {
    platform: 'darwin-x86_64',
    archive: findArtifact(['_x64.app.tar.gz', '-x64.app.tar.gz', '_x86_64.app.tar.gz']),
  },
];

// When only one universal/arch artifact exists, map it to the host arch name(s).
const archives = files.filter((name) => name.endsWith('.app.tar.gz'));
if (archives.length === 1) {
  const archive = archives[0];
  const sigName = `${archive}.sig`;
  if (!files.includes(sigName)) {
    console.error(`Missing signature file: ${sigName}`);
    process.exit(1);
  }
  const signature = fs.readFileSync(path.join(artifactDir, sigName), 'utf8').trim();
  const url = `https://github.com/${repo}/releases/download/${tag}/${archive}`;
  // Prefer detecting arch from filename; fall back to both common mac targets.
  if (archive.includes('aarch64') || archive.includes('arm64')) {
    platforms['darwin-aarch64'] = { signature, url };
  } else if (archive.includes('x64') || archive.includes('x86_64')) {
    platforms['darwin-x86_64'] = { signature, url };
  } else {
    platforms['darwin-aarch64'] = { signature, url };
    platforms['darwin-x86_64'] = { signature, url };
  }
} else {
  for (const pair of pairs) {
    if (!pair.archive) continue;
    const sigName = `${pair.archive}.sig`;
    if (!files.includes(sigName)) {
      console.error(`Missing signature file: ${sigName}`);
      process.exit(1);
    }
    platforms[pair.platform] = {
      signature: fs.readFileSync(path.join(artifactDir, sigName), 'utf8').trim(),
      url: `https://github.com/${repo}/releases/download/${tag}/${pair.archive}`,
    };
  }
}

if (!Object.keys(platforms).length) {
  console.error(`No .app.tar.gz artifacts found in ${artifactDir}`);
  console.error(files.join('\n'));
  process.exit(1);
}

const latest = {
  version,
  notes: `Zippy v${version}`,
  pub_date: new Date().toISOString(),
  platforms,
};

const outPath = path.join(artifactDir, 'latest.json');
fs.writeFileSync(outPath, `${JSON.stringify(latest, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
