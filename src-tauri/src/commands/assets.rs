use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

use crate::db::DbState;

#[derive(Debug, Serialize)]
pub struct ImportAssetResult {
    pub filename: String,
    pub local_path: String,
    pub thumbnail_path: String,
    pub hash: String,
    pub asset_type: String,
}

fn detect_asset_type(filename: &str) -> String {
    let lower = filename.to_lowercase();
    if lower.ends_with(".png")
        || lower.ends_with(".jpg")
        || lower.ends_with(".jpeg")
        || lower.ends_with(".gif")
        || lower.ends_with(".webp")
        || lower.ends_with(".svg")
    {
        "image".into()
    } else if lower.ends_with(".pdf") {
        "pdf".into()
    } else if lower.ends_with(".csv") || lower.ends_with(".xlsx") || lower.ends_with(".xls") {
        "table-data".into()
    } else {
        "other".into()
    }
}

fn file_hash(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(hex::encode(hasher.finalize()))
}

#[tauri::command]
pub fn import_asset(
    project_path: String,
    source_path: String,
) -> Result<ImportAssetResult, String> {
    let project = PathBuf::from(&project_path);
    let assets_dir = project.join("assets");
    fs::create_dir_all(&assets_dir).map_err(|e| e.to_string())?;

    let source = PathBuf::from(&source_path);
    let filename = source
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("invalid filename")?
        .to_string();

    let hash = file_hash(&source)?;
    let dest_name = format!("{}_{}", &hash[..12], filename);
    let dest_path = assets_dir.join(&dest_name);

    if !dest_path.exists() {
        fs::copy(&source, &dest_path).map_err(|e| e.to_string())?;
    }

    let thumb_path = generate_thumbnail_internal(&project_path, &dest_path)?;

    Ok(ImportAssetResult {
        filename,
        local_path: dest_path.to_string_lossy().to_string(),
        thumbnail_path: thumb_path,
        hash,
        asset_type: detect_asset_type(&dest_name),
    })
}

pub fn generate_thumbnail_internal(project_path: &str, image_path: &Path) -> Result<String, String> {
    let project = PathBuf::from(project_path);
    let thumbs_dir = project.join("thumbnails");
    fs::create_dir_all(&thumbs_dir).map_err(|e| e.to_string())?;

    let stem = image_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("thumb");
    let thumb_path = thumbs_dir.join(format!("{stem}_thumb.png"));

    if thumb_path.exists() {
        return Ok(thumb_path.to_string_lossy().to_string());
    }

    let ext = image_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if ext == "pdf" || ext == "svg" {
        return Ok(String::new());
    }

    match image::open(image_path) {
        Ok(img) => {
            let thumb = img.thumbnail(200, 200);
            thumb.save(&thumb_path).map_err(|e| e.to_string())?;
            Ok(thumb_path.to_string_lossy().to_string())
        }
        Err(_) => Ok(String::new()),
    }
}

#[tauri::command]
pub fn generate_thumbnail(project_path: String, image_path: String) -> Result<String, String> {
    generate_thumbnail_internal(&project_path, Path::new(&image_path))
}

#[tauri::command]
pub fn delete_asset_file(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn read_file_base64(file_path: String) -> Result<String, String> {
    let bytes = fs::read(&file_path).map_err(|e| e.to_string())?;
    use base64::{engine::general_purpose::STANDARD, Engine};
    Ok(STANDARD.encode(bytes))
}
