<<<<<<< HEAD
# Real Remote Desktop Platform

A production-grade, self-hosted remote desktop solution that provides secure, low-latency access to Windows desktops through any modern web browser. Built with Rust for the native agent and TypeScript for the web client.

## 🚀 Features

### Core Functionality
- **Native Windows Agent**: High-performance screen capture using DXGI Desktop Duplication API
- **Web-Based Client**: Modern browser interface with hardware-accelerated canvas rendering
- **Real-Time Transport**: WebRTC with WebSocket fallback for optimal connectivity
- **Secure Communication**: End-to-end encryption with token-based authentication
- **Input Injection**: Full mouse, keyboard, and touch input support
- **Multi-Monitor Support**: Switch between displays seamlessly
- **Quality Control**: Dynamic quality adjustment based on network conditions

### Advanced Features
- **Windows Service**: Runs as a background service with auto-start capability
- **Clipboard Sync**: Bidirectional clipboard sharing between local and remote
- **File Transfer**: Drag-and-drop file upload to remote desktop
- **Session Management**: Multiple concurrent sessions with isolation
- **Performance Monitoring**: Real-time metrics and diagnostics
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 📋 Requirements

### Windows Agent
- Windows 10/11 (64-bit)
- .NET Framework 4.7.2 or later
- 4GB RAM minimum, 8GB recommended
- DirectX 11 compatible graphics card
- Network connectivity (port 8080)

### Web Client
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- WebRTC support
- JavaScript enabled
- Network connectivity to agent

### Development Environment
- Rust 1.70+ (for agent development)
- Node.js 18+ (for web client development)
- Git

## 🛠️ Installation

### Quick Start (Pre-built)

1. **Download the latest release** from the releases page
2. **Install the Windows agent**:
   ```powershell
   # Run as Administrator
   .\RealRemoteDesktopAgent-Setup.exe
   ```
3. **Start the web client**:
   ```bash
   # Extract web client files
   tar -xzf real-remote-desktop-web-client.tar.gz
   cd real-remote-desktop-web-client
   
   # Start development server
   npm run dev:server
   ```
4. **Open your browser** and navigate to `http://localhost:3000`

### From Source

#### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Build Everything
```bash
# Clone the repository
git clone https://github.com/real-remote-desktop/platform.git
cd platform

# Build all components
./build.sh

# The built files will be in the `dist/` directory
```

#### Build Individual Components
```bash
# Build only the agent
./build.sh agent

# Build only the web client
./build.sh web-client

# Build only the installer
./build.sh installer

# Run tests
./build.sh test

# Clean build artifacts
./build.sh clean
```

## 🚀 Usage

### Windows Agent

#### Console Mode
```powershell
# Run in console mode (for development/testing)
.\real-remote-desktop-agent.exe

# With custom config
.\real-remote-desktop-agent.exe --config custom-config.toml

# With custom port
.\real-remote-desktop-agent.exe --port 9090
```

#### Service Mode
```powershell
# Install as Windows service (run as Administrator)
.\install_service.ps1

# Start the service
Start-Service RealRemoteDesktopAgent

# Stop the service
Stop-Service RealRemoteDesktopAgent

# Check service status
Get-Service RealRemoteDesktopAgent
```

#### Manual Service Installation
```powershell
# Create service
sc.exe create "RealRemoteDesktopAgent" binPath= "C:\Program Files\Real Remote Desktop\real-remote-desktop-agent.exe --service" DisplayName= "Real Remote Desktop Agent" start= auto

# Start service
sc.exe start RealRemoteDesktopAgent

# Remove service
sc.exe stop RealRemoteDesktopAgent
sc.exe delete RealRemoteDesktopAgent
```

### Web Client

#### Development Mode
```bash
# Start development server
npm run dev

# Or use the custom dev server
npm run dev:server
```

#### Production Mode
```bash
# Build for production
npm run build

# Serve built files
npm run preview
```

#### Using a Simple HTTP Server
```bash
# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000

# Node.js
npx serve dist
```

## 🔧 Configuration

### Agent Configuration (`config.toml`)

```toml
[agent]
name = "Windows Desktop"
version = "1.0.0"
log_level = "info"
log_file = "logs/agent.log"

[capture]
enabled = true
framerate = 30
quality = "high"  # low, medium, high, ultra
codec = "h264"
width = 1920
height = 1080

[transport]
webrtc_enabled = true
websocket_enabled = true
port = 8080
host = "0.0.0.0"
ice_servers = [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302"
]

[input]
enabled = true
mouse_sensitivity = 1.0
keyboard_layout = "en-US"
touch_enabled = true

[security]
token_required = true
token_expiry = 3600
max_sessions = 5
session_timeout = 1800

[logging]
level = "info"
file = "logs/agent.log"
max_size = "10MB"
max_files = 5
```

### Web Client Configuration

The web client configuration is stored in the browser's localStorage and can be modified through the settings panel:

```javascript
// Default configuration
{
  "connection": {
    "defaultHost": "localhost",
    "defaultPort": 8080,
    "secure": false,
    "timeout": 30000
  },
  "display": {
    "defaultQuality": "medium",
    "scaleMode": "fit",
    "maintainAspectRatio": true
  },
  "input": {
    "mouseSensitivity": 1.0,
    "keyboardLayout": "en-US",
    "touchEnabled": true
  },
  "ui": {
    "theme": "auto",
    "showPerformanceOverlay": false,
    "showConnectionInfo": true
  }
}
```

## 🔐 Security

### Authentication
- **Token-based**: Secure pairing using time-limited tokens
- **QR Code**: Easy pairing via QR code scanning
- **Manual Entry**: Direct token input for advanced users

### Encryption
- **WebRTC**: DTLS-SRTP encryption for media streams
- **WebSocket**: TLS encryption for control messages
- **Data Channels**: Encrypted binary communication

### Network Security
- **Firewall Rules**: Automatic Windows firewall configuration
- **Port Management**: Configurable listening ports
- **Access Control**: Session isolation and timeout

## 📊 Monitoring

### Agent Metrics
- CPU and memory usage
- Network bandwidth utilization
- Frame capture and encoding performance
- Active session count
- Error rates and recovery

### Client Metrics
- Connection latency and jitter
- Frame rate and quality
- Input responsiveness
- Network packet loss
- Session duration

### Logging
```bash
# View agent logs
tail -f logs/agent.log

# View service logs (Windows)
Get-EventLog -LogName Application -Source "RealRemoteDesktopAgent"

# View web client logs (browser console)
# Open Developer Tools > Console
```

## 🐛 Troubleshooting

### Common Issues

#### Agent Won't Start
```powershell
# Check if port is in use
netstat -an | findstr :8080

# Check Windows Defender
Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled

# Check service status
Get-Service RealRemoteDesktopAgent
```

#### Web Client Can't Connect
```javascript
// Check browser console for errors
// Verify WebRTC support
if (!navigator.mediaDevices) {
  console.error('WebRTC not supported');
}

// Check network connectivity
fetch('http://agent-ip:8080/health')
  .then(response => console.log('Agent reachable'))
  .catch(error => console.error('Agent unreachable'));
```

#### Poor Performance
1. **Reduce quality** in client settings
2. **Check network** bandwidth and latency
3. **Update graphics drivers** on Windows
4. **Close unnecessary applications** on remote desktop
5. **Use wired connection** instead of WiFi

#### Screen Capture Issues
```powershell
# Check DXGI support
dxdiag

# Update graphics drivers
# Ensure no other screen capture software is running
```

### Debug Mode

#### Agent Debug
```powershell
# Run with debug logging
.\real-remote-desktop-agent.exe --config debug-config.toml

# Debug config
[logging]
level = "debug"
```

#### Web Client Debug
```javascript
// Enable debug logging
localStorage.setItem('debug', 'true');

// View detailed connection info
console.log(window.RealRemoteDesktop);
```

## 🔄 Development

### Project Structure
```
real-remote-desktop/
├── agent/                 # Windows native agent (Rust)
│   ├── src/              # Source code
│   ├── Cargo.toml        # Rust dependencies
│   └── config.toml       # Agent configuration
├── web-client/           # Browser-based client (TypeScript)
│   ├── src/              # Source code
│   ├── dist/             # Built files
│   └── package.json      # Node.js dependencies
├── protocol/             # Communication protocol spec
├── docs/                 # Documentation
├── installer/            # Windows installer (NSIS)
└── build.sh             # Build script
```

### Development Workflow

1. **Setup Development Environment**
   ```bash
   # Install Rust
   rustup install stable
   rustup default stable
   
   # Install Node.js
   nvm install 18
   nvm use 18
   
   # Install dependencies
   cd agent && cargo build
   cd ../web-client && npm install
   ```

2. **Run Development Servers**
   ```bash
   # Terminal 1: Agent
   cd agent
   cargo run
   
   # Terminal 2: Web Client
   cd web-client
   npm run dev
   ```

3. **Testing**
   ```bash
   # Test agent
   cd agent && cargo test
   
   # Test web client
   cd web-client && npm test
   
   # Run all tests
   ./build.sh test
   ```

### Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the coding standards
4. **Add tests** for new functionality
5. **Run the test suite**: `./build.sh test`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Code Standards

- **Rust**: Follow `rustfmt` and `clippy` guidelines
- **TypeScript**: Use ESLint and Prettier
- **Documentation**: Update README and inline docs
- **Testing**: Maintain 80%+ code coverage
- **Security**: Follow OWASP guidelines
=======
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
>>>>>>> cfeb5fa0aab2c26020d07afca40c29520c7acc35

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<<<<<<< HEAD
## 🤝 Support

### Getting Help
- **Documentation**: Check the [docs/](docs/) directory
- **Issues**: Report bugs on [GitHub Issues](https://github.com/real-remote-desktop/platform/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/real-remote-desktop/platform/discussions)
- **Wiki**: Check the [GitHub Wiki](https://github.com/real-remote-desktop/platform/wiki)

### Community
- **Discord**: Join our [Discord server](https://discord.gg/real-remote-desktop)
- **Matrix**: Join our [Matrix room](https://matrix.to/#/#real-remote-desktop:matrix.org)
- **Reddit**: Visit [r/RealRemoteDesktop](https://reddit.com/r/RealRemoteDesktop)

## 🙏 Acknowledgments

- **WebRTC**: For real-time communication capabilities
- **OpenH264**: For H.264 video encoding
- **DXGI**: For efficient screen capture on Windows
- **Rust Community**: For the excellent ecosystem
- **TypeScript Team**: For the amazing language and tooling

---

**Made with ❤️ by the Real Remote Desktop Team**
=======
## 🙏 Acknowledgments

- **WebRTC** - Real-time communication
- **OpenH264** - Video encoding
- **Tokio** - Async runtime
- **NSIS** - Windows installer

## 📞 Support

- **Documentation**: [Wiki]()
- **Issues**: [GitHub Issues]()
- **Discussions**: [GitHub Discussions]()

---

**Real Remote Desktop Platform** - Enterprise-grade remote desktop solution for modern organizations.
>>>>>>> cfeb5fa0aab2c26020d07afca40c29520c7acc35

