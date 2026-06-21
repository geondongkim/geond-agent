use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::{
    collections::BTreeMap,
    env, fs,
    io::{BufRead, BufReader, Read},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex, OnceLock},
    thread,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter, Manager};

const LANGUAGE_SETTINGS_KEY: &str = "geond-agent.workbench.language";
const SESSION_DEFAULTS_SETTINGS_KEY: &str = "geond-agent.workbench.session-defaults";
const PINNED_SESSION_IDS_SETTINGS_KEY: &str = "geond-agent.workbench.pinned-session-ids";
const WORKSPACE_SETTINGS_KEY: &str = "geond-agent.workbench.workspace";
const LOCAL_ENV_FILE_NAME: &str = ".env.local";
const CLAUDE_STREAM_EVENT_NAME: &str = "geond-agent://claude-code-stream-json";
const CLAUDE_DEFAULT_TIMEOUT_MS: u64 = 10 * 60 * 1000;
const CLAUDE_MAX_TIMEOUT_MS: u64 = 60 * 60 * 1000;
const PROCESS_OUTPUT_CAP_BYTES: usize = 1024 * 1024;
const PROCESS_OUTPUT_TRUNCATED_MARKER: &str = "\n... [truncated]\n";
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
    stream_channel_id: Option<String>,
    timeout_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeCodeCommandResponse {
    stdout: String,
    stderr: String,
    exit_code: Option<i32>,
    stdout_truncated: bool,
    stderr_truncated: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeCodeStreamPayload {
    channel_id: String,
    stream: String,
    text: String,
    sequence: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDescriptor {
    id: String,
    label: String,
    path: String,
}

type ProcessHandle = Arc<Mutex<Child>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_app_setting,
            save_app_setting,
            remove_app_setting,
            append_workbench_events,
            list_workbench_events,
            delete_workbench_session_events,
            list_workspaces,
            run_claude_code_stream_json,
            cancel_claude_code_stream
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
fn delete_workbench_session_events(app: AppHandle, session_id: String) -> Result<usize, String> {
    let connection = open_event_store(&app)?;
    delete_events_for_session(&connection, &session_id)
}

#[tauri::command]
fn list_workspaces() -> Result<Vec<WorkspaceDescriptor>, String> {
    let path = env::current_dir().map_err(to_string)?;
    Ok(vec![workspace_descriptor(path)])
}

#[tauri::command]
fn run_claude_code_stream_json(
    app: AppHandle,
    request: ClaudeCodeCommandRequest,
) -> Result<ClaudeCodeCommandResponse, String> {
    let stream_channel_id = request.stream_channel_id.clone();
    let timeout_ms = normalize_timeout_ms(request.timeout_ms)?;
    let mut command = build_claude_command(&request)?;

    if let Some(channel_id) = stream_channel_id {
        return run_streaming_claude_command(app, command, channel_id, timeout_ms);
    }

    let output = command.output().map_err(to_string)?;
    Ok(ClaudeCodeCommandResponse {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code(),
        stdout_truncated: false,
        stderr_truncated: false,
    })
}

#[tauri::command]
fn cancel_claude_code_stream(channel_id: String) -> Result<bool, String> {
    let Some(handle) = process_handle(&channel_id)? else {
        return Ok(false);
    };
    let mut child = handle
        .lock()
        .map_err(|_| "Claude Code process registry is unavailable.".to_string())?;

    if child.try_wait().map_err(to_string)?.is_some() {
        return Ok(false);
    }

    child.kill().map_err(to_string)?;
    Ok(true)
}

fn build_claude_command(request: &ClaudeCodeCommandRequest) -> Result<Command, String> {
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

    Ok(command)
}

fn run_streaming_claude_command(
    app: AppHandle,
    mut command: Command,
    channel_id: String,
    timeout_ms: u64,
) -> Result<ClaudeCodeCommandResponse, String> {
    command.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = command.spawn().map_err(to_string)?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Unable to capture Claude Code stdout.".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Unable to capture Claude Code stderr.".to_string())?;
    let child_handle = register_process(&channel_id, child)?;

    let stdout_app = app.clone();
    let stdout_channel_id = channel_id.clone();
    let stdout_reader =
        thread::spawn(move || read_process_stream(stdout, stdout_app, stdout_channel_id, "stdout"));
    let stderr_app = app.clone();
    let stderr_channel_id = channel_id.clone();
    let stderr_reader =
        thread::spawn(move || read_process_stream(stderr, stderr_app, stderr_channel_id, "stderr"));

    let wait_result = wait_for_process(&child_handle, timeout_ms);
    remove_process(&channel_id)?;
    let (exit_code, timed_out) = wait_result?;
    let stdout = stdout_reader
        .join()
        .map_err(|_| "Claude Code stdout reader panicked.".to_string())?;
    let mut stderr = stderr_reader
        .join()
        .map_err(|_| "Claude Code stderr reader panicked.".to_string())?;

    if timed_out {
        stderr.text = append_status_line(
            stderr.text,
            &format!("Claude Code runner timed out after {timeout_ms}ms."),
        );
    }

    Ok(ClaudeCodeCommandResponse {
        stdout: stdout.text,
        stderr: stderr.text,
        exit_code: Some(exit_code),
        stdout_truncated: stdout.truncated,
        stderr_truncated: stderr.truncated,
    })
}

fn normalize_timeout_ms(timeout_ms: Option<u64>) -> Result<u64, String> {
    let timeout_ms = timeout_ms.unwrap_or(CLAUDE_DEFAULT_TIMEOUT_MS);
    if timeout_ms == 0 || timeout_ms > CLAUDE_MAX_TIMEOUT_MS {
        return Err(format!(
            "Claude Code timeout must be between 1 and {CLAUDE_MAX_TIMEOUT_MS}ms."
        ));
    }
    Ok(timeout_ms)
}

fn process_registry() -> &'static Mutex<BTreeMap<String, ProcessHandle>> {
    static REGISTRY: OnceLock<Mutex<BTreeMap<String, ProcessHandle>>> = OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(BTreeMap::new()))
}

fn register_process(channel_id: &str, child: Child) -> Result<ProcessHandle, String> {
    let handle = Arc::new(Mutex::new(child));
    process_registry()
        .lock()
        .map_err(|_| "Claude Code process registry is unavailable.".to_string())?
        .insert(channel_id.to_string(), handle.clone());
    Ok(handle)
}

fn process_handle(channel_id: &str) -> Result<Option<ProcessHandle>, String> {
    Ok(process_registry()
        .lock()
        .map_err(|_| "Claude Code process registry is unavailable.".to_string())?
        .get(channel_id)
        .cloned())
}

fn remove_process(channel_id: &str) -> Result<(), String> {
    process_registry()
        .lock()
        .map_err(|_| "Claude Code process registry is unavailable.".to_string())?
        .remove(channel_id);
    Ok(())
}

fn wait_for_process(handle: &ProcessHandle, timeout_ms: u64) -> Result<(i32, bool), String> {
    let deadline = Instant::now() + Duration::from_millis(timeout_ms);
    let mut timed_out = false;

    loop {
        {
            let mut child = handle
                .lock()
                .map_err(|_| "Claude Code process handle is unavailable.".to_string())?;
            if let Some(status) = child.try_wait().map_err(to_string)? {
                return Ok((status.code().unwrap_or(130), timed_out));
            }

            if Instant::now() >= deadline {
                timed_out = true;
                child.kill().map_err(to_string)?;
            }
        }

        if timed_out {
            let mut child = handle
                .lock()
                .map_err(|_| "Claude Code process handle is unavailable.".to_string())?;
            let status = child.wait().map_err(to_string)?;
            return Ok((status.code().unwrap_or(124), true));
        }

        thread::sleep(Duration::from_millis(50));
    }
}

#[derive(Debug, PartialEq, Eq)]
struct StreamCapture {
    text: String,
    truncated: bool,
}

fn read_process_stream<R: Read>(
    reader: R,
    app: AppHandle,
    channel_id: String,
    stream: &str,
) -> StreamCapture {
    let mut reader = BufReader::new(reader);
    let mut output = String::new();
    let mut truncated = false;
    let mut line = String::new();
    let mut sequence = 0;

    loop {
        line.clear();
        let bytes = reader.read_line(&mut line).unwrap_or_default();
        if bytes == 0 {
            break;
        }

        truncated = push_capped_output(&mut output, &line) || truncated;
        let text = trim_line_ending(&line);
        if !text.trim().is_empty() {
            let _ = app.emit(
                CLAUDE_STREAM_EVENT_NAME,
                ClaudeCodeStreamPayload {
                    channel_id: channel_id.clone(),
                    stream: stream.to_string(),
                    text,
                    sequence,
                },
            );
        }
        sequence += 1;
    }

    StreamCapture {
        text: output,
        truncated,
    }
}

fn push_capped_output(output: &mut String, value: &str) -> bool {
    if output.len() >= PROCESS_OUTPUT_CAP_BYTES {
        return true;
    }

    let remaining = PROCESS_OUTPUT_CAP_BYTES - output.len();
    if value.len() <= remaining {
        output.push_str(value);
        return false;
    }

    let mut end = remaining.saturating_sub(PROCESS_OUTPUT_TRUNCATED_MARKER.len());
    while end > 0 && !value.is_char_boundary(end) {
        end -= 1;
    }
    output.push_str(&value[..end]);
    if output.len() + PROCESS_OUTPUT_TRUNCATED_MARKER.len() <= PROCESS_OUTPUT_CAP_BYTES {
        output.push_str(PROCESS_OUTPUT_TRUNCATED_MARKER);
    }
    true
}

fn append_status_line(mut output: String, line: &str) -> String {
    if !output.is_empty() && !output.ends_with('\n') {
        output.push('\n');
    }
    output.push_str(line);
    output.push('\n');
    output
}

fn ensure_allowed_setting_key(key: &str) -> Result<(), String> {
    match key {
        LANGUAGE_SETTINGS_KEY
        | SESSION_DEFAULTS_SETTINGS_KEY
        | PINNED_SESSION_IDS_SETTINGS_KEY
        | WORKSPACE_SETTINGS_KEY => Ok(()),
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

    for (index, line) in text.lines().enumerate() {
        let line_number = index + 1;
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let Some((key, value)) = line.split_once('=') else {
            return Err(format!(
                "Malformed .env.local line {line_number}: expected KEY=value."
            ));
        };

        let key = key.trim().trim_start_matches("export ").to_string();
        if key.is_empty() || key.contains(char::is_whitespace) {
            return Err(format!(
                "Malformed .env.local line {line_number}: invalid key."
            ));
        }

        let value = unquote_env_value(value.trim(), line_number)?;
        if !value.trim().is_empty() {
            values.insert(key, value);
        }
    }

    Ok(values)
}

fn unquote_env_value(value: &str, line_number: usize) -> Result<String, String> {
    if value.len() >= 2 {
        let bytes = value.as_bytes();
        let first = bytes[0];
        let last = bytes[value.len() - 1];
        if (first == b'"' && last == b'"') || (first == b'\'' && last == b'\'') {
            return Ok(value[1..value.len() - 1].to_string());
        }
    }

    if value.starts_with('"') || value.starts_with('\'') {
        return Err(format!(
            "Malformed .env.local line {line_number}: unterminated quoted value."
        ));
    }

    Ok(value.to_string())
}

fn trim_line_ending(value: &str) -> String {
    value.trim_end_matches(&['\r', '\n'][..]).to_string()
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

fn delete_events_for_session(connection: &Connection, session_id: &str) -> Result<usize, String> {
    if session_id.trim().is_empty() {
        return Err("Session id is required.".to_string());
    }

    connection
        .execute(
            "delete from workbench_events where session_id = ?1",
            params![session_id],
        )
        .map_err(to_string)
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
    fn allows_only_known_local_settings_keys() {
        assert!(ensure_allowed_setting_key(LANGUAGE_SETTINGS_KEY).is_ok());
        assert!(ensure_allowed_setting_key(SESSION_DEFAULTS_SETTINGS_KEY).is_ok());
        assert!(ensure_allowed_setting_key(PINNED_SESSION_IDS_SETTINGS_KEY).is_ok());
        assert!(ensure_allowed_setting_key(WORKSPACE_SETTINGS_KEY).is_ok());
        assert!(ensure_allowed_setting_key("geond-agent.workbench.provider-credential").is_err());
    }

    #[test]
    fn deletes_events_for_one_session_only() {
        let connection = Connection::open_in_memory().expect("open in-memory sqlite");
        connection
            .execute_batch(
                "create table workbench_events (
                    id integer primary key autoincrement,
                    session_id text not null,
                    event_type text not null,
                    event_at text,
                    payload_json text not null,
                    created_at text not null default current_timestamp
                );",
            )
            .expect("create event table");
        connection
            .execute(
                "insert into workbench_events (session_id, event_type, payload_json) values (?1, ?2, ?3)",
                params!["session-a", "session.lifecycle", "{}"],
            )
            .expect("insert session-a");
        connection
            .execute(
                "insert into workbench_events (session_id, event_type, payload_json) values (?1, ?2, ?3)",
                params!["session-b", "session.lifecycle", "{}"],
            )
            .expect("insert session-b");

        let deleted =
            delete_events_for_session(&connection, "session-a").expect("delete session-a");
        let remaining: i64 = connection
            .query_row("select count(*) from workbench_events", [], |row| {
                row.get(0)
            })
            .expect("count remaining");
        let session_b_remaining: i64 = connection
            .query_row(
                "select count(*) from workbench_events where session_id = ?1",
                params!["session-b"],
                |row| row.get(0),
            )
            .expect("count session-b");

        assert_eq!(deleted, 1);
        assert_eq!(remaining, 1);
        assert_eq!(session_b_remaining, 1);
        assert!(delete_events_for_session(&connection, " ").is_err());
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

    #[test]
    fn rejects_malformed_local_env_lines() {
        let root = env::temp_dir().join(format!(
            "geond-agent-env-malformed-test-{}",
            std::process::id()
        ));
        fs::create_dir_all(&root).expect("create temp env dir");
        fs::write(
            root.join(LOCAL_ENV_FILE_NAME),
            [
                format!("{}='local-zai-key'", "ZAI_API_KEY"),
                "MALFORMED_LINE".to_string(),
            ]
            .join("\n"),
        )
        .expect("write temp env");

        let error = allowed_local_env(Some(&root)).expect_err("reject malformed line");
        fs::remove_dir_all(root).expect("remove temp env dir");

        assert!(error.contains("Malformed .env.local line 2"));
    }

    #[test]
    fn rejects_invalid_claude_timeout_values() {
        assert_eq!(
            normalize_timeout_ms(None).expect("default timeout"),
            CLAUDE_DEFAULT_TIMEOUT_MS
        );
        assert_eq!(normalize_timeout_ms(Some(1)).expect("small timeout"), 1);
        assert!(normalize_timeout_ms(Some(0)).is_err());
        assert!(normalize_timeout_ms(Some(CLAUDE_MAX_TIMEOUT_MS + 1)).is_err());
    }

    #[test]
    fn caps_accumulated_process_output() {
        let mut output = String::new();
        let oversized = "x".repeat(PROCESS_OUTPUT_CAP_BYTES + 128);

        let truncated = push_capped_output(&mut output, &oversized);

        assert!(truncated);
        assert!(output.len() <= PROCESS_OUTPUT_CAP_BYTES);
        assert!(output.contains("[truncated]"));
    }

    #[test]
    fn trims_stream_line_endings_without_stripping_json_content() {
        assert_eq!(
            trim_line_ending("{\"type\":\"assistant\"}\n"),
            "{\"type\":\"assistant\"}"
        );
        assert_eq!(
            trim_line_ending("{\"type\":\"assistant\"}\r\n"),
            "{\"type\":\"assistant\"}"
        );
        assert_eq!(
            trim_line_ending("  {\"type\":\"assistant\"}  \n"),
            "  {\"type\":\"assistant\"}  "
        );
    }
}
