import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { Logger } from './utils/Logger';
import { RDPSessionManager } from './services/RDPSessionManager';
import { WebSocketManager } from './services/WebSocketManager';
import { AuthManager } from './services/AuthManager';
import { FileTransferManager } from './services/FileTransferManager';
import { DeviceRedirectionManager } from './services/DeviceRedirectionManager';
import { AuditLogger } from './services/AuditLogger';
import { Config } from './utils/Config';

// Load environment variables
dotenv.config();

const logger = new Logger('RDPGateway');
const config = Config.getInstance();

class RDPGateway {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private rdpSessionManager: RDPSessionManager;
  private wsManager: WebSocketManager;
  private authManager: AuthManager;
  private fileTransferManager: FileTransferManager;
  private deviceRedirectionManager: DeviceRedirectionManager;
  private auditLogger: AuditLogger;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.get('cors').allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.initializeServices();
    this.setupSocketHandlers();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      }
    }));

    // CORS
    this.app.use(cors({
      origin: config.get('cors').allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Static files
    this.app.use(express.static('public'));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/auth', require('./routes/auth').default);
    this.app.use('/api/sessions', require('./routes/sessions').default);
    this.app.use('/api/files', require('./routes/files').default);
    this.app.use('/api/devices', require('./routes/devices').default);
    this.app.use('/api/audit', require('./routes/audit').default);

    // WebSocket upgrade endpoint
    this.app.get('/ws', (req, res) => {
      res.send('WebSocket endpoint available at /socket.io/');
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
      });
    });

    // Error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Express error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
      });
    });
  }

  private initializeServices(): void {
    this.rdpSessionManager = new RDPSessionManager();
    this.wsManager = new WebSocketManager(this.io);
    this.authManager = new AuthManager();
    this.fileTransferManager = new FileTransferManager();
    this.deviceRedirectionManager = new DeviceRedirectionManager();
    this.auditLogger = new AuditLogger();

    logger.info('All services initialized');
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Authentication
      socket.on('authenticate', async (data) => {
        try {
          const authResult = await this.authManager.authenticateSocket(socket, data);
          if (authResult.success) {
            socket.emit('authenticated', { success: true });
            this.auditLogger.logConnection(socket.id, data);
          } else {
            socket.emit('authenticated', { success: false, error: authResult.error });
          }
        } catch (error) {
          logger.error('Authentication error:', error);
          socket.emit('authenticated', { success: false, error: 'Authentication failed' });
        }
      });

      // RDP Session Management
      socket.on('rdp:connect', async (data) => {
        try {
          const session = await this.rdpSessionManager.createSession(socket.id, data);
          socket.emit('rdp:connected', { sessionId: session.id });
          this.auditLogger.logRDPSession(socket.id, data);
        } catch (error) {
          logger.error('RDP connection error:', error);
          socket.emit('rdp:error', { error: error.message });
        }
      });

      socket.on('rdp:disconnect', async (data) => {
        try {
          await this.rdpSessionManager.disconnectSession(socket.id);
          socket.emit('rdp:disconnected');
          this.auditLogger.logRDPDisconnect(socket.id);
        } catch (error) {
          logger.error('RDP disconnect error:', error);
        }
      });

      // Input forwarding
      socket.on('input:mouse', (data) => {
        this.rdpSessionManager.forwardMouseInput(socket.id, data);
      });

      socket.on('input:keyboard', (data) => {
        this.rdpSessionManager.forwardKeyboardInput(socket.id, data);
      });

      socket.on('input:touch', (data) => {
        this.rdpSessionManager.forwardTouchInput(socket.id, data);
      });

      // Clipboard
      socket.on('clipboard:set', (data) => {
        this.rdpSessionManager.setClipboard(socket.id, data);
      });

      socket.on('clipboard:get', () => {
        this.rdpSessionManager.getClipboard(socket.id);
      });

      // File transfer
      socket.on('file:upload', async (data) => {
        try {
          const result = await this.fileTransferManager.handleUpload(socket.id, data);
          socket.emit('file:uploaded', result);
        } catch (error) {
          logger.error('File upload error:', error);
          socket.emit('file:error', { error: error.message });
        }
      });

      socket.on('file:download', async (data) => {
        try {
          const result = await this.fileTransferManager.handleDownload(socket.id, data);
          socket.emit('file:downloaded', result);
        } catch (error) {
          logger.error('File download error:', error);
          socket.emit('file:error', { error: error.message });
        }
      });

      // Device redirection
      socket.on('device:connect', async (data) => {
        try {
          const result = await this.deviceRedirectionManager.connectDevice(socket.id, data);
          socket.emit('device:connected', result);
        } catch (error) {
          logger.error('Device connection error:', error);
          socket.emit('device:error', { error: error.message });
        }
      });

      socket.on('device:disconnect', async (data) => {
        try {
          await this.deviceRedirectionManager.disconnectDevice(socket.id, data);
          socket.emit('device:disconnected', { deviceId: data.deviceId });
        } catch (error) {
          logger.error('Device disconnect error:', error);
        }
      });

      // Quality settings
      socket.on('quality:change', (data) => {
        this.rdpSessionManager.changeQuality(socket.id, data.quality);
      });

      // Fullscreen
      socket.on('display:fullscreen', (data) => {
        this.rdpSessionManager.setFullscreen(socket.id, data.enabled);
      });

      // Multi-monitor
      socket.on('display:monitor', (data) => {
        this.rdpSessionManager.setMonitor(socket.id, data.monitorIndex);
      });

      // Disconnect
      socket.on('disconnect', async () => {
        logger.info(`Client disconnected: ${socket.id}`);
        await this.rdpSessionManager.disconnectSession(socket.id);
        this.auditLogger.logDisconnect(socket.id);
      });
    });

    logger.info('Socket handlers configured');
  }

  public start(): void {
    const port = config.get('server').port;
    const host = config.get('server').host;

    this.server.listen(port, host, () => {
      logger.info(`RDP Gateway Server running on ${host}:${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`WebSocket endpoint: ws://${host}:${port}/socket.io/`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  private async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down RDP Gateway...');
      
      // Close all RDP sessions
      await this.rdpSessionManager.shutdown();
      
      // Close WebSocket connections
      this.io.close();
      
      // Close HTTP server
      this.server.close(() => {
        logger.info('RDP Gateway shutdown complete');
        process.exit(0);
      });
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server
const gateway = new RDPGateway();
gateway.start(); 