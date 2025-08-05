"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketManager = void 0;
const Logger_1 = require("../utils/Logger");
const events_1 = require("events");
class WebSocketManager extends events_1.EventEmitter {
    constructor(io) {
        super();
        this.logger = new Logger_1.Logger('WebSocketManager');
        this.clients = new Map();
        this.io = io;
        this.logger.info('WebSocket Manager initialized');
    }
    handleConnection(socket) {
        const client = {
            id: socket.id,
            socket,
            authenticated: false,
            lastActivity: new Date(),
            userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
            ipAddress: socket.handshake.address || 'Unknown'
        };
        this.clients.set(socket.id, client);
        this.logger.info(`Client connected: ${socket.id} from ${client.ipAddress}`);
        this.setupClientHandlers(client);
        this.emit('clientConnected', client);
    }
    handleDisconnection(socketId) {
        const client = this.clients.get(socketId);
        if (client) {
            this.logger.info(`Client disconnected: ${socketId}`);
            this.emit('clientDisconnected', client);
            this.clients.delete(socketId);
        }
    }
    setupClientHandlers(client) {
        const { socket } = client;
        socket.on('authenticate', (data) => {
            this.handleAuthentication(client, data);
        });
        socket.on('rdp:connect', (data) => {
            this.handleRDPConnect(client, data);
        });
        socket.on('rdp:disconnect', () => {
            this.handleRDPDisconnect(client);
        });
        socket.on('input:mouse', (data) => {
            this.handleMouseInput(client, data);
        });
        socket.on('input:keyboard', (data) => {
            this.handleKeyboardInput(client, data);
        });
        socket.on('input:touch', (data) => {
            this.handleTouchInput(client, data);
        });
        socket.on('clipboard:set', (data) => {
            this.handleClipboardSet(client, data);
        });
        socket.on('clipboard:get', () => {
            this.handleClipboardGet(client);
        });
        socket.on('file:upload', (data) => {
            this.handleFileUpload(client, data);
        });
        socket.on('file:download', (data) => {
            this.handleFileDownload(client, data);
        });
        socket.on('device:connect', (data) => {
            this.handleDeviceConnect(client, data);
        });
        socket.on('device:disconnect', (data) => {
            this.handleDeviceDisconnect(client, data);
        });
        socket.on('quality:change', (data) => {
            this.handleQualityChange(client, data);
        });
        socket.on('display:fullscreen', (data) => {
            this.handleFullscreenChange(client, data);
        });
        socket.on('display:monitor', (data) => {
            this.handleMonitorChange(client, data);
        });
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
            client.lastActivity = new Date();
        });
        socket.on('disconnect', () => {
            this.handleDisconnection(socket.id);
        });
    }
    handleAuthentication(client, data) {
        this.logger.info(`Authentication attempt for client ${client.id}`);
        this.emit('authenticate', { client, data });
    }
    handleRDPConnect(client, data) {
        if (!client.authenticated) {
            client.socket.emit('rdp:error', { error: 'Not authenticated' });
            return;
        }
        this.logger.info(`RDP connect request from client ${client.id} to ${data.host}:${data.port}`);
        this.emit('rdpConnect', { client, data });
    }
    handleRDPDisconnect(client) {
        this.logger.info(`RDP disconnect request from client ${client.id}`);
        this.emit('rdpDisconnect', { client });
    }
    handleMouseInput(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('mouseInput', { client, data });
    }
    handleKeyboardInput(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('keyboardInput', { client, data });
    }
    handleTouchInput(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('touchInput', { client, data });
    }
    handleClipboardSet(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('clipboardSet', { client, data });
    }
    handleClipboardGet(client) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('clipboardGet', { client });
    }
    handleFileUpload(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('fileUpload', { client, data });
    }
    handleFileDownload(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('fileDownload', { client, data });
    }
    handleDeviceConnect(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('deviceConnect', { client, data });
    }
    handleDeviceDisconnect(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('deviceDisconnect', { client, data });
    }
    handleQualityChange(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('qualityChange', { client, data });
    }
    handleFullscreenChange(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('fullscreenChange', { client, data });
    }
    handleMonitorChange(client, data) {
        if (!client.authenticated || !client.sessionId) {
            return;
        }
        client.lastActivity = new Date();
        this.emit('monitorChange', { client, data });
    }
    sendFrame(clientId, frame) {
        const client = this.clients.get(clientId);
        if (client && client.authenticated) {
            client.socket.emit('frame', { data: frame.toString('base64') });
            client.lastActivity = new Date();
        }
    }
    sendClipboardData(clientId, data) {
        const client = this.clients.get(clientId);
        if (client && client.authenticated) {
            client.socket.emit('clipboard:data', data);
            client.lastActivity = new Date();
        }
    }
    sendFileData(clientId, data) {
        const client = this.clients.get(clientId);
        if (client && client.authenticated) {
            client.socket.emit('file:data', data);
            client.lastActivity = new Date();
        }
    }
    sendDeviceData(clientId, data) {
        const client = this.clients.get(clientId);
        if (client && client.authenticated) {
            client.socket.emit('device:data', data);
            client.lastActivity = new Date();
        }
    }
    sendError(clientId, error) {
        const client = this.clients.get(clientId);
        if (client) {
            client.socket.emit('error', { error });
            client.lastActivity = new Date();
        }
    }
    setClientAuthenticated(clientId, sessionId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.authenticated = true;
            client.sessionId = sessionId;
            client.lastActivity = new Date();
        }
    }
    getClient(clientId) {
        return this.clients.get(clientId);
    }
    getAllClients() {
        return Array.from(this.clients.values());
    }
    getConnectedClientsCount() {
        return this.clients.size;
    }
    broadcastToAll(event, data) {
        this.io.emit(event, data);
    }
    broadcastToAuthenticated(event, data) {
        for (const client of this.clients.values()) {
            if (client.authenticated) {
                client.socket.emit(event, data);
            }
        }
    }
}
exports.WebSocketManager = WebSocketManager;
//# sourceMappingURL=WebSocketManager.js.map