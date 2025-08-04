import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { EventEmitter } from '../utils/EventEmitter';

export interface WebRTCOptions {
  host: string;
  port: number;
  secure: boolean;
  token?: string;
  iceServers: RTCIceServer[];
  maxBitrate: number;
  maxFramerate: number;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  enableAudio?: boolean;
  enableVideo?: boolean;
}

export interface WebRTCStats {
  bytesReceived: number;
  bytesSent: number;
  framesReceived: number;
  framesDropped: number;
  latency: number;
  bitrate: number;
  framerate: number;
  packetLoss: number;
  jitter: number;
}

export interface DataChannelMessage {
  type: 'control' | 'input' | 'clipboard' | 'file' | 'metrics';
  data: any;
  timestamp: number;
}

export class WebRTCService extends EventEmitter {
  private logger = new Logger('WebRTCService');
  
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private mediaStream: MediaStream | null = null;
  private signalingSocket: WebSocket | null = null;
  
  private connectionOptions: WebRTCOptions | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  private stats: WebRTCStats = {
    bytesReceived: 0,
    bytesSent: 0,
    framesReceived: 0,
    framesDropped: 0,
    latency: 0,
    bitrate: 0,
    framerate: 0,
    packetLoss: 0,
    jitter: 0
  };

  async connect(options: WebRTCOptions): Promise<void> {
    try {
      this.logger.info('Initializing WebRTC connection', options);
      this.connectionOptions = options;
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: options.iceServers,
        iceCandidatePoolSize: 10
      });
      
      // Setup event handlers
      this.setupPeerConnectionHandlers();
      
      // Connect to signaling server
      await this.connectSignalingServer();
      
      // Create data channels
      this.createDataChannels();
      
      // Setup media handling
      if (options.enableVideo) {
        await this.setupVideoReceiver();
      }
      
      this.logger.info('WebRTC connection setup complete');
      
    } catch (error) {
      this.logger.error('WebRTC connection failed', error);
      this.emit('error', error);
      throw error;
    }
  }

  disconnect(): void {
    this.logger.info('Disconnecting WebRTC');
    
    // Close data channels
    this.dataChannels.forEach(channel => {
      if (channel.readyState === 'open') {
        channel.close();
      }
    });
    this.dataChannels.clear();
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Close signaling socket
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }
    
    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    this.isConnected = false;
    this.emit('disconnected');
    
    this.logger.info('WebRTC disconnected');
  }

  sendMessage(channel: string, message: DataChannelMessage): void {
    const dataChannel = this.dataChannels.get(channel);
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        const messageStr = JSON.stringify(message);
        dataChannel.send(messageStr);
        this.stats.bytesSent += messageStr.length;
      } catch (error) {
        this.logger.error('Failed to send message', error);
        throw error;
      }
    } else {
      throw new Error(`Data channel '${channel}' not available`);
    }
  }

  sendInputEvent(event: any): void {
    this.sendMessage('input', {
      type: 'input',
      data: event,
      timestamp: Date.now()
    });
  }

  sendClipboardData(data: string): void {
    this.sendMessage('clipboard', {
      type: 'clipboard',
      data,
      timestamp: Date.now()
    });
  }

  sendFileChunk(fileId: string, chunk: ArrayBuffer, offset: number, totalSize: number): void {
    this.sendMessage('file', {
      type: 'file',
      data: {
        fileId,
        chunk: Array.from(new Uint8Array(chunk)),
        offset,
        totalSize
      },
      timestamp: Date.now()
    });
  }

  sendHeartbeat(): void {
    this.sendMessage('control', {
      type: 'control',
      data: { action: 'heartbeat' },
      timestamp: Date.now()
    });
  }

  updateQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    if (!this.connectionOptions) return;
    
    this.connectionOptions.quality = quality;
    
    // Update video constraints based on quality
    const constraints = this.getVideoConstraints(quality);
    
    // Re-negotiate if needed
    if (this.peerConnection && this.peerConnection.connectionState === 'connected') {
      this.logger.info(`Updating quality to ${quality}`);
      // In a real implementation, you would renegotiate the connection
      // with new constraints
    }
  }

  getStats(): WebRTCStats | null {
    if (!this.isConnected) return null;
    return { ...this.stats };
  }

  private async connectSignalingServer(): Promise<void> {
    const { host, port, secure, token } = this.connectionOptions!;
    const protocol = secure ? 'wss' : 'ws';
    const url = `${protocol}://${host}:${port}/webrtc-signaling`;
    
    return new Promise((resolve, reject) => {
      this.signalingSocket = new WebSocket(url);
      
      this.signalingSocket.onopen = () => {
        this.logger.info('Signaling connection established');
        
        // Send authentication
        if (token) {
          this.signalingSocket!.send(JSON.stringify({
            type: 'auth',
            token
          }));
        }
        
        resolve();
      };
      
      this.signalingSocket.onmessage = (event) => {
        this.handleSignalingMessage(JSON.parse(event.data));
      };
      
      this.signalingSocket.onerror = (error) => {
        this.logger.error('Signaling connection error', error);
        reject(error);
      };
      
      this.signalingSocket.onclose = () => {
        this.logger.info('Signaling connection closed');
        this.handleSignalingDisconnection();
      };
    });
  }

  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return;
    
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.logger.debug('ICE candidate generated', event.candidate);
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };
    
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection!.iceConnectionState;
      this.logger.info('ICE connection state changed', state);
      
      if (state === 'connected') {
        this.isConnected = true;
        this.emit('connected');
      } else if (state === 'disconnected' || state === 'failed') {
        this.isConnected = false;
        this.emit('disconnected');
        this.handleDisconnection();
      }
    };
    
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection!.connectionState;
      this.logger.info('Connection state changed', state);
    };
    
    this.peerConnection.ondatachannel = (event) => {
      this.handleDataChannel(event.channel);
    };
    
    this.peerConnection.ontrack = (event) => {
      this.logger.info('Remote track received', event.track.kind);
      this.handleRemoteTrack(event);
    };
  }

  private createDataChannels(): void {
    if (!this.peerConnection) return;
    
    const channels = ['control', 'input', 'clipboard', 'file', 'metrics'];
    
    channels.forEach(channelName => {
      const channel = this.peerConnection!.createDataChannel(channelName, {
        ordered: channelName === 'control' || channelName === 'input',
        maxRetransmits: channelName === 'control' ? 3 : 1
      });
      
      this.handleDataChannel(channel);
    });
  }

  private handleDataChannel(channel: RTCDataChannel): void {
    this.logger.info(`Data channel created: ${channel.label}`);
    
    channel.onopen = () => {
      this.logger.info(`Data channel opened: ${channel.label}`);
      this.dataChannels.set(channel.label, channel);
    };
    
    channel.onmessage = (event) => {
      this.handleDataChannelMessage(channel.label, event.data);
    };
    
    channel.onclose = () => {
      this.logger.info(`Data channel closed: ${channel.label}`);
      this.dataChannels.delete(channel.label);
    };
    
    channel.onerror = (error) => {
      this.logger.error(`Data channel error: ${channel.label}`, error);
    };
  }

  private handleDataChannelMessage(channel: string, data: string): void {
    try {
      const message: DataChannelMessage = JSON.parse(data);
      this.stats.bytesReceived += data.length;
      
      this.emit('message', { channel, message });
      
      // Handle specific message types
      switch (message.type) {
        case 'control':
          this.handleControlMessage(message.data);
          break;
        case 'video':
          this.handleVideoFrame(message.data);
          break;
        case 'metrics':
          this.handleMetricsMessage(message.data);
          break;
        default:
          this.logger.debug(`Received message on channel ${channel}`, message);
      }
      
    } catch (error) {
      this.logger.error('Failed to parse data channel message', error);
    }
  }

  private async setupVideoReceiver(): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      // Create a video element to receive the stream
      const videoElement = document.createElement('video');
      videoElement.style.display = 'none';
      document.body.appendChild(videoElement);
      
      // Handle incoming video stream
      this.peerConnection.ontrack = (event) => {
        if (event.track.kind === 'video') {
          this.mediaStream = new MediaStream([event.track]);
          videoElement.srcObject = this.mediaStream;
          videoElement.play();
          
          this.emit('videoStream', this.mediaStream);
        }
      };
      
    } catch (error) {
      this.logger.error('Failed to setup video receiver', error);
      throw error;
    }
  }

  private handleRemoteTrack(event: RTCTrackEvent): void {
    this.logger.info('Remote track received', event.track.kind);
    
    if (event.track.kind === 'video') {
      this.mediaStream = new MediaStream([event.track]);
      this.emit('videoStream', this.mediaStream);
    }
  }

  private handleSignalingMessage(message: any): void {
    switch (message.type) {
      case 'offer':
        this.handleOffer(message.offer);
        break;
      case 'answer':
        this.handleAnswer(message.answer);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(message.candidate);
        break;
      case 'error':
        this.logger.error('Signaling error', message.error);
        this.emit('error', new Error(message.error));
        break;
      default:
        this.logger.debug('Unknown signaling message', message);
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendSignalingMessage({
        type: 'answer',
        answer
      });
      
    } catch (error) {
      this.logger.error('Failed to handle offer', error);
      throw error;
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      this.logger.error('Failed to handle answer', error);
      throw error;
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;
    
    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      this.logger.error('Failed to add ICE candidate', error);
    }
  }

  private sendSignalingMessage(message: any): void {
    if (this.signalingSocket && this.signalingSocket.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
    } else {
      this.logger.warn('Signaling socket not available');
    }
  }

  private handleControlMessage(data: any): void {
    switch (data.action) {
      case 'resize':
        this.emit('resize', data);
        break;
      case 'quality-change':
        this.emit('qualityChange', data);
        break;
      case 'heartbeat':
        this.emit('heartbeat');
        break;
      default:
        this.logger.debug('Unknown control message', data);
    }
  }

  private handleVideoFrame(data: any): void {
    this.stats.framesReceived++;
    this.emit('videoFrame', data);
  }

  private handleMetricsMessage(data: any): void {
    this.stats = { ...this.stats, ...data };
    this.emit('metrics', this.stats);
  }

  private handleSignalingDisconnection(): void {
    this.logger.warn('Signaling connection lost');
    this.handleDisconnection();
  }

  private handleDisconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect(this.connectionOptions!);
      }, 1000 * this.reconnectAttempts);
    } else {
      this.logger.error('Max reconnection attempts reached');
      this.emit('error', new Error('Connection lost'));
    }
  }

  private getVideoConstraints(quality: string): MediaTrackConstraints {
    const constraints: Record<string, MediaTrackConstraints> = {
      low: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { max: 15 }
      },
      medium: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { max: 30 }
      },
      high: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { max: 60 }
      },
      ultra: {
        width: { ideal: 2560 },
        height: { ideal: 1440 },
        frameRate: { max: 60 }
      }
    };
    
    return constraints[quality] || constraints.medium;
  }
} 