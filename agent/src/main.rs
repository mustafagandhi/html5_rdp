use clap::{App, Arg};
use tokio;
use tracing::{info, error};
use tracing_subscriber;

mod agent;
mod capture;
mod config;
mod error;
mod input;
mod logging;
mod transport;
mod types;
mod utils;

use agent::Agent;
use config::Config;
use error::AgentResult;

#[tokio::main]
async fn main() -> AgentResult<()> {
    // Initialize logging
    logging::init()?;
    
    info!("Starting Real Remote Desktop Agent...");
    
    // Parse command line arguments
    let matches = App::new("Real Remote Desktop Agent")
        .version("1.0.0")
        .author("Real Remote Desktop Team")
        .about("Native agent for Real Remote Desktop platform")
        .arg(
            Arg::new("config")
                .short('c')
                .long("config")
                .value_name("FILE")
                .help("Path to configuration file")
                .default_value("config.toml")
        )
        .arg(
            Arg::new("port")
                .short('p')
                .long("port")
                .value_name("PORT")
                .help("Port to listen on")
                .default_value("8080")
        )
        .get_matches();
    
    // Load configuration
    let config_path = matches.get_one::<String>("config").unwrap();
    let config = Config::load(config_path)?;
    
    info!("Configuration loaded from: {}", config_path);
    
    // Create and start agent
    let mut agent = Agent::new(config).await?;
    
    // Handle shutdown gracefully
    let shutdown_signal = tokio::signal::ctrl_c();
    
    tokio::select! {
        _ = agent.start() => {
            info!("Agent started successfully");
        }
        _ = shutdown_signal => {
            info!("Received shutdown signal");
        }
    }
    
    // Stop agent gracefully
    agent.stop().await?;
    info!("Agent stopped successfully");
    
    Ok(())
} 