use rusqlite::params;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use zip::ZipArchive;

use crate::db::{ensure_project_db, open_project_conn};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectTemplateInfo {
    pub id: String,
    pub filename: String,
    pub local_path: String,
    pub uploaded_at: String,
    pub source_hash: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StyleMappingRecord {
    pub word_style_id: String,
    pub word_style_name: String,
    pub docforge_style_id: String,
    pub extracted_json: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LinkedWordDocument {
    pub word_path: String,
    pub imported_at: String,
    pub last_synced_at: Option<String>,
    pub original_filename: String,
    pub source_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoredAssetRecord {
    pub id: String,
    pub filename: String,
    pub local_path: String,
    pub thumbnail_path: String,
    pub asset_type: String,
    pub tags: String,
    pub description: String,
    pub created_at: String,
    pub modified_at: String,
    pub usage_count: i64,
    pub referenced_block_ids: String,
    pub hash: String,
}

fn file_hash(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(hex::encode(hasher.finalize()))
}

fn read_docx_entry(docx_path: &Path, entry: &str) -> Result<String, String> {
    let file = fs::File::open(docx_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut entry_file = archive.by_name(entry).map_err(|e| e.to_string())?;
    let mut contents = String::new();
    entry_file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
    Ok(contents)
}

fn ensure_project_dirs(project_path: &Path) -> Result<(), String> {
    fs::create_dir_all(project_path.join("assets")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_path.join("thumbnails")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_path.join("templates")).map_err(|e| e.to_string())?;
    fs::create_dir_all(project_path.join("linked")).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn upload_project_template(
    project_path: String,
    source_path: String,
) -> Result<ProjectTemplateInfo, String> {
    let project = PathBuf::from(&project_path);
    ensure_project_dirs(&project)?;
    ensure_project_db(&project)?;

    let source = PathBuf::from(&source_path);
    let filename = source
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("invalid filename")?
        .to_string();

    if !filename.to_lowercase().ends_with(".docx") {
        return Err("Template must be a .docx file".into());
    }

    let hash = file_hash(&source)?;
    let dest_path = project.join("templates").join("template.docx");
    fs::copy(&source, &dest_path).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    let id = "default".to_string();
    let info = ProjectTemplateInfo {
        id: id.clone(),
        filename: filename.clone(),
        local_path: dest_path.to_string_lossy().to_string(),
        uploaded_at: now.clone(),
        source_hash: hash.clone(),
    };

    let conn = open_project_conn(&project)?;
    conn.execute(
        "INSERT INTO project_template (id, filename, local_path, uploaded_at, source_hash)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET
           filename = excluded.filename,
           local_path = excluded.local_path,
           uploaded_at = excluded.uploaded_at,
           source_hash = excluded.source_hash",
        params![id, filename, info.local_path, now, hash],
    )
    .map_err(|e| e.to_string())?;

    Ok(info)
}

#[tauri::command]
pub fn get_project_template(project_path: String) -> Result<Option<ProjectTemplateInfo>, String> {
    let project = PathBuf::from(&project_path);
    if !project.join("metadata.db").exists() {
        return Ok(None);
    }
    ensure_project_db(&project)?;
    let conn = open_project_conn(&project)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, filename, local_path, uploaded_at, source_hash
             FROM project_template WHERE id = 'default'",
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query([])
        .map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(ProjectTemplateInfo {
            id: row.get(0).map_err(|e| e.to_string())?,
            filename: row.get(1).map_err(|e| e.to_string())?,
            local_path: row.get(2).map_err(|e| e.to_string())?,
            uploaded_at: row.get(3).map_err(|e| e.to_string())?,
            source_hash: row.get(4).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn extract_docx_styles_xml(source_path: String) -> Result<String, String> {
    read_docx_entry(Path::new(&source_path), "word/styles.xml")
}

#[tauri::command]
pub fn save_style_mappings(
    project_path: String,
    mappings: Vec<StyleMappingRecord>,
) -> Result<(), String> {
    let project = PathBuf::from(&project_path);
    ensure_project_db(&project)?;
    let conn = open_project_conn(&project)?;
    conn.execute("DELETE FROM style_mappings", [])
        .map_err(|e| e.to_string())?;
    for m in mappings {
        conn.execute(
            "INSERT INTO style_mappings (word_style_id, word_style_name, docforge_style_id, extracted_json)
             VALUES (?1, ?2, ?3, ?4)",
            params![m.word_style_id, m.word_style_name, m.docforge_style_id, m.extracted_json],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_style_mappings(project_path: String) -> Result<Vec<StyleMappingRecord>, String> {
    let project = PathBuf::from(&project_path);
    if !project.join("metadata.db").exists() {
        return Ok(vec![]);
    }
    ensure_project_db(&project)?;
    let conn = open_project_conn(&project)?;
    let mut stmt = conn
        .prepare(
            "SELECT word_style_id, word_style_name, docforge_style_id, extracted_json
             FROM style_mappings",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(StyleMappingRecord {
                word_style_id: row.get(0)?,
                word_style_name: row.get(1)?,
                docforge_style_id: row.get(2)?,
                extracted_json: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[tauri::command]
pub fn link_word_document(
    project_path: String,
    source_path: String,
) -> Result<LinkedWordDocument, String> {
    let project = PathBuf::from(&project_path);
    ensure_project_dirs(&project)?;
    ensure_project_db(&project)?;

    let source = PathBuf::from(&source_path);
    let filename = source
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("invalid filename")?
        .to_string();

    let dest_path = project.join("linked").join("document.docx");
    fs::copy(&source, &dest_path).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().to_rfc3339();
    let linked = LinkedWordDocument {
        word_path: dest_path.to_string_lossy().to_string(),
        imported_at: now.clone(),
        last_synced_at: None,
        original_filename: filename,
        source_path: Some(source_path.clone()),
    };

    let conn = open_project_conn(&project)?;
    conn.execute(
        "INSERT INTO linked_word_document (id, word_path, imported_at, last_synced_at, original_filename, source_path)
         VALUES ('default', ?1, ?2, NULL, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET
           word_path = excluded.word_path,
           imported_at = excluded.imported_at,
           last_synced_at = NULL,
           original_filename = excluded.original_filename,
           source_path = excluded.source_path",
        params![linked.word_path, now, linked.original_filename, source_path],
    )
    .map_err(|e| e.to_string())?;

    Ok(linked)
}

#[tauri::command]
pub fn get_linked_word_document(project_path: String) -> Result<Option<LinkedWordDocument>, String> {
    let project = PathBuf::from(&project_path);
    if !project.join("metadata.db").exists() {
        return Ok(None);
    }
    ensure_project_db(&project)?;
    let conn = open_project_conn(&project)?;
    let mut stmt = conn
        .prepare(
            "SELECT word_path, imported_at, last_synced_at, original_filename, source_path
             FROM linked_word_document WHERE id = 'default'",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(LinkedWordDocument {
            word_path: row.get(0).map_err(|e| e.to_string())?,
            imported_at: row.get(1).map_err(|e| e.to_string())?,
            last_synced_at: row.get(2).ok(),
            original_filename: row.get(3).map_err(|e| e.to_string())?,
            source_path: row.get(4).ok(),
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn mark_word_document_synced(project_path: String) -> Result<(), String> {
    let project = PathBuf::from(&project_path);
    ensure_project_db(&project)?;
    let now = chrono::Utc::now().to_rfc3339();
    let conn = open_project_conn(&project)?;
    conn.execute(
        "UPDATE linked_word_document SET last_synced_at = ?1 WHERE id = 'default'",
        params![now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn write_linked_word_document(
    project_path: String,
    base64_data: String,
) -> Result<String, String> {
    let project = PathBuf::from(&project_path);
    ensure_project_dirs(&project)?;
    let dest_path = project.join("linked").join("document.docx");

    use base64::{engine::general_purpose::STANDARD, Engine};
    let bytes = STANDARD.decode(base64_data).map_err(|e| e.to_string())?;
    fs::write(&dest_path, bytes).map_err(|e| e.to_string())?;

    ensure_project_db(&project)?;
    let now = chrono::Utc::now().to_rfc3339();
    let conn = open_project_conn(&project)?;
    conn.execute(
        "INSERT INTO linked_word_document (id, word_path, imported_at, last_synced_at, original_filename)
         VALUES ('default', ?1, ?2, ?3, 'document.docx')
         ON CONFLICT(id) DO UPDATE SET
           word_path = excluded.word_path,
           last_synced_at = excluded.last_synced_at",
        params![dest_path.to_string_lossy().to_string(), now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn file_path_exists(file_path: String) -> bool {
    PathBuf::from(file_path).is_file()
}

#[tauri::command]
pub fn upsert_project_asset(
    project_path: String,
    asset: StoredAssetRecord,
) -> Result<(), String> {
    let project = PathBuf::from(&project_path);
    ensure_project_db(&project)?;
    let conn = open_project_conn(&project)?;
    conn.execute(
        "INSERT INTO assets_index
         (id, filename, local_path, thumbnail_path, asset_type, tags, description,
          created_at, modified_at, usage_count, referenced_block_ids, hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
         ON CONFLICT(id) DO UPDATE SET
           filename = excluded.filename,
           local_path = excluded.local_path,
           thumbnail_path = excluded.thumbnail_path,
           asset_type = excluded.asset_type,
           tags = excluded.tags,
           description = excluded.description,
           modified_at = excluded.modified_at,
           usage_count = excluded.usage_count,
           referenced_block_ids = excluded.referenced_block_ids,
           hash = excluded.hash",
        params![
            asset.id,
            asset.filename,
            asset.local_path,
            asset.thumbnail_path,
            asset.asset_type,
            asset.tags,
            asset.description,
            asset.created_at,
            asset.modified_at,
            asset.usage_count,
            asset.referenced_block_ids,
            asset.hash,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_project_assets(project_path: String) -> Result<Vec<StoredAssetRecord>, String> {
    let project = PathBuf::from(&project_path);
    if !project.join("metadata.db").exists() {
        return Ok(vec![]);
    }
    ensure_project_db(&project)?;
    let conn = open_project_conn(&project)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, filename, local_path, thumbnail_path, asset_type, tags, description,
                    created_at, modified_at, usage_count, referenced_block_ids, hash
             FROM assets_index ORDER BY created_at",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(StoredAssetRecord {
                id: row.get(0)?,
                filename: row.get(1)?,
                local_path: row.get(2)?,
                thumbnail_path: row.get(3)?,
                asset_type: row.get(4)?,
                tags: row.get(5)?,
                description: row.get(6)?,
                created_at: row.get(7)?,
                modified_at: row.get(8)?,
                usage_count: row.get(9)?,
                referenced_block_ids: row.get(10)?,
                hash: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[derive(Debug, Serialize)]
pub struct ImportAssetBytesResult {
    pub filename: String,
    pub local_path: String,
    pub thumbnail_path: String,
    pub hash: String,
    pub asset_type: String,
}

#[tauri::command]
pub fn import_asset_bytes(
    project_path: String,
    filename: String,
    base64_data: String,
    asset_type: String,
) -> Result<ImportAssetBytesResult, String> {
    let project = PathBuf::from(&project_path);
    ensure_project_dirs(&project)?;
    let assets_dir = project.join("assets");

    use base64::{engine::general_purpose::STANDARD, Engine};
    let bytes = STANDARD.decode(base64_data).map_err(|e| e.to_string())?;

    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let hash = hex::encode(hasher.finalize());

    let dest_name = format!("{}_{}", &hash[..12.min(hash.len())], filename);
    let dest_path = assets_dir.join(&dest_name);

    if !dest_path.exists() {
        fs::write(&dest_path, &bytes).map_err(|e| e.to_string())?;
    }

    let thumb_path = crate::commands::assets::generate_thumbnail_internal(
        &project_path,
        &dest_path,
    )?;

    Ok(ImportAssetBytesResult {
        filename,
        local_path: dest_path.to_string_lossy().to_string(),
        thumbnail_path: thumb_path,
        hash,
        asset_type,
    })
}

#[tauri::command]
pub fn extract_docx_media(
    project_path: String,
    source_path: String,
) -> Result<Vec<ImportAssetBytesResult>, String> {
    let project = PathBuf::from(&project_path);
    ensure_project_dirs(&project)?;
    let assets_dir = project.join("assets");

    let file = fs::File::open(&source_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut results = Vec::new();

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name().to_string();
        if !name.starts_with("word/media/") {
            continue;
        }
        let filename = name
            .split('/')
            .next_back()
            .unwrap_or("image.png")
            .to_string();
        let mut bytes = Vec::new();
        file.read_to_end(&mut bytes).map_err(|e| e.to_string())?;

        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        let hash = hex::encode(hasher.finalize());
        let dest_name = format!("{}_{}", &hash[..12.min(hash.len())], filename);
        let dest_path = assets_dir.join(&dest_name);
        if !dest_path.exists() {
            fs::write(&dest_path, &bytes).map_err(|e| e.to_string())?;
        }

        let ext = filename.split('.').next_back().unwrap_or("").to_lowercase();
        let asset_type = if ["png", "jpg", "jpeg", "gif", "webp", "svg"].contains(&ext.as_str()) {
            "image"
        } else {
            "other"
        };

        let thumb_path = crate::commands::assets::generate_thumbnail_internal(
            &project_path,
            &dest_path,
        )?;

        results.push(ImportAssetBytesResult {
            filename: filename.clone(),
            local_path: dest_path.to_string_lossy().to_string(),
            thumbnail_path: thumb_path,
            hash,
            asset_type: asset_type.into(),
        });
    }

    Ok(results)
}
