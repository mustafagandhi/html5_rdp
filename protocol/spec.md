# Real Remote Desktop Protocol Specification

## Overview

The Real Remote Desktop Protocol (RRDP) is a binary protocol designed for efficient, low-latency remote desktop communication between web clients and native agents. It supports multiple transport layers including WebRTC and WebSocket, with built-in encryption and compression.

## Protocol Version

Current version: `1.0.0`

## Transport Layers

### WebRTC Transport
- Uses WebRTC Data Channels for reliable message delivery
- Supports multiple data channels for different message types
- Automatic reconnection and connection state management
- ICE/STUN/TURN support for NAT traversal

### WebSocket Transport
- Fallback transport for environments without WebRTC support
- Binary message format for efficiency
- TLS encryption for security
- Automatic reconnection with exponential backoff

## Message Format

### Binary Message Structure

```
+--------+--------+--------+--------+--------+--------+--------+--------+
| Version|  Type  | Channel| Length | Sequence| Timestamp|    Data     |
|  (1B)  |  (1B)  |  (1B)  |  (4B)  |  (4B)  |   (8B)  |   (N bytes) |
+--------+--------+--------+--------+--------+--------+--------+--------+
```

### JSON Message Structure (for control messages)

```json
{
  "version": "1.0.0",
  "type": "control",
  "channel": "session",
  "sequence": 12345,
  "timestamp": 1640995200000,
  "data": {
    "action": "connect",
    "session_id": "uuid-string",
    "capabilities": {
      "video": true,
      "audio": true,
      "clipboard": true,
      "file_transfer": true,
      "touch": true,
      "multi_monitor": true
    }
  }
}
```

## Message Types

### 1. Control Messages (`control`)

#### Connection Management
- `connect` - Establish new session
- `disconnect` - Terminate session
- `reconnect` - Reestablish connection
- `heartbeat` - Keep-alive ping
- `capabilities` - Exchange client/agent capabilities

#### Session Management
- `session_start` - Begin new session
- `session_end` - End current session
- `session_pause` - Pause session
- `session_resume` - Resume session
- `session_timeout` - Session timeout notification

#### Quality Control
- `quality_change` - Request quality change
- `framerate_change` - Request framerate change
- `resolution_change` - Request resolution change

### 2. Video Messages (`video`)

#### Frame Data
```json
{
  "type": "video",
  "channel": "video",
  "data": {
    "frame_id": "uuid",
    "timestamp": 1640995200000,
    "width": 1920,
    "height": 1080,
    "format": "h264",
    "quality": "high",
    "compressed": true,
    "data": "base64-encoded-frame-data"
  }
}
```

#### Video Control
- `video_start` - Start video stream
- `video_stop` - Stop video stream
- `video_pause` - Pause video stream
- `video_resume` - Resume video stream

### 3. Input Messages (`input`)

#### Mouse Events
```json
{
  "type": "input",
  "channel": "input",
  "data": {
    "event_type": "mouse",
    "action": "mousemove",
    "x": 100.5,
    "y": 200.3,
    "button": 1,
    "delta_x": 10.0,
    "delta_y": 20.0,
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    }
  }
}
```

#### Keyboard Events
```json
{
  "type": "input",
  "channel": "input",
  "data": {
    "event_type": "keyboard",
    "action": "keydown",
    "key": "a",
    "key_code": 65,
    "code": "KeyA",
    "repeat": false,
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    }
  }
}
```

#### Touch Events
```json
{
  "type": "input",
  "channel": "input",
  "data": {
    "event_type": "touch",
    "action": "touchstart",
    "touches": [
      {
        "id": 1,
        "x": 100.0,
        "y": 200.0,
        "pressure": 1.0
      }
    ],
    "changed_touches": [...]
  }
}
```

#### Wheel Events
```json
{
  "type": "input",
  "channel": "input",
  "data": {
    "event_type": "wheel",
    "delta_x": 0.0,
    "delta_y": 120.0,
    "delta_z": 0.0,
    "delta_mode": 0,
    "x": 100.0,
    "y": 200.0,
    "modifiers": {...}
  }
}
```

### 4. Clipboard Messages (`clipboard`)

#### Clipboard Data
```json
{
  "type": "clipboard",
  "channel": "clipboard",
  "data": {
    "format": "text",
    "content": "clipboard text content",
    "encoding": "utf-8",
    "direction": "to_agent"
  }
}
```

#### Clipboard Control
- `clipboard_request` - Request clipboard content
- `clipboard_clear` - Clear clipboard
- `clipboard_formats` - List available formats

### 5. File Transfer Messages (`file`)

#### File Transfer Control
```json
{
  "type": "file",
  "channel": "file",
  "data": {
    "action": "upload_start",
    "file_id": "uuid",
    "filename": "document.pdf",
    "size": 1048576,
    "checksum": "sha256-hash",
    "chunk_size": 65536,
    "total_chunks": 16
  }
}
```

#### File Chunk Data
```json
{
  "type": "file",
  "channel": "file",
  "data": {
    "action": "upload_chunk",
    "file_id": "uuid",
    "chunk_index": 5,
    "total_chunks": 16,
    "data": "base64-encoded-chunk",
    "checksum": "sha256-hash"
  }
}
```

### 6. Metrics Messages (`metrics`)

#### Performance Metrics
```json
{
  "type": "metrics",
  "channel": "metrics",
  "data": {
    "fps": 30.5,
    "latency": 45,
    "bitrate": 2048000,
    "packet_loss": 0.1,
    "jitter": 5.2,
    "frame_drops": 2,
    "bytes_received": 1048576,
    "bytes_sent": 2097152,
    "cpu_usage": 15.3,
    "memory_usage": 268435456
  }
}
```

## Connection Lifecycle

### 1. Handshake Phase
1. Client sends `connect` message with capabilities
2. Agent responds with `connect_ack` and agent capabilities
3. Both parties establish encryption keys
4. Session is created with unique session ID

### 2. Session Phase
1. Video stream starts automatically
2. Input events are processed in real-time
3. Metrics are exchanged periodically
4. Heartbeats maintain connection health

### 3. Disconnection Phase
1. Either party can initiate `disconnect`
2. All active transfers are completed
3. Session is cleaned up
4. Connection is closed gracefully

## Security

### Encryption
- All messages are encrypted using AES-256-GCM
- Keys are derived using ECDH key exchange
- Perfect forward secrecy is maintained
- Message authentication using HMAC-SHA256

### Authentication
- Token-based authentication for initial connection
- Session tokens for ongoing communication
- Optional certificate-based authentication
- Rate limiting to prevent abuse

## Error Handling

### Error Message Format
```json
{
  "type": "error",
  "channel": "control",
  "data": {
    "error_code": 1001,
    "error_message": "Invalid session ID",
    "recoverable": true,
    "suggested_action": "reconnect"
  }
}
```

### Common Error Codes
- `1000` - General error
- `1001` - Invalid session ID
- `1002` - Authentication failed
- `1003` - Unsupported capability
- `1004` - Resource unavailable
- `1005` - Network timeout
- `1006` - Protocol version mismatch
- `1007` - Rate limit exceeded

## Quality of Service

### Adaptive Quality
- Automatic quality adjustment based on network conditions
- Frame rate scaling from 1-60 FPS
- Resolution scaling from 320x240 to 4K
- Bitrate adaptation from 100 Kbps to 10 Mbps

### Priority Levels
1. **Critical** - Control messages, authentication
2. **High** - Input events, clipboard
3. **Medium** - Video frames, metrics
4. **Low** - File transfers, bulk data

## Compression

### Message Compression
- LZ4 compression for control messages
- Brotli compression for file transfers
- No compression for video frames (already compressed)

### Video Compression
- H.264 baseline profile for compatibility
- VP8/VP9 for better compression
- AV1 for future compatibility
- Hardware acceleration when available

## Extensions

### Plugin System
- Custom message types can be registered
- Plugin capabilities are exchanged during handshake
- Versioned plugin interfaces

### Custom Channels
- Applications can define custom channels
- Channel registration during connection
- Namespace separation for custom channels

## Implementation Notes

### WebRTC Implementation
- Use WebRTC Data Channels for reliable delivery
- Implement connection state monitoring
- Handle ICE candidate exchange
- Support for TURN servers

### WebSocket Implementation
- Binary WebSocket messages for efficiency
- Implement reconnection logic
- Handle connection state changes
- Support for TLS encryption

### Performance Considerations
- Use binary message format for efficiency
- Implement message batching for input events
- Use efficient serialization (MessagePack, CBOR)
- Minimize memory allocations

## Versioning

### Protocol Versioning
- Major version changes require new client/agent versions
- Minor version changes are backward compatible
- Patch versions are fully compatible

### Capability Negotiation
- Clients and agents exchange supported features
- Graceful degradation for unsupported features
- Feature detection and fallback mechanisms

## Testing

### Protocol Compliance
- Automated protocol compliance testing
- Message format validation
- Error handling verification
- Performance benchmarking

### Interoperability
- Cross-platform compatibility testing
- Different browser compatibility
- Network condition simulation
- Security vulnerability testing 