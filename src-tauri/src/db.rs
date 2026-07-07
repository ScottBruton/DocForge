use rusqlite::{Connection, Result};
use std::path::Path;

pub fn init_db(path: &Path) -> Result<()> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS recent_projects (
            path TEXT PRIMARY KEY,
            opened_at TEXT NOT NULL
        );",
    )?;
    Ok(())
}

pub fn init_project_db(path: &Path) -> Result<()> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS assets_index (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            local_path TEXT NOT NULL,
            thumbnail_path TEXT,
            asset_type TEXT NOT NULL,
            tags TEXT,
            description TEXT,
            created_at TEXT NOT NULL,
            modified_at TEXT NOT NULL,
            usage_count INTEGER DEFAULT 0,
            referenced_block_ids TEXT DEFAULT '[]',
            hash TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS generation_sessions (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            prompt TEXT,
            status TEXT
        );
        CREATE TABLE IF NOT EXISTS project_template (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            local_path TEXT NOT NULL,
            uploaded_at TEXT NOT NULL,
            source_hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS style_mappings (
            word_style_id TEXT PRIMARY KEY,
            word_style_name TEXT NOT NULL,
            docforge_style_id TEXT NOT NULL,
            extracted_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS linked_word_document (
            id TEXT PRIMARY KEY,
            word_path TEXT NOT NULL,
            imported_at TEXT NOT NULL,
            last_synced_at TEXT,
            original_filename TEXT NOT NULL
        );",
    )?;
    migrate_project_db(&conn)?;
    Ok(())
}

fn migrate_project_db(conn: &Connection) -> Result<()> {
    let columns: Vec<String> = conn
        .prepare("PRAGMA table_info(assets_index)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .collect();

    if !columns.is_empty() {
        if !columns.contains(&"referenced_block_ids".to_string()) {
            conn.execute(
                "ALTER TABLE assets_index ADD COLUMN referenced_block_ids TEXT DEFAULT '[]'",
                [],
            )?;
        }
        if !columns.contains(&"hash".to_string()) {
            conn.execute(
                "ALTER TABLE assets_index ADD COLUMN hash TEXT DEFAULT ''",
                [],
            )?;
        }
    }

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS project_template (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            local_path TEXT NOT NULL,
            uploaded_at TEXT NOT NULL,
            source_hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS style_mappings (
            word_style_id TEXT PRIMARY KEY,
            word_style_name TEXT NOT NULL,
            docforge_style_id TEXT NOT NULL,
            extracted_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS linked_word_document (
            id TEXT PRIMARY KEY,
            word_path TEXT NOT NULL,
            imported_at TEXT NOT NULL,
            last_synced_at TEXT,
            original_filename TEXT NOT NULL
        );",
    )?;
    Ok(())
}

pub fn ensure_project_db(project_path: &Path) -> Result<(), String> {
    let db_path = project_path.join("metadata.db");
    if db_path.exists() {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        migrate_project_db(&conn).map_err(|e| e.to_string())?;
    } else {
        init_project_db(&db_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn open_project_conn(project_path: &Path) -> Result<Connection, String> {
    ensure_project_db(project_path)?;
    Connection::open(project_path.join("metadata.db")).map_err(|e| e.to_string())
}

pub struct DbState {
    pub path: String,
}

impl DbState {
    fn conn(&self) -> Result<Connection> {
        Connection::open(&self.path)
    }

    pub fn add_recent(&self, path: &str) -> Result<(), String> {
        let conn = self.conn().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO recent_projects (path, opened_at) VALUES (?1, ?2)
             ON CONFLICT(path) DO UPDATE SET opened_at = ?2",
            [path, &now],
        )
        .map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM recent_projects WHERE path NOT IN (
                SELECT path FROM recent_projects ORDER BY opened_at DESC LIMIT 10
            )",
            [],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_recent(&self) -> Result<Vec<crate::commands::project::RecentProject>, String> {
        let conn = self.conn().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT path, opened_at FROM recent_projects ORDER BY opened_at DESC LIMIT 10",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(crate::commands::project::RecentProject {
                    path: row.get(0)?,
                    opened_at: row.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row.map_err(|e| e.to_string())?);
        }
        Ok(results)
    }
}
