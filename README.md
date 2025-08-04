# 🖥️ Remote Desktop (Non-RDP) – Web-Based Remote Desktop Access

A self-hosted, protocol-agnostic remote desktop platform that lets users access their full desktop environments directly from a browser — without relying on RDP, TeamViewer, Chrome Remote Desktop, or VNC clients.

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
- Supports Windows, Linux (Wayland/X11), and macOS (optional)

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
| Agent       | Windows/Linux/MacOS  |

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
├── agent/              # Native service (Windows/Linux/MacOS)
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

### 🖥️ Windows/Linux/MacOS Agent

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

