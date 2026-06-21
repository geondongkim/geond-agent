use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::{
    collections::BTreeMap,
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::{AppHandle, Manager};

const LANGUAGE_SETTINGS_KEY: &str = "geond-agent.workbench.language";
const SESSION_DEFAULTS_SETTINGS_KEY: &str = "geond-agent.workbench.session-defaults";
const WORKSPACE_SETTINGS_KEY: &str = "geond-agent.workbench.workspace";
const LOCAL_ENV_FILE_NAME: &str = ".env.local";
const CLAUDE_ENV_KEYS: &[&str] = &[
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "ZAI_API_KEY",
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeCodeCommandRequest {
    executable: String,
    cwd: Option<String>,
    args: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeCodeCommandResponse {
    stdout: String,
    stderr: String,
    exit_code: Option<i32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDescriptor {
    id: String,
    label: String,
    path: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_app_setting,
            save_app_setting,
            remove_app_setting,
            append_workbench_events,
            list_workbench_events,
            list_workspaces,
            run_claude_code_stream_json
        ])
        .run(tauri::generate_context!())
        .expect("error while running geond-agent desktop");
}

#[tauri::command]
fn load_app_setting(app: AppHandle, key: String) -> Result<Option<String>, String> {
    ensure_allowed_setting_key(&key)?;
    let values = read_settings(&app)?;
    Ok(values.get(&key).cloned())
}

#[tauri::command]
fn save_app_setting(app: AppHandle, key: String, value: String) -> Result<(), String> {
    ensure_allowed_setting_key(&key)?;
    let mut values = read_settings(&app)?;
    values.insert(key, value);
    write_settings(&app, &values)
}

#[tauri::command]
fn remove_app_setting(app: AppHandle, key: String) -> Result<(), String> {
    ensure_allowed_setting_key(&key)?;
    let mut values = read_settings(&app)?;
    values.remove(&key);
    write_settings(&app, &values)
}

#[tauri::command]
fn append_workbench_events(app: AppHandle, events: Vec<Value>) -> Result<usize, String> {
    let connection = open_event_store(&app)?;
    let mut statement = connection
        .prepare(
            "insert into workbench_events (session_id, event_type, event_at, payload_json)
             values (?1, ?2, ?3, ?4)",
        )
        .map_err(to_string)?;

    let mut inserted = 0;
    for event in events {
        let session_id = read_string(&event, "sessionId").unwrap_or_else(|| "unknown".to_string());
        let event_type = read_string(&event, "type").unwrap_or_else(|| "unknown".to_string());
        let event_at = read_string(&event, "at");
        let payload = serde_json::to_string(&event).map_err(to_string)?;

        statement
            .execute(params![session_id, event_type, event_at, payload])
            .map_err(to_string)?;
        inserted += 1;
    }

    Ok(inserted)
}

#[tauri::command]
fn list_workbench_events(app: AppHandle, session_id: Option<String>) -> Result<Vec<Value>, String> {
    let connection = open_event_store(&app)?;
    let sql = match session_id {
        Some(_) => {
            "select payload_json from workbench_events where session_id = ?1 order by id asc"
        }
        None => "select payload_json from workbench_events order by id asc",
    };
    let mut statement = connection.prepare(sql).map_err(to_string)?;
    let rows = match session_id {
        Some(session_id) => statement
            .query_map(params![session_id], |row| row.get::<_, String>(0))
            .map_err(to_string)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(to_string)?,
        None => statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(to_string)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(to_string)?,
    };

    rows.into_iter()
        .map(|payload| serde_json::from_str(&payload).map_err(to_string))
        .collect()
}

#[tauri::command]
fn list_workspaces() -> Result<Vec<WorkspaceDescriptor>, String> {
    let path = env::current_dir().map_err(to_string)?;
    Ok(vec![workspace_descriptor(path)])
}

#[tauri::command]
fn run_claude_code_stream_json(
    request: ClaudeCodeCommandRequest,
) -> Result<ClaudeCodeCommandResponse, String> {
    if request.executable != "claude" {
        return Err("Only the user-installed `claude` executable is allowed.".to_string());
    }
    ensure_stream_json_args(&request.args)?;

    let mut command = Command::new(&request.executable);
    command.args(&request.args);

    let cwd = request.cwd.as_deref().map(PathBuf::from);
    if let Some(cwd) = &cwd {
        command.current_dir(cwd);
    }
    for (key, value) in allowed_local_env(cwd.as_deref())? {
        command.env(key, value);
    }

    let output = command.output().map_err(to_string)?;
    Ok(ClaudeCodeCommandResponse {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code(),
    })
}

fn ensure_allowed_setting_key(key: &str) -> Result<(), String> {
    match key {
        LANGUAGE_SETTINGS_KEY | SESSION_DEFAULTS_SETTINGS_KEY | WORKSPACE_SETTINGS_KEY => Ok(()),
        _ => Err("Unsupported settings key.".to_string()),
    }
}

fn ensure_stream_json_args(args: &[String]) -> Result<(), String> {
    let has_bare = args.iter().any(|arg| arg == "--bare");
    let has_print = args.iter().any(|arg| arg == "-p" || arg == "--print");
    let has_verbose = args.iter().any(|arg| arg == "--verbose");
    let has_stream_json = args
        .windows(2)
        .any(|window| window[0] == "--output-format" && window[1] == "stream-json");

    if has_bare && has_print && has_verbose && has_stream_json {
        Ok(())
    } else {
        Err(
            "Claude Code runner requires --bare -p --verbose --output-format stream-json."
                .to_string(),
        )
    }
}

fn allowed_local_env(cwd: Option<&Path>) -> Result<BTreeMap<String, String>, String> {
    let mut values = BTreeMap::new();

    if let Some(cwd) = cwd {
        let path = cwd.join(LOCAL_ENV_FILE_NAME);
        if path.exists() {
            for (key, value) in parse_local_env_file(&path)? {
                if CLAUDE_ENV_KEYS.contains(&key.as_str()) {
                    values.insert(key, value);
                }
            }
        }
    }

    if let Some(zai_key) = values.get("ZAI_API_KEY").cloned() {
        values
            .entry("ANTHROPIC_API_KEY".to_string())
            .or_insert(zai_key);
    }

    Ok(values)
}

fn parse_local_env_file(path: &Path) -> Result<BTreeMap<String, String>, String> {
    let text = fs::read_to_string(path).map_err(to_string)?;
    let mut values = BTreeMap::new();

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim().trim_start_matches("export ").to_string();
            let value = unquote_env_value(value.trim());
            if !key.is_empty() && !value.trim().is_empty() {
                values.insert(key, value);
            }
        }
    }

    Ok(values)
}

fn unquote_env_value(value: &str) -> String {
    if value.len() >= 2 {
        let bytes = value.as_bytes();
        let first = bytes[0];
        let last = bytes[value.len() - 1];
        if (first == b'"' && last == b'"') || (first == b'\'' && last == b'\'') {
            return value[1..value.len() - 1].to_string();
        }
    }

    value.to_string()
}

fn read_settings(app: &AppHandle) -> Result<BTreeMap<String, String>, String> {
    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(BTreeMap::new());
    }

    let text = fs::read_to_string(path).map_err(to_string)?;
    serde_json::from_str(&text).map_err(to_string)
}

fn write_settings(app: &AppHandle, values: &BTreeMap<String, String>) -> Result<(), String> {
    let path = settings_path(app)?;
    let text = serde_json::to_string_pretty(values).map_err(to_string)?;
    fs::write(path, text).map_err(to_string)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("settings.json"))
}

fn open_event_store(app: &AppHandle) -> Result<Connection, String> {
    let path = app_data_dir(app)?.join("workbench.sqlite3");
    let connection = Connection::open(path).map_err(to_string)?;
    connection
        .execute_batch(
            "create table if not exists workbench_events (
                id integer primary key autoincrement,
                session_id text not null,
                event_type text not null,
                event_at text,
                payload_json text not null,
                created_at text not null default current_timestamp
            );
            create index if not exists idx_workbench_events_session
                on workbench_events(session_id, id);",
        )
        .map_err(to_string)?;
    Ok(connection)
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(to_string)?;
    fs::create_dir_all(&dir).map_err(to_string)?;
    Ok(dir)
}

fn workspace_descriptor(path: PathBuf) -> WorkspaceDescriptor {
    let label = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("workspace")
        .to_string();
    let path = path_to_string(&path);

    WorkspaceDescriptor {
        id: path.clone(),
        label,
        path,
    }
}

fn read_string(value: &Value, key: &str) -> Option<String> {
    value
        .as_object()
        .and_then(|object: &Map<String, Value>| object.get(key))
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(ToString::to_string)
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

fn to_string(error: impl ToString) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_claude_stream_json_args() {
        let args = vec![
            "--bare".to_string(),
            "-p".to_string(),
            "--verbose".to_string(),
            "--output-format".to_string(),
            "stream-json".to_string(),
            "Prompt".to_string(),
        ];

        assert!(ensure_stream_json_args(&args).is_ok());
        assert!(ensure_stream_json_args(&["--bare".to_string()]).is_err());
    }

    #[test]
    fn maps_allowed_local_env_without_empty_values() {
        let root = env::temp_dir().join(format!("geond-agent-env-test-{}", std::process::id()));
        fs::create_dir_all(&root).expect("create temp env dir");
        fs::write(
            root.join(LOCAL_ENV_FILE_NAME),
            [
                format!("{}='local-zai-key'", "ZAI_API_KEY"),
                format!("{}=https://api.z.ai/api/anthropic", "ANTHROPIC_BASE_URL"),
                format!("{}=glm-4.7", "ANTHROPIC_DEFAULT_SONNET_MODEL"),
                "IGNORED_ENV=must-not-pass".to_string(),
                format!("{}=   ", "ANTHROPIC_DEFAULT_OPUS_MODEL"),
            ]
            .join("\n"),
        )
        .expect("write temp env");

        let values = allowed_local_env(Some(&root)).expect("parse local env");
        fs::remove_dir_all(root).expect("remove temp env dir");

        assert_eq!(
            values.get("ZAI_API_KEY").map(String::as_str),
            Some("local-zai-key")
        );
        assert_eq!(
            values.get("ANTHROPIC_API_KEY").map(String::as_str),
            Some("local-zai-key")
        );
        assert_eq!(
            values
                .get("ANTHROPIC_DEFAULT_SONNET_MODEL")
                .map(String::as_str),
            Some("glm-4.7")
        );
        assert!(!values.contains_key("IGNORED_ENV"));
        assert!(!values.contains_key("ANTHROPIC_DEFAULT_OPUS_MODEL"));
    }
}
