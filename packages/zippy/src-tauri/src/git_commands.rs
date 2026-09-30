use crate::git::{self, BranchInfo, RepoStatus};
use crate::git_config::{self, AppConfig, ConfigError, Profile, SshKeyInfo};
use std::path::PathBuf;

fn repo_path(repo_id: &str) -> Result<PathBuf, ConfigError> {
    let cfg = git_config::load_config()?;
    let repo = git_config::find_repo(&cfg, repo_id)?;
    Ok(PathBuf::from(&repo.path))
}

fn profile_for_repo(repo_id: &str) -> Result<Option<Profile>, ConfigError> {
    let cfg = git_config::load_config()?;
    let repo = git_config::find_repo(&cfg, repo_id)?;
    Ok(match &repo.profile_id {
        Some(pid) => Some(git_config::find_profile(&cfg, pid)?.clone()),
        None => None,
    })
}

#[tauri::command]
pub fn get_config() -> Result<AppConfig, ConfigError> {
    git_config::load_config()
}

#[tauri::command]
pub fn add_repo(path: String, name: Option<String>) -> Result<AppConfig, ConfigError> {
    git_config::add_repo(&path, name)
}

#[tauri::command]
pub fn remove_repo(repo_id: String) -> Result<AppConfig, ConfigError> {
    git_config::remove_repo(&repo_id)
}

#[tauri::command]
pub fn select_repo(repo_id: String) -> Result<AppConfig, ConfigError> {
    git_config::select_repo(&repo_id)
}

#[tauri::command]
pub fn upsert_profile(profile: Profile) -> Result<AppConfig, ConfigError> {
    let mut p = profile;
    if p.id.trim().is_empty() {
        p.id = uuid::Uuid::new_v4().to_string();
    }
    git_config::upsert_profile(p)
}

#[tauri::command]
pub fn delete_profile(profile_id: String) -> Result<AppConfig, ConfigError> {
    git_config::delete_profile(&profile_id)
}

#[tauri::command]
pub fn bind_repo_profile(
    repo_id: String,
    profile_id: Option<String>,
) -> Result<AppConfig, ConfigError> {
    git_config::bind_repo_profile(&repo_id, profile_id)
}

#[tauri::command]
pub fn list_branches(repo_id: String) -> Result<Vec<BranchInfo>, ConfigError> {
    let path = repo_path(&repo_id)?;
    git::list_branches(&path)
}

#[tauri::command]
pub fn checkout_branch(repo_id: String, branch: String) -> Result<(), ConfigError> {
    let path = repo_path(&repo_id)?;
    git::checkout_branch(&path, &branch)
}

#[tauri::command]
pub fn create_branch(repo_id: String, name: String, checkout: bool) -> Result<(), ConfigError> {
    let path = repo_path(&repo_id)?;
    git::create_branch(&path, &name, checkout)
}

#[tauri::command]
pub fn delete_branch(repo_id: String, name: String, force: bool) -> Result<(), ConfigError> {
    let path = repo_path(&repo_id)?;
    git::delete_branch(&path, &name, force)
}

#[tauri::command]
pub fn get_repo_status(repo_id: String) -> Result<RepoStatus, ConfigError> {
    let path = repo_path(&repo_id)?;
    git::repo_status(&path)
}

#[tauri::command]
pub fn apply_profile(repo_id: String, profile_id: String) -> Result<RepoStatus, ConfigError> {
    let cfg = git_config::load_config()?;
    let path = PathBuf::from(&git_config::find_repo(&cfg, &repo_id)?.path);
    let profile = git_config::find_profile(&cfg, &profile_id)?.clone();
    git::apply_profile(&path, &profile)?;
    git_config::bind_repo_profile(&repo_id, Some(profile_id))?;
    git::repo_status(&path)
}

#[tauri::command]
pub fn fetch_repo(repo_id: String) -> Result<String, ConfigError> {
    let path = repo_path(&repo_id)?;
    let profile = profile_for_repo(&repo_id)?;
    git::fetch(&path, profile.as_ref())
}

#[tauri::command]
pub fn push_repo(repo_id: String, set_upstream: bool) -> Result<String, ConfigError> {
    let path = repo_path(&repo_id)?;
    let profile = profile_for_repo(&repo_id)?;
    git::push(&path, profile.as_ref(), set_upstream)
}

#[tauri::command]
pub fn recent_log(repo_id: String, limit: Option<usize>) -> Result<Vec<String>, ConfigError> {
    let path = repo_path(&repo_id)?;
    git::recent_log(&path, limit.unwrap_or(12))
}

#[tauri::command]
pub fn list_ssh_keys() -> Result<Vec<SshKeyInfo>, ConfigError> {
    git_config::list_ssh_keys()
}

#[tauri::command]
pub fn import_missing_ssh_profiles() -> Result<AppConfig, ConfigError> {
    git_config::import_missing_ssh_profiles()
}
