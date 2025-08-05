import { Logger } from '../utils/Logger';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { EventEmitter } from 'events';

export interface WebSocketClient {
  id: string;
  socket: Socket;
  authenticated: boolean;
  sessionId?: string;
  lastActivity: Date;
  userAgent: string;
  ipAddress: string;
}

export class WebSocketManager extends EventEmitter {
  private logger = new Logger('WebSocketManager');
  private io: SocketIOServer;
  private clients: Map<string, WebSocketClient> = new Map();

  constructor(io: SocketIOServer) {
    super();
    this.io = io;
    this.logger.info('WebSocket Manager initialized');
  }

  public handleConnection(socket: Socket): void {
    const client: WebSocketClient = {
      id: socket.id,
      socket,
      authenticated: false,
      lastActivity: new Date(),
      userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
      ipAddress: socket.handshake.address || 'Unknown'
    };

    this.clients.set(socket.id, client);
    this.logger.info(`Client connected: ${socket.id} from ${client.ipAddress}`);

    // Set up client event handlers
    this.setupClientHandlers(client);

    // Emit connection event
    this.emit('clientConnected', client);
  }

  public handleDisconnection(socketId: string): void {
    const client = this.clients.get(socketId);
    if (client) {
      this.logger.info(`Client disconnected: ${socketId}`);
      this.emit('clientDisconnected', client);
      this.clients.delete(socketId);
    }
  }

  private setupClientHandlers(client: WebSocketClient): void {
    const { socket } = client;

    // Authentication
    socket.on('authenticate', (data) => {
      this.handleAuthentication(client, data);
    });

    // RDP Session Management
    socket.on('rdp:connect', (data) => {
      this.handleRDPConnect(client, data);
    });

    socket.on('rdp:disconnect', () => {
      this.handleRDPDisconnect(client);
    });

    // Input forwarding
    socket.on('input:mouse', (data) => {
      this.handleMouseInput(client, data);
    });

    socket.on('input:keyboard', (data) => {
      this.handleKeyboardInput(client, data);
    });

    socket.on('input:touch', (data) => {
      this.handleTouchInput(client, data);
    });

    // Clipboard
    socket.on('clipboard:set', (data) => {
      this.handleClipboardSet(client, data);
    });

    socket.on('clipboard:get', () => {
      this.handleClipboardGet(client);
    });

    // File transfer
    socket.on('file:upload', (data) => {
      this.handleFileUpload(client, data);
    });

    socket.on('file:download', (data) => {
      this.handleFileDownload(client, data);
    });

    // Device redirection
    socket.on('device:connect', (data) => {
      this.handleDeviceConnect(client, data);
    });

    socket.on('device:disconnect', (data) => {
      this.handleDeviceDisconnect(client, data);
    });

    // Quality settings
    socket.on('quality:change', (data) => {
      this.handleQualityChange(client, data);
    });

    // Display settings
    socket.on('display:fullscreen', (data) => {
      this.handleFullscreenChange(client, data);
    });

    socket.on('display:monitor', (data) => {
      this.handleMonitorChange(client, data);
    });

    // Ping/Pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
      client.lastActivity = new Date();
    });

    // Disconnect
    socket.on('disconnect', () => {
      this.handleDisconnection(socket.id);
    });
  }

  private handleAuthentication(client: WebSocketClient, data: any): void {
    this.logger.info(`Authentication attempt for client ${client.id}`);
    
    // Emit authentication event for external handling
    this.emit('authenticate', { client, data });
  }

  private handleRDPConnect(client: WebSocketClient, data: any): void {
    if (!client.authenticated) {
      client.socket.emit('rdp:error', { error: 'Not authenticated' });
      return;
    }

    this.logger.info(`RDP connect request from client ${client.id} to ${data.host}:${data.port}`);
    
    // Emit RDP connect event for external handling
    this.emit('rdpConnect', { client, data });
  }

  private handleRDPDisconnect(client: WebSocketClient): void {
    this.logger.info(`RDP disconnect request from client ${client.id}`);
    
    // Emit RDP disconnect event for external handling
    this.emit('rdpDisconnect', { client });
  }

  private handleMouseInput(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit mouse input event for external handling
    this.emit('mouseInput', { client, data });
  }

  private handleKeyboardInput(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit keyboard input event for external handling
    this.emit('keyboardInput', { client, data });
  }

  private handleTouchInput(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit touch input event for external handling
    this.emit('touchInput', { client, data });
  }

  private handleClipboardSet(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit clipboard set event for external handling
    this.emit('clipboardSet', { client, data });
  }

  private handleClipboardGet(client: WebSocketClient): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit clipboard get event for external handling
    this.emit('clipboardGet', { client });
  }

  private handleFileUpload(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit file upload event for external handling
    this.emit('fileUpload', { client, data });
  }

  private handleFileDownload(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit file download event for external handling
    this.emit('fileDownload', { client, data });
  }

  private handleDeviceConnect(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit device connect event for external handling
    this.emit('deviceConnect', { client, data });
  }

  private handleDeviceDisconnect(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit device disconnect event for external handling
    this.emit('deviceDisconnect', { client, data });
  }

  private handleQualityChange(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit quality change event for external handling
    this.emit('qualityChange', { client, data });
  }

  private handleFullscreenChange(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit fullscreen change event for external handling
    this.emit('fullscreenChange', { client, data });
  }

  private handleMonitorChange(client: WebSocketClient, data: any): void {
    if (!client.authenticated || !client.sessionId) {
      return;
    }

    client.lastActivity = new Date();
    
    // Emit monitor change event for external handling
    this.emit('monitorChange', { client, data });
  }

  // Public methods for sending data to clients
  public sendFrame(clientId: string, frame: Buffer): void {
    const client = this.clients.get(clientId);
    if (client && client.authenticated) {
      client.socket.emit('frame', { data: frame.toString('base64') });
      client.lastActivity = new Date();
    }
  }

  public sendClipboardData(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client && client.authenticated) {
      client.socket.emit('clipboard:data', data);
      client.lastActivity = new Date();
    }
  }

  public sendFileData(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client && client.authenticated) {
      client.socket.emit('file:data', data);
      client.lastActivity = new Date();
    }
  }

  public sendDeviceData(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client && client.authenticated) {
      client.socket.emit('device:data', data);
      client.lastActivity = new Date();
    }
  }

  public sendError(clientId: string, error: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.socket.emit('error', { error });
      client.lastActivity = new Date();
    }
  }

  public setClientAuthenticated(clientId: string, sessionId?: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.authenticated = true;
      client.sessionId = sessionId;
      client.lastActivity = new Date();
    }
  }

  public getClient(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  public getAllClients(): WebSocketClient[] {
    return Array.from(this.clients.values());
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public broadcastToAuthenticated(event: string, data: any): void {
    for (const client of this.clients.values()) {
      if (client.authenticated) {
        client.socket.emit(event, data);
      }
    }
  }
} 