use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiKeyResponse {
    pub key: Option<String>,
}

fn key_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("api_key.txt"))
}

#[tauri::command]
pub fn store_api_key(app: AppHandle, key: String) -> Result<(), String> {
    let path = key_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_api_key(app: AppHandle) -> Result<ApiKeyResponse, String> {
    let path = key_path(&app)?;
    if path.exists() {
        let key = fs::read_to_string(path).map_err(|e| e.to_string())?;
        Ok(ApiKeyResponse { key: Some(key) })
    } else {
        Ok(ApiKeyResponse { key: None })
    }
}

#[tauri::command]
pub fn delete_api_key(app: AppHandle) -> Result<(), String> {
    let path = key_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
