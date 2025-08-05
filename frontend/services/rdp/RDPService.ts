import { EventEmitter } from '../../utils/EventEmitter';
import { Logger } from '../../utils/Logger';
import { Config } from '../../utils/Config';

export interface RDPConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  domain?: string;
  enableNLA: boolean;
  enableTLS: boolean;
  enableCredSSP: boolean;
  enableGFX: boolean;
  enableAudio: boolean;
  enableClipboard: boolean;
  enableFileTransfer: boolean;
  enableDeviceRedirection: boolean;
  enablePrinterRedirection: boolean;
  enableSmartCardRedirection: boolean;
  enableUSBRedirection: boolean;
  enableCameraRedirection: boolean;
  enableMicrophoneRedirection: boolean;
  enableSpeakerRedirection: boolean;
  enableMultiMonitor: boolean;
  monitorCount: number;
  colorDepth: number;
  width: number;
  height: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  frameRate: number;
  compressionLevel: number;
  encryptionLevel: 'none' | 'low' | 'medium' | 'high';
  authenticationLevel: 'none' | 'low' | 'medium' | 'high';
  timeout: number;
  reconnectAttempts: number;
  reconnectDelay: number;
}

export interface RDPConnection {
  id: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  config: RDPConnectionConfig;
  startTime: Date;
  lastActivity: Date;
  frameCount: number;
  bytesReceived: number;
  bytesSent: number;
  error?: string;
}

export class RDPService extends EventEmitter {
  private logger = new Logger('RDPService');
  private config = Config.getInstance();
  private socket: WebSocket | null = null;
  private connection: RDPConnection | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private frameQueue: ArrayBuffer[] = [];
  private isProcessingFrames = false;

  constructor() {
    super();
    this.logger.info('RDP Service initialized');
  }

  public async connect(rdpConfig: RDPConnectionConfig): Promise<RDPConnection> {
    try {
      this.logger.info(`Connecting to RDP server: ${rdpConfig.host}:${rdpConfig.port}`);

      // First authenticate with the gateway
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error('Authentication failed');
      }

      // Connect to WebSocket gateway
      await this.connectWebSocket();

      // Send RDP connection request
      this.socket!.send(JSON.stringify({
        type: 'rdp:connect',
        data: rdpConfig
      }));

      // Create connection object
      this.connection = {
        id: `rdp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'connecting',
        config: rdpConfig,
        startTime: new Date(),
        lastActivity: new Date(),
        frameCount: 0,
        bytesReceived: 0,
        bytesSent: 0
      };

      this.emit('connecting', this.connection);
      
      return this.connection;
    } catch (error) {
      this.logger.error('RDP connection failed:', error);
      throw error;
    }
  }

  private async authenticate(): Promise<{ success: boolean; token?: string }> {
    try {
      const response = await fetch(`${this.config.get('api').baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: this.config.get('auth').username,
          password: this.config.get('auth').password
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.config.set('auth.token', result.token);
        return { success: true, token: result.token };
      } else {
        return { success: false };
      }
    } catch (error) {
      this.logger.error('Authentication error:', error);
      return { success: false };
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.get('api').wsUrl;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.logger.info('WebSocket connected');
        
        // Authenticate WebSocket connection
        this.socket!.send(JSON.stringify({
          type: 'authenticate',
          data: {
            token: this.config.get('auth.token')
          }
        }));
        
        resolve();
      };

      this.socket.onerror = (error) => {
        this.logger.error('WebSocket connection error:', error);
        reject(error);
      };

      this.socket.onclose = () => {
        this.logger.info('WebSocket disconnected');
        this.handleDisconnection();
      };

      this.socket.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
    });
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'authenticated':
          this.handleAuthenticationResponse(message);
          break;
        case 'rdp:connected':
          this.handleRDPConnected(message);
          break;
        case 'rdp:error':
          this.handleRDPError(message);
          break;
        case 'frame':
          this.handleFrame(message);
          break;
        case 'clipboard:data':
          this.handleClipboardData(message);
          break;
        case 'file:data':
          this.handleFileData(message);
          break;
        case 'device:data':
          this.handleDeviceData(message);
          break;
        case 'error':
          this.handleError(message);
          break;
        default:
          this.logger.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      this.logger.error('Error parsing WebSocket message:', error);
    }
  }

  private handleAuthenticationResponse(message: any): void {
    if (message.success) {
      this.logger.info('WebSocket authenticated successfully');
    } else {
      this.logger.error('WebSocket authentication failed:', message.error);
      this.emit('error', new Error('WebSocket authentication failed'));
    }
  }

  private handleRDPConnected(message: any): void {
    if (this.connection) {
      this.connection.status = 'connected';
      this.connection.lastActivity = new Date();
      this.reconnectAttempts = 0;
      
      this.logger.info('RDP connection established');
      this.emit('connected', this.connection);
    }
  }

  private handleRDPError(message: any): void {
    if (this.connection) {
      this.connection.status = 'error';
      this.connection.error = message.error;
      
      this.logger.error('RDP connection error:', message.error);
      this.emit('error', new Error(message.error));
    }
  }

  private handleFrame(message: any): void {
    if (this.connection) {
      this.connection.frameCount++;
      this.connection.lastActivity = new Date();
      
      // Convert base64 frame data to ArrayBuffer
      const frameData = this.base64ToArrayBuffer(message.data);
      this.frameQueue.push(frameData);
      
      // Process frames asynchronously
      if (!this.isProcessingFrames) {
        this.processFrameQueue();
      }
    }
  }

  private async processFrameQueue(): Promise<void> {
    this.isProcessingFrames = true;
    
    while (this.frameQueue.length > 0) {
      const frame = this.frameQueue.shift();
      if (frame) {
        this.emit('frame', frame);
      }
      
      // Allow other tasks to run
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    this.isProcessingFrames = false;
  }

  private handleClipboardData(message: any): void {
    this.emit('clipboardData', message.data);
  }

  private handleFileData(message: any): void {
    this.emit('fileData', message.data);
  }

  private handleDeviceData(message: any): void {
    this.emit('deviceData', message.data);
  }

  private handleError(message: any): void {
    this.logger.error('Server error:', message.error);
    this.emit('error', new Error(message.error));
  }

  private handleDisconnection(): void {
    if (this.connection) {
      this.connection.status = 'disconnected';
      this.connection.lastActivity = new Date();
      
      this.logger.info('RDP connection lost');
      this.emit('disconnected', this.connection);
      
      // Attempt reconnection if configured
      if (this.reconnectAttempts < this.connection.config.reconnectAttempts) {
        this.scheduleReconnection();
      }
    }
  }

  private scheduleReconnection(): void {
    this.reconnectAttempts++;
    const delay = this.connection!.config.reconnectDelay * this.reconnectAttempts;
    
    this.logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private async reconnect(): Promise<void> {
    try {
      this.logger.info('Attempting to reconnect...');
      
      if (this.connection) {
        this.connection.status = 'connecting';
        this.emit('reconnecting', this.connection);
        
        await this.connect(this.connection.config);
      }
    } catch (error) {
      this.logger.error('Reconnection failed:', error);
      this.emit('error', error);
    }
  }

  public sendMouseInput(x: number, y: number, button: number, action: string): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'input:mouse',
        data: { x, y, button, action }
      }));
    }
  }

  public sendKeyboardInput(keyCode: number, scanCode: number, flags: number, unicode?: string): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'input:keyboard',
        data: { keyCode, scanCode, flags, unicode }
      }));
    }
  }

  public sendTouchInput(x: number, y: number, pressure: number, action: string): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'input:touch',
        data: { x, y, pressure, action }
      }));
    }
  }

  public setClipboard(data: any): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'clipboard:set',
        data
      }));
    }
  }

  public getClipboard(): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'clipboard:get'
      }));
    }
  }

  public uploadFile(file: File): void {
    if (this.socket && this.connection?.status === 'connected') {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = (reader.result as string).split(',')[1];
        this.socket!.send(JSON.stringify({
          type: 'file:upload',
          data: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileData: base64Data
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  }

  public downloadFile(fileName: string, filePath: string): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'file:download',
        data: { fileName, filePath }
      }));
    }
  }

  public connectDevice(deviceType: string, deviceName: string, deviceData: any): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'device:connect',
        data: {
          type: deviceType,
          name: deviceName,
          ...deviceData
        }
      }));
    }
  }

  public disconnectDevice(deviceId: string): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'device:disconnect',
        data: { deviceId }
      }));
    }
  }

  public changeQuality(quality: string): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'quality:change',
        data: { quality }
      }));
    }
  }

  public setFullscreen(enabled: boolean): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'display:fullscreen',
        data: { enabled }
      }));
    }
  }

  public setMonitor(monitorIndex: number): void {
    if (this.socket && this.connection?.status === 'connected') {
      this.socket.send(JSON.stringify({
        type: 'display:monitor',
        data: { monitorIndex }
      }));
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        type: 'rdp:disconnect'
      }));
      
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connection) {
      this.connection.status = 'disconnected';
      this.connection.lastActivity = new Date();
      
      this.logger.info('RDP connection closed');
      this.emit('disconnected', this.connection);
    }
  }

  public getConnection(): RDPConnection | null {
    return this.connection;
  }

  public getConnectionStatus(): string {
    return this.connection?.status || 'disconnected';
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
} 