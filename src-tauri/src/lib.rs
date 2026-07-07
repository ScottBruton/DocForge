pub mod commands;
pub mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let app_data = app.path().app_data_dir().expect("app data dir");
            std::fs::create_dir_all(&app_data).ok();
            let db_path = app_data.join("docforge.db");
            db::init_db(&db_path).expect("failed to init db");
            app.manage(db::DbState {
                path: db_path.to_string_lossy().to_string(),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::project::create_project,
            commands::project::open_project,
            commands::project::save_project,
            commands::project::save_project_as,
            commands::project::list_recent_projects,
            commands::project::add_recent_project,
            commands::assets::import_asset,
            commands::assets::generate_thumbnail,
            commands::assets::delete_asset_file,
            commands::assets::read_file_base64,
            commands::project_metadata::upload_project_template,
            commands::project_metadata::get_project_template,
            commands::project_metadata::extract_docx_styles_xml,
            commands::project_metadata::save_style_mappings,
            commands::project_metadata::get_style_mappings,
            commands::project_metadata::link_word_document,
            commands::project_metadata::get_linked_word_document,
            commands::project_metadata::mark_word_document_synced,
            commands::project_metadata::write_linked_word_document,
            commands::project_metadata::upsert_project_asset,
            commands::project_metadata::load_project_assets,
            commands::project_metadata::import_asset_bytes,
            commands::project_metadata::extract_docx_media,
            commands::settings::store_api_key,
            commands::settings::get_api_key,
            commands::settings::delete_api_key,
            commands::word::word_com_ping,
            commands::word::word_com_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
