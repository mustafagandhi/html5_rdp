use crate::error::{AgentError, AgentResult};
use crate::types::{Quality, VideoCodec};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Main configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub auth: AuthConfig,
    pub capture: CaptureConfig,
    pub input: InputConfig,
    pub transport: TransportConfig,
    pub security: SecurityConfig,
    pub logging: LoggingConfig,
}

/// Server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub max_connections: u32,
    pub connection_timeout: u64,
    pub heartbeat_interval: u64,
}

/// Authentication configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub token: Option<String>,
    pub require_auth: bool,
    pub session_timeout: u64,
    pub max_failed_attempts: u32,
}

/// Screen capture configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureConfig {
    pub video: bool,
    pub audio: bool,
    pub quality: Quality,
    pub framerate: u32,
    pub codec: VideoCodec,
    pub hardware_acceleration: bool,
    pub multi_monitor: bool,
    pub capture_cursor: bool,
}

/// Input injection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputConfig {
    pub enable_mouse: bool,
    pub enable_keyboard: bool,
    pub enable_touch: bool,
    pub enable_clipboard: bool,
    pub enable_file_transfer: bool,
    pub mouse_sensitivity: f32,
    pub keyboard_repeat_delay: u32,
}

/// Transport configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransportConfig {
    pub webrtc_enabled: bool,
    pub websocket_enabled: bool,
    pub ice_servers: Vec<String>,
    pub max_bitrate: u32,
    pub enable_compression: bool,
}

/// Security configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub enable_encryption: bool,
    pub enable_audit_logging: bool,
    pub allowed_ips: Vec<String>,
    pub rate_limit_requests: u32,
    pub rate_limit_window: u64,
}

/// Logging configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub file: Option<String>,
    pub max_file_size: u64,
    pub max_files: u32,
    pub enable_console: bool,
}

impl Config {
    /// Load configuration from file
    pub fn load<P: AsRef<Path>>(path: P) -> AgentResult<Self> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| AgentError::Config(format!("Failed to read config file: {}", e)))?;

        let config: Config = toml::from_str(&content)
            .map_err(|e| AgentError::Config(format!("Failed to parse config file: {}", e)))?;

        Ok(config)
    }

    /// Save configuration to file
    pub fn save<P: AsRef<Path>>(&self, path: P) -> AgentResult<()> {
        let content = toml::to_string_pretty(self)
            .map_err(|e| AgentError::Config(format!("Failed to serialize config: {}", e)))?;

        std::fs::write(path, content)
            .map_err(|e| AgentError::Config(format!("Failed to write config file: {}", e)))?;

        Ok(())
    }

    /// Create default configuration
    pub fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 8080,
                max_connections: 10,
                connection_timeout: 30000,
                heartbeat_interval: 30000,
            },
            auth: AuthConfig {
                token: None,
                require_auth: true,
                session_timeout: 3600000, // 1 hour
                max_failed_attempts: 3,
            },
            capture: CaptureConfig {
                video: true,
                audio: false,
                quality: Quality::Medium,
                framerate: 30,
                codec: VideoCodec::H264,
                hardware_acceleration: true,
                multi_monitor: false,
                capture_cursor: true,
            },
            input: InputConfig {
                enable_mouse: true,
                enable_keyboard: true,
                enable_touch: true,
                enable_clipboard: false,
                enable_file_transfer: false,
                mouse_sensitivity: 1.0,
                keyboard_repeat_delay: 500,
            },
            transport: TransportConfig {
                webrtc_enabled: true,
                websocket_enabled: true,
                ice_servers: vec![
                    "stun:stun.l.google.com:19302".to_string(),
                    "stun:stun1.l.google.com:19302".to_string(),
                ],
                max_bitrate: 2000000, // 2 Mbps
                enable_compression: true,
            },
            security: SecurityConfig {
                enable_encryption: true,
                enable_audit_logging: true,
                allowed_ips: vec![],
                rate_limit_requests: 100,
                rate_limit_window: 60000, // 1 minute
            },
            logging: LoggingConfig {
                level: "info".to_string(),
                file: None,
                max_file_size: 10 * 1024 * 1024, // 10 MB
                max_files: 5,
                enable_console: true,
            },
        }
    }

    /// Validate configuration
    pub fn validate(&self) -> AgentResult<()> {
        // Validate server config
        if self.server.port == 0 {
            return Err(AgentError::Config("Port cannot be 0".to_string()));
        }
        if self.server.max_connections == 0 {
            return Err(AgentError::Config("Max connections cannot be 0".to_string()));
        }

        // Validate auth config
        if self.auth.require_auth && self.auth.token.is_none() {
            return Err(AgentError::Config("Token required when authentication is enabled".to_string()));
        }
        if self.auth.session_timeout == 0 {
            return Err(AgentError::Config("Session timeout cannot be 0".to_string()));
        }

        // Validate capture config
        if self.capture.framerate == 0 {
            return Err(AgentError::Config("Framerate cannot be 0".to_string()));
        }
        if self.capture.framerate > 120 {
            return Err(AgentError::Config("Framerate cannot exceed 120".to_string()));
        }

        // Validate input config
        if self.input.mouse_sensitivity <= 0.0 {
            return Err(AgentError::Config("Mouse sensitivity must be positive".to_string()));
        }
        if self.input.keyboard_repeat_delay == 0 {
            return Err(AgentError::Config("Keyboard repeat delay cannot be 0".to_string()));
        }

        // Validate transport config
        if !self.transport.webrtc_enabled && !self.transport.websocket_enabled {
            return Err(AgentError::Config("At least one transport must be enabled".to_string()));
        }
        if self.transport.max_bitrate == 0 {
            return Err(AgentError::Config("Max bitrate cannot be 0".to_string()));
        }

        // Validate security config
        if self.security.rate_limit_requests == 0 {
            return Err(AgentError::Config("Rate limit requests cannot be 0".to_string()));
        }
        if self.security.rate_limit_window == 0 {
            return Err(AgentError::Config("Rate limit window cannot be 0".to_string()));
        }

        // Validate logging config
        if self.logging.max_file_size == 0 {
            return Err(AgentError::Config("Max file size cannot be 0".to_string()));
        }
        if self.logging.max_files == 0 {
            return Err(AgentError::Config("Max files cannot be 0".to_string()));
        }

        Ok(())
    }

    /// Get configuration as environment variables
    pub fn as_env_vars(&self) -> Vec<(String, String)> {
        let mut vars = Vec::new();

        // Server config
        vars.push(("SERVER_HOST".to_string(), self.server.host.clone()));
        vars.push(("SERVER_PORT".to_string(), self.server.port.to_string()));
        vars.push(("SERVER_MAX_CONNECTIONS".to_string(), self.server.max_connections.to_string()));
        vars.push(("SERVER_CONNECTION_TIMEOUT".to_string(), self.server.connection_timeout.to_string()));
        vars.push(("SERVER_HEARTBEAT_INTERVAL".to_string(), self.server.heartbeat_interval.to_string()));

        // Auth config
        if let Some(token) = &self.auth.token {
            vars.push(("AUTH_TOKEN".to_string(), token.clone()));
        }
        vars.push(("AUTH_REQUIRE_AUTH".to_string(), self.auth.require_auth.to_string()));
        vars.push(("AUTH_SESSION_TIMEOUT".to_string(), self.auth.session_timeout.to_string()));
        vars.push(("AUTH_MAX_FAILED_ATTEMPTS".to_string(), self.auth.max_failed_attempts.to_string()));

        // Capture config
        vars.push(("CAPTURE_VIDEO".to_string(), self.capture.video.to_string()));
        vars.push(("CAPTURE_AUDIO".to_string(), self.capture.audio.to_string()));
        vars.push(("CAPTURE_QUALITY".to_string(), self.capture.quality.to_string()));
        vars.push(("CAPTURE_FRAMERATE".to_string(), self.capture.framerate.to_string()));
        vars.push(("CAPTURE_CODEC".to_string(), format!("{:?}", self.capture.codec)));
        vars.push(("CAPTURE_HARDWARE_ACCELERATION".to_string(), self.capture.hardware_acceleration.to_string()));
        vars.push(("CAPTURE_MULTI_MONITOR".to_string(), self.capture.multi_monitor.to_string()));
        vars.push(("CAPTURE_CURSOR".to_string(), self.capture.capture_cursor.to_string()));

        // Input config
        vars.push(("INPUT_ENABLE_MOUSE".to_string(), self.input.enable_mouse.to_string()));
        vars.push(("INPUT_ENABLE_KEYBOARD".to_string(), self.input.enable_keyboard.to_string()));
        vars.push(("INPUT_ENABLE_TOUCH".to_string(), self.input.enable_touch.to_string()));
        vars.push(("INPUT_ENABLE_CLIPBOARD".to_string(), self.input.enable_clipboard.to_string()));
        vars.push(("INPUT_ENABLE_FILE_TRANSFER".to_string(), self.input.enable_file_transfer.to_string()));
        vars.push(("INPUT_MOUSE_SENSITIVITY".to_string(), self.input.mouse_sensitivity.to_string()));
        vars.push(("INPUT_KEYBOARD_REPEAT_DELAY".to_string(), self.input.keyboard_repeat_delay.to_string()));

        // Transport config
        vars.push(("TRANSPORT_WEBRTC_ENABLED".to_string(), self.transport.webrtc_enabled.to_string()));
        vars.push(("TRANSPORT_WEBSOCKET_ENABLED".to_string(), self.transport.websocket_enabled.to_string()));
        vars.push(("TRANSPORT_MAX_BITRATE".to_string(), self.transport.max_bitrate.to_string()));
        vars.push(("TRANSPORT_ENABLE_COMPRESSION".to_string(), self.transport.enable_compression.to_string()));

        // Security config
        vars.push(("SECURITY_ENABLE_ENCRYPTION".to_string(), self.security.enable_encryption.to_string()));
        vars.push(("SECURITY_ENABLE_AUDIT_LOGGING".to_string(), self.security.enable_audit_logging.to_string()));
        vars.push(("SECURITY_RATE_LIMIT_REQUESTS".to_string(), self.security.rate_limit_requests.to_string()));
        vars.push(("SECURITY_RATE_LIMIT_WINDOW".to_string(), self.security.rate_limit_window.to_string()));

        // Logging config
        vars.push(("LOGGING_LEVEL".to_string(), self.logging.level.clone()));
        if let Some(file) = &self.logging.file {
            vars.push(("LOGGING_FILE".to_string(), file.clone()));
        }
        vars.push(("LOGGING_MAX_FILE_SIZE".to_string(), self.logging.max_file_size.to_string()));
        vars.push(("LOGGING_MAX_FILES".to_string(), self.logging.max_files.to_string()));
        vars.push(("LOGGING_ENABLE_CONSOLE".to_string(), self.logging.enable_console.to_string()));

        vars
    }
}

impl Default for Config {
    fn default() -> Self {
        Self::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::fs;

    #[test]
    fn test_config_default() {
        let config = Config::default();
        assert_eq!(config.server.port, 8080);
        assert_eq!(config.capture.quality, Quality::Medium);
        assert_eq!(config.capture.framerate, 30);
    }

    #[test]
    fn test_config_validation() {
        let mut config = Config::default();
        assert!(config.validate().is_ok());

        // Test invalid port
        config.server.port = 0;
        assert!(config.validate().is_err());

        // Reset and test invalid framerate
        config = Config::default();
        config.capture.framerate = 0;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_load_save() {
        let config = Config::default();
        let temp_file = NamedTempFile::new().unwrap();
        
        // Save config
        assert!(config.save(&temp_file).is_ok());
        
        // Load config
        let loaded_config = Config::load(&temp_file).unwrap();
        assert_eq!(loaded_config.server.port, config.server.port);
        assert_eq!(loaded_config.capture.quality, config.capture.quality);
    }

    #[test]
    fn test_config_env_vars() {
        let config = Config::default();
        let env_vars = config.as_env_vars();
        
        assert!(env_vars.iter().any(|(k, v)| k == "SERVER_PORT" && v == "8080"));
        assert!(env_vars.iter().any(|(k, v)| k == "CAPTURE_QUALITY" && v == "medium"));
    }
} 