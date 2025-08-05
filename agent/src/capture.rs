use crate::{
    config::CaptureConfig,
    error::{AgentError, AgentResult},
    logging,
    types::{Display, Frame, Metrics, Quality, VideoCodec},
};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use uuid::Uuid;

#[cfg(target_os = "windows")]
use windows::{
    core::{Interface, PCWSTR},
    Graphics::DirectX::Direct3D11::{
        ID3D11Device, ID3D11DeviceContext, ID3D11Texture2D, D3D11_TEXTURE2D_DESC,
    },
    Graphics::DirectX::Direct3D11::{
        D3D11CreateDevice, D3D11_DRIVER_TYPE_HARDWARE, D3D11_CREATE_DEVICE_BGRA_SUPPORT,
    },
    Graphics::DirectX::DXGI::{
        IDXGIAdapter1, IDXGIOutput, IDXGIOutput1, IDXGIOutputDuplication, DXGI_OUTPUT_DESC,
        DXGI_OUTDUPL_DESC, DXGI_OUTDUPL_FRAME_INFO,
    },
    Graphics::DirectX::DXGI::{
        DXGI_ERROR_WAIT_TIMEOUT, DXGI_ERROR_ACCESS_LOST, DXGI_ERROR_ACCESS_DENIED,
    },
    Win32::Graphics::Gdi::{
        EnumDisplayMonitors, GetMonitorInfoW, MONITORINFOEXW, MONITORINFOF_PRIMARY,
    },
    Win32::Foundation::{BOOL, HANDLE, RECT},
};

pub struct CaptureManager {
    config: CaptureConfig,
    displays: Arc<Mutex<Vec<Display>>>,
    is_capturing: Arc<Mutex<bool>>,
    frame_tx: Option<mpsc::Sender<Frame>>,
    metrics: Arc<Mutex<Metrics>>,
    capture_handle: Option<tokio::task::JoinHandle<()>>,
    start_time: Instant,
}

#[cfg(target_os = "windows")]
struct WindowsCaptureContext {
    device: ID3D11Device,
    context: ID3D11DeviceContext,
    output_duplications: Vec<IDXGIOutputDuplication>,
    frame_count: u64,
    last_frame_time: Instant,
}

impl CaptureManager {
    pub fn new(config: CaptureConfig) -> AgentResult<Self> {
        logging::log_info("Initializing Capture Manager", "CaptureManager");

        Ok(Self {
            config,
            displays: Arc::new(Mutex::new(Vec::new())),
            is_capturing: Arc::new(Mutex::new(false)),
            frame_tx: None,
            metrics: Arc::new(Mutex::new(Metrics::default())),
            capture_handle: None,
            start_time: Instant::now(),
        })
    }

    pub async fn start(&mut self) -> AgentResult<()> {
        logging::log_info("Starting Capture Manager", "CaptureManager");

        // Discover displays
        self.discover_displays().await?;

        // Start capture if video is enabled
        if self.config.video {
            self.start_capture().await?;
        }

        logging::log_info("Capture Manager started", "CaptureManager");
        Ok(())
    }

    pub async fn stop(&mut self) -> AgentResult<()> {
        logging::log_info("Stopping Capture Manager", "CaptureManager");

        // Stop capture
        {
            let mut is_capturing = self.is_capturing.lock().unwrap();
            *is_capturing = false;
        }

        // Wait for capture task to finish
        if let Some(handle) = self.capture_handle.take() {
            let _ = handle.await;
        }

        logging::log_info("Capture Manager stopped", "CaptureManager");
        Ok(())
    }

    pub fn set_frame_sender(&mut self, tx: mpsc::Sender<Frame>) {
        self.frame_tx = Some(tx);
    }

    pub async fn get_displays(&self) -> Vec<Display> {
        let displays = self.displays.lock().unwrap();
        displays.clone()
    }

    pub async fn get_metrics(&self) -> AgentResult<Metrics> {
        let metrics = self.metrics.lock().unwrap();
        Ok(metrics.clone())
    }

    pub async fn set_quality(&mut self, quality: Quality) -> AgentResult<()> {
        self.config.quality = quality;
        logging::log_info(&format!("Quality set to: {:?}", quality), "CaptureManager");
        Ok(())
    }

    pub async fn set_framerate(&mut self, framerate: u32) -> AgentResult<()> {
        self.config.framerate = framerate;
        logging::log_info(&format!("Framerate set to: {}", framerate), "CaptureManager");
        Ok(())
    }

    async fn discover_displays(&mut self) -> AgentResult<()> {
        logging::log_info("Discovering displays", "CaptureManager");

        #[cfg(target_os = "windows")]
        {
            let displays = Self::discover_windows_displays().await?;
            let mut displays_mutex = self.displays.lock().unwrap();
            *displays_mutex = displays;
        }

        #[cfg(target_os = "linux")]
        {
            let displays = Self::discover_linux_displays().await?;
            let mut displays_mutex = self.displays.lock().unwrap();
            *displays_mutex = displays;
        }

        #[cfg(target_os = "macos")]
        {
            let displays = Self::discover_macos_displays().await?;
            let mut displays_mutex = self.displays.lock().unwrap();
            *displays_mutex = displays;
        }

        logging::log_info("Display discovery completed", "CaptureManager");
        Ok(())
    }

    async fn start_capture(&mut self) -> AgentResult<()> {
        logging::log_info("Starting capture", "CaptureManager");

        let frame_tx = self.frame_tx.clone().ok_or(AgentError::ConfigurationError(
            "Frame sender not set".to_string(),
        ))?;

        let config = self.config.clone();
        let displays = self.displays.clone();
        let is_capturing = self.is_capturing.clone();
        let metrics = self.metrics.clone();

        // Set capturing flag
        {
            let mut capturing = is_capturing.lock().unwrap();
            *capturing = true;
        }

        let handle = tokio::spawn(async move {
            let mut frame_interval = Duration::from_millis(1000 / config.framerate as u64);
            let mut last_frame_time = Instant::now();

            while {
                let capturing = is_capturing.lock().unwrap();
                *capturing
            } {
                let now = Instant::now();
                if now.duration_since(last_frame_time) >= frame_interval {
                    match Self::capture_frame(&config, &displays).await {
                        Ok(frame) => {
                            if let Err(e) = frame_tx.send(frame).await {
                                logging::log_error(&format!("Failed to send frame: {}", e), "CaptureManager");
                                break;
                            }

                            // Update metrics
                            {
                                let mut metrics_guard = metrics.lock().unwrap();
                                metrics_guard.fps = 1.0 / frame_interval.as_secs_f64();
                                metrics_guard.frames_captured += 1;
                            }

                            last_frame_time = now;
                        }
                        Err(e) => {
                            logging::log_error(&format!("Failed to capture frame: {}", e), "CaptureManager");
                            tokio::time::sleep(Duration::from_millis(100)).await;
                        }
                    }
                } else {
                    tokio::time::sleep(Duration::from_millis(1)).await;
                }
            }
        });

        self.capture_handle = Some(handle);
        Ok(())
    }

    async fn capture_frame(config: &CaptureConfig, displays: &Arc<Mutex<Vec<Display>>>) -> AgentResult<Frame> {
        #[cfg(target_os = "windows")]
        {
            Self::capture_windows_frame(config, displays).await
        }

        #[cfg(target_os = "linux")]
        {
            Self::capture_linux_frame(config, displays).await
        }

        #[cfg(target_os = "macos")]
        {
            Self::capture_macos_frame(config, displays).await
        }
    }

    #[cfg(target_os = "windows")]
    async fn discover_windows_displays() -> AgentResult<Vec<Display>> {
        let mut displays = Vec::new();
        let mut monitor_count = 0;

        unsafe {
            let result = EnumDisplayMonitors(
                HANDLE::default(),
                None,
                Some(enum_monitor_proc),
                &mut monitor_count as *mut _ as isize,
            );

            if result.as_bool() {
                // For now, we'll create a single display entry
                // In a full implementation, we'd enumerate all monitors
                displays.push(Display {
                    id: "primary".to_string(),
                    name: "Primary Display".to_string(),
                    width: 1920,
                    height: 1080,
                    x: 0,
                    y: 0,
                    is_primary: true,
                    refresh_rate: 60,
                });
            }
        }

        Ok(displays)
    }

    #[cfg(target_os = "linux")]
    async fn discover_linux_displays() -> AgentResult<Vec<Display>> {
        // Placeholder for Linux display discovery
        // Would use X11 or Wayland APIs
        Ok(vec![Display {
            id: "primary".to_string(),
            name: "Primary Display".to_string(),
            width: 1920,
            height: 1080,
            x: 0,
            y: 0,
            is_primary: true,
            refresh_rate: 60,
        }])
    }

    #[cfg(target_os = "macos")]
    async fn discover_macos_displays() -> AgentResult<Vec<Display>> {
        // Placeholder for macOS display discovery
        // Would use Core Graphics APIs
        Ok(vec![Display {
            id: "primary".to_string(),
            name: "Primary Display".to_string(),
            width: 1920,
            height: 1080,
            x: 0,
            y: 0,
            is_primary: true,
            refresh_rate: 60,
        }])
    }

    #[cfg(target_os = "windows")]
    async fn capture_windows_frame(config: &CaptureConfig, _displays: &Arc<Mutex<Vec<Display>>>) -> AgentResult<Frame> {
        static mut CAPTURE_CONTEXT: Option<WindowsCaptureContext> = None;

        unsafe {
            // Initialize capture context if not already done
            if CAPTURE_CONTEXT.is_none() {
                let (device, context) = Self::create_d3d11_device()?;
                let output_duplications = Self::create_output_duplications(&device).await?;
                
                CAPTURE_CONTEXT = Some(WindowsCaptureContext {
                    device,
                    context,
                    output_duplications,
                    frame_count: 0,
                    last_frame_time: Instant::now(),
                });
            }

            let context = CAPTURE_CONTEXT.as_mut().unwrap();
            let frame_data = Self::capture_dxgi_frame(context).await?;

            let frame = Frame {
                id: Uuid::new_v4().to_string(),
                timestamp: chrono::Utc::now().timestamp_millis(),
                width: config.width,
                height: config.height,
                format: VideoCodec::H264,
                quality: config.quality.clone(),
                data: frame_data,
                display_id: "primary".to_string(),
            };

            context.frame_count += 1;
            context.last_frame_time = Instant::now();

            Ok(frame)
        }
    }

    #[cfg(target_os = "windows")]
    fn create_d3d11_device() -> AgentResult<(ID3D11Device, ID3D11DeviceContext)> {
        unsafe {
            let (device, context) = D3D11CreateDevice(
                None,
                D3D11_DRIVER_TYPE_HARDWARE,
                None,
                D3D11_CREATE_DEVICE_BGRA_SUPPORT,
                None,
                0,
            )?;

            Ok((device, context))
        }
    }

    #[cfg(target_os = "windows")]
    async fn create_output_duplications(device: &ID3D11Device) -> AgentResult<Vec<IDXGIOutputDuplication>> {
        let mut duplications = Vec::new();

        // Get the primary adapter
        let adapter: IDXGIAdapter1 = device.GetAdapter()?;
        
        // Get the primary output
        let output: IDXGIOutput = adapter.EnumOutputs(0)?;
        let output1: IDXGIOutput1 = output.cast()?;
        
        // Create output duplication
        let duplication = output1.DuplicateOutput(device)?;
        duplications.push(duplication);

        Ok(duplications)
    }

    #[cfg(target_os = "windows")]
    async fn capture_dxgi_frame(context: &mut WindowsCaptureContext) -> AgentResult<Vec<u8>> {
        for duplication in &context.output_duplications {
            match duplication.AcquireNextFrame(100, None, None) {
                Ok((frame_info, desktop_resource)) => {
                    // Convert the desktop resource to a texture
                    let texture: ID3D11Texture2D = desktop_resource.cast()?;
                    
                    // Create a staging texture to read the data
                    let desc = texture.GetDesc();
                    let staging_desc = D3D11_TEXTURE2D_DESC {
                        Width: desc.Width,
                        Height: desc.Height,
                        MipLevels: 1,
                        ArraySize: 1,
                        Format: desc.Format,
                        SampleDesc: desc.SampleDesc,
                        Usage: windows::Graphics::DirectX::Direct3D11::D3D11_USAGE_STAGING,
                        BindFlags: 0,
                        CPUAccessFlags: windows::Graphics::DirectX::Direct3D11::D3D11_CPU_ACCESS_READ,
                        MiscFlags: 0,
                    };

                    let staging_texture = context.device.CreateTexture2D(&staging_desc, None)?;
                    
                    // Copy the desktop texture to staging texture
                    context.context.CopyResource(&staging_texture, &texture);
                    
                    // Map the staging texture to read pixel data
                    let mapped_subresource = context.context.Map(
                        &staging_texture,
                        0,
                        windows::Graphics::DirectX::Direct3D11::D3D11_MAP_READ,
                        0,
                    )?;

                    // Convert BGRA to RGBA and compress
                    let width = desc.Width as usize;
                    let height = desc.Height as usize;
                    let pitch = mapped_subresource.RowPitch as usize;
                    let data = std::slice::from_raw_parts(
                        mapped_subresource.pData as *const u8,
                        pitch * height,
                    );

                    let mut rgba_data = Vec::with_capacity(width * height * 4);
                    for y in 0..height {
                        for x in 0..width {
                            let src_offset = y * pitch + x * 4;
                            if src_offset + 3 < data.len() {
                                // Convert BGRA to RGBA
                                rgba_data.push(data[src_offset + 2]); // R
                                rgba_data.push(data[src_offset + 1]); // G
                                rgba_data.push(data[src_offset + 0]); // B
                                rgba_data.push(data[src_offset + 3]); // A
                            }
                        }
                    }

                    context.context.Unmap(&staging_texture, 0);
                    duplication.ReleaseFrame()?;

                    // For now, return raw RGBA data
                    // In production, this would be encoded to H.264
                    return Ok(rgba_data);
                }
                Err(e) => {
                    if e.code() == DXGI_ERROR_WAIT_TIMEOUT {
                        continue;
                    } else {
                        return Err(AgentError::CaptureError(format!("DXGI capture failed: {}", e)));
                    }
                }
            }
        }

        Err(AgentError::CaptureError("No frames captured".to_string()))
    }

    #[cfg(target_os = "linux")]
    async fn capture_linux_frame(config: &CaptureConfig, _displays: &Arc<Mutex<Vec<Display>>>) -> AgentResult<Frame> {
        // Placeholder for Linux frame capture
        // Would use X11 or Wayland APIs
        let frame_data = vec![0u8; config.width as usize * config.height as usize * 4];
        
        Ok(Frame {
            id: Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            width: config.width,
            height: config.height,
            format: VideoCodec::H264,
            quality: config.quality.clone(),
            data: frame_data,
            display_id: "primary".to_string(),
        })
    }

    #[cfg(target_os = "macos")]
    async fn capture_macos_frame(config: &CaptureConfig, _displays: &Arc<Mutex<Vec<Display>>>) -> AgentResult<Frame> {
        // Placeholder for macOS frame capture
        // Would use Core Graphics APIs
        let frame_data = vec![0u8; config.width as usize * config.height as usize * 4];
        
        Ok(Frame {
            id: Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            width: config.width,
            height: config.height,
            format: VideoCodec::H264,
            quality: config.quality.clone(),
            data: frame_data,
            display_id: "primary".to_string(),
        })
    }
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn enum_monitor_proc(
    _hmonitor: isize,
    _hdc: isize,
    _lprc: *const RECT,
    _lparam: isize,
) -> i32 {
    // This is a simplified implementation
    // In a full implementation, we'd collect monitor information
    1
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_capture_manager_creation() {
        let config = CaptureConfig::default();
        let manager = CaptureManager::new(config);
        assert!(manager.is_ok());
    }

    #[tokio::test]
    async fn test_display_discovery() {
        let config = CaptureConfig::default();
        let mut manager = CaptureManager::new(config).unwrap();
        let result = manager.discover_displays().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_quality_setting() {
        let config = CaptureConfig::default();
        let mut manager = CaptureManager::new(config).unwrap();
        let result = manager.set_quality(Quality::High).await;
        assert!(result.is_ok());
    }
} 