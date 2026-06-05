//! send_message + abort_turn commands.

use tokio::sync::mpsc;

use deepseek_core::engine::EngineEvent;
use deepseek_core::pricing::ProviderId;
use deepseek_core::thread::ThreadId;
use deepseek_state::{ThreadInsert, ThreadRepo};

use crate::dto::SendMessageInput;
use crate::events::dispatch_engine_event;
use crate::AppState;

/// Run a turn for `input.threadId`, streaming results back as Tauri events.
///
/// If `input.threadId` is empty, a fresh thread is created and the first
/// stream event will carry its real id (P4 debug-UI affordance — task 7.1
/// removes this once the prototype's `create_thread` flow is the entry).
#[tauri::command]
pub async fn send_message(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    input: SendMessageInput,
) -> Result<(), String> {
    let engine = state.engine.clone();

    let resolved_id: ThreadId = if input.thread_id.is_empty() {
        let provider_id = crate::commands::config::read_default_provider_id_pub();
        let model = crate::commands::config::read_default_model_pub();
        let repo = ThreadRepo::new(state.db.as_ref());
        repo.create(ThreadInsert {
            name: None,
            model,
            cwd: None,
            permission_mode: "default".into(),
            provider_id,
            thinking_effort: Some("medium".into()),
            parent_thread_id: None,
            project_id: None,
        })
        .map_err(|e| format!("create_thread: {e}"))?
        .id
    } else {
        input.thread_id
    };

    sync_thread_runtime_from_db(&state, &resolved_id)?;

    let (event_tx, mut event_rx) = mpsc::unbounded_channel::<EngineEvent>();

    let app_clone = app.clone();
    let forward = tokio::spawn(async move {
        while let Some(ev) = event_rx.recv().await {
            dispatch_engine_event(&app_clone, ev);
        }
    });

    let result = engine
        .send_message(resolved_id, input.content, event_tx)
        .await
        .map_err(|e| format!("Engine error: {e}"));

    let _ = forward.await;

    result
}

fn sync_thread_runtime_from_db(
    state: &tauri::State<'_, AppState>,
    thread_id: &str,
) -> Result<(), String> {
    let repo = ThreadRepo::new(state.db.as_ref());
    let row = repo.get(thread_id).map_err(|e| e.to_string())?;
    if let Some(cached) = state.engine.cache().get(thread_id) {
        *cached.model.write() = row.model.clone();
        *cached.provider_id.write() = row.provider_id.clone();
        *cached.provider.write() = ProviderId::from_str_lossy(&row.provider_id);
        *cached.thinking_effort.write() = row.thinking_effort.clone();
    }
    tracing::info!(
        thread_id = %thread_id,
        provider_id = %row.provider_id,
        model = %row.model,
        thinking_effort = %row.thinking_effort,
        "send_message runtime synced"
    );
    Ok(())
}

#[tauri::command]
pub async fn abort_turn(
    state: tauri::State<'_, AppState>,
    thread_id: String,
) -> Result<(), String> {
    state.engine.abort_turn(&thread_id);
    Ok(())
}
