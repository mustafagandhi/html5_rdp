use clap::Parser;
use real_remote_desktop_agent::{
    agent::Agent,
    config::Config,
    error::AgentError,
    logging,
};
use std::process;
use tracing::{error, info};

#[derive(Parser)]
#[command(
    name = "real-remote-desktop-agent",
    about = "Native agent for Real Remote Desktop platform",
    version,
    long_about = "A secure, high-performance remote desktop agent that provides screen capture, input injection, and WebRTC/WebSocket transport capabilities."
)]
struct Cli {
    /// Configuration file path
    #[arg(short, long, default_value = "config.toml")]
    config: String,

    /// Log level (trace, debug, info, warn, error)
    #[arg(short, long, default_value = "info")]
    log_level: String,

    /// Run in daemon mode (background)
    #[arg(short, long)]
    daemon: bool,

    /// Enable debug mode
    #[arg(short, long)]
    debug: bool,

    /// Port to listen on
    #[arg(short, long)]
    port: Option<u16>,

    /// Host to bind to
    #[arg(long, default_value = "0.0.0.0")]
    host: String,

    /// Authentication token
    #[arg(short, long)]
    token: Option<String>,

    /// Enable audio capture
    #[arg(long)]
    audio: bool,

    /// Enable video encoding
    #[arg(long)]
    video: bool,

    /// Quality level (low, medium, high, ultra)
    #[arg(short, long, default_value = "medium")]
    quality: String,

    /// Show system tray icon
    #[arg(long)]
    tray: bool,
}

#[tokio::main]
async fn main() {
    // Parse command line arguments
    let cli = Cli::parse();

    // Initialize logging
    if let Err(e) = logging::init(&cli.log_level) {
        eprintln!("Failed to initialize logging: {}", e);
        process::exit(1);
    }

    info!("Starting Real Remote Desktop Agent v{}", env!("CARGO_PKG_VERSION"));

    // Load configuration
    let config = match Config::load(&cli.config) {
        Ok(config) => {
            info!("Configuration loaded from {}", cli.config);
            config
        }
        Err(e) => {
            error!("Failed to load configuration: {}", e);
            process::exit(1);
        }
    }

    // Override config with CLI arguments
    let mut config = config;
    if let Some(port) = cli.port {
        config.server.port = port;
    }
    if let Some(token) = cli.token {
        config.auth.token = Some(token);
    }
    if cli.audio {
        config.capture.audio = true;
    }
    if cli.video {
        config.capture.video = true;
    }
    if let Ok(quality) = cli.quality.parse() {
        config.capture.quality = quality;
    }

    // Validate configuration
    if let Err(e) = config.validate() {
        error!("Configuration validation failed: {}", e);
        process::exit(1);
    }

    // Create and start agent
    let agent = match Agent::new(config).await {
        Ok(agent) => {
            info!("Agent initialized successfully");
            agent
        }
        Err(e) => {
            error!("Failed to initialize agent: {}", e);
            process::exit(1);
        }
    }

    // Run agent
    if let Err(e) = agent.run().await {
        error!("Agent failed: {}", e);
        process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::fs;

    #[test]
    fn test_cli_parsing() {
        let args = vec![
            "real-remote-desktop-agent",
            "--config", "test.toml",
            "--log-level", "debug",
            "--port", "8080",
            "--quality", "high",
        ];

        let cli = Cli::try_parse_from(args).unwrap();
        assert_eq!(cli.config, "test.toml");
        assert_eq!(cli.log_level, "debug");
        assert_eq!(cli.port, Some(8080));
        assert_eq!(cli.quality, "high");
    }

    #[test]
    fn test_config_override() {
        let temp_file = NamedTempFile::new().unwrap();
        let config_content = r#"
            [server]
            host = "127.0.0.1"
            port = 3000

            [auth]
            token = "test-token"

            [capture]
            video = true
            audio = false
            quality = "medium"
        "#;
        fs::write(&temp_file, config_content).unwrap();

        let args = vec![
            "real-remote-desktop-agent",
            "--config", temp_file.path().to_str().unwrap(),
            "--port", "8080",
            "--quality", "high",
        ];

        let cli = Cli::try_parse_from(args).unwrap();
        let config = Config::load(&cli.config).unwrap();

        // CLI arguments should override config
        assert_eq!(config.server.port, 8080);
        assert_eq!(config.capture.quality.to_string(), "high");
    }
} 