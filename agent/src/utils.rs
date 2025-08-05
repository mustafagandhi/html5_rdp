use crate::error::{AgentError, AgentResult};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

pub fn get_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

pub fn get_timestamp_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

pub fn format_duration(duration: Duration) -> String {
    let total_seconds = duration.as_secs();
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;

    if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, seconds)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, seconds)
    } else {
        format!("{}s", seconds)
    }
}

pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    match bytes {
        0..=KB => format!("{} B", bytes),
        KB..=MB => format!("{:.1} KB", bytes as f64 / KB as f64),
        MB..=GB => format!("{:.1} MB", bytes as f64 / MB as f64),
        _ => format!("{:.1} GB", bytes as f64 / GB as f64),
    }
}

pub fn format_bitrate(bps: u64) -> String {
    const KBPS: u64 = 1000;
    const MBPS: u64 = KBPS * 1000;
    const GBPS: u64 = MBPS * 1000;

    match bps {
        0..=KBPS => format!("{} bps", bps),
        KBPS..=MBPS => format!("{:.1} Kbps", bps as f64 / KBPS as f64),
        MBPS..=GBPS => format!("{:.1} Mbps", bps as f64 / MBPS as f64),
        _ => format!("{:.1} Gbps", bps as f64 / GBPS as f64),
    }
}

pub fn calculate_fps(frame_times: &[u64]) -> f32 {
    if frame_times.len() < 2 {
        return 0.0;
    }

    let total_time = frame_times.last().unwrap() - frame_times.first().unwrap();
    if total_time == 0 {
        return 0.0;
    }

    let frame_count = frame_times.len() - 1;
    (frame_count as f32 * 1000.0) / (total_time as f32)
}

pub fn calculate_latency(send_time: u64, receive_time: u64) -> u32 {
    if receive_time >= send_time {
        (receive_time - send_time) as u32
    } else {
        0
    }
}

pub fn calculate_packet_loss(sent: u32, received: u32) -> f32 {
    if sent == 0 {
        return 0.0;
    }
    ((sent - received) as f32 / sent as f32) * 100.0
}

pub fn validate_uuid(uuid_str: &str) -> AgentResult<()> {
    uuid::Uuid::parse_str(uuid_str)
        .map(|_| ())
        .map_err(|e| AgentError::Other(format!("Invalid UUID: {}", e)))
}

pub fn generate_session_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn generate_token() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 32] = rng.gen();
    base64::encode(bytes)
}

pub fn hash_password(password: &str) -> AgentResult<String> {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    Ok(format!("{:x}", hasher.finalize()))
}

pub fn verify_password(password: &str, hash: &str) -> AgentResult<bool> {
    let password_hash = hash_password(password)?;
    Ok(password_hash == hash)
}

pub fn compress_data(data: &[u8]) -> AgentResult<Vec<u8>> {
    use flate2::write::DeflateEncoder;
    use flate2::Compression;
    use std::io::Write;

    let mut encoder = DeflateEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(data)?;
    encoder.finish().map_err(|e| AgentError::Other(format!("Compression error: {}", e)))
}

pub fn decompress_data(data: &[u8]) -> AgentResult<Vec<u8>> {
    use flate2::read::DeflateDecoder;
    use std::io::Read;

    let mut decoder = DeflateDecoder::new(data);
    let mut decompressed = Vec::new();
    decoder.read_to_end(&mut decompressed)?;
    Ok(decompressed)
}

pub fn encode_base64(data: &[u8]) -> String {
    base64::encode(data)
}

pub fn decode_base64(data: &str) -> AgentResult<Vec<u8>> {
    base64::decode(data)
        .map_err(|e| AgentError::Other(format!("Base64 decode error: {}", e)))
}

pub fn sanitize_filename(filename: &str) -> String {
    use std::path::Path;
    
    let path = Path::new(filename);
    if let Some(name) = path.file_name() {
        if let Some(name_str) = name.to_str() {
            // Remove or replace invalid characters
            name_str
                .chars()
                .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
                .collect()
        } else {
            "unknown_file".to_string()
        }
    } else {
        "unknown_file".to_string()
    }
}

pub fn get_system_memory_info() -> AgentResult<(u64, u64)> {
    use sysinfo::{System, SystemExt};
    
    let mut sys = System::new_all();
    sys.refresh_memory();
    
    let total = sys.total_memory() * 1024; // Convert to bytes
    let available = sys.available_memory() * 1024; // Convert to bytes
    
    Ok((total, available))
}

pub fn get_cpu_usage() -> AgentResult<f32> {
    use sysinfo::{System, SystemExt};
    
    let mut sys = System::new_all();
    sys.refresh_cpu();
    
    // Get average CPU usage across all cores
    let cpu_usage = sys.global_cpu_info().cpu_usage();
    Ok(cpu_usage)
}

pub fn is_port_available(port: u16) -> bool {
    use std::net::{TcpListener, TcpStream};
    
    // Try to bind to the port
    if let Ok(_listener) = TcpListener::bind(format!("127.0.0.1:{}", port)) {
        return true;
    }
    
    // If binding fails, try to connect to see if it's in use
    if let Ok(_stream) = TcpStream::connect(format!("127.0.0.1:{}", port)) {
        return false; // Port is in use
    }
    
    true // Port is available
}

pub fn find_available_port(start_port: u16) -> Option<u16> {
    for port in start_port..start_port + 1000 {
        if is_port_available(port) {
            return Some(port);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timestamp_functions() {
        let timestamp = get_timestamp();
        assert!(timestamp > 0);
        
        let timestamp_seconds = get_timestamp_seconds();
        assert!(timestamp_seconds > 0);
    }

    #[test]
    fn test_format_duration() {
        let duration = Duration::from_secs(3661); // 1h 1m 1s
        let formatted = format_duration(duration);
        assert_eq!(formatted, "1h 1m 1s");
        
        let duration = Duration::from_secs(61); // 1m 1s
        let formatted = format_duration(duration);
        assert_eq!(formatted, "1m 1s");
        
        let duration = Duration::from_secs(30); // 30s
        let formatted = format_duration(duration);
        assert_eq!(formatted, "30s");
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(1024), "1.0 KB");
        assert_eq!(format_bytes(1048576), "1.0 MB");
        assert_eq!(format_bytes(1073741824), "1.0 GB");
    }

    #[test]
    fn test_format_bitrate() {
        assert_eq!(format_bitrate(1000), "1.0 Kbps");
        assert_eq!(format_bitrate(1000000), "1.0 Mbps");
        assert_eq!(format_bitrate(1000000000), "1.0 Gbps");
    }

    #[test]
    fn test_calculate_fps() {
        let frame_times = vec![1000, 1033, 1066, 1100]; // ~30 FPS
        let fps = calculate_fps(&frame_times);
        assert!((fps - 30.0).abs() < 5.0); // Allow some tolerance
    }

    #[test]
    fn test_calculate_latency() {
        let latency = calculate_latency(1000, 1045);
        assert_eq!(latency, 45);
    }

    #[test]
    fn test_calculate_packet_loss() {
        let loss = calculate_packet_loss(100, 95);
        assert_eq!(loss, 5.0);
    }

    #[test]
    fn test_uuid_validation() {
        let valid_uuid = "550e8400-e29b-41d4-a716-446655440000";
        assert!(validate_uuid(valid_uuid).is_ok());
        
        let invalid_uuid = "invalid-uuid";
        assert!(validate_uuid(invalid_uuid).is_err());
    }

    #[test]
    fn test_session_id_generation() {
        let session_id = generate_session_id();
        assert!(!session_id.is_empty());
        assert!(validate_uuid(&session_id).is_ok());
    }

    #[test]
    fn test_token_generation() {
        let token = generate_token();
        assert!(!token.is_empty());
        assert_ne!(token, generate_token()); // Should be unique
    }

    #[test]
    fn test_password_hashing() {
        let password = "test_password";
        let hash = hash_password(password).unwrap();
        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_compression() {
        let original_data = b"Hello, World! This is a test string for compression.";
        let compressed = compress_data(original_data).unwrap();
        let decompressed = decompress_data(&compressed).unwrap();
        assert_eq!(original_data, decompressed.as_slice());
    }

    #[test]
    fn test_base64_encoding() {
        let data = b"Hello, World!";
        let encoded = encode_base64(data);
        let decoded = decode_base64(&encoded).unwrap();
        assert_eq!(data, decoded.as_slice());
    }

    #[test]
    fn test_filename_sanitization() {
        let filename = "test file (1).txt";
        let sanitized = sanitize_filename(filename);
        assert_eq!(sanitized, "test_file__1_.txt");
    }
} 