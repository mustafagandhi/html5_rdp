# 🌐 Remote Desktop (Non-RDP) – Full Architecture

## 1. 🧭 Purpose

This platform allows **secure, session-based access to a full desktop environment** via the browser without relying on the proprietary RDP protocol. It supports Windows, Linux, and potentially macOS via a **custom or open protocol** like:

* **VNC** (Virtual Network Computing)
* **SPICE** (Simple Protocol for Independent Computing Environments)
* **WayVNC / Weston / DRM streaming**
* **Custom WebCodec-based Protocol**

This architecture is flexible, performant, and portable.

---

## 2. 🏗️ High-Level Architecture

```
                    Browser-Based Frontend
  ┌───────────────────────────────────────────────────────────┐
  │ HTML5 Canvas + WebRTC/WebSocket + Input Capture UI        │
  └────────────┬──────────────────────────────────────────────┘
               │
     Secure TLS or WebRTC Transport (TURN/STUN/NAT Traversal)
               │
  ┌────────────▼──────────────┐
  │     Host Agent (Native)   │
  │   Frame Capture & Encode  │
  │   Input Handler & Sender  │
  └────────────┬──────────────┘
               │
      Local OS Session / VM (Windows / Linux / Wayland)
```

---

## 3. 🧩 Components

### 🔹 A. Browser Client (Frontend)

* GPU-accelerated `<canvas>` rendering
* Keyboard, mouse, and touch input capture
* Clipboard/file upload UI
* Stats, diagnostics, and performance tuning

### 🔹 B. Host Agent (Native)

* Screen capture using DXGI, GDI, PipeWire, etc.
* Encoding with H.264/VP8/AV1/WebP
* Injects inputs using `SendInput`, `uinput`, etc.
* WebRTC or WebSocket transport layer
* Auth/token handling and access policies

---

## 4. 🔐 Security Architecture

| *Component*          | *Approach*                                                        |
| -------------------- | ----------------------------------------------------------------- |
| *Transport*          | *TLS 1.3 / DTLS-SRTP (WebRTC)*                                    |
| *Authentication*     | *Device pairing (shared secret, QR code), token-based auth*       |
| *Session Management* | *Host agent restricts 1 session per user; tracks active sessions* |
| *Encryption*         | *AES-GCM or ChaCha20-Poly1305 for frames and control messages*    |
| *Clipboard & Files*  | *Permission-based; disabled by default*                           |
| *Firewall/Port*      | Works behind NAT via WebSocket                                    |

---

## 5. 🔁 Data & Control Flow

* WebRTC/WebSocket secure handshake
* Screen frames encoded and streamed
* Input events captured, serialized, and sent
* Clipboard & file channels via structured messages

---

## 6. 🧪 Protocol Specification (Custom)

| Channel     | Purpose                                     |
| ----------- | ------------------------------------------- |
| `control`   | JSON commands (connect, resize, ping, etc.) |
| `video`     | Binary video frames                         |
| `input`     | Keyboard/mouse events                       |
| `clipboard` | UTF-8 text blocks                           |
| `file`      | File chunk uploads                          |
| `metrics`   | RTT, bandwidth, FPS                         |

---

## 7. 🛠️ Agent Installer (Windows/Linux)

* Service + optional tray icon
* Built in Rust, or Go
* Installs firewall rules
* Uses `ffmpeg`, `libinput`, `webrtc-native`, etc.

---

## 8. 📈 Performance Goals

| Metric     | Goal                                    |
| ---------- | --------------------------------------- |
| Latency    | <100 ms roundtrip                       |
| Frame Rate | 30–60 FPS (adaptive)                    |
| Resolution | Dynamic (720p to 2160p)                 |
| Bandwidth  | <2 Mbps (adaptive H.264, H.265, or AV1) |
| CPU Usage  | <20% on quad-core machine               |

---

## 9. 🧠 Authentication & Access Control

* OAuth2 / JWT / username-password support
* QR-based device pairing with token binding
* Role-based access: User and Admin
* Session expiry, auto-lock, forced termination

---

## 10. 🌐 Transport Layer Strategy

* Default: WebRTC over DTLS (TURN/STUN optional)
* Fallback: Secure WebSocket (TLS)
* Transport switching logic:

  * Try WebRTC (UDP)
  * Fall back to WebSocket (TLS 443)

---

## 11. 🎞️ Codec Support Strategy

| Codec       | Use Case                  | Notes                    |
| ----------- | ------------------------- | ------------------------ |
| H.264/H.265 | Default for compatibility | GPU-accelerated decoding |
| VP9         | Higher quality, fallback  | Slower on older devices  |
| AV1         | Future-ready              | Low bandwidth, CPU heavy |
| WebP        | Fallback / legacy browser | Lossless option          |

* Dynamic codec negotiation per session
* Hardware encoding when available

---

## 12. 🔄 Session Persistence & Recovery

* Reconnect with token if browser crashes
* Automatic session lock after inactivity
* Resume clipboard and state channels
* Logs last session start/end per user

---

## 13. 📟 Device Registry & Agent Identity

* Each agent registers with a `device_id`
* Users can bind/unbind devices via web UI
* Agent maintains persistent auth token
* Device labels, last seen, status indicators

---

## 14. 📜 Audit Logging & Compliance

* Session start/stop, IP, user-agent
* Clipboard events, file transfers
* Role-based log access (Admin only)
* Exportable JSON/CSV logs
* Optional: Remote syslog/Graylog integration

---

## 15. 📶 Bandwidth Adaptation Strategy

* Agent monitors RTT, drop rate, FPS
* Dynamically adjusts:

  * Frame resolution
  * Frame interval (fps)
  * Codec bitrate
* User can toggle quality profiles manually

---

## 16. 📁 Project Structure

```
remote-desktop/
│
├── agent/
│   ├── src/            # Windows/Linux/macOS code
│   ├── installer/      # NSIS or InnoSetup scripts
│   └── README.md
│
├── web-client/
│   ├── public/
│   ├── src/
│   ├── canvas/
│   ├── webrtc/
│   └── README.md
│
├── docs/
│   └── architecture.md
│
└── protocol/
    └── spec.md         # JSON schema + message types
```
