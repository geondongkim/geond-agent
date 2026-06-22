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
const RUNNER_MODE_SETTINGS_KEY: &str = "geond-agent.workbench.runner-mode";
const LOCAL_ENV_FILE_NAME: &str = ".env.local";
const CLAUDE_STREAM_EVENT_NAME: &str = "geond-agent://claude-code-stream-json";
const CLAUDE_DEFAULT_TIMEOUT_MS: u64 = 10 * 60 * 1000;
const CLAUDE_MAX_TIMEOUT_MS: u64 = 60 * 60 * 1000;
const PROCESS_OUTPUT_CAP_BYTES: usize = 1024 * 1024;
const PROCESS_OUTPUT_TRUNCATED_MARKER: &str = "\n... [truncated]\n";
const EVENT_STORE_SCHEMA_VERSION: i64 = 2;
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionIndexRecord {
    id: String,
    lifecycle: String,
    title: Option<String>,
    workspace_path: Option<String>,
    backend_adapter_id: Option<String>,
    backend_label: Option<String>,
    provider_route_label: Option<String>,
    provider_key_missing: bool,
    capability_warning: Option<String>,
    external_sessions: Value,
    pending_approval_ids: Vec<String>,
    pending_approval_count: usize,
    warning_count: usize,
    error_count: usize,
    updated_at: Option<String>,
    resumable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkbenchApprovalRecord {
    session_id: String,
    approval_id: String,
    kind: String,
    title: Option<String>,
    subject: Option<String>,
    reason: Option<String>,
    status: String,
    decision: Option<String>,
    requested_at: Option<String>,
    resolved_at: Option<String>,
    source_event_id: Option<i64>,
    updated_at: Option<String>,
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
            list_workbench_sessions,
            list_workbench_approvals,
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
    let mut connection = open_event_store(&app)?;
    append_events_to_store(&mut connection, events)
}

fn append_events_to_store(
    connection: &mut Connection,
    events: Vec<Value>,
) -> Result<usize, String> {
    let transaction = connection.transaction().map_err(to_string)?;
    let mut inserted = 0;

    {
        let mut statement = transaction
            .prepare(
                "insert into workbench_events (session_id, event_type, event_at, payload_json)
             values (?1, ?2, ?3, ?4)",
            )
            .map_err(to_string)?;

        for event in events {
            let session_id =
                read_string(&event, "sessionId").unwrap_or_else(|| "unknown".to_string());
            let event_type = read_string(&event, "type").unwrap_or_else(|| "unknown".to_string());
            let event_at = read_string(&event, "at");
            let payload = serde_json::to_string(&event).map_err(to_string)?;

            statement
                .execute(params![session_id, event_type, event_at, payload])
                .map_err(to_string)?;
            let source_event_id = transaction.last_insert_rowid();
            materialize_approval_for_event(&transaction, &event, source_event_id)?;
            upsert_session_index_for_event(&transaction, &event)?;
            inserted += 1;
        }
    }

    transaction.commit().map_err(to_string)?;
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
fn list_workbench_sessions(app: AppHandle) -> Result<Vec<SessionIndexRecord>, String> {
    let connection = open_event_store(&app)?;
    let mut sessions = {
        let mut statement = connection
        .prepare(
            "select session_id, lifecycle, title, workspace_path, backend_adapter_id,
                    backend_label, provider_route_label, provider_key_missing,
                    capability_warning, external_sessions_json, pending_approval_ids_json,
                    pending_approval_count, warning_count, error_count, updated_at
             from workbench_sessions
             order by coalesce(updated_at, '') desc, coalesce(title, session_id) asc, session_id asc",
        )
            .map_err(to_string)?;

        let rows = statement
            .query_map([], |row| {
                let external_sessions_json: String = row.get(9)?;
                let pending_approval_ids_json: String = row.get(10)?;
                let external_sessions = serde_json::from_str(&external_sessions_json)
                    .unwrap_or_else(|_| Value::Object(Map::new()));
                let pending_approval_ids =
                    serde_json::from_str(&pending_approval_ids_json).unwrap_or_else(|_| Vec::new());
                let lifecycle: String = row.get(1)?;
                let resumable = is_session_index_record_resumable(&lifecycle, &external_sessions);

                Ok(SessionIndexRecord {
                    id: row.get(0)?,
                    lifecycle,
                    title: row.get(2)?,
                    workspace_path: row.get(3)?,
                    backend_adapter_id: row.get(4)?,
                    backend_label: row.get(5)?,
                    provider_route_label: row.get(6)?,
                    provider_key_missing: row.get::<_, i64>(7)? != 0,
                    capability_warning: row.get(8)?,
                    external_sessions,
                    pending_approval_count: pending_approval_ids.len(),
                    pending_approval_ids,
                    warning_count: row.get::<_, i64>(12)? as usize,
                    error_count: row.get::<_, i64>(13)? as usize,
                    updated_at: row.get(14)?,
                    resumable,
                })
            })
            .map_err(to_string)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(to_string)?
    };

    for session in sessions.iter_mut() {
        sync_session_index_record_approvals(&connection, session)?;
    }

    Ok(sessions)
}

#[tauri::command]
fn list_workbench_approvals(
    app: AppHandle,
    session_id: Option<String>,
    status: Option<String>,
) -> Result<Vec<WorkbenchApprovalRecord>, String> {
    let connection = open_event_store(&app)?;
    list_approval_records(&connection, session_id.as_deref(), status.as_deref())
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
        | WORKSPACE_SETTINGS_KEY
        | RUNNER_MODE_SETTINGS_KEY => Ok(()),
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
        ensure_resume_args(args)
    } else {
        Err(
            "Claude Code runner requires --bare -p --verbose --output-format stream-json."
                .to_string(),
        )
    }
}

fn ensure_resume_args(args: &[String]) -> Result<(), String> {
    let resume_positions: Vec<usize> = args
        .iter()
        .enumerate()
        .filter_map(|(index, arg)| (arg == "--resume").then_some(index))
        .collect();

    if resume_positions.is_empty() {
        return Ok(());
    }

    if resume_positions.len() > 1 {
        return Err("Claude Code runner accepts at most one --resume value.".to_string());
    }

    if args.iter().any(|arg| arg == "--session-id") {
        return Err("Claude Code runner cannot combine --resume with --session-id.".to_string());
    }

    let value = args.get(resume_positions[0] + 1).map(String::as_str);
    match value {
        Some(value) if is_safe_session_handle(value) => Ok(()),
        _ => Err(
            "Claude Code runner requires --resume to be followed by a safe session id.".to_string(),
        ),
    }
}

fn is_safe_session_handle(value: &str) -> bool {
    !value.trim().is_empty()
        && !value.starts_with('-')
        && value.chars().all(|character| {
            character.is_ascii_alphanumeric() || character == '_' || character == '-'
        })
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
    let mut connection = Connection::open(path).map_err(to_string)?;
    migrate_event_store(&mut connection)?;
    backfill_session_index_if_empty(&connection)?;
    Ok(connection)
}

fn migrate_event_store(connection: &mut Connection) -> Result<(), String> {
    let mut version = event_store_user_version(connection)?;
    if version > EVENT_STORE_SCHEMA_VERSION {
        return Err(format!(
            "Workbench event store schema version {version} is newer than supported version {EVENT_STORE_SCHEMA_VERSION}."
        ));
    }

    if version < 1 {
        let transaction = connection.transaction().map_err(to_string)?;
        transaction
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
                    on workbench_events(session_id, id);
                create table if not exists workbench_sessions (
                    session_id text primary key,
                    lifecycle text not null,
                    title text,
                    workspace_path text,
                    backend_adapter_id text,
                    backend_label text,
                    provider_route_label text,
                    provider_key_missing integer not null default 0,
                    capability_warning text,
                    external_sessions_json text not null default '{}',
                    pending_approval_ids_json text not null default '[]',
                    pending_approval_count integer not null default 0,
                    warning_count integer not null default 0,
                    error_count integer not null default 0,
                    updated_at text
                );
                create index if not exists idx_workbench_sessions_updated
                    on workbench_sessions(updated_at);
                pragma user_version = 1;",
            )
            .map_err(to_string)?;
        transaction.commit().map_err(to_string)?;
        version = 1;
    }

    if version < 2 {
        let transaction = connection.transaction().map_err(to_string)?;
        transaction
            .execute_batch(
                "create table if not exists workbench_approvals (
                    session_id text not null,
                    approval_id text not null,
                    kind text not null default 'unknown',
                    title text,
                    subject text,
                    reason text,
                    status text not null,
                    decision text,
                    requested_at text,
                    resolved_at text,
                    source_event_id integer,
                    updated_at text,
                    primary key (session_id, approval_id)
                );
                create index if not exists idx_workbench_approvals_session_status
                    on workbench_approvals(session_id, status, requested_at, updated_at);
                create index if not exists idx_workbench_approvals_status
                    on workbench_approvals(status, updated_at);
                pragma user_version = 2;",
            )
            .map_err(to_string)?;
        backfill_approvals_from_events(&transaction)?;
        transaction.commit().map_err(to_string)?;
    }

    Ok(())
}

fn event_store_user_version(connection: &Connection) -> Result<i64, String> {
    connection
        .query_row("pragma user_version", [], |row| row.get(0))
        .map_err(to_string)
}

#[cfg(test)]
fn create_event_store_schema(connection: &mut Connection) -> Result<(), String> {
    migrate_event_store(connection)?;
    backfill_session_index_if_empty(connection)
}

fn backfill_approvals_from_events(connection: &Connection) -> Result<(), String> {
    let mut statement = connection
        .prepare("select id, payload_json from workbench_events order by id asc")
        .map_err(to_string)?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(to_string)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_string)?;

    for (source_event_id, payload) in rows {
        let event = serde_json::from_str::<Value>(&payload).map_err(to_string)?;
        materialize_approval_for_event(connection, &event, source_event_id)?;
    }

    backfill_session_approval_counts(connection)
}

fn backfill_session_approval_counts(connection: &Connection) -> Result<(), String> {
    let mut statement = connection
        .prepare("select session_id from workbench_sessions order by session_id asc")
        .map_err(to_string)?;
    let session_ids = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(to_string)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_string)?;

    for session_id in session_ids {
        let pending_approval_ids = pending_approval_ids_for_session(connection, &session_id)?;
        let pending_approval_ids_json =
            serde_json::to_string(&pending_approval_ids).map_err(to_string)?;
        connection
            .execute(
                "update workbench_sessions
                 set pending_approval_ids_json = ?2,
                     pending_approval_count = ?3
                 where session_id = ?1",
                params![
                    session_id,
                    pending_approval_ids_json,
                    pending_approval_ids.len() as i64
                ],
            )
            .map_err(to_string)?;
    }

    Ok(())
}

fn materialize_approval_for_event(
    connection: &Connection,
    event: &Value,
    source_event_id: i64,
) -> Result<(), String> {
    let event_type = read_string(event, "type").unwrap_or_default();
    let Some(session_id) = read_string(event, "sessionId") else {
        return Ok(());
    };

    match event_type.as_str() {
        "approval.requested" => {
            let Some(approval) = event.get("approval") else {
                return Ok(());
            };
            let Some(approval_id) = read_string(approval, "id") else {
                return Ok(());
            };
            let requested_at =
                read_string(approval, "requestedAt").or_else(|| read_string(event, "at"));
            let updated_at = read_string(event, "at").or_else(|| requested_at.clone());
            connection
                .execute(
                    "insert into workbench_approvals (
                        session_id, approval_id, kind, title, subject, reason, status, decision,
                        requested_at, resolved_at, source_event_id, updated_at
                     ) values (?1, ?2, ?3, ?4, ?5, ?6, 'pending', null, ?7, null, ?8, ?9)
                     on conflict(session_id, approval_id) do update set
                        kind = excluded.kind,
                        title = excluded.title,
                        subject = excluded.subject,
                        reason = excluded.reason,
                        status = 'pending',
                        decision = null,
                        requested_at = coalesce(excluded.requested_at, workbench_approvals.requested_at),
                        resolved_at = null,
                        source_event_id = excluded.source_event_id,
                        updated_at = excluded.updated_at",
                    params![
                        session_id,
                        approval_id,
                        read_string(approval, "kind").unwrap_or_else(|| "unknown".to_string()),
                        read_string(approval, "title"),
                        read_string(approval, "subject"),
                        read_string(approval, "reason"),
                        requested_at,
                        source_event_id,
                        updated_at,
                    ],
                )
                .map_err(to_string)?;
        }
        "approval.resolved" => {
            let Some(approval_id) = read_string(event, "approvalId") else {
                return Ok(());
            };
            let resolved_at = read_string(event, "at");
            let updated_at = resolved_at.clone();
            connection
                .execute(
                    "insert into workbench_approvals (
                        session_id, approval_id, kind, title, subject, reason, status, decision,
                        requested_at, resolved_at, source_event_id, updated_at
                     ) values (?1, ?2, 'unknown', null, null, null, 'resolved', ?3, null, ?4, ?5, ?6)
                     on conflict(session_id, approval_id) do update set
                        status = 'resolved',
                        decision = excluded.decision,
                        resolved_at = excluded.resolved_at,
                        source_event_id = excluded.source_event_id,
                        updated_at = excluded.updated_at",
                    params![
                        session_id,
                        approval_id,
                        read_string(event, "decision"),
                        resolved_at,
                        source_event_id,
                        updated_at,
                    ],
                )
                .map_err(to_string)?;
        }
        _ => {}
    }

    Ok(())
}

fn list_approval_records(
    connection: &Connection,
    session_id: Option<&str>,
    status: Option<&str>,
) -> Result<Vec<WorkbenchApprovalRecord>, String> {
    if let Some(status) = status {
        if !matches!(status, "pending" | "resolved") {
            return Err("Approval status filter must be pending or resolved.".to_string());
        }
    }

    let mut statement = connection
        .prepare(
            "select session_id, approval_id, kind, title, subject, reason, status, decision,
                    requested_at, resolved_at, source_event_id, updated_at
             from workbench_approvals
             where (?1 is null or session_id = ?1)
               and (?2 is null or status = ?2)
             order by coalesce(requested_at, updated_at, ''), session_id, approval_id",
        )
        .map_err(to_string)?;

    let rows = statement
        .query_map(params![session_id, status], |row| {
            Ok(WorkbenchApprovalRecord {
                session_id: row.get(0)?,
                approval_id: row.get(1)?,
                kind: row.get(2)?,
                title: row.get(3)?,
                subject: row.get(4)?,
                reason: row.get(5)?,
                status: row.get(6)?,
                decision: row.get(7)?,
                requested_at: row.get(8)?,
                resolved_at: row.get(9)?,
                source_event_id: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(to_string)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(to_string)
}

fn pending_approval_ids_for_session(
    connection: &Connection,
    session_id: &str,
) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(
            "select approval_id
             from workbench_approvals
             where session_id = ?1 and status = 'pending'
             order by coalesce(requested_at, updated_at, ''), approval_id",
        )
        .map_err(to_string)?;

    let rows = statement
        .query_map(params![session_id], |row| row.get::<_, String>(0))
        .map_err(to_string)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(to_string)
}

fn sync_session_index_record_approvals(
    connection: &Connection,
    record: &mut SessionIndexRecord,
) -> Result<(), String> {
    let pending_approval_ids = pending_approval_ids_for_session(connection, &record.id)?;
    record.pending_approval_count = pending_approval_ids.len();
    record.pending_approval_ids = pending_approval_ids;
    Ok(())
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
        .and_then(|deleted| {
            if table_exists(connection, "workbench_approvals")? {
                connection
                    .execute(
                        "delete from workbench_approvals where session_id = ?1",
                        params![session_id],
                    )
                    .map_err(to_string)?;
            }
            if table_exists(connection, "workbench_sessions")? {
                connection
                    .execute(
                        "delete from workbench_sessions where session_id = ?1",
                        params![session_id],
                    )
                    .map_err(to_string)?;
            }
            Ok(deleted)
        })
}

fn backfill_session_index_if_empty(connection: &Connection) -> Result<(), String> {
    let session_count: i64 = connection
        .query_row("select count(*) from workbench_sessions", [], |row| {
            row.get(0)
        })
        .map_err(to_string)?;
    if session_count > 0 {
        return Ok(());
    }

    let mut statement = connection
        .prepare("select payload_json from workbench_events order by id asc")
        .map_err(to_string)?;
    let payloads = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(to_string)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_string)?;

    for payload in payloads {
        let event = serde_json::from_str::<Value>(&payload).map_err(to_string)?;
        upsert_session_index_for_event(connection, &event)?;
    }

    Ok(())
}

fn upsert_session_index_for_event(connection: &Connection, event: &Value) -> Result<(), String> {
    let Some(session_id) = read_string(event, "sessionId") else {
        return Ok(());
    };
    let mut record = read_session_index_record(connection, &session_id)?
        .unwrap_or_else(|| empty_session_index_record(session_id));
    apply_event_to_session_index_record(&mut record, event);
    sync_session_index_record_approvals(connection, &mut record)?;
    write_session_index_record(connection, &record)
}

fn read_session_index_record(
    connection: &Connection,
    session_id: &str,
) -> Result<Option<SessionIndexRecord>, String> {
    let mut statement = connection
        .prepare(
            "select session_id, lifecycle, title, workspace_path, backend_adapter_id,
                    backend_label, provider_route_label, provider_key_missing,
                    capability_warning, external_sessions_json, pending_approval_ids_json,
                    pending_approval_count, warning_count, error_count, updated_at
             from workbench_sessions where session_id = ?1",
        )
        .map_err(to_string)?;
    let mut rows = statement.query(params![session_id]).map_err(to_string)?;
    let Some(row) = rows.next().map_err(to_string)? else {
        return Ok(None);
    };

    let external_sessions_json: String = row.get(9).map_err(to_string)?;
    let pending_approval_ids_json: String = row.get(10).map_err(to_string)?;
    let external_sessions =
        serde_json::from_str(&external_sessions_json).unwrap_or_else(|_| Value::Object(Map::new()));
    let pending_approval_ids =
        serde_json::from_str(&pending_approval_ids_json).unwrap_or_else(|_| Vec::new());
    let lifecycle: String = row.get(1).map_err(to_string)?;
    let resumable = is_session_index_record_resumable(&lifecycle, &external_sessions);

    let mut record = SessionIndexRecord {
        id: row.get(0).map_err(to_string)?,
        lifecycle: lifecycle.clone(),
        title: row.get(2).map_err(to_string)?,
        workspace_path: row.get(3).map_err(to_string)?,
        backend_adapter_id: row.get(4).map_err(to_string)?,
        backend_label: row.get(5).map_err(to_string)?,
        provider_route_label: row.get(6).map_err(to_string)?,
        provider_key_missing: row.get::<_, i64>(7).map_err(to_string)? != 0,
        capability_warning: row.get(8).map_err(to_string)?,
        external_sessions,
        pending_approval_count: pending_approval_ids.len(),
        pending_approval_ids,
        warning_count: row.get::<_, i64>(12).map_err(to_string)? as usize,
        error_count: row.get::<_, i64>(13).map_err(to_string)? as usize,
        updated_at: row.get(14).map_err(to_string)?,
        resumable,
    };

    sync_session_index_record_approvals(connection, &mut record)?;
    Ok(Some(record))
}

fn write_session_index_record(
    connection: &Connection,
    record: &SessionIndexRecord,
) -> Result<(), String> {
    let mut record = record.clone();
    sync_session_index_record_approvals(connection, &mut record)?;
    let external_sessions_json =
        serde_json::to_string(&record.external_sessions).map_err(to_string)?;
    let pending_approval_ids_json =
        serde_json::to_string(&record.pending_approval_ids).map_err(to_string)?;

    connection
        .execute(
            "insert into workbench_sessions (
                session_id, lifecycle, title, workspace_path, backend_adapter_id,
                backend_label, provider_route_label, provider_key_missing,
                capability_warning, external_sessions_json, pending_approval_ids_json,
                pending_approval_count, warning_count, error_count, updated_at
             ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
             on conflict(session_id) do update set
                lifecycle = excluded.lifecycle,
                title = excluded.title,
                workspace_path = excluded.workspace_path,
                backend_adapter_id = excluded.backend_adapter_id,
                backend_label = excluded.backend_label,
                provider_route_label = excluded.provider_route_label,
                provider_key_missing = excluded.provider_key_missing,
                capability_warning = excluded.capability_warning,
                external_sessions_json = excluded.external_sessions_json,
                pending_approval_ids_json = excluded.pending_approval_ids_json,
                pending_approval_count = excluded.pending_approval_count,
                warning_count = excluded.warning_count,
                error_count = excluded.error_count,
                updated_at = excluded.updated_at",
            params![
                record.id.as_str(),
                record.lifecycle.as_str(),
                record.title.as_deref(),
                record.workspace_path.as_deref(),
                record.backend_adapter_id.as_deref(),
                record.backend_label.as_deref(),
                record.provider_route_label.as_deref(),
                if record.provider_key_missing { 1 } else { 0 },
                record.capability_warning.as_deref(),
                external_sessions_json,
                pending_approval_ids_json,
                record.pending_approval_count as i64,
                record.warning_count as i64,
                record.error_count as i64,
                record.updated_at.as_deref(),
            ],
        )
        .map_err(to_string)?;
    Ok(())
}

fn empty_session_index_record(session_id: String) -> SessionIndexRecord {
    SessionIndexRecord {
        id: session_id,
        lifecycle: "created".to_string(),
        title: None,
        workspace_path: None,
        backend_adapter_id: None,
        backend_label: None,
        provider_route_label: None,
        provider_key_missing: false,
        capability_warning: None,
        external_sessions: Value::Object(Map::new()),
        pending_approval_ids: Vec::new(),
        pending_approval_count: 0,
        warning_count: 0,
        error_count: 0,
        updated_at: None,
        resumable: false,
    }
}

fn apply_event_to_session_index_record(record: &mut SessionIndexRecord, event: &Value) {
    let event_type = read_string(event, "type").unwrap_or_default();
    let at = read_string(event, "at");

    match event_type.as_str() {
        "session.lifecycle" => {
            if let Some(lifecycle) = read_string(event, "lifecycle") {
                record.lifecycle = lifecycle;
            }
            record.title = read_string(event, "title").or_else(|| record.title.clone());
            record.workspace_path =
                read_string(event, "workspacePath").or_else(|| record.workspace_path.clone());
            apply_selection_to_session_index_record(record, event.get("selection"));
        }
        "selection.snapshot.updated" => {
            apply_selection_to_session_index_record(record, event.get("selection"));
        }
        "session.adapter.linked" => {
            if let (Some(adapter_id), Some(external_session_id)) = (
                read_string(event, "adapterId"),
                read_string(event, "externalSessionId"),
            ) {
                let mut external_sessions = record
                    .external_sessions
                    .as_object()
                    .cloned()
                    .unwrap_or_default();
                let mut value = Map::new();
                value.insert("adapterId".to_string(), Value::String(adapter_id.clone()));
                value.insert(
                    "externalSessionId".to_string(),
                    Value::String(external_session_id),
                );
                if let Some(resumed) = read_string(event, "resumedFromExternalSessionId") {
                    value.insert(
                        "resumedFromExternalSessionId".to_string(),
                        Value::String(resumed),
                    );
                }
                if let Some(linked_at) = read_string(event, "at") {
                    value.insert("linkedAt".to_string(), Value::String(linked_at));
                }
                external_sessions.insert(adapter_id, Value::Object(value));
                record.external_sessions = Value::Object(external_sessions);
            }
        }
        "approval.requested" => {
            if let Some(approval_id) = event
                .get("approval")
                .and_then(|approval| read_string(approval, "id"))
            {
                if !record.pending_approval_ids.contains(&approval_id) {
                    record.pending_approval_ids.push(approval_id);
                }
            }
        }
        "approval.resolved" => {
            if let Some(approval_id) = read_string(event, "approvalId") {
                record.pending_approval_ids.retain(|id| id != &approval_id);
            }
        }
        "warning" => {
            record.warning_count += 1;
        }
        "error" => {
            record.error_count += 1;
        }
        _ => {}
    }

    record.pending_approval_count = record.pending_approval_ids.len();
    record.updated_at = at.or_else(|| record.updated_at.clone());
}

fn apply_selection_to_session_index_record(
    record: &mut SessionIndexRecord,
    selection: Option<&Value>,
) {
    let Some(selection) = selection else {
        return;
    };

    record.backend_adapter_id =
        read_string(selection, "backendAdapterId").or_else(|| record.backend_adapter_id.clone());
    record.backend_label = selection
        .get("backendAdapter")
        .and_then(|backend| read_string(backend, "label"))
        .or_else(|| record.backend_label.clone());
    record.provider_route_label = selection
        .get("providerRoute")
        .and_then(|provider| read_string(provider, "label"))
        .or_else(|| record.provider_route_label.clone());
    record.provider_key_missing = selection
        .get("providerRoute")
        .and_then(|provider| read_string(provider, "apiKeyState"))
        .map(|state| state == "missing")
        .unwrap_or(record.provider_key_missing);
    record.capability_warning = selection
        .get("capabilityWarnings")
        .and_then(Value::as_array)
        .and_then(|warnings| warnings.first())
        .and_then(Value::as_str)
        .map(ToString::to_string)
        .or_else(|| record.capability_warning.clone());
}

fn table_exists(connection: &Connection, table_name: &str) -> Result<bool, String> {
    connection
        .query_row(
            "select exists(select 1 from sqlite_master where type = 'table' and name = ?1)",
            params![table_name],
            |row| row.get::<_, i64>(0),
        )
        .map(|value| value != 0)
        .map_err(to_string)
}

fn is_session_index_record_resumable(lifecycle: &str, external_sessions: &Value) -> bool {
    external_sessions
        .as_object()
        .map(|object| !object.is_empty())
        .unwrap_or(false)
        && matches!(lifecycle, "completed" | "failed" | "paused")
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
    fn validates_claude_resume_arg_shape() {
        let args = vec![
            "--bare".to_string(),
            "-p".to_string(),
            "--verbose".to_string(),
            "--output-format".to_string(),
            "stream-json".to_string(),
            "--resume".to_string(),
            "claude-session_123".to_string(),
            "Prompt".to_string(),
        ];

        assert!(ensure_stream_json_args(&args).is_ok());

        let empty_resume = vec![
            "--bare".to_string(),
            "-p".to_string(),
            "--verbose".to_string(),
            "--output-format".to_string(),
            "stream-json".to_string(),
            "--resume".to_string(),
            " ".to_string(),
            "Prompt".to_string(),
        ];
        assert!(ensure_stream_json_args(&empty_resume).is_err());

        let flag_like_resume = vec![
            "--bare".to_string(),
            "-p".to_string(),
            "--verbose".to_string(),
            "--output-format".to_string(),
            "stream-json".to_string(),
            "--resume".to_string(),
            "--model".to_string(),
            "Prompt".to_string(),
        ];
        assert!(ensure_stream_json_args(&flag_like_resume).is_err());

        let mixed_session_modes = vec![
            "--bare".to_string(),
            "-p".to_string(),
            "--verbose".to_string(),
            "--output-format".to_string(),
            "stream-json".to_string(),
            "--session-id".to_string(),
            "local-session-1".to_string(),
            "--resume".to_string(),
            "claude-session-1".to_string(),
            "Prompt".to_string(),
        ];
        assert!(ensure_stream_json_args(&mixed_session_modes).is_err());
    }

    #[test]
    fn allows_only_known_local_settings_keys() {
        assert!(ensure_allowed_setting_key(LANGUAGE_SETTINGS_KEY).is_ok());
        assert!(ensure_allowed_setting_key(SESSION_DEFAULTS_SETTINGS_KEY).is_ok());
        assert!(ensure_allowed_setting_key(PINNED_SESSION_IDS_SETTINGS_KEY).is_ok());
        assert!(ensure_allowed_setting_key(WORKSPACE_SETTINGS_KEY).is_ok());
        assert!(ensure_allowed_setting_key(RUNNER_MODE_SETTINGS_KEY).is_ok());
        assert!(ensure_allowed_setting_key("geond-agent.workbench.provider-credential").is_err());
    }

    #[test]
    fn deletes_events_for_one_session_only() {
        let mut connection = Connection::open_in_memory().expect("open in-memory sqlite");
        create_event_store_schema(&mut connection).expect("create event store schema");
        connection
            .execute(
                "insert into workbench_sessions (session_id, lifecycle) values (?1, ?2)",
                params!["session-a", "started"],
            )
            .expect("insert session-a index");
        connection
            .execute(
                "insert into workbench_approvals (session_id, approval_id, kind, status)
                 values (?1, ?2, ?3, ?4)",
                params!["session-a", "approval-a", "command", "pending"],
            )
            .expect("insert session-a approval");
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
        let approval_a_remaining: i64 = connection
            .query_row(
                "select count(*) from workbench_approvals where session_id = ?1",
                params!["session-a"],
                |row| row.get(0),
            )
            .expect("count session-a approvals");

        assert_eq!(deleted, 1);
        assert_eq!(remaining, 1);
        assert_eq!(session_b_remaining, 1);
        assert_eq!(approval_a_remaining, 0);
        assert!(delete_events_for_session(&connection, " ").is_err());
    }

    #[test]
    fn upserts_session_index_from_workbench_events() {
        let mut connection = create_index_test_connection();
        let start = serde_json::json!({
            "type": "session.lifecycle",
            "sessionId": "session-a",
            "lifecycle": "started",
            "title": "Session A",
            "workspacePath": "/workspace/geond-agent",
            "selection": {
                "backendAdapterId": "claude-code.external-cli-acp",
                "backendAdapter": { "label": "Claude Code external CLI/ACP candidate" },
                "providerRoute": {
                    "label": "Z.ai Anthropic-compatible route",
                    "apiKeyState": "missing"
                },
                "capabilityWarnings": ["Z.ai route key metadata is missing"]
            },
            "at": "2026-06-22T01:00:00.000Z"
        });
        let linked = serde_json::json!({
            "type": "session.adapter.linked",
            "sessionId": "session-a",
            "adapterId": "claude-code.external-cli-acp",
            "externalSessionId": "claude-session-a",
            "at": "2026-06-22T01:00:01.000Z"
        });
        let approval = serde_json::json!({
            "type": "approval.requested",
            "sessionId": "session-a",
            "approval": { "id": "approval-a" },
            "at": "2026-06-22T01:00:02.000Z"
        });
        let resolved = serde_json::json!({
            "type": "approval.resolved",
            "sessionId": "session-a",
            "approvalId": "approval-a",
            "decision": "approved",
            "at": "2026-06-22T01:00:03.000Z"
        });
        let completed = serde_json::json!({
            "type": "session.lifecycle",
            "sessionId": "session-a",
            "lifecycle": "completed",
            "at": "2026-06-22T01:00:04.000Z"
        });

        append_events_to_store(
            &mut connection,
            vec![start, linked, approval, resolved, completed],
        )
        .expect("append events");

        let record = read_session_index_record(&connection, "session-a")
            .expect("read index")
            .expect("session-a index row");

        assert_eq!(record.lifecycle, "completed");
        assert_eq!(record.title.as_deref(), Some("Session A"));
        assert_eq!(
            record.backend_label.as_deref(),
            Some("Claude Code external CLI/ACP candidate")
        );
        assert!(record.provider_key_missing);
        assert_eq!(record.pending_approval_count, 0);
        assert!(record.resumable);
    }

    #[test]
    fn materializes_approvals_during_transactional_append() {
        let mut connection = create_index_test_connection();
        let start = serde_json::json!({
            "type": "session.lifecycle",
            "sessionId": "session-approval",
            "lifecycle": "started",
            "title": "Approval session",
            "at": "2026-06-22T03:00:00.000Z"
        });
        let requested = serde_json::json!({
            "type": "approval.requested",
            "sessionId": "session-approval",
            "approval": {
                "id": "approval-command",
                "kind": "command",
                "title": "Run verification",
                "subject": "pnpm verify",
                "reason": "Validate the slice"
            },
            "at": "2026-06-22T03:00:01.000Z"
        });

        append_events_to_store(&mut connection, vec![start, requested]).expect("append request");

        let pending = list_approval_records(&connection, Some("session-approval"), Some("pending"))
            .expect("list pending approvals");
        let record = read_session_index_record(&connection, "session-approval")
            .expect("read session index")
            .expect("session-approval index row");

        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].approval_id, "approval-command");
        assert_eq!(pending[0].kind, "command");
        assert_eq!(pending[0].status, "pending");
        assert_eq!(record.pending_approval_ids, vec!["approval-command"]);
        assert_eq!(record.pending_approval_count, 1);

        let resolved = serde_json::json!({
            "type": "approval.resolved",
            "sessionId": "session-approval",
            "approvalId": "approval-command",
            "decision": "approved",
            "at": "2026-06-22T03:00:02.000Z"
        });
        append_events_to_store(&mut connection, vec![resolved]).expect("append resolution");

        let resolved_records =
            list_approval_records(&connection, Some("session-approval"), Some("resolved"))
                .expect("list resolved approvals");
        let record = read_session_index_record(&connection, "session-approval")
            .expect("read session index")
            .expect("session-approval index row");

        assert_eq!(resolved_records.len(), 1);
        assert_eq!(resolved_records[0].decision.as_deref(), Some("approved"));
        assert_eq!(record.pending_approval_ids, Vec::<String>::new());
        assert_eq!(record.pending_approval_count, 0);
    }

    #[test]
    fn backfills_session_index_from_existing_events() {
        let connection = create_index_test_connection();
        let start = serde_json::json!({
            "type": "session.lifecycle",
            "sessionId": "session-backfill",
            "lifecycle": "started",
            "title": "Backfill session",
            "at": "2026-06-22T02:00:00.000Z"
        });
        let warning = serde_json::json!({
            "type": "warning",
            "sessionId": "session-backfill",
            "id": "warning-backfill",
            "message": "Synthetic warning",
            "at": "2026-06-22T02:00:01.000Z"
        });

        for event in [start, warning] {
            connection
                .execute(
                    "insert into workbench_events (session_id, event_type, event_at, payload_json)
                     values (?1, ?2, ?3, ?4)",
                    params![
                        read_string(&event, "sessionId").expect("session id"),
                        read_string(&event, "type").expect("event type"),
                        read_string(&event, "at"),
                        serde_json::to_string(&event).expect("serialize event")
                    ],
                )
                .expect("insert event");
        }

        backfill_session_index_if_empty(&connection).expect("backfill index");
        backfill_session_index_if_empty(&connection).expect("idempotent backfill");

        let record = read_session_index_record(&connection, "session-backfill")
            .expect("read index")
            .expect("session-backfill index row");
        let row_count: i64 = connection
            .query_row("select count(*) from workbench_sessions", [], |row| {
                row.get(0)
            })
            .expect("count session rows");

        assert_eq!(record.title.as_deref(), Some("Backfill session"));
        assert_eq!(record.warning_count, 1);
        assert_eq!(row_count, 1);
    }

    #[test]
    fn migrates_unversioned_event_store_and_backfills_approvals() {
        let mut connection = Connection::open_in_memory().expect("open in-memory sqlite");
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
            .expect("create legacy events table");

        let requested = serde_json::json!({
            "type": "approval.requested",
            "sessionId": "legacy-session",
            "approval": {
                "id": "legacy-approval",
                "kind": "filesystem",
                "title": "Write file"
            },
            "at": "2026-06-22T04:00:00.000Z"
        });
        let resolved = serde_json::json!({
            "type": "approval.resolved",
            "sessionId": "legacy-session",
            "approvalId": "legacy-approval",
            "decision": "rejected",
            "at": "2026-06-22T04:00:01.000Z"
        });

        for event in [requested, resolved] {
            connection
                .execute(
                    "insert into workbench_events (session_id, event_type, event_at, payload_json)
                     values (?1, ?2, ?3, ?4)",
                    params![
                        read_string(&event, "sessionId").expect("session id"),
                        read_string(&event, "type").expect("event type"),
                        read_string(&event, "at"),
                        serde_json::to_string(&event).expect("serialize event")
                    ],
                )
                .expect("insert legacy event");
        }

        create_event_store_schema(&mut connection).expect("migrate event store");

        let version = event_store_user_version(&connection).expect("read user version");
        let approvals =
            list_approval_records(&connection, Some("legacy-session"), Some("resolved"))
                .expect("list migrated approvals");

        assert_eq!(version, EVENT_STORE_SCHEMA_VERSION);
        assert_eq!(approvals.len(), 1);
        assert_eq!(approvals[0].approval_id, "legacy-approval");
        assert_eq!(approvals[0].kind, "filesystem");
        assert_eq!(approvals[0].decision.as_deref(), Some("rejected"));
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

    fn create_index_test_connection() -> Connection {
        let mut connection = Connection::open_in_memory().expect("open in-memory sqlite");
        create_event_store_schema(&mut connection).expect("create event store schema");
        connection
    }
}
