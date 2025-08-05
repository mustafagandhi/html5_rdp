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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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

