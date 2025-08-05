use crate::{
    agent::Agent,
    config::Config,
    error::{AgentError, AgentResult},
    logging,
};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::mpsc;
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus, ServiceType,
    },
    service_control_handler::{self, ServiceControlHandler},
    service_dispatcher,
};

define_windows_service!(ffi_service_main, service_main);

pub struct WindowsService {
    agent: Arc<Mutex<Option<Agent>>>,
    shutdown_tx: Option<mpsc::Sender<()>>,
}

impl WindowsService {
    pub fn new() -> Self {
        Self {
            agent: Arc::new(Mutex::new(None)),
            shutdown_tx: None,
        }
    }

    pub fn run() -> AgentResult<()> {
        logging::log_info("Starting Real Remote Desktop Agent as Windows Service", "Service");

        // Register the service
        service_dispatcher::start("RealRemoteDesktopAgent", ffi_service_main)?;

        Ok(())
    }
}

fn service_main(arguments: Vec<std::ffi::OsString>) {
    logging::log_info("Windows service main function called", "Service");

    // Create service control handler
    let event_handler = move |control_event| -> ServiceControlHandlerResult {
        match control_event {
            ServiceControl::Stop => {
                logging::log_info("Received stop signal", "Service");
                ServiceControlHandlerResult::NoError
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    };

    let status_handle = service_control_handler::register("RealRemoteDesktopAgent", event_handler)
        .map_err(|e| {
            logging::log_error(&format!("Failed to register service control handler: {}", e), "Service");
            e
        })?;

    // Update service status to running
    status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    })?;

    // Load configuration
    let config = match Config::load("config.toml") {
        Ok(config) => config,
        Err(e) => {
            logging::log_error(&format!("Failed to load config: {}", e), "Service");
            return;
        }
    };

    // Create and start agent
    let agent = match tokio::runtime::Runtime::new() {
        Ok(rt) => {
            let agent_result = rt.block_on(async {
                let mut agent = Agent::new(config).await?;
                agent.start().await?;
                Ok(agent)
            });

            match agent_result {
                Ok(agent) => Some(agent),
                Err(e) => {
                    logging::log_error(&format!("Failed to start agent: {}", e), "Service");
                    None
                }
            }
        }
        Err(e) => {
            logging::log_error(&format!("Failed to create runtime: {}", e), "Service");
            None
        }
    };

    // Store agent in shared state
    if let Some(agent) = agent {
        // TODO: Store agent in shared state for service control
    }

    // Keep service running
    loop {
        std::thread::sleep(Duration::from_secs(1));
    }
}

type ServiceControlHandlerResult = windows_service::Result<()>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_creation() {
        let service = WindowsService::new();
        assert!(service.agent.lock().unwrap().is_none());
    }
} 