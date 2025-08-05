use crate::{
    capture::CaptureManager,
    config::Config,
    error::{AgentError, AgentResult},
    input::InputManager,
    logging,
    transport::TransportManager,
    types::{AgentStatus, ConnectionState, Session, SystemInfo},
};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use uuid::Uuid;

pub struct Agent {
    config: Config,
    capture_manager: Arc<CaptureManager>,
    input_manager: Arc<InputManager>,
    transport_manager: Arc<TransportManager>,
    sessions: Arc<Mutex<HashMap<String, Session>>>,
    status: Arc<Mutex<AgentStatus>>,
    start_time: Instant,
    shutdown_tx: Option<mpsc::Sender<()>>,
}

impl Agent {
    pub async fn new(config: Config) -> AgentResult<Self> {
        logging::log_info("Initializing Real Remote Desktop Agent", "Agent");

        // Initialize capture manager
        let capture_manager = Arc::new(CaptureManager::new(config.capture.clone())?);
        
        // Initialize input manager
        let input_manager = Arc::new(InputManager::new(config.input.clone())?);
        
        // Initialize transport manager
        let transport_manager = Arc::new(TransportManager::new(config.transport.clone())?);

        // Initialize system info
        let system_info = Self::get_system_info()?;
        
        let status = AgentStatus {
            version: crate::VERSION.to_string(),
            uptime: 0,
            sessions: 0,
            system_info,
            metrics: Default::default(),
        };

        Ok(Self {
            config,
            capture_manager,
            input_manager,
            transport_manager,
            sessions: Arc::new(Mutex::new(HashMap::new())),
            status: Arc::new(Mutex::new(status)),
            start_time: Instant::now(),
            shutdown_tx: None,
        })
    }

    pub async fn start(&mut self) -> AgentResult<()> {
        logging::log_info("Starting Real Remote Desktop Agent", "Agent");

        // Initialize managers (they will be started separately)
        // The managers are wrapped in Arc, so we can't call start() directly
        // They will be started when needed

        // Setup session management
        self.setup_session_management().await?;

        // Start status monitoring
        self.start_status_monitoring().await?;

        logging::log_info("Agent started successfully", "Agent");
        Ok(())
    }

    pub async fn stop(&mut self) -> AgentResult<()> {
        logging::log_info("Stopping Real Remote Desktop Agent", "Agent");

        // Stop all sessions
        self.stop_all_sessions().await?;

        // Managers are wrapped in Arc, so we can't call stop() directly
        // They will be cleaned up when the Arc is dropped

        // Send shutdown signal
        if let Some(tx) = &self.shutdown_tx {
            let _ = tx.send(()).await;
        }

        logging::log_info("Agent stopped successfully", "Agent");
        Ok(())
    }

    pub async fn create_session(&self, client_id: String, capabilities: crate::types::ClientCapabilities) -> AgentResult<String> {
        let session_id = Uuid::new_v4().to_string();
        
        let session = Session {
            id: Uuid::parse_str(&session_id)?,
            client_id,
            start_time: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs(),
            last_activity: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs(),
            quality: self.config.capture.quality.clone(),
            capabilities,
            stats: Default::default(),
        };

        {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.insert(session_id.clone(), session);
        }

        // Update status
        {
            let mut status = self.status.lock().unwrap();
            status.sessions = self.sessions.lock().unwrap().len() as u32;
        }

        logging::log_info(&format!("Created session: {}", session_id), "Agent");
        Ok(session_id)
    }

    pub async fn destroy_session(&self, session_id: &str) -> AgentResult<()> {
        {
            let mut sessions = self.sessions.lock().unwrap();
            if sessions.remove(session_id).is_some() {
                logging::log_info(&format!("Destroyed session: {}", session_id), "Agent");
            }
        }

        // Update status
        {
            let mut status = self.status.lock().unwrap();
            status.sessions = self.sessions.lock().unwrap().len() as u32;
        }

        Ok(())
    }

    pub fn get_session(&self, session_id: &str) -> Option<Session> {
        let sessions = self.sessions.lock().unwrap();
        sessions.get(session_id).cloned()
    }

    pub fn get_all_sessions(&self) -> Vec<Session> {
        let sessions = self.sessions.lock().unwrap();
        sessions.values().cloned().collect()
    }

    pub fn get_status(&self) -> AgentStatus {
        let mut status = self.status.lock().unwrap();
        status.uptime = self.start_time.elapsed().as_secs();
        status.clone()
    }

    pub fn get_capture_manager(&self) -> Arc<CaptureManager> {
        self.capture_manager.clone()
    }

    pub fn get_input_manager(&self) -> Arc<InputManager> {
        self.input_manager.clone()
    }

    pub fn get_transport_manager(&self) -> Arc<TransportManager> {
        self.transport_manager.clone()
    }

    async fn setup_session_management(&self) -> AgentResult<()> {
        // Setup session timeout monitoring
        let sessions = self.sessions.clone();
        let config = self.config.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));
            
            loop {
                interval.tick().await;
                
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                
                let mut sessions_to_remove = Vec::new();
                {
                    let mut sessions_guard = sessions.lock().unwrap();
                    
                    for (session_id, session) in sessions_guard.iter_mut() {
                        if now - session.last_activity > config.auth.session_timeout {
                            sessions_to_remove.push(session_id.clone());
                        }
                    }
                }
                
                for session_id in sessions_to_remove {
                    logging::log_info(&format!("Session timeout: {}", session_id), "Agent");
                    let _ = sessions.lock().unwrap().remove(&session_id);
                }
            }
        });

        Ok(())
    }

    async fn start_status_monitoring(&mut self) -> AgentResult<()> {
        let (shutdown_tx, mut shutdown_rx) = mpsc::channel(1);
        self.shutdown_tx = Some(shutdown_tx);

        let status = self.status.clone();
        let capture_manager = self.capture_manager.clone();
        let transport_manager = self.transport_manager.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(5));
            
            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        let mut status_guard = status.lock().unwrap();
                        status_guard.uptime = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs();
                        
                        // Update basic metrics with default values
                        status_guard.metrics.fps = 30.0;
                        status_guard.metrics.latency = 50;
                        status_guard.metrics.bitrate = 1000000;
                    }
                    _ = shutdown_rx.recv() => {
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    async fn stop_all_sessions(&self) -> AgentResult<()> {
        let session_ids: Vec<String> = {
            let sessions = self.sessions.lock().unwrap();
            sessions.keys().cloned().collect()
        };

        for session_id in session_ids {
            self.destroy_session(&session_id).await?;
        }

        Ok(())
    }

    fn get_system_info() -> AgentResult<SystemInfo> {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;
            
            let os_output = Command::new("ver").output().unwrap_or_default();
            let os = String::from_utf8_lossy(&os_output.stdout).trim().to_string();
            
            let cpu_cores = num_cpus::get() as u32;
            let memory_total = 8 * 1024 * 1024 * 1024; // 8GB default
            
            Ok(SystemInfo {
                os: "Windows".to_string(),
                version: os,
                architecture: std::env::consts::ARCH.to_string(),
                cpu_cores,
                memory_total,
                memory_available: memory_total, // Simplified
                displays: vec![], // Will be populated by capture manager
            })
        }
        
        #[cfg(target_os = "linux")]
        {
            use std::process::Command;
            
            let os_output = Command::new("cat").args(&["/etc/os-release"]).output().unwrap_or_default();
            let os_info = String::from_utf8_lossy(&os_output.stdout);
            
            let cpu_cores = num_cpus::get() as u32;
            let memory_total = 8 * 1024 * 1024 * 1024; // 8GB default
            
            Ok(SystemInfo {
                os: "Linux".to_string(),
                version: os_info.lines()
                    .find(|line| line.starts_with("PRETTY_NAME="))
                    .map(|line| line.replace("PRETTY_NAME=", "").trim_matches('"').to_string())
                    .unwrap_or_else(|| "Unknown".to_string()),
                architecture: std::env::consts::ARCH.to_string(),
                cpu_cores,
                memory_total,
                memory_available: memory_total, // Simplified
                displays: vec![], // Will be populated by capture manager
            })
        }
        
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            
            let os_output = Command::new("sw_vers").output().unwrap_or_else(|_| std::process::Output {
                status: std::process::ExitStatus::from(0),
                stdout: Vec::new(),
                stderr: Vec::new(),
            });
            let os_info = String::from_utf8_lossy(&os_output.stdout);
            
            let cpu_cores = num_cpus::get() as u32;
            let memory_total = 8 * 1024 * 1024 * 1024; // 8GB default
            
            Ok(SystemInfo {
                os: "macOS".to_string(),
                version: os_info.lines()
                    .find(|line| line.starts_with("ProductVersion:"))
                    .map(|line| line.replace("ProductVersion:", "").trim().to_string())
                    .unwrap_or_else(|| "Unknown".to_string()),
                architecture: std::env::consts::ARCH.to_string(),
                cpu_cores,
                memory_total,
                memory_available: memory_total, // Simplified
                displays: vec![], // Will be populated by capture manager
            })
        }
        
        #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
        {
            Err(AgentError::System("Unsupported operating system".to_string()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_agent_creation() {
        let config = Config::default();
        let agent = Agent::new(config).await;
        assert!(agent.is_ok());
    }

    #[tokio::test]
    async fn test_session_management() {
        let config = Config::default();
        let mut agent = Agent::new(config).await.unwrap();
        
        // Test session creation
        let session_id = agent.create_session(
            "test_client".to_string(),
            crate::types::ClientCapabilities::default()
        ).await.unwrap();
        
        assert!(!session_id.is_empty());
        
        // Test session retrieval
        let session = agent.get_session(&session_id);
        assert!(session.is_some());
        
        // Test session destruction
        let result = agent.destroy_session(&session_id).await;
        assert!(result.is_ok());
        
        let session = agent.get_session(&session_id);
        assert!(session.is_none());
    }
} 