/**
 * Tauri commands for custom updater (disabled for fork)
 */
use super::custom_updater::UpdateInfo;
use tauri::{command, AppHandle};

/// Check for updates - disabled in fork
#[command]
pub async fn check_for_app_updates(
    _app: AppHandle,
    _nonce_seed: String,
    _current_version: String,
) -> Result<Option<UpdateInfo>, String> {
    Ok(None)
}

/// Check if update is available - disabled in fork
#[command]
pub fn is_update_available(_current_version: String, _latest_version: String) -> bool {
    false
}
