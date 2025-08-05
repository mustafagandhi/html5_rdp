import { Logger } from '../../utils/Logger';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { Config } from '../../utils/Config';
import { WebRTCService } from '../webrtc/WebRTCService';
import { EventEmitter } from '../../utils/EventEmitter';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

export enum ConnectionType {
  HOST = 'host',
  CLIENT = 'client'
}

export interface ConnectionInfo {
  id: string;
  type: ConnectionType;
  state: ConnectionState;
  isHost: boolean;
  isClient: boolean;
  startTime: number;
  endTime?: number;
  duration?: number;
  bytesReceived: number;
  bytesSent: number;
  framesReceived: number;
  framesDropped: number;
  latency: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  screenShareActive: boolean;
  fileTransferActive: boolean;
  deviceRedirectionActive: boolean;
}

export interface ConnectionOptions {
  isHost: boolean;
  connectionCode?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  enableAudio?: boolean;
  enableVideo?: boolean;
  enableClipboard?: boolean;
  enableFileTransfer?: boolean;
  enableDeviceRedirection?: boolean;
  enableFolderMounting?: boolean;
}

export class ConnectionManager extends EventEmitter {
  private logger = new Logger('ConnectionManager');
  private config = Config.getInstance();
  
  private webrtcService: WebRTCService;
  
  private currentConnection: ConnectionInfo | null = null;
  private connectionHistory: ConnectionInfo[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isPaused = false;
  private connectionCode: string = '';

  constructor() {
    super();
    
    this.webrtcService = new WebRTCService();
    
    this.setupEventListeners();
    this.logger.info('Agentless Connection Manager initialized');
  }

  async startHostSession(options: ConnectionOptions): Promise<void> {
    try {
      this.logger.info('Starting host session', options);
      
      // Generate connection code
      this.connectionCode = this.generateConnectionCode();
      
      // Create connection info
      const connectionInfo: ConnectionInfo = {
        id: this.generateConnectionId(),
        type: ConnectionType.HOST,
        state: ConnectionState.CONNECTING,
        isHost: true,
        isClient: false,
        startTime: Date.now(),
        bytesReceived: 0,
        bytesSent: 0,
        framesReceived: 0,
        framesDropped: 0,
        latency: 0,
        quality: options.quality || 'medium',
        screenShareActive: false,
        fileTransferActive: false,
        deviceRedirectionActive: false
      };

      this.currentConnection = connectionInfo;
      this.emit('connectionStateChanged', connectionInfo);
      this.emit('hostSessionStarted', { connectionCode: this.connectionCode });
      
      // Start screen sharing
      await this.startScreenSharing();
      
      this.logger.info('Host session started successfully');
    } catch (error) {
      this.logger.error('Failed to start host session', error as Error);
      throw error;
    }
  }

  async joinClientSession(connectionCode: string, options: ConnectionOptions): Promise<void> {
    try {
      this.logger.info('Joining client session', { connectionCode, options });
      
      // Validate connection code
      if (!this.validateConnectionCode(connectionCode)) {
        throw new Error('Invalid connection code');
      }
      
      this.connectionCode = connectionCode;
      
      // Create connection info
      const connectionInfo: ConnectionInfo = {
        id: this.generateConnectionId(),
        type: ConnectionType.CLIENT,
        state: ConnectionState.CONNECTING,
        isHost: false,
        isClient: true,
        startTime: Date.now(),
        bytesReceived: 0,
        bytesSent: 0,
        framesReceived: 0,
        framesDropped: 0,
        latency: 0,
        quality: options.quality || 'medium',
        screenShareActive: false,
        fileTransferActive: false,
        deviceRedirectionActive: false
      };

      this.currentConnection = connectionInfo;
      this.emit('connectionStateChanged', connectionInfo);
      
      // Connect to host
      await this.connectToHost(connectionCode);
      
      this.logger.info('Client session joined successfully');
    } catch (error) {
      this.logger.error('Failed to join client session', error as Error);
      throw error;
    }
  }

  async startScreenSharing(): Promise<void> {
    try {
      this.logger.info('Starting screen sharing');
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          logicalSurface: true,
          resizeMode: 'crop-and-scale'
        },
        audio: this.config.get('webrtc').enableAudio
      });
      
      // Set up WebRTC with screen share stream
      await this.webrtcService.setLocalStream(stream);
      
      if (this.currentConnection) {
        this.currentConnection.screenShareActive = true;
        this.emit('screenShareStarted', stream);
      }
      
      this.logger.info('Screen sharing started successfully');
    } catch (error) {
      this.logger.error('Failed to start screen sharing', error as Error);
      throw error;
    }
  }

  async stopScreenSharing(): Promise<void> {
    try {
      this.logger.info('Stopping screen sharing');
      
      await this.webrtcService.stopLocalStream();
      
      if (this.currentConnection) {
        this.currentConnection.screenShareActive = false;
        this.emit('screenShareStopped');
      }
      
      this.logger.info('Screen sharing stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop screen sharing', error as Error);
      throw error;
    }
  }

  async startFileTransfer(): Promise<void> {
    try {
      this.logger.info('Starting file transfer');
      
      // Check for File System Access API support
      if (!('showOpenFilePicker' in window)) {
        throw new Error('File System Access API not supported');
      }
      
      if (this.currentConnection) {
        this.currentConnection.fileTransferActive = true;
        this.emit('fileTransferStarted');
      }
      
      this.logger.info('File transfer started successfully');
    } catch (error) {
      this.logger.error('Failed to start file transfer', error as Error);
      throw error;
    }
  }

  async startDeviceRedirection(): Promise<void> {
    try {
      this.logger.info('Starting device redirection');
      
      // Check for Web USB API support
      if (!('usb' in navigator)) {
        throw new Error('Web USB API not supported');
      }
      
      if (this.currentConnection) {
        this.currentConnection.deviceRedirectionActive = true;
        this.emit('deviceRedirectionStarted');
      }
      
      this.logger.info('Device redirection started successfully');
    } catch (error) {
      this.logger.error('Failed to start device redirection', error as Error);
      throw error;
    }
  }

  disconnect(): void {
    this.logger.info('Disconnecting...');
    
    if (this.currentConnection) {
      this.currentConnection.state = ConnectionState.DISCONNECTED;
      this.currentConnection.endTime = Date.now();
      this.currentConnection.duration = this.currentConnection.endTime - this.currentConnection.startTime;
      
      this.connectionHistory.push(this.currentConnection);
      this.emit('disconnected', this.currentConnection);
    }
    
    this.webrtcService.disconnect();
    this.stopHeartbeat();
    this.stopReconnectTimer();
    
    this.currentConnection = null;
    this.connectionCode = '';
    this.reconnectAttempts = 0;
    
    this.logger.info('Disconnected successfully');
  }

  reconnect(): void {
    this.logger.info('Attempting to reconnect...');
    
    if (this.reconnectAttempts >= 5) {
      this.logger.error('Max reconnection attempts reached');
      this.emit('reconnectionFailed');
      return;
    }
    
    this.reconnectAttempts++;
    
    if (this.currentConnection) {
      this.currentConnection.state = ConnectionState.RECONNECTING;
      this.emit('connectionStateChanged', this.currentConnection);
    }
    
    // Implement reconnection logic
    setTimeout(() => {
      this.logger.info('Reconnection attempt completed');
    }, 1000 * this.reconnectAttempts);
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
    return this.currentConnection;
  }

  getConnectionHistory(): ConnectionInfo[] {
    return this.connectionHistory;
  }

  getConnectionCode(): string {
    return this.connectionCode;
  }

  updateQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    if (!this.currentConnection) {
      this.logger.warn('No active connection to update quality');
      return;
    }

    this.currentConnection.quality = quality;
    this.webrtcService.updateQuality(quality);
    
    this.emit('qualityChanged', quality);
    this.logger.info(`Quality updated to ${quality}`);
  }

  sendInputEvents(events: any[]): void {
    if (!this.currentConnection || this.currentConnection.state !== ConnectionState.CONNECTED) {
      return;
    }

    try {
      this.webrtcService.sendInputEvents(events);
    } catch (error) {
      this.logger.error('Failed to send input events', error as Error);
    }
  }

  private setupEventListeners(): void {
    // WebRTC events
    this.webrtcService.on('connected', () => {
      this.logger.info('WebRTC connected');
      if (this.currentConnection) {
        this.currentConnection.state = ConnectionState.CONNECTED;
        this.emit('connected', this.currentConnection);
      }
    });
    
    this.webrtcService.on('disconnected', () => {
      this.logger.info('WebRTC disconnected');
      this.handleServiceDisconnection();
    });
    
    this.webrtcService.on('error', (error) => {
      this.logger.error('WebRTC error', error);
      ErrorHandler.handleWebRTCError(error, 'WebRTC Service');
    });
  }

  private handleServiceDisconnection(): void {
    if (this.currentConnection && this.currentConnection.state === ConnectionState.CONNECTED) {
      this.logger.warn('Service disconnected, attempting reconnection');
      this.reconnect();
    }
  }

  private async connectToHost(connectionCode: string): Promise<void> {
    // Implement connection to host logic
    this.logger.info('Connecting to host with code:', connectionCode);
    
    // For now, simulate connection
    setTimeout(() => {
      if (this.currentConnection) {
        this.currentConnection.state = ConnectionState.CONNECTED;
        this.emit('connected', this.currentConnection);
      }
    }, 1000);
  }

  private generateConnectionCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private validateConnectionCode(code: string): boolean {
    return code.length === 6 && /^[A-Z0-9]+$/.test(code);
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat(): void {
    const interval = (this.config.get('connection') as any).heartbeatInterval || 30000;
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isPaused) return;
      
      try {
        this.webrtcService.sendHeartbeat();
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

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  getWebRTCService(): WebRTCService {
    return this.webrtcService;
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

  isHost(): boolean {
    return this.currentConnection?.isHost || false;
  }

  isClient(): boolean {
    return this.currentConnection?.isClient || false;
  }
} 