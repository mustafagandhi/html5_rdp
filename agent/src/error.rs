use thiserror::Error;

#[derive(Error, Debug)]
pub enum AgentError {
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Screen capture error: {0}")]
    Capture(String),

    #[error("Input injection error: {0}")]
    Input(String),

    #[error("Transport error: {0}")]
    Transport(String),

    #[error("WebSocket error: {0}")]
    WebSocket(String),

    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Video encoding error: {0}")]
    VideoEncoding(String),

    #[error("Encoder error: {0}")]
    EncoderError(String),

    #[error("Audio capture error: {0}")]
    AudioCapture(String),

    #[error("System error: {0}")]
    System(String),

    #[error("Network error: {0}")]
    Network(String),

    #[error("Security error: {0}")]
    Security(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("URL parsing error: {0}")]
    Url(#[from] url::ParseError),

    #[error("Other error: {0}")]
    Other(String),

    #[error("UUID error: {0}")]
    Uuid(#[from] uuid::Error),

    #[error("System time error: {0}")]
    SystemTime(#[from] std::time::SystemTimeError),

    #[error("OpenH264 error: {0}")]
    OpenH264(#[from] openh264::Error),

    #[error("WebRTC error: {0}")]
    WebRTC(#[from] webrtc::Error),

    #[error("Encoder not initialized")]
    EncoderNotInitialized,
}

impl AgentError {
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            AgentError::Network(_) | AgentError::Transport(_) | AgentError::WebSocket(_)
        )
    }

    pub fn is_critical(&self) -> bool {
        matches!(
            self,
            AgentError::Config(_) | AgentError::Auth(_) | AgentError::Security(_)
        )
    }

    pub fn context(self, context: &str) -> Self {
        match self {
            AgentError::Config(msg) => AgentError::Config(format!("{}: {}", context, msg)),
            AgentError::Capture(msg) => AgentError::Capture(format!("{}: {}", context, msg)),
            AgentError::Input(msg) => AgentError::Input(format!("{}: {}", context, msg)),
            AgentError::Transport(msg) => AgentError::Transport(format!("{}: {}", context, msg)),
            AgentError::WebRTC(e) => AgentError::WebRTC(e),
            AgentError::WebSocket(msg) => AgentError::WebSocket(format!("{}: {}", context, msg)),
            AgentError::Auth(msg) => AgentError::Auth(format!("{}: {}", context, msg)),
            AgentError::VideoEncoding(msg) => AgentError::VideoEncoding(format!("{}: {}", context, msg)),
            AgentError::EncoderError(msg) => AgentError::EncoderError(format!("{}: {}", context, msg)),
            AgentError::AudioCapture(msg) => AgentError::AudioCapture(format!("{}: {}", context, msg)),
            AgentError::Uuid(e) => AgentError::Uuid(e),
            AgentError::SystemTime(e) => AgentError::SystemTime(e),
            AgentError::OpenH264(e) => AgentError::OpenH264(e),
            AgentError::EncoderNotInitialized => AgentError::EncoderNotInitialized,
            AgentError::System(msg) => AgentError::System(format!("{}: {}", context, msg)),
            AgentError::Network(msg) => AgentError::Network(format!("{}: {}", context, msg)),
            AgentError::Security(msg) => AgentError::Security(format!("{}: {}", context, msg)),
            AgentError::Io(e) => AgentError::Io(e),
            AgentError::Serialization(e) => AgentError::Serialization(e),
            AgentError::Url(e) => AgentError::Url(e),
            AgentError::Other(msg) => AgentError::Other(format!("{}: {}", context, msg)),
        }
    }
}

impl From<anyhow::Error> for AgentError {
    fn from(err: anyhow::Error) -> Self {
        AgentError::Other(err.to_string())
    }
}

impl From<Box<dyn std::error::Error + Send + Sync>> for AgentError {
    fn from(err: Box<dyn std::error::Error + Send + Sync>) -> Self {
        AgentError::Other(err.to_string())
    }
}

pub type AgentResult<T> = Result<T, AgentError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_recoverable() {
        let network_error = AgentError::Network("connection failed".to_string());
        assert!(network_error.is_recoverable());

        let config_error = AgentError::Config("invalid config".to_string());
        assert!(!config_error.is_recoverable());
    }

    #[test]
    fn test_error_critical() {
        let auth_error = AgentError::Auth("invalid token".to_string());
        assert!(auth_error.is_critical());

        let network_error = AgentError::Network("connection failed".to_string());
        assert!(!network_error.is_critical());
    }

    #[test]
    fn test_error_context() {
        let error = AgentError::Capture("failed to capture screen".to_string());
        let contextualized = error.context("screen capture");
        
        match contextualized {
            AgentError::Capture(msg) => {
                assert!(msg.contains("screen capture"));
                assert!(msg.contains("failed to capture screen"));
            }
            _ => panic!("Expected Capture error"),
        }
    }
} 