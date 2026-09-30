import { open } from '@tauri-apps/plugin-dialog';
import { escapeHtml } from '../lib/format';
import { gitApi } from '../lib/git';
import type {
  AppConfig,
  BranchInfo,
  Profile,
  RepoStatus,
  SshKeyInfo,
} from '../types/git';

type CenterTab = 'branches' | 'commits' | 'remotes';
type BranchScope = 'local' | string;

export type GitState = {
  config: AppConfig | null;
  branches: BranchInfo[];
  status: RepoStatus | null;
  logs: string[];
  sshKeys: SshKeyInfo[];
  error: string | null;
  notice: string | null;
  busy: boolean;
  editing: Profile | null;
  filter: string;
  centerTab: CenterTab;
  branchScope: BranchScope;
};

function emptyProfile(): Profile {
  return {
    id: '',
    name: '',
    userName: '',
    userEmail: '',
    sshKeyPath: '',
    sshHostAlias: '',
  };
}

function parseLogLine(line: string) {
  const [hash = '', subject = '', author = '', when = ''] = line.split('\t');
  return { hash, subject, author, when, raw: line };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    try {
      return JSON.stringify(error);
    } catch {
      /* ignore */
    }
  }
  return 'Unexpected error';
}

export function createGitState(): GitState {
  return {
    config: null,
    branches: [],
    status: null,
    logs: [],
    sshKeys: [],
    error: null,
    notice: null,
    busy: false,
    editing: null,
    filter: '',
    centerTab: 'branches',
    branchScope: 'local',
  };
}

export type GitController = {
  state: GitState;
  bootstrap: () => Promise<void>;
  render: () => void;
};

export function mountGitPanel(root: HTMLElement): GitController {
  const state = createGitState();

  async function refreshRepo(repoId: string): Promise<void> {
    const [branches, status, logs] = await Promise.all([
      gitApi.listBranches(repoId),
      gitApi.getRepoStatus(repoId),
      gitApi.recentLog(repoId, 30),
    ]);
    state.branches = branches;
    state.status = status;
    state.logs = logs;
  }

  async function bootstrap(): Promise<void> {
    state.error = null;
    try {
      const [cfg, keys] = await Promise.all([gitApi.getConfig(), gitApi.listSshKeys()]);
      state.config = cfg;
      state.sshKeys = keys;
      if (cfg.selectedRepoId) {
        await refreshRepo(cfg.selectedRepoId);
      } else {
        state.branches = [];
        state.status = null;
        state.logs = [];
      }
    } catch (error) {
      state.error = errorMessage(error);
    }
    render();
  }

  async function run(action: () => Promise<void>): Promise<void> {
    state.busy = true;
    state.error = null;
    render();
    try {
      await action();
    } catch (error) {
      state.error = errorMessage(error);
      state.notice = null;
    } finally {
      state.busy = false;
      render();
    }
  }

  function profileExistsForKey(path: string): boolean {
    const abs = path.replace(/^~\//, '');
    return (state.config?.profiles ?? []).some((p) => {
      const existing = p.sshKeyPath || '';
      return (
        existing === path ||
        existing.replace(/^~\//, '') === abs ||
        existing.endsWith(`/${abs}`) ||
        existing.endsWith(`/${path.split('/').pop() ?? ''}`)
      );
    });
  }

  async function importSshKeyFile(): Promise<boolean> {
    const selected = await open({
      multiple: false,
      title: '选择 SSH 私钥文件',
      filters: [
        { name: 'SSH key', extensions: ['pub', 'pem', 'key'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (!selected || Array.isArray(selected)) return false;

    let keyPath = selected;
    // If user picked a .pub file, use the private key beside it when present.
    if (keyPath.endsWith('.pub')) {
      keyPath = keyPath.slice(0, -4);
    }

    if (profileExistsForKey(keyPath)) {
      state.notice = `该密钥已在 Profiles 中：${keyPath}`;
      return true;
    }

    const fileName = keyPath.split(/[/\\]/).pop() || 'ssh-key';
    const homePrefix = keyPath.includes('/.ssh/')
      ? `~/.ssh/${fileName}`
      : keyPath;

    state.config = await gitApi.upsertProfile({
      id: '',
      name: fileName,
      userName: '',
      userEmail: '',
      sshKeyPath: homePrefix,
      sshHostAlias: '',
    });
    state.sshKeys = await gitApi.listSshKeys();
    state.notice = `已导入密钥：${fileName}`;
    return true;
  }

  function selectedRepo() {
    if (!state.config?.selectedRepoId) return null;
    return state.config.repos.find((r) => r.id === state.config!.selectedRepoId) ?? null;
  }

  function boundProfile() {
    const repo = selectedRepo();
    if (!state.config || !repo?.profileId) return null;
    return state.config.profiles.find((p) => p.id === repo.profileId) ?? null;
  }

  function remoteNames(): string[] {
    const names = new Set<string>();
    for (const r of state.status?.remotes ?? []) names.add(r.name);
    for (const b of state.branches) {
      if (b.remote) names.add(b.remote);
    }
    return Array.from(names).sort();
  }

  function remoteUrlByName(): Map<string, string> {
    const map = new Map<string, string>();
    for (const r of state.status?.remotes ?? []) {
      map.set(r.name, r.url);
    }
    return map;
  }

  function scopeCounts(): Record<string, number> {
    const names = remoteNames();
    const counts: Record<string, number> = { local: 0 };
    for (const name of names) counts[name] = 0;
    for (const b of state.branches) {
      if (!b.isRemote) {
        counts.local += 1;
      } else if (b.remote) {
        counts[b.remote] = (counts[b.remote] ?? 0) + 1;
      }
    }
    return counts;
  }

  function visibleBranches(): BranchInfo[] {
    const q = state.filter.toLowerCase();
    return state.branches.filter((b) => {
      if (q && !b.name.toLowerCase().includes(q)) return false;
      if (state.branchScope === 'local') return !b.isRemote;
      return b.isRemote && b.remote === state.branchScope;
    });
  }

  function bindEvents(): void {
    root.querySelector('#git-add-repo')?.addEventListener('click', () => {
      void run(async () => {
        const selected = await open({
          directory: true,
          multiple: false,
          title: '选择 Git 仓库目录',
        });
        if (!selected || Array.isArray(selected)) return;
        const cfg = await gitApi.addRepo(selected);
        state.config = cfg;
        if (cfg.selectedRepoId) await refreshRepo(cfg.selectedRepoId);
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-select-repo]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.selectRepo;
        if (!id) return;
        void run(async () => {
          const cfg = await gitApi.selectRepo(id);
          state.config = cfg;
          state.centerTab = 'branches';
          state.branchScope = 'local';
          state.filter = '';
          await refreshRepo(id);
        });
      });
    });

    root.querySelector('#git-remove-repo')?.addEventListener('click', () => {
      const repo = selectedRepo();
      if (!repo) return;
      if (!confirm('从列表移除该仓库？（不会删除磁盘文件）')) return;
      void run(async () => {
        const cfg = await gitApi.removeRepo(repo.id);
        state.config = cfg;
        if (cfg.selectedRepoId) await refreshRepo(cfg.selectedRepoId);
        else {
          state.branches = [];
          state.status = null;
          state.logs = [];
        }
      });
    });

    root.querySelector('#git-refresh')?.addEventListener('click', () => {
      const repo = selectedRepo();
      if (!repo) return;
      void run(async () => {
        await refreshRepo(repo.id);
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-center-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.centerTab = (btn.dataset.centerTab as CenterTab) || 'branches';
        render();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-branch-scope]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.branchScope = btn.dataset.branchScope || 'local';
        render();
      });
    });

    const filterInput = root.querySelector<HTMLInputElement>('#git-branch-filter');
    filterInput?.addEventListener('input', () => {
      const pos = filterInput.selectionStart ?? filterInput.value.length;
      state.filter = filterInput.value;
      render();
      const el = root.querySelector<HTMLInputElement>('#git-branch-filter');
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });

    root.querySelectorAll<HTMLButtonElement>('[data-checkout]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const branch = btn.dataset.checkout;
        const repo = selectedRepo();
        if (!repo || !branch) return;
        void run(async () => {
          await gitApi.checkoutBranch(repo.id, branch);
          await refreshRepo(repo.id);
        });
      });
    });

    root.querySelector('#git-import-ssh')?.addEventListener('click', () => {
      void run(async () => {
        state.notice = null;
        const before = state.config?.profiles.length ?? 0;
        state.config = await gitApi.importMissingSshProfiles();
        state.sshKeys = await gitApi.listSshKeys();
        const added = (state.config.profiles.length ?? 0) - before;

        if (added > 0) {
          state.notice = `已从 ~/.ssh 导入 ${added} 个新 Profile`;
          return;
        }

        // No new keys from scan — open a picker so the action is never a silent no-op.
        const picked = await importSshKeyFile();
        if (!picked) {
          state.notice =
            state.sshKeys.length === 0
              ? '未在 ~/.ssh 发现可用密钥（需有对应 .pub）。已取消文件选择'
              : `~/.ssh 中 ${state.sshKeys.length} 把密钥均已在 Profiles 中。已取消文件选择`;
        }
      });
    });

    root.querySelector('#git-new-profile')?.addEventListener('click', () => {
      state.editing = emptyProfile();
      render();
    });

    root.querySelectorAll<HTMLButtonElement>('[data-apply-profile]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const profileId = btn.dataset.applyProfile;
        const repo = selectedRepo();
        if (!repo || !profileId) return;
        void run(async () => {
          state.status = await gitApi.applyProfile(repo.id, profileId);
          state.config = await gitApi.getConfig();
        });
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-edit-profile]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.editProfile;
        const profile = state.config?.profiles.find((p) => p.id === id);
        if (!profile) return;
        state.editing = { ...profile };
        render();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-delete-profile]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteProfile;
        if (!id) return;
        if (!confirm('删除此 Profile？')) return;
        void run(async () => {
          state.config = await gitApi.deleteProfile(id);
        });
      });
    });

    root.querySelector('#git-modal-close')?.addEventListener('click', () => {
      if (!state.busy) {
        state.editing = null;
        render();
      }
    });

    root.querySelector('#git-modal-backdrop')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget && !state.busy) {
        state.editing = null;
        render();
      }
    });

    root.querySelector('#git-modal-cancel')?.addEventListener('click', () => {
      if (!state.busy) {
        state.editing = null;
        render();
      }
    });

    const form = root.querySelector<HTMLFormElement>('#git-profile-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!state.editing) return;
      const fd = new FormData(form);
      state.editing = {
        ...state.editing,
        name: String(fd.get('name') ?? ''),
        userName: String(fd.get('userName') ?? ''),
        userEmail: String(fd.get('userEmail') ?? ''),
        sshKeyPath: String(fd.get('sshKeyPath') ?? ''),
        sshHostAlias: String(fd.get('sshHostAlias') ?? ''),
      };
      void run(async () => {
        state.config = await gitApi.upsertProfile(state.editing!);
        state.editing = null;
      });
    });

    const sshSelect = root.querySelector<HTMLSelectElement>('#git-ssh-select');
    const sshManual = root.querySelector<HTMLInputElement>('#git-ssh-manual');
    sshSelect?.addEventListener('change', () => {
      if (sshManual) sshManual.value = sshSelect.value;
      const nameInput = root.querySelector<HTMLInputElement>('#git-profile-name');
      if (nameInput && !nameInput.value.trim()) {
        const key = state.sshKeys.find((k) => k.path === sshSelect.value);
        if (key) nameInput.value = key.comment || key.name;
      }
    });
  }

  function renderCenter(repoSelected: boolean): string {
    if (!repoSelected) {
      return `<div class="git-panel-body"><div class="empty-inline">从左侧选择仓库</div></div>`;
    }

    const tabs = `
      <div class="git-tabs">
        <button class="git-tab ${state.centerTab === 'branches' ? 'is-active' : ''}" type="button" data-center-tab="branches">
          分支 (${state.branches.length})
        </button>
        <button class="git-tab ${state.centerTab === 'commits' ? 'is-active' : ''}" type="button" data-center-tab="commits">
          提交 (${state.logs.length})
        </button>
        <button class="git-tab ${state.centerTab === 'remotes' ? 'is-active' : ''}" type="button" data-center-tab="remotes">
          Remotes (${state.status?.remotes.length ?? 0})
        </button>
      </div>`;

    if (state.centerTab === 'commits') {
      const items = state.logs.map(parseLogLine);
      return `
        ${tabs}
        <div class="git-panel-body">
          ${
            items.length
              ? `<ul class="git-commit-list">${items
                  .map(
                    (c) => `
                <li class="git-commit-item">
                  <div class="git-commit-top">
                    <span class="git-commit-hash">${escapeHtml(c.hash)}</span>
                    <span class="meta">${escapeHtml(c.when)}</span>
                  </div>
                  <div>${escapeHtml(c.subject)}</div>
                  <div class="meta">${escapeHtml(c.author)}</div>
                </li>`,
                  )
                  .join('')}</ul>`
              : '<div class="empty-inline">暂无提交记录</div>'
          }
        </div>`;
    }

    if (state.centerTab === 'remotes') {
      const remotes = state.status?.remotes ?? [];
      return `
        ${tabs}
        <div class="git-panel-body">
          ${
            remotes.length
              ? `<ul class="git-remote-list">${remotes
                  .map(
                    (r) => `
                <li class="git-remote-item">
                  <strong>${escapeHtml(r.name)}</strong>
                  <span class="meta mono">${escapeHtml(r.url)}</span>
                </li>`,
                  )
                  .join('')}</ul>`
              : '<div class="empty-inline">没有配置 remote</div>'
          }
        </div>`;
    }

    const names = remoteNames();
    const urls = remoteUrlByName();
    const counts = scopeCounts();
    if (state.branchScope !== 'local' && !names.includes(state.branchScope)) {
      state.branchScope = 'local';
    }
    const activeRemoteUrl =
      state.branchScope !== 'local' ? urls.get(state.branchScope) : undefined;
    const branches = visibleBranches();

    return `
      ${tabs}
      <div class="git-subtabs">
        <button class="git-subtab ${state.branchScope === 'local' ? 'is-active' : ''}" type="button" data-branch-scope="local">
          本地 (${counts.local ?? 0})
        </button>
        ${names
          .map(
            (name) => `
          <button class="git-subtab ${state.branchScope === name ? 'is-active' : ''}" type="button" data-branch-scope="${escapeHtml(name)}" title="${escapeHtml(urls.get(name) || name)}">
            ${escapeHtml(name)} (${counts[name] ?? 0})
          </button>`,
          )
          .join('')}
      </div>
      ${
        activeRemoteUrl
          ? `<div class="git-scope-banner">
              <span class="git-pill">${escapeHtml(state.branchScope)}</span>
              <span class="meta truncate" title="${escapeHtml(activeRemoteUrl)}">${escapeHtml(activeRemoteUrl)}</span>
            </div>`
          : ''
      }
      <div class="git-toolbar">
        <input id="git-branch-filter" class="git-input grow" placeholder="${
          state.branchScope === 'local'
            ? '筛选本地分支…'
            : `筛选 ${escapeHtml(state.branchScope)} 分支…`
        }" value="${escapeHtml(state.filter)}" />
      </div>
      <div class="git-panel-body">
        ${
          branches.length
            ? `<div class="git-branch-list">${branches
                .map((b) => {
                  const label =
                    b.isRemote && b.remote
                      ? b.name.slice(b.remote.length + 1) || b.name
                      : b.name;
                  return `
                  <div class="git-branch-item ${b.isCurrent ? 'is-current' : ''}">
                    <div class="git-branch-row">
                      <span class="git-branch-name ${b.isRemote ? 'is-remote' : ''}">
                        ${b.isCurrent ? '●' : '○'} ${escapeHtml(label)}
                      </span>
                      <div class="actions">
                        ${
                          !b.isCurrent
                            ? `<button class="btn" type="button" data-checkout="${escapeHtml(b.name)}" ${state.busy ? 'disabled' : ''}>切换</button>`
                            : ''
                        }
                      </div>
                    </div>
                    <div class="meta">
                      ${
                        b.isRemote
                          ? escapeHtml(b.name)
                          : b.upstream
                            ? `tracks → ${escapeHtml(b.upstream)}`
                            : '无 upstream'
                      }
                    </div>
                  </div>`;
                })
                .join('')}</div>`
            : `<div class="empty-inline">${
                state.branchScope === 'local'
                  ? '没有匹配的本地分支'
                  : `没有匹配的 ${escapeHtml(state.branchScope)} 远程分支`
              }</div>`
        }
      </div>`;
  }

  function renderModal(): string {
    if (!state.editing) return '';
    const editing = state.editing;
    const keyOptions = state.sshKeys
      .map(
        (k) =>
          `<option value="${escapeHtml(k.path)}" ${editing.sshKeyPath === k.path ? 'selected' : ''}>${escapeHtml(k.name)}${k.comment ? ` — ${escapeHtml(k.comment)}` : ''}</option>`,
      )
      .join('');
    const orphanOption =
      editing.sshKeyPath && !state.sshKeys.some((k) => k.path === editing.sshKeyPath)
        ? `<option value="${escapeHtml(editing.sshKeyPath)}" selected>${escapeHtml(editing.sshKeyPath)}（未找到文件）</option>`
        : '';

    return `
      <div class="git-modal-backdrop" id="git-modal-backdrop">
        <div class="git-modal" role="dialog" aria-modal="true">
          <div class="git-modal-header">
            <h3>${editing.id ? '编辑 Profile' : '新增 Profile'}</h3>
            <button class="btn" type="button" id="git-modal-close" ${state.busy ? 'disabled' : ''}>关闭</button>
          </div>
          <form id="git-profile-form">
            <div class="git-modal-body">
              <label class="git-field">名称
                <input id="git-profile-name" name="name" value="${escapeHtml(editing.name)}" required autofocus />
              </label>
              <label class="git-field">user.name
                <input name="userName" value="${escapeHtml(editing.userName)}" />
              </label>
              <label class="git-field">user.email
                <input name="userEmail" value="${escapeHtml(editing.userEmail)}" />
              </label>
              <label class="git-field">SSH 私钥
                <select id="git-ssh-select" name="sshKeyPathSelect">
                  <option value="">（不设置 SSH）</option>
                  ${keyOptions}
                  ${orphanOption}
                </select>
              </label>
              <label class="git-field">或手动填写路径
                <input id="git-ssh-manual" name="sshKeyPath" placeholder="~/.ssh/id_ed25519_work" value="${escapeHtml(editing.sshKeyPath)}" />
              </label>
              <label class="git-field">SSH Host 别名（备注）
                <input name="sshHostAlias" placeholder="github-work" value="${escapeHtml(editing.sshHostAlias)}" />
              </label>
            </div>
            <div class="git-modal-footer">
              <button class="btn" type="button" id="git-modal-cancel" ${state.busy ? 'disabled' : ''}>取消</button>
              <button class="btn primary" type="submit" ${state.busy ? 'disabled' : ''}>保存</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  function render(): void {
    const repo = selectedRepo();
    const profile = boundProfile();
    const status = state.status;
    const disabled = state.busy || !repo;

    root.innerHTML = `
      <aside class="git-col">
        <div class="git-col-header">
          <h2>仓库</h2>
          <button class="btn primary" type="button" id="git-add-repo" ${state.busy ? 'disabled' : ''}>添加</button>
        </div>
        <div class="git-panel-body">
          ${
            !state.config?.repos.length
              ? '<div class="empty-inline">添加本地 Git 仓库开始管理</div>'
              : `<div class="git-repo-list">${state.config.repos
                  .map(
                    (r) => `
                  <button class="git-repo-item ${repo?.id === r.id ? 'is-active' : ''}" type="button" data-select-repo="${escapeHtml(r.id)}">
                    <span class="git-repo-name">${escapeHtml(r.name)}</span>
                    <span class="meta truncate">${escapeHtml(r.path)}</span>
                  </button>`,
                  )
                  .join('')}</div>`
          }
          ${
            repo
              ? `<div class="git-col-actions">
                  <button class="btn danger" type="button" id="git-remove-repo" ${state.busy ? 'disabled' : ''}>移除当前仓库</button>
                </div>`
              : ''
          }
        </div>
      </aside>

      <section class="git-col git-col-main">
        <div class="git-col-header">
          <h2>${repo ? escapeHtml(repo.name) : '仓库'}</h2>
          <div class="actions">
            <button class="btn" type="button" id="git-refresh" ${disabled ? 'disabled' : ''}>刷新</button>
          </div>
        </div>
        ${state.error ? `<div class="git-error">${escapeHtml(state.error)}</div>` : ''}
        ${
          status
            ? `<div class="git-status-bar">
                <span class="git-pill ok">${escapeHtml(status.currentBranch ?? '(detached)')}</span>
                <span class="git-pill ${status.isDirty ? 'warn' : ''}">${status.isDirty ? '有未提交改动' : '工作区干净'}</span>
                ${
                  status.ahead > 0 || status.behind > 0
                    ? `<span class="git-pill">↑${status.ahead} ↓${status.behind}</span>`
                    : ''
                }
                <span class="meta">${escapeHtml(status.userName || '?')} &lt;${escapeHtml(status.userEmail || '?')}&gt;</span>
                ${status.sshCommand ? `<span class="meta" title="${escapeHtml(status.sshCommand)}">SSH 已配置</span>` : ''}
                ${profile ? `<span class="git-pill ok">Profile: ${escapeHtml(profile.name)}</span>` : ''}
              </div>`
            : ''
        }
        ${renderCenter(Boolean(repo))}
      </section>

      <aside class="git-col">
        <div class="git-col-header">
          <h2>Profiles</h2>
          <div class="actions">
            <button class="btn" type="button" id="git-import-ssh" ${state.busy ? 'disabled' : ''} title="扫描 ~/.ssh 导入缺失密钥；若无新密钥则打开文件选择">导入 SSH</button>
            <button class="btn primary" type="button" id="git-new-profile" ${state.busy ? 'disabled' : ''}>新增</button>
          </div>
        </div>
        <div class="git-panel-body">
          ${
            state.notice
              ? `<div class="git-notice">${escapeHtml(state.notice)}</div>`
              : ''
          }
          ${
            state.sshKeys.length
              ? `<p class="meta git-ssh-hint">本机发现 ${state.sshKeys.length} 把密钥：${escapeHtml(state.sshKeys.map((k) => k.name).join(', '))}</p>`
              : '<p class="meta git-ssh-hint">未在 ~/.ssh 发现带 .pub 的私钥。可点「导入 SSH」手动选择文件。</p>'
          }
          ${
            !state.config?.profiles.length
              ? '<div class="empty-inline">还没有 Profile，点右上角新增或导入 SSH</div>'
              : `<div class="git-profile-list">${state.config.profiles
                  .map(
                    (p) => `
                  <div class="git-profile-item">
                    <strong>${escapeHtml(p.name || '(未命名)')}</strong>
                    <span class="meta">${escapeHtml(p.userName || '?')} &lt;${escapeHtml(p.userEmail || '?')}&gt;</span>
                    <span class="meta truncate">${escapeHtml(p.sshKeyPath || '无 SSH key')}</span>
                    <div class="actions">
                      <button class="btn primary" type="button" data-apply-profile="${escapeHtml(p.id)}" ${!repo || state.busy ? 'disabled' : ''}>应用</button>
                      <button class="btn" type="button" data-edit-profile="${escapeHtml(p.id)}">编辑</button>
                      <button class="btn danger" type="button" data-delete-profile="${escapeHtml(p.id)}">删除</button>
                    </div>
                  </div>`,
                  )
                  .join('')}</div>`
          }
          <p class="meta git-ssh-hint">「应用」写入该仓 local <code>user.*</code> 与 <code>core.sshCommand</code>。</p>
        </div>
      </aside>
      ${renderModal()}
    `;

    bindEvents();
  }

  return { state, bootstrap, render };
}
