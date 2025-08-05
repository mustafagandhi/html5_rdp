import { Logger } from '../../utils/Logger';
import { Config } from '../../utils/Config';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { EventEmitter } from '../utils/EventEmitter';

export interface WebSocketOptions {
  host: string;
  port: number;
  secure: boolean;
  token?: string;
  reconnectAttempts?: number;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  enableAudio?: boolean;
  enableVideo?: boolean;
}

export interface WebSocketStats {
  bytesReceived: number;
  bytesSent: number;
  latency: number;
  messagesReceived: number;
  messagesSent: number;
  reconnections: number;
}

export interface WebSocketMessage {
  type: 'control' | 'video' | 'input' | 'clipboard' | 'file' | 'metrics';
  data: any;
  timestamp: number;
  sequence?: number;
}

export class WebSocketService extends EventEmitter {
  private logger = new Logger('WebSocketService');
  
  private socket: WebSocket | null = null;
  private connectionOptions: WebSocketOptions | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageSequence = 0;
  
  private stats: WebSocketStats = {
    bytesReceived: 0,
    bytesSent: 0,
    latency: 0,
    messagesReceived: 0,
    messagesSent: 0,
    reconnections: 0
  };

  async connect(options: WebSocketOptions): Promise<void> {
    try {
      this.logger.info('Initializing WebSocket connection', options);
      this.connectionOptions = options;
      
      await this.connectSocket();
      this.setupHeartbeat();
      
      this.logger.info('WebSocket connection established');
      
    } catch (error) {
      this.logger.error('WebSocket connection failed', error);
      this.emit('error', error);
      throw error;
    }
  }

  disconnect(): void {
    this.logger.info('Disconnecting WebSocket');
    
    this.stopHeartbeat();
    this.stopReconnectTimer();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.emit('disconnected');
    
    this.logger.info('WebSocket disconnected');
  }

  sendMessage(message: WebSocketMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    try {
      message.sequence = ++this.messageSequence;
      const messageStr = JSON.stringify(message);
      this.socket.send(messageStr);
      
      this.stats.bytesSent += messageStr.length;
      this.stats.messagesSent++;
      
    } catch (error) {
      this.logger.error('Failed to send message', error);
      throw error;
    }
  }

  sendInputEvent(event: any): void {
    this.sendMessage({
      type: 'input',
      data: event,
      timestamp: Date.now()
    });
  }

  sendClipboardData(data: string): void {
    this.sendMessage({
      type: 'clipboard',
      data,
      timestamp: Date.now()
    });
  }

  sendFileChunk(fileId: string, chunk: ArrayBuffer, offset: number, totalSize: number): void {
    this.sendMessage({
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
    this.sendMessage({
      type: 'control',
      data: { action: 'heartbeat' },
      timestamp: Date.now()
    });
  }

  updateQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    if (!this.connectionOptions) return;
    
    this.connectionOptions.quality = quality;
    
    this.sendMessage({
      type: 'control',
      data: { action: 'quality-change', quality },
      timestamp: Date.now()
    });
    
    this.logger.info(`Quality updated to ${quality}`);
  }

  getStats(): WebSocketStats | null {
    if (!this.isConnected) return null;
    return { ...this.stats };
  }

  private async connectSocket(): Promise<void> {
    const { host, port, secure, token } = this.connectionOptions!;
    const protocol = secure ? 'wss' : 'ws';
    const url = `${protocol}://${host}:${port}/websocket`;
    
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url);
      
      this.socket.onopen = () => {
        this.logger.info('WebSocket connection opened');
        this.isConnected = true;
        this.stats.reconnections++;
        
        // Send authentication
        if (token) {
          this.sendMessage({
            type: 'control',
            data: { action: 'auth', token },
            timestamp: Date.now()
          });
        }
        
        this.emit('connected');
        resolve();
      };
      
      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.socket.onerror = (error) => {
        this.logger.error('WebSocket error', error);
        this.emit('error', error);
        reject(error);
      };
      
      this.socket.onclose = (event) => {
        this.logger.info('WebSocket connection closed', event.code, event.reason);
        this.isConnected = false;
        this.emit('disconnected');
        
        // Attempt reconnection if not a clean close
        if (event.code !== 1000) {
          this.handleDisconnection();
        }
      };
    });
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      this.stats.bytesReceived += data.length;
      this.stats.messagesReceived++;
      
      this.emit('message', message);
      
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
          this.logger.debug('Received message', message);
      }
      
    } catch (error) {
      this.logger.error('Failed to parse WebSocket message', error);
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
      case 'auth-success':
        this.logger.info('Authentication successful');
        this.emit('authenticated');
        break;
      case 'auth-failed':
        this.logger.error('Authentication failed', data.error);
        this.emit('error', new Error(data.error));
        break;
      default:
        this.logger.debug('Unknown control message', data);
    }
  }

  private handleVideoFrame(data: any): void {
    this.emit('videoFrame', data);
  }

  private handleMetricsMessage(data: any): void {
    this.stats = { ...this.stats, ...data };
    this.emit('metrics', this.stats);
  }

  private setupHeartbeat(): void {
    const interval = 30000; // 30 seconds
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.sendHeartbeat();
      }
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleDisconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      const delay = 1000 * this.reconnectAttempts;
      this.reconnectTimer = setTimeout(async () => {
        try {
          await this.connectSocket();
          this.reconnectAttempts = 0;
          this.logger.info('Reconnection successful');
        } catch (error) {
          this.logger.error('Reconnection failed', error);
          this.handleDisconnection();
        }
      }, delay);
    } else {
      this.logger.error('Max reconnection attempts reached');
      this.emit('error', new Error('Connection lost'));
    }
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
} 