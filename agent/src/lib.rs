pub mod agent;
pub mod capture;
pub mod config;
pub mod error;
pub mod input;
pub mod logging;
pub mod transport;
pub mod types;
pub mod utils;

// Re-export main types for convenience
pub use agent::Agent;
pub use config::Config;
pub use error::AgentError;
pub use types::*;

// Version information
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const NAME: &str = env!("CARGO_PKG_NAME");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert!(!VERSION.is_empty());
        assert!(!NAME.is_empty());
    }
} 