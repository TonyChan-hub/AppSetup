use crate::protocol::{
    create_request, empty_params, parse_message, ProbeMessage, DEFAULT_PROBE_PORT, EVENT_DEVICE,
    EVENT_NETWORK, EVENT_PERF, MESSAGE_KIND_EVENT, MESSAGE_KIND_RESPONSE,
};
use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, oneshot, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
pub struct ProbeStatus {
    pub connected: bool,
    pub url: String,
}

type PendingMap = HashMap<String, oneshot::Sender<Result<Value, String>>>;

#[derive(Default)]
struct ProbeInner {
    connected: bool,
    url: String,
    write_tx: Option<mpsc::UnboundedSender<String>>,
    pending: PendingMap,
    generation: u64,
}

pub struct ProbeClient {
    inner: Arc<Mutex<ProbeInner>>,
}

impl ProbeClient {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(ProbeInner::default())),
        }
    }

    pub async fn status(&self) -> ProbeStatus {
        let guard = self.inner.lock().await;
        ProbeStatus {
            connected: guard.connected,
            url: guard.url.clone(),
        }
    }

    pub async fn disconnect(&self, app: &AppHandle) {
        let mut guard = self.inner.lock().await;
        guard.generation = guard.generation.wrapping_add(1);
        guard.connected = false;
        if let Some(tx) = guard.write_tx.take() {
            drop(tx);
        }
        let pending = std::mem::take(&mut guard.pending);
        let url = guard.url.clone();
        drop(guard);

        for (_, waiter) in pending {
            let _ = waiter.send(Err("Probe disconnected".into()));
        }

        let _ = app.emit(
            "probe:status",
            ProbeStatus {
                connected: false,
                url,
            },
        );
    }

    pub async fn connect(
        &self,
        app: AppHandle,
        host: String,
        port: u16,
    ) -> Result<ProbeStatus, String> {
        self.disconnect(&app).await;

        let port = if port == 0 { DEFAULT_PROBE_PORT } else { port };
        let url = format!("ws://{host}:{port}/probe");

        let (ws_stream, _) = connect_async(&url)
            .await
            .map_err(|error| format!("Failed to connect to {url}: {error}"))?;
        let (mut write, mut read) = ws_stream.split();
        let (write_tx, mut write_rx) = mpsc::unbounded_channel::<String>();

        let generation = {
            let mut guard = self.inner.lock().await;
            guard.generation = guard.generation.wrapping_add(1);
            guard.url = url.clone();
            guard.write_tx = Some(write_tx);
            guard.connected = true;
            guard.generation
        };

        let writer_inner = self.inner.clone();
        let writer_generation = generation;
        tauri::async_runtime::spawn(async move {
            while let Some(payload) = write_rx.recv().await {
                if writer_inner.lock().await.generation != writer_generation {
                    break;
                }
                if write.send(Message::Text(payload.into())).await.is_err() {
                    break;
                }
            }
        });

        let reader_inner = self.inner.clone();
        let reader_app = app.clone();
        let reader_url = url.clone();
        let reader_generation = generation;
        tauri::async_runtime::spawn(async move {
            while let Some(message) = read.next().await {
                if reader_inner.lock().await.generation != reader_generation {
                    break;
                }
                match message {
                    Ok(Message::Text(text)) => {
                        handle_incoming(&reader_inner, &reader_app, &text).await;
                    }
                    Ok(Message::Binary(bytes)) => {
                        if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                            handle_incoming(&reader_inner, &reader_app, &text).await;
                        }
                    }
                    Ok(Message::Close(_)) | Err(_) => break,
                    _ => {}
                }
            }

            let mut guard = reader_inner.lock().await;
            if guard.generation != reader_generation {
                return;
            }
            guard.connected = false;
            guard.write_tx = None;
            let pending = std::mem::take(&mut guard.pending);
            drop(guard);

            for (_, waiter) in pending {
                let _ = waiter.send(Err("Probe connection closed".into()));
            }

            let _ = reader_app.emit(
                "probe:status",
                ProbeStatus {
                    connected: false,
                    url: reader_url,
                },
            );
        });

        let _ = app.emit(
            "probe:status",
            ProbeStatus {
                connected: true,
                url: url.clone(),
            },
        );

        self.request("ping", empty_params())
            .await
            .map_err(|error| {
                // Best-effort disconnect on failed handshake.
                let inner = self.inner.clone();
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let client = ProbeClient { inner };
                    client.disconnect(&app).await;
                });
                error
            })?;

        Ok(ProbeStatus {
            connected: true,
            url,
        })
    }

    pub async fn request(&self, method: &str, params: Value) -> Result<Value, String> {
        let (id, rx) = {
            let mut guard = self.inner.lock().await;
            if !guard.connected {
                return Err("Probe is not connected".into());
            }
            let Some(tx) = guard.write_tx.clone() else {
                return Err("Probe is not connected".into());
            };
            let id = Uuid::new_v4().to_string();
            let (resp_tx, resp_rx) = oneshot::channel();
            guard.pending.insert(id.clone(), resp_tx);
            let payload = serde_json::to_string(&create_request(id.clone(), method, params))
                .map_err(|error| error.to_string())?;
            tx.send(payload).map_err(|_| "Probe is not connected".to_string())?;
            (id, resp_rx)
        };

        match rx.await {
            Ok(result) => result,
            Err(_) => {
                let mut guard = self.inner.lock().await;
                guard.pending.remove(&id);
                Err("Probe request cancelled".into())
            }
        }
    }
}

async fn handle_incoming(inner: &Arc<Mutex<ProbeInner>>, app: &AppHandle, raw: &str) {
    let Some(message) = parse_message(raw) else {
        return;
    };

    match message {
        ProbeMessage::Response(response) if response.kind == MESSAGE_KIND_RESPONSE => {
            let waiter = {
                let mut guard = inner.lock().await;
                guard.pending.remove(&response.id)
            };
            if let Some(waiter) = waiter {
                let result = if let Some(error) = response.error {
                    Err(error.message)
                } else {
                    Ok(response.result.unwrap_or(Value::Null))
                };
                let _ = waiter.send(result);
            }
        }
        ProbeMessage::Event(event) if event.kind == MESSAGE_KIND_EVENT => {
            let _ = app.emit("probe:event", &event);
            let payload = event.payload.unwrap_or(Value::Null);
            match event.event_type.as_str() {
                EVENT_NETWORK => {
                    let _ = app.emit("probe:network", payload);
                }
                EVENT_PERF => {
                    let _ = app.emit("probe:perf", payload);
                }
                EVENT_DEVICE => {
                    let _ = app.emit("probe:device", payload);
                }
                _ => {}
            }
        }
        _ => {}
    }
}
