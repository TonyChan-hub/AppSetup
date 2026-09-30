import { invoke } from '@tauri-apps/api/core';
import type {
  AppConfig,
  BranchInfo,
  Profile,
  RepoStatus,
  SshKeyInfo,
} from '../types/git';

export const gitApi = {
  getConfig: () => invoke<AppConfig>('get_config'),
  addRepo: (path: string, name?: string) =>
    invoke<AppConfig>('add_repo', { path, name: name ?? null }),
  removeRepo: (repoId: string) => invoke<AppConfig>('remove_repo', { repoId }),
  selectRepo: (repoId: string) => invoke<AppConfig>('select_repo', { repoId }),
  upsertProfile: (profile: Profile) => invoke<AppConfig>('upsert_profile', { profile }),
  deleteProfile: (profileId: string) =>
    invoke<AppConfig>('delete_profile', { profileId }),
  listBranches: (repoId: string) => invoke<BranchInfo[]>('list_branches', { repoId }),
  checkoutBranch: (repoId: string, branch: string) =>
    invoke<void>('checkout_branch', { repoId, branch }),
  getRepoStatus: (repoId: string) => invoke<RepoStatus>('get_repo_status', { repoId }),
  applyProfile: (repoId: string, profileId: string) =>
    invoke<RepoStatus>('apply_profile', { repoId, profileId }),
  recentLog: (repoId: string, limit = 30) =>
    invoke<string[]>('recent_log', { repoId, limit }),
  listSshKeys: () => invoke<SshKeyInfo[]>('list_ssh_keys'),
  importMissingSshProfiles: () => invoke<AppConfig>('import_missing_ssh_profiles'),
};
