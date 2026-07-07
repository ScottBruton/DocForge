use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

#[derive(Debug, Serialize, Deserialize)]
pub struct WordComResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

fn python_bridge_path() -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("..");
    path.push("python-bridge");
    path.push("word_com.py");
    path
}

fn run_python_command(command: &str, payload: &str) -> WordComResponse {
    let script = python_bridge_path();
    let output = Command::new("python")
        .arg(&script)
        .arg(command)
        .arg(payload)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&stdout) {
                WordComResponse {
                    success: parsed
                        .get("success")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false),
                    message: parsed
                        .get("message")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string(),
                    data: parsed.get("data").cloned(),
                }
            } else {
                WordComResponse {
                    success: false,
                    message: stdout.to_string(),
                    data: None,
                }
            }
        }
        Err(e) => WordComResponse {
            success: false,
            message: format!("Failed to run Python bridge: {e}"),
            data: None,
        },
    }
}

#[tauri::command]
pub async fn word_com_ping() -> Result<WordComResponse, String> {
    Ok(run_python_command("ping", "{}"))
}

#[tauri::command]
pub async fn word_com_command(command: String, payload: String) -> Result<WordComResponse, String> {
    Ok(run_python_command(&command, &payload))
}

#[allow(dead_code)]
fn _write_stdin_example() {
    // reserved for future stdin/stdout streaming protocol
    let _ = std::io::stdout().write_all(b"");
}
