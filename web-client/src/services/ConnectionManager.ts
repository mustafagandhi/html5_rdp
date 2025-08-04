import { Logger } from '../utils/Logger';
import { ErrorHandler } from '../utils/ErrorHandler';
import { Config } from '../utils/Config';
import { WebRTCService } from './WebRTCService';
import { WebSocketService } from './WebSocketService';
import { EventEmitter } from '../utils/EventEmitter';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

export enum ConnectionType {
  WEBRTC = 'webrtc',
  WEBSOCKET = 'websocket'
}

export interface ConnectionInfo {
  id: string;
  type: ConnectionType;
  state: ConnectionState;
  host: string;
  port: number;
  secure: boolean;
  startTime: number;
  endTime?: number;
  duration?: number;
  bytesReceived: number;
  bytesSent: number;
  framesReceived: number;
  framesDropped: number;
  latency: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface ConnectionOptions {
  host: string;
  port: number;
  secure: boolean;
  token?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  enableAudio?: boolean;
  enableVideo?: boolean;
  enableClipboard?: boolean;
  enableFileTransfer?: boolean;
}

export class ConnectionManager extends EventEmitter {
  private logger = new Logger('ConnectionManager');
  private config = Config.getInstance();
  
  private webrtcService: WebRTCService;
  private websocketService: WebSocketService;
  
  private currentConnection: ConnectionInfo | null = null;
  private connectionHistory: ConnectionInfo[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isPaused = false;

  constructor() {
    super();
    
    this.webrtcService = new WebRTCService();
    this.websocketService = new WebSocketService();
    
    this.setupEventListeners();
    this.logger.info('Connection manager initialized');
  }

  async connect(options: ConnectionOptions): Promise<void> {
    try {
      this.logger.info('Attempting to connect', options);
      
      // Validate options
      this.validateConnectionOptions(options);
      
      // Create connection info
      const connectionInfo: ConnectionInfo = {
        id: this.generateConnectionId(),
        type: ConnectionType.WEBRTC, // Start with WebRTC
        state: ConnectionState.CONNECTING,
        host: options.host,
        port: options.port,
        secure: options.secure,
        startTime: Date.now(),
        bytesReceived: 0,
        bytesSent: 0,
        framesReceived: 0,
        framesDropped: 0,
        latency: 0,
        quality: options.quality || 'medium'
      };

      this.currentConnection = connectionInfo;
      this.emit('connectionStateChanged', connectionInfo);
      
      // Try WebRTC first
      try {
        await this.webrtcService.connect({
          ...options,
          iceServers: this.config.get('webrtc').iceServers,
          maxBitrate: this.config.get('webrtc').maxBitrate,
          maxFramerate: this.config.get('webrtc').maxFramerate
        });
        
        connectionInfo.type = ConnectionType.WEBRTC;
        connectionInfo.state = ConnectionState.CONNECTED;
        this.logger.info('WebRTC connection established');
        
      } catch (webrtcError) {
        this.logger.warn('WebRTC connection failed, falling back to WebSocket', webrtcError);
        
        // Fallback to WebSocket
        try {
          await this.websocketService.connect({
            ...options,
            reconnectAttempts: this.config.get('connection').reconnectAttempts
          });
          
          connectionInfo.type = ConnectionType.WEBSOCKET;
          connectionInfo.state = ConnectionState.CONNECTED;
          this.logger.info('WebSocket connection established');
          
        } catch (websocketError) {
          connectionInfo.state = ConnectionState.FAILED;
          connectionInfo.endTime = Date.now();
          connectionInfo.duration = connectionInfo.endTime - connectionInfo.startTime;
          
          this.logger.error('All connection methods failed', { webrtcError, websocketError });
          throw new Error('Failed to establish connection');
        }
      }

      this.currentConnection = connectionInfo;
      this.connectionHistory.push(connectionInfo);
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Start monitoring
      this.startConnectionMonitoring();
      
      this.emit('connected', connectionInfo);
      this.logger.info('Connection established successfully');
      
    } catch (error) {
      this.logger.error('Connection failed', error);
      this.emit('connectionFailed', error);
      throw error;
    }
  }

  disconnect(): void {
    this.logger.info('Disconnecting...');
    
    // Stop timers
    this.stopHeartbeat();
    this.stopReconnectTimer();
    
    // Disconnect services
    this.webrtcService.disconnect();
    this.websocketService.disconnect();
    
    // Update connection info
    if (this.currentConnection) {
      this.currentConnection.state = ConnectionState.DISCONNECTED;
      this.currentConnection.endTime = Date.now();
      this.currentConnection.duration = this.currentConnection.endTime - this.currentConnection.startTime;
      
      this.emit('disconnected', this.currentConnection);
    }
    
    this.currentConnection = null;
    this.reconnectAttempts = 0;
    
    this.logger.info('Disconnected');
  }

  reconnect(): void {
    if (!this.currentConnection) {
      this.logger.warn('No active connection to reconnect');
      return;
    }

    const maxAttempts = this.config.get('connection').reconnectAttempts;
    
    if (this.reconnectAttempts >= maxAttempts) {
      this.logger.error('Max reconnection attempts reached');
      this.emit('reconnectionFailed');
      return;
    }

    this.reconnectAttempts++;
    this.logger.info(`Reconnection attempt ${this.reconnectAttempts}/${maxAttempts}`);
    
    this.currentConnection!.state = ConnectionState.RECONNECTING;
    this.emit('connectionStateChanged', this.currentConnection);
    
    const delay = this.config.get('connection').reconnectDelay * this.reconnectAttempts;
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect({
          host: this.currentConnection!.host,
          port: this.currentConnection!.port,
          secure: this.currentConnection!.secure,
          quality: this.currentConnection!.quality
        });
        
        this.reconnectAttempts = 0;
        this.logger.info('Reconnection successful');
        
      } catch (error) {
        this.logger.error('Reconnection failed', error);
        this.reconnect();
      }
    }, delay);
  }

  pause(): void {
    this.isPaused = true;
    this.logger.info('Connection paused');
  }

  resume(): void {
    this.isPaused = false;
    this.logger.info('Connection resumed');
  }

  getConnectionInfo(): ConnectionInfo | null {
    return this.currentConnection ? { ...this.currentConnection } : null;
  }

  getConnectionHistory(): ConnectionInfo[] {
    return [...this.connectionHistory];
  }

  updateQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    if (!this.currentConnection) {
      this.logger.warn('No active connection to update quality');
      return;
    }

    this.currentConnection.quality = quality;
    this.webrtcService.updateQuality(quality);
    this.websocketService.updateQuality(quality);
    
    this.emit('qualityChanged', quality);
    this.logger.info(`Quality updated to ${quality}`);
  }

  private setupEventListeners(): void {
    // WebRTC events
    this.webrtcService.on('connected', () => {
      this.logger.info('WebRTC connected');
    });
    
    this.webrtcService.on('disconnected', () => {
      this.logger.info('WebRTC disconnected');
      this.handleServiceDisconnection();
    });
    
    this.webrtcService.on('error', (error) => {
      this.logger.error('WebRTC error', error);
      ErrorHandler.handleWebRTCError(error, 'WebRTC Service');
    });
    
    // WebSocket events
    this.websocketService.on('connected', () => {
      this.logger.info('WebSocket connected');
    });
    
    this.websocketService.on('disconnected', () => {
      this.logger.info('WebSocket disconnected');
      this.handleServiceDisconnection();
    });
    
    this.websocketService.on('error', (error) => {
      this.logger.error('WebSocket error', error);
      ErrorHandler.handleConnectionError(error, 'WebSocket');
    });
  }

  private handleServiceDisconnection(): void {
    if (this.currentConnection && this.currentConnection.state === ConnectionState.CONNECTED) {
      this.logger.warn('Service disconnected, attempting reconnection');
      this.reconnect();
    }
  }

  private validateConnectionOptions(options: ConnectionOptions): void {
    if (!options.host || options.host.trim() === '') {
      throw new Error('Host is required');
    }
    
    if (options.port < 1 || options.port > 65535) {
      throw new Error('Invalid port number');
    }
    
    if (options.quality && !['low', 'medium', 'high', 'ultra'].includes(options.quality)) {
      throw new Error('Invalid quality setting');
    }
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat(): void {
    const interval = this.config.get('connection').heartbeatInterval;
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isPaused) return;
      
      try {
        this.webrtcService.sendHeartbeat();
        this.websocketService.sendHeartbeat();
      } catch (error) {
        this.logger.warn('Heartbeat failed', error);
      }
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startConnectionMonitoring(): void {
    // Monitor connection quality and performance
    setInterval(() => {
      if (!this.currentConnection || this.isPaused) return;
      
      // Update connection stats
      const webrtcStats = this.webrtcService.getStats();
      const websocketStats = this.websocketService.getStats();
      
      if (webrtcStats) {
        this.currentConnection.bytesReceived = webrtcStats.bytesReceived;
        this.currentConnection.bytesSent = webrtcStats.bytesSent;
        this.currentConnection.framesReceived = webrtcStats.framesReceived;
        this.currentConnection.framesDropped = webrtcStats.framesDropped;
        this.currentConnection.latency = webrtcStats.latency;
      } else if (websocketStats) {
        this.currentConnection.bytesReceived = websocketStats.bytesReceived;
        this.currentConnection.bytesSent = websocketStats.bytesSent;
        this.currentConnection.latency = websocketStats.latency;
      }
      
      this.emit('statsUpdated', this.currentConnection);
    }, 1000);
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Public methods for external access
  getWebRTCService(): WebRTCService {
    return this.webrtcService;
  }

  getWebSocketService(): WebSocketService {
    return this.websocketService;
  }

  isConnected(): boolean {
    return this.currentConnection?.state === ConnectionState.CONNECTED;
  }

  isConnecting(): boolean {
    return this.currentConnection?.state === ConnectionState.CONNECTING;
  }

  isReconnecting(): boolean {
    return this.currentConnection?.state === ConnectionState.RECONNECTING;
  }
} 