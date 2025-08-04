# Real Remote Desktop Protocol Specification

## Overview

This document defines the communication protocol used by the Real Remote Desktop system. The protocol supports both WebRTC and WebSocket transport layers with a unified message format.

## Protocol Version

- **Version**: 1.0.0
- **Date**: 2024
- **Status**: Production Ready

## Transport Layers

### 1. WebRTC Transport

WebRTC is the primary transport mechanism, providing:
- Low-latency UDP-based communication
- NAT traversal via STUN/TURN servers
- Built-in encryption (DTLS-SRTP)
- Data channels for control messages

### 2. WebSocket Transport

WebSocket serves as a fallback transport, providing:
- TCP-based reliable communication
- TLS encryption
- Firewall-friendly operation
- Automatic reconnection

## Message Format

All messages follow a unified JSON format:

```json
{
  "type": "message_type",
  "channel": "channel_name",
  "data": {},
  "timestamp": 1234567890,
  "sequence": 1,
  "version": "1.0.0"
}
```

### Message Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Message type identifier |
| `channel` | string | Yes | Channel name (control, video, input, etc.) |
| `data` | object | Yes | Message payload |
| `timestamp` | number | Yes | Unix timestamp in milliseconds |
| `sequence` | number | No | Sequence number for ordering |
| `version` | string | Yes | Protocol version |

## Message Channels

### 1. Control Channel (`control`)

Handles connection management, authentication, and system control.

#### Message Types

##### `auth`
Authentication request/response.

```json
{
  "type": "auth",
  "channel": "control",
  "data": {
    "action": "request|response|success|failed",
    "token": "auth_token",
    "clientId": "client_identifier",
    "capabilities": {
      "video": true,
      "audio": false,
      "clipboard": true,
      "fileTransfer": false
    }
  }
}
```

##### `connect`
Connection establishment.

```json
{
  "type": "connect",
  "channel": "control",
  "data": {
    "action": "request|response|success|failed",
    "sessionId": "session_identifier",
    "quality": "low|medium|high|ultra",
    "resolution": {
      "width": 1920,
      "height": 1080
    },
    "framerate": 30
  }
}
```

##### `disconnect`
Connection termination.

```json
{
  "type": "disconnect",
  "channel": "control",
  "data": {
    "action": "request|response",
    "reason": "user_request|timeout|error",
    "sessionId": "session_identifier"
  }
}
```

##### `heartbeat`
Connection health monitoring.

```json
{
  "type": "heartbeat",
  "channel": "control",
  "data": {
    "timestamp": 1234567890,
    "sessionId": "session_identifier"
  }
}
```

##### `resize`
Display resize request.

```json
{
  "type": "resize",
  "channel": "control",
  "data": {
    "width": 1920,
    "height": 1080,
    "quality": "low|medium|high|ultra"
  }
}
```

##### `quality-change`
Quality adjustment.

```json
{
  "type": "quality-change",
  "channel": "control",
  "data": {
    "quality": "low|medium|high|ultra",
    "reason": "auto|manual|performance"
  }
}
```

### 2. Video Channel (`video`)

Handles video frame transmission.

#### Message Types

##### `frame`
Video frame data.

```json
{
  "type": "frame",
  "channel": "video",
  "data": {
    "frameId": "frame_identifier",
    "timestamp": 1234567890,
    "width": 1920,
    "height": 1080,
    "format": "h264|vp8|vp9|av1",
    "quality": "low|medium|high|ultra",
    "data": "base64_encoded_frame_data",
    "compression": "gzip|brotli|none"
  }
}
```

##### `frame-request`
Request for specific frame.

```json
{
  "type": "frame-request",
  "channel": "video",
  "data": {
    "frameId": "frame_identifier",
    "quality": "low|medium|high|ultra"
  }
}
```

### 3. Input Channel (`input`)

Handles user input events.

#### Message Types

##### `mouse`
Mouse input event.

```json
{
  "type": "mouse",
  "channel": "input",
  "data": {
    "action": "mousedown|mouseup|mousemove|click|dblclick|contextmenu|wheel",
    "button": 0|1|2,
    "x": 0.5,
    "y": 0.5,
    "deltaX": 0,
    "deltaY": 0,
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    }
  }
}
```

##### `keyboard`
Keyboard input event.

```json
{
  "type": "keyboard",
  "channel": "input",
  "data": {
    "action": "keydown|keyup|keypress",
    "key": "a",
    "keyCode": 65,
    "code": "KeyA",
    "modifiers": {
      "ctrl": false,
      "alt": false,
      "shift": false,
      "meta": false
    },
    "repeat": false
  }
}
```

##### `touch`
Touch input event.

```json
{
  "type": "touch",
  "channel": "input",
  "data": {
    "action": "touchstart|touchend|touchmove",
    "touches": [
      {
        "id": 1,
        "x": 0.5,
        "y": 0.5,
        "pressure": 1.0
      }
    ],
    "changedTouches": [
      {
        "id": 1,
        "x": 0.5,
        "y": 0.5,
        "pressure": 1.0
      }
    ]
  }
}
```

### 4. Clipboard Channel (`clipboard`)

Handles clipboard synchronization.

#### Message Types

##### `clipboard-data`
Clipboard content.

```json
{
  "type": "clipboard-data",
  "channel": "clipboard",
  "data": {
    "format": "text|html|image",
    "content": "clipboard_content",
    "encoding": "utf8|base64"
  }
}
```

##### `clipboard-request`
Request for clipboard content.

```json
{
  "type": "clipboard-request",
  "channel": "clipboard",
  "data": {
    "format": "text|html|image"
  }
}
```

### 5. File Channel (`file`)

Handles file transfer operations.

#### Message Types

##### `file-transfer-start`
Initiate file transfer.

```json
{
  "type": "file-transfer-start",
  "channel": "file",
  "data": {
    "fileId": "file_identifier",
    "filename": "example.txt",
    "size": 1024,
    "checksum": "sha256_hash",
    "direction": "upload|download"
  }
}
```

##### `file-chunk`
File data chunk.

```json
{
  "type": "file-chunk",
  "channel": "file",
  "data": {
    "fileId": "file_identifier",
    "chunkIndex": 0,
    "totalChunks": 10,
    "data": "base64_encoded_chunk",
    "checksum": "chunk_checksum"
  }
}
```

##### `file-transfer-complete`
File transfer completion.

```json
{
  "type": "file-transfer-complete",
  "channel": "file",
  "data": {
    "fileId": "file_identifier",
    "success": true,
    "error": null
  }
}
```

### 6. Metrics Channel (`metrics`)

Handles performance and connection metrics.

#### Message Types

##### `metrics`
Performance metrics.

```json
{
  "type": "metrics",
  "channel": "metrics",
  "data": {
    "fps": 30.5,
    "latency": 45,
    "bitrate": 2000000,
    "packetLoss": 0.1,
    "jitter": 5.2,
    "frameDrops": 2,
    "bytesReceived": 1048576,
    "bytesSent": 524288,
    "cpuUsage": 15.5,
    "memoryUsage": 268435456
  }
}
```

## Error Handling

### Error Message Format

```json
{
  "type": "error",
  "channel": "control",
  "data": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {},
    "recoverable": true
  }
}
```

### Error Codes

| Code | Description | Recoverable |
|------|-------------|-------------|
| `AUTH_FAILED` | Authentication failed | No |
| `INVALID_TOKEN` | Invalid authentication token | No |
| `SESSION_EXPIRED` | Session has expired | Yes |
| `CONNECTION_TIMEOUT` | Connection timeout | Yes |
| `QUALITY_NOT_SUPPORTED` | Requested quality not supported | Yes |
| `INPUT_NOT_SUPPORTED` | Input type not supported | Yes |
| `FILE_TOO_LARGE` | File exceeds size limit | No |
| `INSUFFICIENT_BANDWIDTH` | Insufficient bandwidth | Yes |
| `ENCODING_ERROR` | Video encoding error | Yes |
| `DECODING_ERROR` | Video decoding error | Yes |

## Security

### Authentication

1. **Token-based**: Clients authenticate using pre-shared tokens
2. **Session-based**: Each connection creates a unique session
3. **Time-limited**: Sessions expire after configurable timeout

### Encryption

1. **WebRTC**: DTLS-SRTP for media, DTLS for data channels
2. **WebSocket**: TLS 1.3 encryption
3. **Message-level**: Optional additional encryption for sensitive data

### Access Control

1. **Role-based**: Different permission levels for users
2. **Feature-based**: Granular control over features (clipboard, file transfer)
3. **Audit logging**: All actions logged for security compliance

## Performance Considerations

### Quality Levels

| Level | Resolution | Framerate | Bitrate | Use Case |
|-------|------------|-----------|---------|----------|
| Low | 640x480 | 15 fps | 500 Kbps | Slow connections |
| Medium | 1280x720 | 30 fps | 2 Mbps | Standard usage |
| High | 1920x1080 | 60 fps | 5 Mbps | High-quality |
| Ultra | 2560x1440 | 60 fps | 10 Mbps | Professional |

### Adaptive Quality

The system automatically adjusts quality based on:
- Network latency
- Packet loss rate
- Available bandwidth
- Client performance

### Compression

- **Video**: H.264/VP8/VP9/AV1 with hardware acceleration
- **Data**: Gzip/Brotli compression for control messages
- **Images**: WebP/JPEG for clipboard images

## Implementation Guidelines

### Client Implementation

1. **Connection Management**
   - Implement automatic reconnection
   - Handle connection state changes
   - Monitor connection health

2. **Message Handling**
   - Validate all incoming messages
   - Handle errors gracefully
   - Implement message queuing for reliability

3. **Performance Optimization**
   - Use Web Workers for heavy processing
   - Implement efficient frame rendering
   - Optimize input event handling

### Server Implementation

1. **Session Management**
   - Track active sessions
   - Implement session cleanup
   - Handle multiple concurrent connections

2. **Resource Management**
   - Limit concurrent connections
   - Implement bandwidth throttling
   - Monitor system resources

3. **Security**
   - Validate all authentication tokens
   - Implement rate limiting
   - Log all security events

## Testing

### Test Scenarios

1. **Connection Tests**
   - Successful connection establishment
   - Authentication failure handling
   - Reconnection after disconnection

2. **Performance Tests**
   - Frame rate under various conditions
   - Latency measurement
   - Bandwidth utilization

3. **Security Tests**
   - Token validation
   - Session timeout
   - Access control enforcement

4. **Error Handling Tests**
   - Network interruption
   - Invalid message handling
   - Resource exhaustion

## Version Compatibility

### Backward Compatibility

- Protocol version 1.0.x maintains backward compatibility
- New optional fields can be added without breaking existing clients
- Deprecated features are marked but not removed immediately

### Migration Strategy

1. **Client Updates**: Gradual rollout with feature flags
2. **Server Updates**: Blue-green deployment
3. **Protocol Updates**: Version negotiation during handshake

## Future Extensions

### Planned Features

1. **Audio Support**: Real-time audio streaming
2. **Multi-monitor**: Support for multiple displays
3. **File Sync**: Real-time file synchronization
4. **Mobile Support**: Touch-optimized interface
5. **VR/AR**: Virtual and augmented reality support

### Extension Points

1. **Custom Codecs**: Plugin system for video codecs
2. **Custom Protocols**: Support for alternative transport layers
3. **Custom Features**: Plugin system for additional functionality

## References

- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [WebSocket Protocol](https://tools.ietf.org/html/rfc6455)
- [H.264 Video Codec](https://www.itu.int/rec/T-REC-H.264)
- [VP8/VP9 Video Codecs](https://www.webmproject.org/)
- [AV1 Video Codec](https://aomedia.org/av1/) 