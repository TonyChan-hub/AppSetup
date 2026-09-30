#!/usr/bin/env node
/**
 * Mirror the latest Zippy .dmg from GitHub Releases into docs/public/downloads/
 * so the docs site can serve installers from github.io (more reachable than
 * github.com release CDN in some regions).
 *
 * Usage: node docs/scripts/mirror-zippy-downloads.mjs [repo]
 * Env: GH_TOKEN / GITHUB_TOKEN (optional but recommended for higher rate limits)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = process.argv[2] || process.env.GITHUB_REPOSITORY || 'TonyChan-hub/AppSetup'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../public/downloads')
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''

function archFromName(name) {
  const lower = name.toLowerCase()
  if (lower.includes('aarch64') || lower.includes('arm64')) return 'aarch64'
  if (lower.includes('x86_64') || lower.includes('x64') || lower.includes('amd64')) {
    return 'x86_64'
  }
  return 'universal'
}

function labelForArch(arch) {
  switch (arch) {
    case 'aarch64':
      return 'macOS (Apple Silicon)'
    case 'x86_64':
      return 'macOS (Intel)'
    default:
      return 'macOS'
  }
}

async function fetchJson(url) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'AppSetup-docs-mirror',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`GET ${url} → ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function downloadFile(url, dest) {
  const headers = { 'User-Agent': 'AppSetup-docs-mirror', Accept: 'application/octet-stream' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, { headers, redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`download ${url} → ${response.status} ${response.statusText}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(dest, buffer)
  return buffer.length
}

fs.mkdirSync(outDir, { recursive: true })

let releases
try {
  releases = await fetchJson(`https://api.github.com/repos/${repo}/releases?per_page=30`)
} catch (error) {
  console.warn(`[mirror-zippy] skip: cannot list releases (${error.message})`)
  process.exit(0)
}

const release = releases.find(
  (item) =>
    typeof item?.tag_name === 'string' &&
    item.tag_name.startsWith('zippy-v') &&
    Array.isArray(item.assets) &&
    item.assets.some((asset) => asset.name?.endsWith('.dmg')),
)

if (!release) {
  console.warn('[mirror-zippy] skip: no Zippy release with .dmg found')
  process.exit(0)
}

const version = release.tag_name.replace(/^zippy-v/, '')
const dmgs = release.assets.filter((asset) => asset.name.endsWith('.dmg'))
const assets = []

for (const asset of dmgs) {
  const dest = path.join(outDir, asset.name)
  // Prefer API asset URL (auth-friendly on Actions); fall back to browser URL.
  const url = asset.url || asset.browser_download_url
  try {
    const size = await downloadFile(url, dest)
    const arch = archFromName(asset.name)
    assets.push({
      name: asset.name,
      arch,
      label: labelForArch(arch),
      size,
      // Served from GitHub Pages (site base /AppSetup/)
      url: `https://tonychan-hub.github.io/AppSetup/downloads/${asset.name}`,
      githubUrl: asset.browser_download_url,
    })
    console.log(`[mirror-zippy] ${asset.name} (${size} bytes)`)
  } catch (error) {
    console.warn(`[mirror-zippy] failed ${asset.name}: ${error.message}`)
  }
}

if (!assets.length) {
  console.warn('[mirror-zippy] skip: no DMG mirrored')
  process.exit(0)
}

const manifest = {
  product: 'Zippy',
  version,
  tag: release.tag_name,
  platform: 'macos',
  publishedAt: release.published_at,
  releasesUrl: release.html_url,
  mirroredAt: new Date().toISOString(),
  assets,
}

const manifestPath = path.join(outDir, 'manifest.json')
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`[mirror-zippy] wrote ${manifestPath}`)
