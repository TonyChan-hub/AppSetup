<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    locale?: 'en' | 'zh'
  }>(),
  { locale: 'en' },
)

const REPO = 'TonyChan-hub/AppSetup'
const MANIFEST_URL = `https://github.com/${REPO}/releases/latest/download/download.json`
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=20`
const RELEASES_PAGE = `https://github.com/${REPO}/releases`

type DownloadAsset = {
  name: string
  arch: string
  label: string
  size?: number
  url: string
}

type DownloadManifest = {
  product?: string
  version: string
  tag: string
  publishedAt?: string
  releasesUrl?: string
  assets: DownloadAsset[]
}

const loading = ref(true)
const error = ref<string | null>(null)
const manifest = ref<DownloadManifest | null>(null)

const copy = computed(() =>
  props.locale === 'zh'
    ? {
        title: '下载桌面应用',
        subtitle: 'macOS · 通过 GitHub Releases 分发',
        loading: '正在获取最新版本…',
        empty: '尚未发布安装包。发版后可在此直接下载，也可先从源码运行。',
        emptyHint: '本地开发：npm install && npm run zippy',
        error: '暂时无法读取发布信息，请前往 GitHub Releases。',
        version: '最新版本',
        allReleases: '全部 Releases',
        fromSource: '从源码运行',
        size: '大小',
      }
    : {
        title: 'Download desktop app',
        subtitle: 'macOS · shipped via GitHub Releases',
        loading: 'Fetching the latest release…',
        empty: 'No packaged build yet. Once a release is published, it will appear here. You can also run from source.',
        emptyHint: 'Local: npm install && npm run zippy',
        error: 'Could not load release info. Open GitHub Releases instead.',
        version: 'Latest',
        allReleases: 'All releases',
        fromSource: 'Run from source',
        size: 'Size',
      },
)

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return null
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

function archFromName(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('aarch64') || lower.includes('arm64')) return 'aarch64'
  if (lower.includes('x86_64') || lower.includes('x64') || lower.includes('amd64')) {
    return 'x86_64'
  }
  return 'universal'
}

function labelForArch(arch: string) {
  if (props.locale === 'zh') {
    switch (arch) {
      case 'aarch64':
        return 'macOS（Apple Silicon）'
      case 'x86_64':
        return 'macOS（Intel）'
      default:
        return 'macOS'
    }
  }
  switch (arch) {
    case 'aarch64':
      return 'macOS (Apple Silicon)'
    case 'x86_64':
      return 'macOS (Intel)'
    default:
      return 'macOS'
  }
}

function localizeAssets(assets: DownloadAsset[]) {
  return assets.map((asset) => ({
    ...asset,
    label: labelForArch(asset.arch || archFromName(asset.name)),
  }))
}

async function loadFromManifest(): Promise<DownloadManifest | null> {
  const response = await fetch(MANIFEST_URL, { headers: { Accept: 'application/json' } })
  if (!response.ok) return null
  const data = (await response.json()) as DownloadManifest
  if (!data?.version || !Array.isArray(data.assets) || data.assets.length === 0) return null
  return {
    ...data,
    assets: localizeAssets(data.assets),
  }
}

async function loadFromGitHubApi(): Promise<DownloadManifest | null> {
  const response = await fetch(RELEASES_API, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) return null
  const releases = (await response.json()) as Array<{
    tag_name: string
    html_url: string
    published_at: string
    assets: Array<{ name: string; browser_download_url: string; size: number }>
  }>
  const release = releases.find(
    (item) => item.tag_name.startsWith('zippy-v') && item.assets?.some((a) => a.name.endsWith('.dmg')),
  )
  if (!release) return null
  const version = release.tag_name.replace(/^zippy-v/, '')
  const assets = release.assets
    .filter((asset) => asset.name.endsWith('.dmg'))
    .map((asset) => {
      const arch = archFromName(asset.name)
      return {
        name: asset.name,
        arch,
        label: labelForArch(arch),
        size: asset.size,
        url: asset.browser_download_url,
      }
    })
  if (!assets.length) return null
  return {
    product: 'Zippy',
    version,
    tag: release.tag_name,
    publishedAt: release.published_at,
    releasesUrl: release.html_url,
    assets,
  }
}

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    // Prefer GitHub API (CORS-friendly in browsers); fall back to download.json.
    manifest.value = (await loadFromGitHubApi()) ?? (await loadFromManifest())
  } catch {
    error.value = copy.value.error
    manifest.value = null
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="zippy-download" id="download">
    <div class="zippy-download__header">
      <div>
        <p class="zippy-download__eyebrow">Zippy</p>
        <h3 class="zippy-download__title">{{ copy.title }}</h3>
        <p class="zippy-download__subtitle">{{ copy.subtitle }}</p>
      </div>
      <p v-if="manifest" class="zippy-download__version">
        {{ copy.version }}
        <strong>v{{ manifest.version }}</strong>
      </p>
    </div>

    <div v-if="loading" class="zippy-download__status">{{ copy.loading }}</div>

    <div v-else-if="manifest" class="zippy-download__assets">
      <a
        v-for="asset in manifest.assets"
        :key="asset.url"
        class="zippy-download__btn"
        :href="asset.url"
        rel="noopener noreferrer"
      >
        <span class="zippy-download__btn-label">{{ asset.label }}</span>
        <span class="zippy-download__btn-meta">
          {{ asset.name }}
          <template v-if="formatBytes(asset.size)"> · {{ formatBytes(asset.size) }}</template>
        </span>
      </a>
    </div>

    <div v-else class="zippy-download__empty">
      <p>{{ error || copy.empty }}</p>
      <p class="zippy-download__hint">
        <code>{{ copy.emptyHint }}</code>
      </p>
    </div>

    <div class="zippy-download__links">
      <a :href="manifest?.releasesUrl || RELEASES_PAGE" rel="noopener noreferrer">
        {{ copy.allReleases }}
      </a>
      <a href="#develop">{{ copy.fromSource }}</a>
    </div>
  </div>
</template>
