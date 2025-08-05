"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const Logger_1 = require("../utils/Logger");
const RDPSessionManager_1 = require("./RDPSessionManager");
const WebSocketManager_1 = require("../ws/WebSocketManager");
const AuthManager_1 = require("../services/AuthManager");
const FileTransferManager_1 = require("../services/FileTransferManager");
const DeviceRedirectionManager_1 = require("../services/DeviceRedirectionManager");
const AuditLogger_1 = require("../services/AuditLogger");
const Config_1 = require("../utils/Config");
dotenv_1.default.config();
const logger = new Logger_1.Logger('RDPGateway');
const config = Config_1.Config.getInstance();
class RDPGateway {
    constructor() {
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
        this.server = (0, http_1.createServer)(this.app);
        this.io = new socket_io_1.Server(this.server, {
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
    setupMiddleware() {
        this.app.use((0, helmet_1.default)({
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
        this.app.use((0, cors_1.default)({
            origin: config.get('cors').allowedOrigins,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));
        this.app.use((0, compression_1.default)());
        this.app.use(express_1.default.json({ limit: '50mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
        this.app.use(express_1.default.static('public'));
    }
    setupRoutes() {
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });
        this.app.use('/api/auth', require('../routes/auth').default);
        this.app.use('/api/sessions', require('../routes/sessions').default);
        this.app.use('/api/files', require('../routes/files').default);
        this.app.use('/api/devices', require('../routes/devices').default);
        this.app.use('/api/audit', require('../routes/audit').default);
        this.app.get('/ws', (req, res) => {
            res.send('WebSocket endpoint available at /socket.io/');
        });
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: 'The requested resource was not found'
            });
        });
        this.app.use((err, req, res, next) => {
            logger.error('Express error:', err);
            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
            });
        });
    }
    initializeServices() {
        this.rdpSessionManager = new RDPSessionManager_1.RDPSessionManager();
        this.wsManager = new WebSocketManager_1.WebSocketManager(this.io);
        this.authManager = new AuthManager_1.AuthManager();
        this.fileTransferManager = new FileTransferManager_1.FileTransferManager();
        this.deviceRedirectionManager = new DeviceRedirectionManager_1.DeviceRedirectionManager();
        this.auditLogger = new AuditLogger_1.AuditLogger();
        logger.info('All services initialized');
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger.info(`Client connected: ${socket.id}`);
            socket.on('authenticate', async (data) => {
                try {
                    const authResult = await this.authManager.authenticateSocket(socket, data);
                    if (authResult.success) {
                        socket.emit('authenticated', { success: true });
                        this.auditLogger.logConnection(socket.id, data);
                    }
                    else {
                        socket.emit('authenticated', { success: false, error: authResult.error });
                    }
                }
                catch (error) {
                    logger.error('Authentication error:', error);
                    socket.emit('authenticated', { success: false, error: 'Authentication failed' });
                }
            });
            socket.on('rdp:connect', async (data) => {
                try {
                    const session = await this.rdpSessionManager.createSession(socket.id, data);
                    socket.emit('rdp:connected', { sessionId: session.id });
                    this.auditLogger.logRDPSession(socket.id, data);
                }
                catch (error) {
                    logger.error('RDP connection error:', error);
                    socket.emit('rdp:error', { error: error.message });
                }
            });
            socket.on('rdp:disconnect', async (data) => {
                try {
                    await this.rdpSessionManager.disconnectSession(socket.id);
                    socket.emit('rdp:disconnected');
                    this.auditLogger.logRDPDisconnect(socket.id);
                }
                catch (error) {
                    logger.error('RDP disconnect error:', error);
                }
            });
            socket.on('input:mouse', (data) => {
                this.rdpSessionManager.forwardMouseInput(socket.id, data);
            });
            socket.on('input:keyboard', (data) => {
                this.rdpSessionManager.forwardKeyboardInput(socket.id, data);
            });
            socket.on('input:touch', (data) => {
                this.rdpSessionManager.forwardTouchInput(socket.id, data);
            });
            socket.on('clipboard:set', (data) => {
                this.rdpSessionManager.setClipboard(socket.id, data);
            });
            socket.on('clipboard:get', () => {
                this.rdpSessionManager.getClipboard(socket.id);
            });
            socket.on('file:upload', async (data) => {
                try {
                    const result = await this.fileTransferManager.handleUpload(socket.id, data);
                    socket.emit('file:uploaded', result);
                }
                catch (error) {
                    logger.error('File upload error:', error);
                    socket.emit('file:error', { error: error.message });
                }
            });
            socket.on('file:download', async (data) => {
                try {
                    const result = await this.fileTransferManager.handleDownload(socket.id, data);
                    socket.emit('file:downloaded', result);
                }
                catch (error) {
                    logger.error('File download error:', error);
                    socket.emit('file:error', { error: error.message });
                }
            });
            socket.on('device:connect', async (data) => {
                try {
                    const result = await this.deviceRedirectionManager.connectDevice(socket.id, data);
                    socket.emit('device:connected', result);
                }
                catch (error) {
                    logger.error('Device connection error:', error);
                    socket.emit('device:error', { error: error.message });
                }
            });
            socket.on('device:disconnect', async (data) => {
                try {
                    await this.deviceRedirectionManager.disconnectDevice(socket.id, data);
                    socket.emit('device:disconnected', { deviceId: data.deviceId });
                }
                catch (error) {
                    logger.error('Device disconnect error:', error);
                }
            });
            socket.on('quality:change', (data) => {
                this.rdpSessionManager.changeQuality(socket.id, data.quality);
            });
            socket.on('display:fullscreen', (data) => {
                this.rdpSessionManager.setFullscreen(socket.id, data.enabled);
            });
            socket.on('display:monitor', (data) => {
                this.rdpSessionManager.setMonitor(socket.id, data.monitorIndex);
            });
            socket.on('disconnect', async () => {
                logger.info(`Client disconnected: ${socket.id}`);
                await this.rdpSessionManager.disconnectSession(socket.id);
                this.auditLogger.logDisconnect(socket.id);
            });
        });
        logger.info('Socket handlers configured');
    }
    start() {
        const port = config.get('server').port;
        const host = config.get('server').host;
        this.server.listen(port, host, () => {
            logger.info(`RDP Gateway Server running on ${host}:${port}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`WebSocket endpoint: ws://${host}:${port}/socket.io/`);
        });
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            this.shutdown();
        });
        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            this.shutdown();
        });
    }
    async shutdown() {
        try {
            logger.info('Shutting down RDP Gateway...');
            await this.rdpSessionManager.shutdown();
            this.io.close();
            this.server.close(() => {
                logger.info('RDP Gateway shutdown complete');
                process.exit(0);
            });
        }
        catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}
const gateway = new RDPGateway();
gateway.start();
//# sourceMappingURL=index.js.map