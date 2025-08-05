# HTML5_RDP

A production-grade, self-hosted remote desktop solution that provides secure, browser-based access to Windows desktops with native performance and enterprise-ready features.

## 🚀 Features

### Core Capabilities
- **Browser-based access** - No plugins or extensions required
- **Native Windows agent** - Built in Rust for performance and security
- **Real-time video streaming** - H.264 hardware-accelerated encoding
- **Low-latency input** - Mouse, keyboard, touch, and clipboard support
- **Multi-monitor support** - Switch between displays seamlessly
- **File transfer** - Drag-and-drop file upload/download
- **Secure communication** - WebRTC with TLS fallback

### Enterprise Features
- **Token-based authentication** - Secure device pairing
- **Session management** - Multiple concurrent sessions
- **Audit logging** - Complete activity tracking
- **Quality adaptation** - Automatic bitrate and framerate adjustment
- **Firewall integration** - Automatic Windows firewall rules
- **Windows service** - Runs as background service

### Performance
- **Hardware acceleration** - GPU-accelerated video encoding
- **Adaptive quality** - Dynamic quality adjustment based on network
- **Efficient protocols** - Binary message format for minimal overhead
- **Connection resilience** - Automatic reconnection and recovery

## 🏗️ Architecture

```
┌─────────────────┐    WebRTC/WebSocket    ┌─────────────────┐
│   Web Client    │◄──────────────────────►│  Windows Agent  │
│   (Browser)     │                        │   (Rust)        │
└─────────────────┘                        └─────────────────┘
        │                                           │
        │                                           │
        ▼                                           ▼
┌─────────────────┐                        ┌─────────────────┐
│   Canvas UI     │                        │   DXGI Capture  │
│   Input Handler │                        │   Input Inject  │
│   WebRTC Client │                        │   H.264 Encoder │
└─────────────────┘                        └─────────────────┘
```

## 📦 Installation

### Prerequisites

- **Windows 10/11** (for agent)
- **Modern browser** (Chrome, Firefox, Safari, Edge)
- **Rust 1.70+** (for building agent)
- **Node.js 18+** (for web client)

### Building from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/real-remote-desktop/platform.git
   cd platform
   ```

2. **Build the Windows agent**
   ```bash
   cd agent
   cargo build --release
   ```

3. **Build the web client**
   ```bash
   npm install
   npm run build
   ```

4. **Install the agent**
   ```bash
   # Run as Administrator
   powershell -ExecutionPolicy Bypass -File install_service.ps1
   ```

### Using the Installer

1. Download the latest installer from releases
2. Run `RealRemoteDesktopAgent-Setup.exe` as Administrator
3. Follow the installation wizard
4. The agent will start automatically as a Windows service

## 🔧 Configuration

### Agent Configuration (`agent/config.toml`)

```toml
[server]
host = "0.0.0.0"
port = 8080
max_connections = 10

[capture]
video = true
quality = "high"
framerate = 30
codec = "h264"

[transport]
webrtc_enabled = true
websocket_enabled = true
ice_servers = ["stun:stun.l.google.com:19302"]
```

### Web Client Configuration

The web client automatically detects the agent and connects. For custom configurations:

```javascript
const config = {
  host: 'localhost',
  port: 8080,
  secure: false,
  quality: 'high',
  enableAudio: false
};
```

## 🚀 Usage

### Starting the Agent

1. **As Windows Service** (recommended)
   ```powershell
   Start-Service RealRemoteDesktopAgent
   ```

2. **Manually**
   ```bash
   ./target/release/real-remote-desktop-agent.exe --config config.toml
   ```

### Connecting from Browser

1. **Start the web client**
   ```bash
   npm run dev
   ```

2. **Open browser**
   Navigate to `http://localhost:3000`

3. **Connect to agent**
   - Enter the agent's IP address
   - Use the pairing token or QR code
   - Start remote desktop session

### Connection Options

- **Local network**: Use agent's local IP (e.g., `192.168.1.100:8080`)
- **Remote access**: Configure port forwarding or VPN
- **Enterprise**: Use reverse proxy with SSL termination

## 🔐 Security

### Authentication
- **Token-based pairing** - Secure device authentication
- **Session isolation** - Each connection is isolated
- **Encrypted communication** - TLS 1.3 for all connections

### Network Security
- **Firewall integration** - Automatic Windows firewall rules
- **Rate limiting** - Prevents abuse and DoS attacks
- **IP filtering** - Restrict access to specific IP ranges

### Data Protection
- **No data storage** - No sensitive data is stored
- **Memory-only sessions** - All data cleared on disconnect
- **Audit logging** - Complete activity tracking

## 📊 Performance

### Video Quality Settings
- **Low**: 500 Kbps, 15 FPS, 640x480
- **Medium**: 1.5 Mbps, 30 FPS, 1280x720
- **High**: 3 Mbps, 30 FPS, 1920x1080
- **Ultra**: 6 Mbps, 60 FPS, 4K

### Network Requirements
- **Local network**: 1-5 Mbps
- **Remote access**: 5-10 Mbps
- **Enterprise**: 10+ Mbps for multiple sessions

### Hardware Requirements
- **Agent**: Windows 10/11, 4GB RAM, DirectX 11 GPU
- **Client**: Modern browser, 2GB RAM, stable internet

## 🛠️ Development

### Project Structure
```
├── agent/                 # Windows agent (Rust)
│   ├── src/              # Source code
│   ├── config.toml       # Configuration
│   └── build.sh          # Build script
├── web-client/           # Browser client (TypeScript)
│   ├── src/              # Source code
│   └── index.html        # Entry point
├── installer/            # Windows installer
└── protocol/            # Protocol specification
```

### Building for Development

1. **Agent development**
   ```bash
   cd agent
   cargo build
   cargo test
   ```

2. **Web client development**
   ```bash
   npm install
   npm run dev
   npm run test
   ```

3. **Full system test**
   ```bash
   # Start agent
   cargo run --release
   
   # Start web client
   npm run dev
   
   # Connect via browser
   ```

### Debugging

1. **Agent logs**
   ```bash
   # View service logs
   Get-EventLog -LogName Application -Source "RealRemoteDesktopAgent"
   
   # Or check log file
   tail -f "C:\Program Files\Real Remote Desktop\logs\agent.log"
   ```

2. **Web client debugging**
   - Open browser developer tools
   - Check console for connection logs
   - Monitor network tab for WebRTC traffic

## 🔧 Troubleshooting

### Common Issues

1. **Agent won't start**
   - Check Windows service status
   - Verify firewall rules
   - Check log files for errors

2. **Connection fails**
   - Verify agent is running
   - Check network connectivity
   - Ensure ports are open (8080 TCP/UDP)

3. **Poor video quality**
   - Check network bandwidth
   - Adjust quality settings
   - Verify GPU drivers are updated

4. **Input not working**
   - Check agent permissions
   - Verify input injection is enabled
   - Restart agent service

### Performance Optimization

1. **Reduce latency**
   - Use wired network connection
   - Enable hardware acceleration
   - Optimize network settings

2. **Improve quality**
   - Increase bandwidth allocation
   - Use higher quality settings
   - Ensure stable network connection

3. **Multiple sessions**
   - Increase server resources
   - Optimize capture settings
   - Monitor system performance

## 📈 Monitoring

### Agent Metrics
- **CPU usage** - System resource utilization
- **Memory usage** - RAM consumption
- **Network I/O** - Bandwidth usage
- **Active sessions** - Current connections

### Client Metrics
- **Frame rate** - Video performance
- **Latency** - Network delay
- **Bitrate** - Data transfer rate
- **Packet loss** - Network quality

### Log Analysis
```bash
# View real-time logs
tail -f logs/agent.log | grep -E "(ERROR|WARN|INFO)"

# Analyze performance
grep "fps\|latency\|bitrate" logs/agent.log
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards
- **Rust**: Follow rustfmt and clippy guidelines
- **TypeScript**: Use ESLint and Prettier
- **Documentation**: Update README and code comments
- **Testing**: Add unit and integration tests

### Testing
```bash
# Run all tests
cargo test
npm test

# Run specific tests
cargo test capture
npm run test:unit
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **WebRTC** - Real-time communication
- **OpenH264** - Video encoding
- **Tokio** - Async runtime
- **NSIS** - Windows installer

## 📞 Support

- **Documentation**: [Wiki](https://github.com/real-remote-desktop/platform/wiki)
- **Issues**: [GitHub Issues](https://github.com/real-remote-desktop/platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/real-remote-desktop/platform/discussions)
- **Email**: support@real-remote-desktop.com

---

**Real Remote Desktop Platform** - Enterprise-grade remote desktop solution for modern organizations.

