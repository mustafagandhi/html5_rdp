use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// Quality levels for video encoding
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Quality {
    Low,
    Medium,
    High,
    Ultra,
}

impl std::str::FromStr for Quality {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "low" => Ok(Quality::Low),
            "medium" => Ok(Quality::Medium),
            "high" => Ok(Quality::High),
            "ultra" => Ok(Quality::Ultra),
            _ => Err(format!("Unknown quality level: {}", s)),
        }
    }
}

impl std::fmt::Display for Quality {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Quality::Low => write!(f, "low"),
            Quality::Medium => write!(f, "medium"),
            Quality::High => write!(f, "high"),
            Quality::Ultra => write!(f, "ultra"),
        }
    }
}

/// Video codec types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VideoCodec {
    H264,
    VP8,
    VP9,
    AV1,
}

impl std::str::FromStr for VideoCodec {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "h264" | "h.264" => Ok(VideoCodec::H264),
            "vp8" => Ok(VideoCodec::VP8),
            "vp9" => Ok(VideoCodec::VP9),
            "av1" => Ok(VideoCodec::AV1),
            _ => Err(format!("Unknown video codec: {}", s)),
        }
    }
}

/// Audio codec types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AudioCodec {
    Opus,
    AAC,
    PCM,
}

/// Frame data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Frame {
    pub id: Uuid,
    pub timestamp: u64,
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
    pub format: VideoCodec,
    pub quality: Quality,
    pub compressed: bool,
}

/// Input event types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InputEvent {
    Mouse(MouseEvent),
    Keyboard(KeyboardEvent),
    Touch(TouchEvent),
    Wheel(WheelEvent),
}

/// Mouse event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseEvent {
    pub action: MouseAction,
    pub button: u8,
    pub x: f32,
    pub y: f32,
    pub delta_x: f32,
    pub delta_y: f32,
    pub modifiers: Modifiers,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MouseAction {
    MouseDown,
    MouseUp,
    MouseMove,
    Click,
    DoubleClick,
    ContextMenu,
}

/// Keyboard event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyboardEvent {
    pub action: KeyboardAction,
    pub key: String,
    pub key_code: u32,
    pub code: String,
    pub modifiers: Modifiers,
    pub repeat: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum KeyboardAction {
    KeyDown,
    KeyUp,
    KeyPress,
}

/// Touch event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TouchEvent {
    pub action: TouchAction,
    pub touches: Vec<TouchPoint>,
    pub changed_touches: Vec<TouchPoint>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TouchAction {
    TouchStart,
    TouchEnd,
    TouchMove,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TouchPoint {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub pressure: f32,
}

/// Wheel event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WheelEvent {
    pub delta_x: f32,
    pub delta_y: f32,
    pub delta_z: f32,
    pub delta_mode: u32,
    pub x: f32,
    pub y: f32,
    pub modifiers: Modifiers,
}

/// Keyboard modifiers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Modifiers {
    pub ctrl: bool,
    pub alt: bool,
    pub shift: bool,
    pub meta: bool,
}

impl Default for Modifiers {
    fn default() -> Self {
        Self {
            ctrl: false,
            alt: false,
            shift: false,
            meta: false,
        }
    }
}

/// Clipboard data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardData {
    pub format: ClipboardFormat,
    pub content: String,
    pub encoding: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ClipboardFormat {
    Text,
    Html,
    Image,
}

/// File transfer data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileTransfer {
    pub file_id: Uuid,
    pub filename: String,
    pub size: u64,
    pub checksum: String,
    pub direction: TransferDirection,
    pub chunks: Vec<FileChunk>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransferDirection {
    Upload,
    Download,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChunk {
    pub index: u32,
    pub total: u32,
    pub data: Vec<u8>,
    pub checksum: String,
}

/// Performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metrics {
    pub fps: f32,
    pub latency: u32,
    pub bitrate: u32,
    pub packet_loss: f32,
    pub jitter: f32,
    pub frame_drops: u32,
    pub bytes_received: u64,
    pub bytes_sent: u64,
    pub cpu_usage: f32,
    pub memory_usage: u64,
}

/// Session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: Uuid,
    pub client_id: String,
    pub start_time: u64,
    pub last_activity: u64,
    pub quality: Quality,
    pub capabilities: ClientCapabilities,
    pub stats: SessionStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientCapabilities {
    pub video: bool,
    pub audio: bool,
    pub clipboard: bool,
    pub file_transfer: bool,
    pub touch: bool,
    pub multi_monitor: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStats {
    pub frames_sent: u64,
    pub frames_dropped: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub connection_time: u64,
    pub reconnections: u32,
}

/// Protocol message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub r#type: String,
    pub channel: String,
    pub data: serde_json::Value,
    pub timestamp: u64,
    pub sequence: Option<u32>,
    pub version: String,
}

/// Connection state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
    Failed,
}

/// Transport type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransportType {
    WebRTC,
    WebSocket,
}

/// Display information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Display {
    pub id: u32,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub refresh_rate: u32,
    pub primary: bool,
}

/// System information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub version: String,
    pub architecture: String,
    pub cpu_cores: u32,
    pub memory_total: u64,
    pub memory_available: u64,
    pub displays: Vec<Display>,
}

/// Agent status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatus {
    pub version: String,
    pub uptime: u64,
    pub sessions: u32,
    pub system_info: SystemInfo,
    pub metrics: Metrics,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quality_parsing() {
        assert_eq!("low".parse::<Quality>().unwrap(), Quality::Low);
        assert_eq!("MEDIUM".parse::<Quality>().unwrap(), Quality::Medium);
        assert_eq!("High".parse::<Quality>().unwrap(), Quality::High);
        assert_eq!("ULTRA".parse::<Quality>().unwrap(), Quality::Ultra);
        
        assert!("invalid".parse::<Quality>().is_err());
    }

    #[test]
    fn test_quality_display() {
        assert_eq!(Quality::Low.to_string(), "low");
        assert_eq!(Quality::Medium.to_string(), "medium");
        assert_eq!(Quality::High.to_string(), "high");
        assert_eq!(Quality::Ultra.to_string(), "ultra");
    }

    #[test]
    fn test_video_codec_parsing() {
        assert_eq!("h264".parse::<VideoCodec>().unwrap(), VideoCodec::H264);
        assert_eq!("H.264".parse::<VideoCodec>().unwrap(), VideoCodec::H264);
        assert_eq!("vp8".parse::<VideoCodec>().unwrap(), VideoCodec::VP8);
        assert_eq!("VP9".parse::<VideoCodec>().unwrap(), VideoCodec::VP9);
        assert_eq!("av1".parse::<VideoCodec>().unwrap(), VideoCodec::AV1);
        
        assert!("invalid".parse::<VideoCodec>().is_err());
    }

    #[test]
    fn test_modifiers_default() {
        let modifiers = Modifiers::default();
        assert!(!modifiers.ctrl);
        assert!(!modifiers.alt);
        assert!(!modifiers.shift);
        assert!(!modifiers.meta);
    }

    #[test]
    fn test_frame_creation() {
        let frame = Frame {
            id: Uuid::new_v4(),
            timestamp: 1234567890,
            width: 1920,
            height: 1080,
            data: vec![0; 100],
            format: VideoCodec::H264,
            quality: Quality::High,
            compressed: true,
        };

        assert_eq!(frame.width, 1920);
        assert_eq!(frame.height, 1080);
        assert_eq!(frame.format, VideoCodec::H264);
        assert_eq!(frame.quality, Quality::High);
        assert!(frame.compressed);
    }
} 