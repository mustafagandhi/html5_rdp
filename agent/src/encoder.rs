use crate::{
    config::CaptureConfig,
    error::{AgentError, AgentResult},
    logging,
    types::{Frame, VideoCodec},
};
use openh264::encoder::{Encoder, EncoderConfig};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct VideoEncoder {
    config: CaptureConfig,
    encoder: Arc<Mutex<Option<Encoder>>>,
    frame_count: u64,
    last_keyframe: u64,
}

impl VideoEncoder {
    pub fn new(config: CaptureConfig) -> AgentResult<Self> {
        logging::log_info("Initializing Video Encoder", "VideoEncoder");

        Ok(Self {
            config,
            encoder: Arc::new(Mutex::new(None)),
            frame_count: 0,
            last_keyframe: 0,
        })
    }

    pub async fn initialize(&mut self) -> AgentResult<()> {
        logging::log_info("Initializing H.264 encoder", "VideoEncoder");

        let encoder_config = EncoderConfig::new(1920, 1080); // Default resolution

        let encoder = Encoder::with_config(encoder_config)?;
        
        {
            let mut encoder_guard = self.encoder.lock().await;
            *encoder_guard = Some(encoder);
        }

        logging::log_info("H.264 encoder initialized successfully", "VideoEncoder");
        Ok(())
    }

    pub async fn encode_frame(&mut self, rgba_data: Vec<u8>) -> AgentResult<Vec<u8>> {
        self.frame_count += 1;
        
        // Force keyframe every 2 seconds
        if self.frame_count - self.last_keyframe >= self.config.framerate as u64 * 2 {
            self.last_keyframe = self.frame_count;
        }

        // Get encoder
        let encoder_guard = self.encoder.lock().await;
        let encoder = encoder_guard.as_ref().ok_or(AgentError::EncoderNotInitialized)?;
        
        // Convert RGBA to YUV420
        let width = 1920; // TODO: Get from frame
        let height = 1080; // TODO: Get from frame
        let yuv_data = self.rgba_to_yuv420(&rgba_data, width, height);
        
        // For now, return the YUV data as-is since OpenH264 requires specific YUV format
        // In a full implementation, we would convert to the proper YUV format
        Ok(yuv_data)
    }

    pub async fn encode_frame_to_frame(&mut self, rgba_data: Vec<u8>) -> AgentResult<Frame> {
        let encoded_data = self.encode_frame(rgba_data).await?;
        
        Ok(Frame {
            id: uuid::Uuid::new_v4(),
            timestamp: chrono::Utc::now().timestamp_millis() as u64,
            width: 1920, // Default width
            height: 1080, // Default height
            data: encoded_data,
            format: VideoCodec::H264,
            quality: self.config.quality.clone(),
            compressed: true,
        })
    }

    fn get_bitrate(&self) -> u32 {
        match self.config.quality {
            crate::types::Quality::Low => 500_000,      // 500 Kbps
            crate::types::Quality::Medium => 1_500_000,  // 1.5 Mbps
            crate::types::Quality::High => 3_000_000,    // 3 Mbps
            crate::types::Quality::Ultra => 6_000_000,   // 6 Mbps
        }
    }

    fn rgba_to_yuv420(&self, rgba: &[u8], width: usize, height: usize) -> Vec<u8> {
        let mut yuv = Vec::with_capacity(width * height * 3 / 2);
        
        // Y plane (luma)
        for i in (0..rgba.len()).step_by(4) {
            let r = rgba[i] as f32;
            let g = rgba[i + 1] as f32;
            let b = rgba[i + 2] as f32;
            
            // Convert RGB to Y (luma)
            let y = 0.299 * r + 0.587 * g + 0.114 * b;
            yuv.push(y.clamp(0.0, 255.0) as u8);
        }
        
        // U and V planes (chroma) - subsampled by 2
        for y in (0..height).step_by(2) {
            for x in (0..width).step_by(2) {
                let idx = (y * width + x) * 4;
                if idx + 3 < rgba.len() {
                    let r = rgba[idx] as f32;
                    let g = rgba[idx + 1] as f32;
                    let b = rgba[idx + 2] as f32;
                    
                    // Convert RGB to U (chroma blue)
                    let u = -0.147 * r - 0.289 * g + 0.436 * b + 128.0;
                    yuv.push(u.clamp(0.0, 255.0) as u8);
                    
                    // Convert RGB to V (chroma red)
                    let v = 0.615 * r - 0.515 * g - 0.100 * b + 128.0;
                    yuv.push(v.clamp(0.0, 255.0) as u8);
                }
            }
        }
        
        yuv
    }

    pub async fn shutdown(&mut self) -> AgentResult<()> {
        logging::log_info("Shutting down Video Encoder", "VideoEncoder");
        
        {
            let mut encoder_guard = self.encoder.lock().await;
            *encoder_guard = None;
        }
        
        logging::log_info("Video Encoder shutdown complete", "VideoEncoder");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_encoder_creation() {
        let config = CaptureConfig::default();
        let encoder = VideoEncoder::new(config);
        assert!(encoder.is_ok());
    }

    #[tokio::test]
    async fn test_encoder_initialization() {
        let config = CaptureConfig::default();
        let mut encoder = VideoEncoder::new(config).unwrap();
        let result = encoder.initialize().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_frame_encoding() {
        let config = CaptureConfig::default();
        let mut encoder = VideoEncoder::new(config).unwrap();
        encoder.initialize().await.unwrap();
        
        // Create a test frame (red pixels)
        let test_data = vec![255u8; 1920 * 1080 * 4]; // RGBA data
        let result = encoder.encode_frame(test_data).await;
        assert!(result.is_ok());
    }
} 