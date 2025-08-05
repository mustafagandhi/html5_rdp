# HTML5 RDP - Browser-based RDP Client

A fully agentless, browser-based Remote Desktop Protocol (RDP) client with **100% feature parity** with native clients like Remmina, XRDP, and Windows MSTSC.

## 🏗️ Project Structure

```
html5_rdp/
├── frontend/                 # Client-side RDP interface
│   ├── components/
│   │   ├── rdp/             # RDP-specific components
│   │   │   ├── CanvasRenderer.ts
│   │   │   ├── InputHandler.ts
│   │   │   └── RDPConnectionPanel.ts
│   │   ├── panels/          # UI panels
│   │   │   ├── ConnectionPanel.ts
│   │   │   ├── SettingsPanel.ts
│   │   │   ├── FileTransferPanel.ts
│   │   │   └── DeviceRedirectionPanel.ts
│   │   └── ui/              # UI components
│   │       └── PerformanceOverlay.ts
│   ├── services/
│   │   ├── rdp/             # RDP service layer
│   │   │   └── RDPService.ts
│   │   ├── websocket/       # WebSocket services
│   │   │   ├── ConnectionManager.ts
│   │   │   └── WebSocketService.ts
│   │   └── webrtc/          # WebRTC services
│   │       └── WebRTCService.ts
│   ├── utils/               # Utility functions
│   │   ├── Logger.ts
│   │   ├── Config.ts
│   │   ├── ErrorHandler.ts
│   │   └── EventEmitter.ts
│   ├── pages/               # Page components
│   │   └── App.ts
│   ├── styles/              # CSS styles
│   │   ├── main.css
│   │   └── components/
│   │       └── rdp-connection-panel.css
│   ├── public/              # Static assets
│   ├── index.html           # Main HTML file
│   ├── main.ts              # Application entry point
│   ├── package.json         # Frontend dependencies
│   ├── tsconfig.json        # TypeScript config
│   └── vite.config.ts       # Vite build config
├── backend/                 # RDP Gateway Server
│   ├── src/
│   │   ├── core/            # Core application logic
│   │   │   ├── index.ts     # Server entry point
│   │   │   └── RDPSessionManager.ts
│   │   ├── ws/              # WebSocket handling
│   │   │   └── WebSocketManager.ts
│   │   ├── services/        # Business logic services
│   │   │   ├── AuthManager.ts
│   │   │   ├── FileTransferManager.ts
│   │   │   ├── DeviceRedirectionManager.ts
│   │   │   └── AuditLogger.ts
│   │   ├── routes/          # API routes
│   │   │   ├── auth.ts
│   │   │   ├── sessions.ts
│   │   │   ├── files.ts
│   │   │   ├── devices.ts
│   │   │   └── audit.ts
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   │   ├── Logger.ts
│   │   │   └── Config.ts
│   │   └── config/          # Configuration files
│   ├── package.json         # Backend dependencies
│   └── tsconfig.json        # TypeScript config
└── .cursor/                 # Cursor IDE configuration
    ├── rules/               # Development rules
    ├── tests/               # All test files
    └── summaries/           # Test results and progress logs
```

## ✨ Features

### 🖥️ Client-Side (Frontend)
- **HTML5 Canvas Rendering**: High-performance remote desktop display
- **Full Input Support**: Mouse, keyboard, and touch input forwarding
- **Multi-Monitor Support**: Handle multiple remote displays
- **File Transfer**: Drag-and-drop file upload/download
- **Clipboard Sync**: Bidirectional clipboard synchronization
- **Device Redirection**: USB, audio, printer, and smart card support
- **Quality Settings**: Dynamic quality adjustment (low/medium/high/ultra)
- **Fullscreen Mode**: Native fullscreen support
- **Performance Overlay**: Real-time performance metrics

### 🌐 Gateway / Bridge (Backend)
- **RDP Protocol Handling**: Full RDP protocol implementation
- **WebSocket Bridge**: Real-time communication between client and RDP server
- **Session Management**: Multi-session support with proper cleanup
- **Authentication**: Secure credential handling and session validation
- **File Transfer Bridge**: Secure file upload/download handling
- **Device Redirection**: USB, audio, and peripheral device forwarding
- **Audit Logging**: Comprehensive session logging and monitoring
- **TLS Encryption**: End-to-end encryption support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern browser with WebRTC support

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Production Build
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
npm start
```

## 🔧 Configuration

### Frontend Configuration
The frontend uses a centralized configuration system in `utils/Config.ts`:

```typescript
{
  server: {
    host: 'localhost',
    port: 3000,
    protocol: 'ws'
  },
  rdp: {
    defaultQuality: 'high',
    enableAudio: true,
    enableClipboard: true,
    enableFileTransfer: true,
    enableDeviceRedirection: true
  },
  ui: {
    theme: 'auto',
    showPerformanceOverlay: false
  }
}
```

### Backend Configuration
Backend configuration is managed through environment variables and `utils/Config.ts`:

```bash
# Environment variables
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:3000
RDP_TIMEOUT=30000
```

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test
```

### Backend Tests
```bash
cd backend
npm test
```

## 📦 Dependencies

### Frontend Dependencies
- **Core**: TypeScript, Vite
- **WebRTC**: webrtc-adapter, simple-peer
- **WebSocket**: socket.io-client
- **UI**: Custom components with modern CSS
- **Utils**: dayjs, lodash-es, uuid

### Backend Dependencies
- **Server**: Express, Socket.IO
- **Security**: helmet, cors, bcryptjs, jsonwebtoken
- **File Handling**: multer, sharp, fluent-ffmpeg
- **Logging**: winston
- **Utils**: uuid, dotenv

## 🔒 Security Features

- **TLS Encryption**: All communications encrypted
- **Authentication**: JWT-based session management
- **CORS Protection**: Proper CORS configuration
- **Input Validation**: Comprehensive input sanitization
- **Audit Logging**: Complete session audit trails
- **Secure Headers**: Helmet.js security headers

## 🌟 Key Features

### ✅ RDP Feature Parity
- [x] RDP Session Launch (host/IP, username, password)
- [x] Multiple concurrent sessions per browser tab
- [x] TLS-encrypted gateway endpoint
- [x] Support for RDP NLA (Network Level Auth)
- [x] Copy-paste between local ↔ remote
- [x] File transfer: upload/download, drag-and-drop support
- [x] Folder mount (WebDAV, or virtual fs over WS)
- [x] Audio playback redirection (Web Audio)
- [x] Remote printing (to PDF or passthrough)
- [x] USB redirection (WebUSB polyfill where possible)
- [x] Virtual camera/device forwarding
- [x] Multi-monitor handling
- [x] Clipboard with sync options
- [x] Session reconnection, timeout handling
- [x] Clean UI with dashboard of saved RDP targets

### 🚫 Agentless Design
- **No Agent Required**: No software installation on target Windows machines
- **Pure Browser**: Runs entirely in the browser using HTML5/WebRTC
- **Gateway Architecture**: Backend acts as RDP gateway/translator
- **Standard RDP**: Uses standard RDP protocol, no proprietary agents

## 🛠️ Development

### Code Organization
- **Feature-based Structure**: Components organized by feature
- **Clear Separation**: Frontend/backend clearly separated
- **TypeScript**: Full TypeScript support with proper types
- **ESLint/Prettier**: Consistent code style
- **Modular Design**: Reusable components and services

### Build System
- **Vite**: Fast frontend development and building
- **TypeScript**: Type-safe development
- **Hot Reload**: Instant development feedback
- **Optimized Builds**: Production-ready builds

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code examples

---

**HTML5 RDP** - Bringing native RDP functionality to the browser, agentless and secure. 