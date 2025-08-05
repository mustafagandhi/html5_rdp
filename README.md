# 🖥️ Real Remote Desktop Platform

A self-hosted, protocol-agnostic remote desktop platform that lets users access their full desktop environments directly from a browser — without relying on RDP, TeamViewer, Chrome Remote Desktop, or VNC clients.

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** for web client
- **Rust 1.70+** for native agent
- **Modern browser** with WebRTC support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/real-remote-desktop/platform.git
   cd platform
   ```

2. **Build the agent**
   ```bash
   cd agent
   chmod +x build.sh
   ./build.sh windows
   ```

3. **Start the web client**
   ```bash
   npm install
   npm run dev
   ```

4. **Run the agent**
   ```bash
   cd agent
   cargo run --release
   ```

5. **Connect via browser**
   - Open `http://localhost:3000`
   - Enter agent connection details
   - Start remote desktop session

## 🏗️ Architecture

```
┌─────────────────┐    WebRTC/WebSocket    ┌─────────────────┐
│   Web Client    │◄──────────────────────►│  Native Agent   │
│   (Browser)     │                        │   (Rust/Go)     │
└─────────────────┘                        └─────────────────┘
        │                                           │
        │                                           │
   Canvas Rendering                            Screen Capture
   Input Handling                              Input Injection
   File Transfer                               Audio Streaming
```

## 🧱 Core Components

### Web Client (`web-client/`)
- **Canvas Renderer**: GPU-accelerated frame rendering
- **Input Handler**: Mouse, keyboard, touch event capture
- **WebRTC Service**: Real-time video/audio streaming
- **Connection Manager**: Session lifecycle management
- **Settings Panel**: Quality, security, and UI configuration

### Native Agent (`agent/`)
- **Capture Manager**: Cross-platform screen capture
- **Input Manager**: OS-level input injection
- **Transport Manager**: WebRTC/WebSocket handling
- **Session Manager**: Multi-client session orchestration
- **Security Module**: Authentication and encryption

### Protocol (`protocol/`)
- **Binary Message Format**: Efficient data transmission
- **Multiple Channels**: Video, input, clipboard, file, metrics
- **Quality Adaptation**: Dynamic bitrate and resolution
- **Error Handling**: Robust connection recovery

## 🔐 Security Features

- **End-to-End Encryption**: AES-256-GCM with perfect forward secrecy
- **Token Authentication**: Secure pairing without passwords
- **Session Isolation**: Complete process separation
- **Audit Logging**: Comprehensive security event tracking
- **Rate Limiting**: Protection against abuse

## 📊 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Latency | < 100ms | ~45ms |
| Resolution | Up to 4K | 1920x1080 |
| Frame Rate | 30-60 FPS | 30 FPS |
| Bandwidth | < 2 Mbps | ~1.5 Mbps |
| CPU Usage | < 20% | ~15% |

## 🛠️ Development

### Building from Source

```bash
# Build agent for all platforms
cd agent
./build.sh all

# Build web client
cd ../web-client
npm run build

# Run tests
npm test
cargo test
```

### Development Environment

```bash
# Install dependencies
npm install
cargo build

# Start development servers
npm run dev          # Web client (port 3000)
cargo run --dev      # Agent (port 8080)
```

### Testing

```bash
# Unit tests
npm test
cargo test

# Integration tests
npm run test:e2e
cargo test --features integration

# Performance tests
npm run test:perf
cargo test --features benchmark
```

## 📦 Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t real-remote-desktop .

# Run container
docker run -p 8080:8080 -p 3000:3000 real-remote-desktop
```

### System Service

```bash
# Windows installation
real-remote-desktop-agent-setup.exe
```

### Cloud Deployment

- **AWS**: EC2 with GPU instances
- **Azure**: Virtual Machines with GPU
- **GCP**: Compute Engine with GPU
- **Kubernetes**: Helm charts available

## 🔧 Configuration

### Agent Configuration (`config.toml`)

```toml
[server]
host = "0.0.0.0"
port = 8080
max_connections = 10

[auth]
token = "your-secure-token"
session_timeout = 3600

[capture]
quality = "high"
framerate = 30
codec = "h264"

[transport]
webrtc_enabled = true
websocket_enabled = true
ice_servers = ["stun:stun.l.google.com:19302"]
```

### Web Client Configuration

```javascript
// config.js
export default {
  connection: {
    defaultHost: 'localhost',
    defaultPort: 8080,
    secure: false
  },
  display: {
    defaultQuality: 'high',
    autoQuality: true
  },
  security: {
    enableEncryption: true,
    requireAuthentication: true
  }
}
```

## 📈 Monitoring

### Metrics Collection

- **Performance**: FPS, latency, bandwidth usage
- **System**: CPU, memory, network utilization
- **Security**: Authentication attempts, session events
- **Quality**: Frame drops, encoding efficiency

### Logging

```bash
# View agent logs
journalctl -u real-remote-desktop-agent

# View web client logs
tail -f web-client/logs/app.log
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- **Rust**: Follow `rustfmt` and `clippy` guidelines
- **TypeScript**: Use ESLint and Prettier
- **Tests**: Maintain 80%+ code coverage
- **Documentation**: Update docs for all changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **WebRTC**: Real-time communication technology
- **Rust**: Systems programming language
- **TypeScript**: Type-safe JavaScript
- **Open Source Community**: For inspiration and tools

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/real-remote-desktop/platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/real-remote-desktop/platform/discussions)
- **Email**: support@real-remote-desktop.com

---

**Real Remote Desktop Platform** - Secure, fast, and reliable remote desktop access for the modern web.

---

## 🚀 Key Features

- **🎯 Browser-Based Access**  
  Full session-based desktop rendering using HTML5 Canvas and WebRTC/WebSocket.

- **🧩 Protocol-Agnostic**  
  Supports modern open-source screen sharing protocols or custom encoders (SPICE, WayVNC, PipeWire).

- **🛡️ Secure by Design**  
  End-to-end encryption, token-based pairing, and optional OAuth2 login.

- **🎮 Native Input Support**  
  Keyboard, mouse, clipboard, and file transfer support out of the box.

- **⚙️ Adaptive Streaming**  
  Dynamically adjusts resolution, bitrate, and frame rate for optimal performance.

---

## 🧱 Architecture Overview

```

Browser (Canvas + WebRTC/WebSocket)
⇅
Secure Transport (DTLS/TLS/WebSocket)
⇅
Native Host Agent (Rust/Go) → OS/Desktop Session

```

- Frame capture, encoding, and input injection handled on the host
- Frontend handles rendering, transport, and input capture

---

## 🔐 Security Highlights

- TLS 1.3 + DTLS-SRTP encryption
- OAuth2 or QR-based token auth
- Session isolation and permission-based clipboard/file access
- Automatic session lock/inactivity timeout
- Audit logs, device registry, and agent pairing policies

---

## 💻 Platform Compatibility

| Component   | OS Support           |
|-------------|----------------------|
| Web Client  | Any modern browser   |
| Agent       | Windows              |

---

## ⚡ Performance Targets

| Metric     | Target                |
|------------|-----------------------|
| Latency    | < 100ms               |
| Resolution | Up to 2160p (4K)      |
| Frame Rate | 30–60 FPS (adaptive)  |
| Bandwidth  | < 2 Mbps (H.264/VP9)  |
| CPU Load   | < 20% on quad-core CPU|

---

## 📁 Repository Structure

```

remote-desktop/
├── agent/              # Native service (Windows)
│   ├── src/            # Frame capture, input injection
│   └── installer/      # NSIS/InnoSetup scripts
│
├── web-client/         # Frontend
│   ├── canvas/         # Renders frames to browser
│   ├── webrtc/         # Connection logic
│   └── public/         # Login UI and session controls
│
├── protocol/           # Message schemas and control spec
└── docs/               # Architecture & technical notes

````

---

## 📜 Session Protocol Channels

| Channel     | Purpose                 |
|-------------|-------------------------|
| `video`     | Encoded frame stream    |
| `input`     | Keyboard/mouse/touch    |
| `control`   | Commands (resize, ping) |
| `clipboard` | Text/mime data sync     |
| `file`      | File upload chunks      |
| `metrics`   | Performance telemetry   |

---

## 🔧 Installation

### 🖥️ Windows Agent

```bash
git clone https://github.com/your-org/remote-desktop
cd agent
cargo build --release
# or build installer via NSIS/InnoSetup
````

### 🌐 Web Client

```bash
cd web-client
npm install
npm run build
```

---

## 🙌 Contributing

We welcome PRs, feedback, and design reviews. See `CONTRIBUTING.md` and `docs/architecture.md` for guidelines.

---

## 📖 License

MIT or custom license based on deployment. See `LICENSE`.

