use crate::error::{AgentError, AgentResult};
use std::path::Path;
use tracing::{Level, Subscriber};
use tracing_subscriber::{
    fmt::{self, format::FmtSpan},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter, Registry,
};

/// Initialize logging system
pub fn init(level: &str) -> AgentResult<()> {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(level));

    let registry = Registry::default()
        .with(env_filter)
        .with(fmt::layer().with_span_events(FmtSpan::CLOSE));

    registry.init();

    tracing::info!("Logging initialized with level: {}", level);
    Ok(())
}

/// Initialize logging with file output
pub fn init_with_file<P: AsRef<Path>>(level: &str, file_path: P) -> AgentResult<()> {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(level));

    let file_appender = tracing_appender::rolling::RollingFileAppender::new(
        tracing_appender::rolling::RollingFileAppender::builder()
            .rotation(tracing_appender::rolling::RollingFileAppender::Rotation::DAILY)
            .filename_prefix("real-remote-desktop-agent")
            .filename_suffix("log")
            .max_files(5)
            .build_in(file_path.as_ref().parent().unwrap_or(Path::new(".")))
            .map_err(|e| AgentError::Config(format!("Failed to create file appender: {}", e)))?,
    );

    let file_layer = fmt::layer()
        .with_file(true)
        .with_line_number(true)
        .with_target(false)
        .with_thread_ids(true)
        .with_thread_names(true)
        .with_span_events(FmtSpan::CLOSE)
        .with_writer(file_appender);

    let console_layer = fmt::layer()
        .with_file(true)
        .with_line_number(true)
        .with_target(false)
        .with_thread_ids(true)
        .with_thread_names(true)
        .with_span_events(FmtSpan::CLOSE);

    Registry::default()
        .with(env_filter)
        .with(file_layer)
        .with(console_layer)
        .init();

    tracing::info!("Logging initialized with level: {} and file output: {:?}", level, file_path.as_ref());
    Ok(())
}

/// Set log level dynamically
pub fn set_level(level: &str) -> AgentResult<()> {
    let level = level.parse::<Level>()
        .map_err(|e| AgentError::Config(format!("Invalid log level: {}", e)))?;

    tracing::info!("Log level changed to: {}", level);
    Ok(())
}

/// Get current log level
pub fn get_level() -> Level {
    tracing::level_filters::LevelFilter::current().into()
}

/// Create a logger for a specific module
pub fn logger(module: &str) -> tracing::Logger {
    tracing::Logger::new(module)
}

/// Log performance metrics
pub fn log_metrics(metrics: &crate::types::Metrics) {
    tracing::info!(
        fps = metrics.fps,
        latency = metrics.latency,
        bitrate = metrics.bitrate,
        packet_loss = metrics.packet_loss,
        jitter = metrics.jitter,
        frame_drops = metrics.frame_drops,
        bytes_received = metrics.bytes_received,
        bytes_sent = metrics.bytes_sent,
        cpu_usage = metrics.cpu_usage,
        memory_usage = metrics.memory_usage,
        "Performance metrics"
    );
}

/// Log connection event
pub fn log_connection(client_id: &str, event: &str, details: Option<&str>) {
    if let Some(details) = details {
        tracing::info!(client_id = client_id, event = event, details = details, "Connection event");
    } else {
        tracing::info!(client_id = client_id, event = event, "Connection event");
    }
}

/// Log security event
pub fn log_security_event(event: &str, client_id: Option<&str>, details: Option<&str>) {
    match (client_id, details) {
        (Some(client_id), Some(details)) => {
            tracing::warn!(client_id = client_id, event = event, details = details, "Security event");
        }
        (Some(client_id), None) => {
            tracing::warn!(client_id = client_id, event = event, "Security event");
        }
        (None, Some(details)) => {
            tracing::warn!(event = event, details = details, "Security event");
        }
        (None, None) => {
            tracing::warn!(event = event, "Security event");
        }
    }
}

/// Log error with context
pub fn log_error(error: &AgentError, context: &str) {
    tracing::error!(error = %error, context = context, "Error occurred");
}

/// Log warning with context
pub fn log_warning(message: &str, context: &str) {
    tracing::warn!(message = message, context = context, "Warning");
}

/// Log info with context
pub fn log_info(message: &str, context: &str) {
    tracing::info!(message = message, context = context, "Info");
}

/// Log debug with context
pub fn log_debug(message: &str, context: &str) {
    tracing::debug!(message = message, context = context, "Debug");
}

/// Log trace with context
pub fn log_trace(message: &str, context: &str) {
    tracing::trace!(message = message, context = context, "Trace");
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_init_logging() {
        assert!(init("info").is_ok());
    }

    #[test]
    fn test_init_logging_with_file() {
        let temp_dir = tempfile::tempdir().unwrap();
        let log_file = temp_dir.path().join("test.log");
        
        assert!(init_with_file("info", &log_file).is_ok());
    }

    #[test]
    fn test_set_level() {
        assert!(set_level("info").is_ok());
        assert!(set_level("debug").is_ok());
        assert!(set_level("invalid").is_err());
    }

    #[test]
    fn test_log_functions() {
        init("debug").unwrap();

        log_info("Test message", "test");
        log_warning("Test warning", "test");
        log_debug("Test debug", "test");
        log_trace("Test trace", "test");

        let error = AgentError::Config("Test error".to_string());
        log_error(&error, "test");
    }
} 