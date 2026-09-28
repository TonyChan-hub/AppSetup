use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

pub const PROTOCOL_VERSION: u32 = 1;
pub const DEFAULT_PROBE_PORT: u16 = 9876;

pub const MESSAGE_KIND_REQUEST: &str = "request";
pub const MESSAGE_KIND_RESPONSE: &str = "response";
pub const MESSAGE_KIND_EVENT: &str = "event";

pub const EVENT_NETWORK: &str = "network.event";
pub const EVENT_PERF: &str = "perf.sample";
pub const EVENT_DEVICE: &str = "device.info";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeRequest {
    pub v: u32,
    pub kind: String,
    pub id: String,
    pub method: String,
    pub params: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeResponse {
    pub v: u32,
    pub kind: String,
    pub id: String,
    #[serde(default)]
    pub result: Option<Value>,
    #[serde(default)]
    pub error: Option<ProbeError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeEvent {
    pub v: u32,
    pub kind: String,
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(default)]
    pub payload: Option<Value>,
    #[serde(default)]
    pub ts: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ProbeMessage {
    Response(ProbeResponse),
    Event(ProbeEvent),
    Other(Value),
}

pub fn create_request(id: impl Into<String>, method: impl Into<String>, params: Value) -> ProbeRequest {
    ProbeRequest {
        v: PROTOCOL_VERSION,
        kind: MESSAGE_KIND_REQUEST.to_string(),
        id: id.into(),
        method: method.into(),
        params,
    }
}

pub fn parse_message(raw: &str) -> Option<ProbeMessage> {
    let value: Value = serde_json::from_str(raw).ok()?;
    let kind = value.get("kind")?.as_str()?;
    match kind {
        MESSAGE_KIND_RESPONSE => serde_json::from_value(value).ok().map(ProbeMessage::Response),
        MESSAGE_KIND_EVENT => serde_json::from_value(value).ok().map(ProbeMessage::Event),
        _ => Some(ProbeMessage::Other(value)),
    }
}

pub fn empty_params() -> Value {
    json!({})
}
