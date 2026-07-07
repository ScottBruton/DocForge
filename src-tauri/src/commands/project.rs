use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::State;

use crate::db::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectFiles {
    pub document_json: String,
    pub styles_json: String,
    pub path: String,
}

fn ensure_project_dirs(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path.join("assets")).map_err(|e| e.to_string())?;
    fs::create_dir_all(path.join("thumbnails")).map_err(|e| e.to_string())?;
    fs::create_dir_all(path.join("templates")).map_err(|e| e.to_string())?;
    fs::create_dir_all(path.join("linked")).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_project(
    path: String,
    document_json: String,
    styles_json: String,
    db: State<'_, DbState>,
) -> Result<ProjectFiles, String> {
    let project_path = Path::new(&path);
    fs::create_dir_all(project_path).map_err(|e| e.to_string())?;
    ensure_project_dirs(project_path)?;

    let doc_path = project_path.join("document.json");
    let styles_path = project_path.join("styles.json");
    fs::write(&doc_path, &document_json).map_err(|e| e.to_string())?;
    fs::write(&styles_path, &styles_json).map_err(|e| e.to_string())?;

    let metadata_db = project_path.join("metadata.db");
    crate::db::init_project_db(&metadata_db).map_err(|e| e.to_string())?;

    db.add_recent(&path)?;

    Ok(ProjectFiles {
        document_json,
        styles_json,
        path,
    })
}

#[tauri::command]
pub fn open_project(path: String, db: State<'_, DbState>) -> Result<ProjectFiles, String> {
    let project_path = Path::new(&path);
    let doc_path = project_path.join("document.json");
    let styles_path = project_path.join("styles.json");

    if !doc_path.exists() {
        return Err("document.json not found".into());
    }

    let document_json = fs::read_to_string(&doc_path).map_err(|e| e.to_string())?;
    let styles_json = if styles_path.exists() {
        fs::read_to_string(&styles_path).map_err(|e| e.to_string())?
    } else {
        "{}".into()
    };

    db.add_recent(&path)?;

    Ok(ProjectFiles {
        document_json,
        styles_json,
        path,
    })
}

#[tauri::command]
pub fn save_project(
    path: String,
    document_json: String,
    styles_json: String,
) -> Result<(), String> {
    let project_path = Path::new(&path);
    ensure_project_dirs(project_path)?;

    let doc_path = project_path.join("document.json");
    let styles_path = project_path.join("styles.json");
    let temp_doc = project_path.join("document.json.tmp");
    let temp_styles = project_path.join("styles.json.tmp");

    fs::write(&temp_doc, &document_json).map_err(|e| e.to_string())?;
    fs::write(&temp_styles, &styles_json).map_err(|e| e.to_string())?;
    fs::rename(&temp_doc, &doc_path).map_err(|e| e.to_string())?;
    fs::rename(&temp_styles, &styles_path).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn save_project_as(
    path: String,
    document_json: String,
    styles_json: String,
    db: State<'_, DbState>,
) -> Result<ProjectFiles, String> {
    create_project(path, document_json, styles_json, db)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentProject {
    pub path: String,
    pub opened_at: String,
}

#[tauri::command]
pub fn list_recent_projects(db: State<'_, DbState>) -> Result<Vec<RecentProject>, String> {
    db.list_recent()
}

#[tauri::command]
pub fn add_recent_project(path: String, db: State<'_, DbState>) -> Result<(), String> {
    db.add_recent(&path)
}
