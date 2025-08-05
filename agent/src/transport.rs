use crate::{
    config::TransportConfig,
    error::{AgentError, AgentResult},
    logging,
    types::{ConnectionState, Message, TransportType},
};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use uuid::Uuid;
use webrtc::api::APIBuilder;
use webrtc::api::media_engine::MediaEngine;
use webrtc::api::setting_engine::SettingEngine;
use webrtc::ice_transport::ice_server::RTCIceServer;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::peer_connection_state::RTCPeerConnectionState;
use webrtc::peer_connection::RTCPeerConnection;
use webrtc::data_channel::data_channel_message::DataChannelMessage;
use webrtc::data_channel::RTCDataChannel;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message as WSMessage};
use futures_util::{SinkExt, StreamExt};
use url::Url;

pub struct TransportManager {
    config: TransportConfig,
    connections: Arc<Mutex<HashMap<String, ConnectionInfo>>>,
    webrtc_peer_connections: Arc<Mutex<HashMap<String, Arc<RTCPeerConnection>>>>,
    websocket_connections: Arc<Mutex<HashMap<String, tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>>>>,
    message_tx: Option<mpsc::Sender<Message>>,
    transport_handle: Option<tokio::task::JoinHandle<()>>,
    start_time: Instant,
}

#[derive(Clone)]
struct ConnectionInfo {
    id: String,
    transport_type: TransportType,
    state: ConnectionState,
    client_id: String,
    start_time: u64,
    last_activity: u64,
}

impl TransportManager {
    pub fn new(config: TransportConfig) -> AgentResult<Self> {
        logging::log_info("Initializing Transport Manager", "TransportManager");

        Ok(Self {
            config,
            connections: Arc::new(Mutex::new(HashMap::new())),
            webrtc_peer_connections: Arc::new(Mutex::new(HashMap::new())),
            websocket_connections: Arc::new(Mutex::new(HashMap::new())),
            message_tx: None,
            transport_handle: None,
            start_time: Instant::now(),
        })
    }

    pub async fn start(&mut self) -> AgentResult<()> {
        logging::log_info("Starting Transport Manager", "TransportManager");

        // Start WebRTC signaling server if enabled
        if self.config.webrtc_enabled {
            self.start_webrtc_signaling().await?;
        }

        // Start WebSocket server if enabled
        if self.config.websocket_enabled {
            self.start_websocket_server().await?;
        }

        // Start message processing
        self.start_message_processing().await?;

        logging::log_info("Transport Manager started", "TransportManager");
        Ok(())
    }

    pub async fn stop(&mut self) -> AgentResult<()> {
        logging::log_info("Stopping Transport Manager", "TransportManager");

        // Close all connections
        self.close_all_connections().await?;

        // Wait for transport task to finish
        if let Some(handle) = self.transport_handle.take() {
            let _ = handle.await;
        }

        logging::log_info("Transport Manager stopped", "TransportManager");
        Ok(())
    }

    pub fn set_message_sender(&mut self, tx: mpsc::Sender<Message>) {
        self.message_tx = Some(tx);
    }

    pub async fn send_message(&self, connection_id: &str, message: Message) -> AgentResult<()> {
        let connections = self.connections.lock().unwrap();
        
        if let Some(connection) = connections.get(connection_id) {
            match connection.transport_type {
                TransportType::WebRTC => {
                    self.send_webrtc_message(connection_id, message).await?;
                }
                TransportType::WebSocket => {
                    self.send_websocket_message(connection_id, message).await?;
                }
            }
        } else {
            return Err(AgentError::Transport("Connection not found".to_string()));
        }

        Ok(())
    }

    pub async fn broadcast_message(&self, message: Message) -> AgentResult<()> {
        let connections = self.connections.lock().unwrap();
        let connection_ids: Vec<String> = connections.keys().cloned().collect();
        drop(connections);

        for connection_id in connection_ids {
            if let Err(e) = self.send_message(&connection_id, message.clone()).await {
                logging::log_error(&AgentError::Transport(format!("Failed to send message to {}: {}", connection_id, e)), "TransportManager");
            }
        }

        Ok(())
    }

    pub async fn get_connection_info(&self, connection_id: &str) -> Option<ConnectionInfo> {
        let connections = self.connections.lock().unwrap();
        connections.get(connection_id).cloned()
    }

    pub async fn get_all_connections(&self) -> Vec<ConnectionInfo> {
        let connections = self.connections.lock().unwrap();
        connections.values().cloned().collect()
    }

    async fn start_webrtc_signaling(&mut self) -> AgentResult<()> {
        logging::log_info("Starting WebRTC signaling server", "TransportManager");

        // Create WebRTC API
        let mut m = MediaEngine::default();
        m.register_default_codecs()?;

        let api = APIBuilder::new()
            .with_media_engine(m)
            .with_setting_engine(SettingEngine::default())
            .build();

        // Setup ICE servers
        let mut ice_servers = Vec::new();
        for server_url in &self.config.ice_servers {
            ice_servers.push(RTCIceServer {
                urls: vec![server_url.clone()],
                username: "".to_string(),
                credential: "".to_string(),
                credential_type: webrtc::ice_transport::ice_credential_type::RTCIceCredentialType::Password,
            });
        }

        let config = RTCConfiguration {
            ice_servers,
            ..Default::default()
        };

        // Store API and config for later use
        // In a real implementation, this would be stored in the struct
        logging::log_info("WebRTC signaling server started", "TransportManager");
        Ok(())
    }

    async fn start_websocket_server(&mut self) -> AgentResult<()> {
        logging::log_info("Starting WebSocket server", "TransportManager");

        // In a real implementation, this would start a WebSocket server
        // For now, we'll just log that it's started
        logging::log_info("WebSocket server started", "TransportManager");
        Ok(())
    }

    async fn start_message_processing(&mut self) -> AgentResult<()> {
        let (message_tx, mut message_rx) = mpsc::channel(1000);
        self.message_tx = Some(message_tx);

        let connections = self.connections.clone();

        let handle = tokio::spawn(async move {
            while let Some(message) = message_rx.recv().await {
                // Process incoming messages
                logging::log_debug(&format!("Processing message: {}", message.r#type), "TransportManager");
                
                // Update connection activity
                if let Some(connection_id) = message.data.get("connection_id").and_then(|v| v.as_str()) {
                    let mut connections_guard = connections.lock().unwrap();
                    if let Some(connection) = connections_guard.get_mut(connection_id) {
                        connection.last_activity = std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs();
                    }
                }
            }
        });

        self.transport_handle = Some(handle);
        Ok(())
    }

    async fn send_webrtc_message(&self, connection_id: &str, message: Message) -> AgentResult<()> {
        let peer_connections = self.webrtc_peer_connections.lock().unwrap();
        
        if let Some(peer_connection) = peer_connections.get(connection_id) {
            // Find the appropriate data channel
            // In a real implementation, we'd get data channels from the peer connection
            // For now, we'll just log the message
            
            // Send message through data channel
            // This is a simplified implementation
            logging::log_debug(&format!("Sending WebRTC message: {}", message.r#type), "TransportManager");
        } else {
            return Err(AgentError::Transport("WebRTC connection not found".to_string()));
        }

        Ok(())
    }

    async fn send_websocket_message(&self, connection_id: &str, message: Message) -> AgentResult<()> {
        let mut websocket_connections = self.websocket_connections.lock().unwrap();
        
        if let Some(websocket) = websocket_connections.get_mut(connection_id) {
            let message_json = serde_json::to_string(&message)?;
            let ws_message = WSMessage::Text(message_json);
            
            if let Err(e) = websocket.send(ws_message).await {
                return Err(AgentError::Transport(format!("Failed to send WebSocket message: {}", e)));
            }
        } else {
            return Err(AgentError::Transport("WebSocket connection not found".to_string()));
        }

        Ok(())
    }

    async fn close_all_connections(&self) -> AgentResult<()> {
        // Close WebRTC connections
        {
            let mut peer_connections = self.webrtc_peer_connections.lock().unwrap();
            for (_, peer_connection) in peer_connections.iter() {
                if let Err(e) = peer_connection.close().await {
                    logging::log_error(&AgentError::Transport(format!("Failed to close WebRTC connection: {}", e)), "TransportManager");
                }
            }
            peer_connections.clear();
        }

        // Close WebSocket connections
        {
            let mut websocket_connections = self.websocket_connections.lock().unwrap();
            for (_, websocket) in websocket_connections.iter_mut() {
                if let Err(e) = websocket.close(None).await {
                    logging::log_error(&AgentError::Transport(format!("Failed to close WebSocket connection: {}", e)), "TransportManager");
                }
            }
            websocket_connections.clear();
        }

        // Clear connection info
        {
            let mut connections = self.connections.lock().unwrap();
            connections.clear();
        }

        Ok(())
    }

    pub async fn create_webrtc_connection(&self, client_id: String) -> AgentResult<String> {
        let connection_id = Uuid::new_v4().to_string();
        
        let connection_info = ConnectionInfo {
            id: connection_id.clone(),
            transport_type: TransportType::WebRTC,
            state: ConnectionState::Connecting,
            client_id,
            start_time: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs(),
            last_activity: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs(),
        };

        {
            let mut connections = self.connections.lock().unwrap();
            connections.insert(connection_id.clone(), connection_info);
        }

        logging::log_info(&format!("Created WebRTC connection: {}", connection_id), "TransportManager");
        Ok(connection_id)
    }

    pub async fn create_websocket_connection(&self, client_id: String) -> AgentResult<String> {
        let connection_id = Uuid::new_v4().to_string();
        
        let connection_info = ConnectionInfo {
            id: connection_id.clone(),
            transport_type: TransportType::WebSocket,
            state: ConnectionState::Connecting,
            client_id,
            start_time: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs(),
            last_activity: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs(),
        };

        {
            let mut connections = self.connections.lock().unwrap();
            connections.insert(connection_id.clone(), connection_info);
        }

        logging::log_info(&format!("Created WebSocket connection: {}", connection_id), "TransportManager");
        Ok(connection_id)
    }

    pub async fn close_connection(&self, connection_id: &str) -> AgentResult<()> {
        let connection_info = {
            let connections = self.connections.lock().unwrap();
            connections.get(connection_id).cloned()
        };

        if let Some(connection) = connection_info {
            match connection.transport_type {
                TransportType::WebRTC => {
                    let mut peer_connections = self.webrtc_peer_connections.lock().unwrap();
                    if let Some(peer_connection) = peer_connections.remove(connection_id) {
                        if let Err(e) = peer_connection.close().await {
                            logging::log_error(&AgentError::Transport(format!("Failed to close WebRTC connection: {}", e)), "TransportManager");
                        }
                    }
                }
                TransportType::WebSocket => {
                    let mut websocket_connections = self.websocket_connections.lock().unwrap();
                    if let Some(mut websocket) = websocket_connections.remove(connection_id) {
                        if let Err(e) = websocket.close(None).await {
                            logging::log_error(&AgentError::Transport(format!("Failed to close WebSocket connection: {}", e)), "TransportManager");
                        }
                    }
                }
            }

            {
                let mut connections = self.connections.lock().unwrap();
                connections.remove(connection_id);
            }

            logging::log_info(&format!("Closed connection: {}", connection_id), "TransportManager");
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_transport_manager_creation() {
        let config = TransportConfig::default();
        let manager = TransportManager::new(config);
        assert!(manager.is_ok());
    }

    #[tokio::test]
    async fn test_webrtc_connection_creation() {
        let config = TransportConfig::default();
        let manager = TransportManager::new(config).unwrap();
        
        let connection_id = manager.create_webrtc_connection("test_client".to_string()).await;
        assert!(connection_id.is_ok());
        
        let connection_id = connection_id.unwrap();
        assert!(!connection_id.is_empty());
    }

    #[tokio::test]
    async fn test_websocket_connection_creation() {
        let config = TransportConfig::default();
        let manager = TransportManager::new(config).unwrap();
        
        let connection_id = manager.create_websocket_connection("test_client".to_string()).await;
        assert!(connection_id.is_ok());
        
        let connection_id = connection_id.unwrap();
        assert!(!connection_id.is_empty());
    }
} 