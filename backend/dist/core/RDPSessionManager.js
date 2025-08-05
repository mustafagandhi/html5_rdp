"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RDPSessionManager = void 0;
const Logger_1 = require("../utils/Logger");
const events_1 = require("events");
const uuid_1 = require("uuid");
const net = __importStar(require("net"));
const tls = __importStar(require("tls"));
const zlib = __importStar(require("zlib"));
class RDPSessionManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.logger = new Logger_1.Logger('RDPSessionManager');
        this.sessions = new Map();
        this.rdpConnections = new Map();
        this.frameProcessors = new Map();
        this.logger.info('RDP Session Manager initialized');
    }
    async createSession(socketId, config) {
        const sessionId = (0, uuid_1.v4)();
        const session = {
            id: sessionId,
            socketId,
            config,
            status: 'connecting',
            startTime: new Date(),
            lastActivity: new Date(),
            frameCount: 0,
            bytesReceived: 0,
            bytesSent: 0
        };
        this.sessions.set(sessionId, session);
        this.logger.info(`Creating RDP session ${sessionId} to ${config.host}:${config.port}`);
        try {
            const rdpConnection = await this.createRDPConnection(session);
            this.rdpConnections.set(sessionId, rdpConnection);
            session.rdpConnection = rdpConnection;
            session.status = 'connected';
            session.lastActivity = new Date();
            this.startFrameProcessing(sessionId);
            this.logger.info(`RDP session ${sessionId} connected successfully`);
            this.emit('sessionCreated', session);
            return session;
        }
        catch (error) {
            session.status = 'error';
            session.error = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create RDP session ${sessionId}:`, error);
            throw error;
        }
    }
    async createRDPConnection(session) {
        return new Promise((resolve, reject) => {
            const config = session.config;
            const socket = net.createConnection({
                host: config.host,
                port: config.port,
                timeout: config.timeout * 1000
            });
            const rdpConnection = {
                socket,
                isConnected: false,
                sessionId: session.id,
                frameBuffer: [],
                inputQueue: [],
                clipboardData: null,
                fileTransferData: null,
                deviceData: null,
                bytesSent: 0,
                bytesReceived: 0
            };
            socket.on('connect', () => {
                this.logger.info(`TCP connection established to ${config.host}:${config.port}`);
                this.sendRDPConnectionRequest(rdpConnection, config);
            });
            socket.on('data', (data) => {
                this.handleRDPData(rdpConnection, data);
            });
            socket.on('error', (error) => {
                this.logger.error(`RDP connection error for session ${session.id}:`, error);
                reject(error);
            });
            socket.on('close', () => {
                this.logger.info(`RDP connection closed for session ${session.id}`);
                rdpConnection.isConnected = false;
                this.emit('sessionDisconnected', { sessionId: session.id });
            });
            if (config.enableTLS) {
                socket.once('connect', () => {
                    this.upgradeToTLS(rdpConnection, config);
                });
            }
            setTimeout(() => {
                if (!rdpConnection.isConnected) {
                    reject(new Error('RDP connection timeout'));
                }
            }, config.timeout * 1000);
            resolve(rdpConnection);
        });
    }
    sendRDPConnectionRequest(connection, config) {
        const request = this.buildRDPConnectionRequest(config);
        connection.socket.write(request);
        connection.bytesSent += request.length;
    }
    buildRDPConnectionRequest(config) {
        const header = Buffer.alloc(11);
        header.writeUInt8(0x03, 0);
        header.writeUInt8(0x00, 1);
        header.writeUInt16BE(0, 2);
        header.writeUInt8(0x02, 4);
        header.writeUInt8(0xE0, 5);
        header.writeUInt16BE(0x0000, 6);
        header.writeUInt16BE(0x0000, 8);
        header.writeUInt8(0x00, 10);
        const details = Buffer.alloc(32);
        details.writeUInt8(0x01, 0);
        details.writeUInt8(0x00, 1);
        details.writeUInt16BE(0x0008, 2);
        details.writeUInt32BE(0x00000000, 4);
        details.writeUInt32BE(0x00000000, 8);
        details.writeUInt32BE(0x00000000, 12);
        details.writeUInt32BE(0x00000000, 16);
        details.writeUInt32BE(0x00000000, 20);
        details.writeUInt32BE(0x00000000, 24);
        details.writeUInt32BE(0x00000000, 28);
        const request = Buffer.concat([header, details]);
        request.writeUInt16BE(request.length, 2);
        return request;
    }
    handleRDPData(connection, data) {
        try {
            const parsedData = this.parseRDPData(data);
            if (parsedData.type === 'connection-confirm') {
                connection.isConnected = true;
                this.logger.info(`RDP connection confirmed for session ${connection.sessionId}`);
                this.emit('sessionConnected', { sessionId: connection.sessionId });
            }
            else if (parsedData.type === 'frame') {
                this.handleVideoFrame(connection, parsedData.data);
            }
            else if (parsedData.type === 'clipboard') {
                this.handleClipboardData(connection, parsedData.data);
            }
            else if (parsedData.type === 'file-transfer') {
                this.handleFileTransferData(connection, parsedData.data);
            }
            else if (parsedData.type === 'device') {
                this.handleDeviceData(connection, parsedData.data);
            }
            connection.bytesReceived += data.length;
        }
        catch (error) {
            this.logger.error('Error handling RDP data:', error);
        }
    }
    parseRDPData(data) {
        if (data.length < 11) {
            throw new Error('Invalid RDP data length');
        }
        const version = data.readUInt8(0);
        const type = data.readUInt8(4);
        if (version === 0x03 && type === 0x02) {
            return { type: 'connection-confirm' };
        }
        else if (version === 0x03 && type === 0x04) {
            return { type: 'frame', data: data.slice(11) };
        }
        else if (version === 0x03 && type === 0x05) {
            return { type: 'clipboard', data: data.slice(11) };
        }
        else if (version === 0x03 && type === 0x06) {
            return { type: 'file-transfer', data: data.slice(11) };
        }
        else if (version === 0x03 && type === 0x07) {
            return { type: 'device', data: data.slice(11) };
        }
        return { type: 'unknown', data };
    }
    handleVideoFrame(connection, frameData) {
        const compressedFrame = this.compressFrame(frameData);
        connection.frameBuffer.push(compressedFrame);
        this.emit('frameReceived', {
            sessionId: connection.sessionId,
            frame: compressedFrame,
            timestamp: Date.now()
        });
    }
    handleClipboardData(connection, data) {
        try {
            const clipboardText = data.toString('utf8');
            connection.clipboardData = clipboardText;
            this.emit('clipboardReceived', {
                sessionId: connection.sessionId,
                data: clipboardText
            });
        }
        catch (error) {
            this.logger.error('Error handling clipboard data:', error);
        }
    }
    handleFileTransferData(connection, data) {
        try {
            const fileData = JSON.parse(data.toString('utf8'));
            connection.fileTransferData = fileData;
            this.emit('fileTransferReceived', {
                sessionId: connection.sessionId,
                data: fileData
            });
        }
        catch (error) {
            this.logger.error('Error handling file transfer data:', error);
        }
    }
    handleDeviceData(connection, data) {
        try {
            const deviceData = JSON.parse(data.toString('utf8'));
            connection.deviceData = deviceData;
            this.emit('deviceDataReceived', {
                sessionId: connection.sessionId,
                data: deviceData
            });
        }
        catch (error) {
            this.logger.error('Error handling device data:', error);
        }
    }
    compressFrame(frameData) {
        return zlib.deflateSync(frameData);
    }
    startFrameProcessing(sessionId) {
        const interval = setInterval(() => {
            const connection = this.rdpConnections.get(sessionId);
            if (!connection || !connection.isConnected) {
                clearInterval(interval);
                this.frameProcessors.delete(sessionId);
                return;
            }
            while (connection.frameBuffer.length > 0) {
                const frame = connection.frameBuffer.shift();
                if (frame) {
                    this.emit('frameProcessed', {
                        sessionId,
                        frame,
                        timestamp: Date.now()
                    });
                }
            }
        }, 1000 / 30);
        this.frameProcessors.set(sessionId, interval);
    }
    upgradeToTLS(connection, config) {
        const tlsOptions = {
            host: config.host,
            port: config.port,
            rejectUnauthorized: false,
            secureProtocol: 'TLSv1_2_method'
        };
        const tlsSocket = tls.connect(tlsOptions, () => {
            this.logger.info(`TLS connection established for session ${connection.sessionId}`);
            connection.socket = tlsSocket;
            tlsSocket.on('data', (data) => {
                this.handleRDPData(connection, data);
            });
            tlsSocket.on('error', (error) => {
                this.logger.error(`TLS connection error for session ${connection.sessionId}:`, error);
            });
            tlsSocket.on('close', () => {
                this.logger.info(`TLS connection closed for session ${connection.sessionId}`);
                connection.isConnected = false;
            });
        });
        tlsSocket.on('error', (error) => {
            this.logger.error(`TLS upgrade failed for session ${connection.sessionId}:`, error);
        });
    }
    async disconnectSession(socketId) {
        const session = this.findSessionBySocketId(socketId);
        if (!session) {
            this.logger.warn(`No session found for socket ${socketId}`);
            return;
        }
        const connection = this.rdpConnections.get(session.id);
        if (connection) {
            connection.socket.end();
            this.rdpConnections.delete(session.id);
        }
        const processor = this.frameProcessors.get(session.id);
        if (processor) {
            clearInterval(processor);
            this.frameProcessors.delete(session.id);
        }
        session.status = 'disconnected';
        session.lastActivity = new Date();
        this.logger.info(`RDP session ${session.id} disconnected`);
        this.emit('sessionDisconnected', session);
    }
    forwardMouseInput(socketId, data) {
        const session = this.findSessionBySocketId(socketId);
        if (!session || session.status !== 'connected')
            return;
        const connection = this.rdpConnections.get(session.id);
        if (connection && connection.isConnected) {
            const inputData = this.buildMouseInputPacket(data);
            connection.socket.write(inputData);
            connection.bytesSent += inputData.length;
        }
    }
    forwardKeyboardInput(socketId, data) {
        const session = this.findSessionBySocketId(socketId);
        if (!session || session.status !== 'connected')
            return;
        const connection = this.rdpConnections.get(session.id);
        if (connection && connection.isConnected) {
            const inputData = this.buildKeyboardInputPacket(data);
            connection.socket.write(inputData);
            connection.bytesSent += inputData.length;
        }
    }
    forwardTouchInput(socketId, data) {
        const session = this.findSessionBySocketId(socketId);
        if (!session || session.status !== 'connected')
            return;
        const connection = this.rdpConnections.get(session.id);
        if (connection && connection.isConnected) {
            const inputData = this.buildTouchInputPacket(data);
            connection.socket.write(inputData);
            connection.bytesSent += inputData.length;
        }
    }
    buildMouseInputPacket(data) {
        const packet = Buffer.alloc(20);
        packet.writeUInt8(0x03, 0);
        packet.writeUInt8(0x00, 1);
        packet.writeUInt16BE(20, 2);
        packet.writeUInt8(0x08, 4);
        packet.writeUInt8(0x01, 5);
        packet.writeUInt16BE(data.x, 6);
        packet.writeUInt16BE(data.y, 8);
        packet.writeUInt8(data.button, 10);
        packet.writeUInt8(data.action === 'down' ? 0x01 : 0x00, 11);
        packet.writeUInt16BE(data.wheel || 0, 12);
        return packet;
    }
    buildKeyboardInputPacket(data) {
        const packet = Buffer.alloc(20);
        packet.writeUInt8(0x03, 0);
        packet.writeUInt8(0x00, 1);
        packet.writeUInt16BE(20, 2);
        packet.writeUInt8(0x08, 4);
        packet.writeUInt8(0x02, 5);
        packet.writeUInt16BE(data.keyCode, 6);
        packet.writeUInt16BE(data.scanCode, 8);
        packet.writeUInt16BE(data.flags, 10);
        packet.writeUInt16BE(data.unicode || 0, 12);
        return packet;
    }
    buildTouchInputPacket(data) {
        const packet = Buffer.alloc(20);
        packet.writeUInt8(0x03, 0);
        packet.writeUInt8(0x00, 1);
        packet.writeUInt16BE(20, 2);
        packet.writeUInt8(0x08, 4);
        packet.writeUInt8(0x03, 5);
        packet.writeUInt16BE(data.x, 6);
        packet.writeUInt16BE(data.y, 8);
        packet.writeUInt8(data.pressure, 10);
        packet.writeUInt8(data.action === 'down' ? 0x01 : 0x00, 11);
        return packet;
    }
    setClipboard(socketId, data) {
        const session = this.findSessionBySocketId(socketId);
        if (!session || session.status !== 'connected')
            return;
        const connection = this.rdpConnections.get(session.id);
        if (connection && connection.isConnected) {
            const clipboardPacket = this.buildClipboardPacket(data);
            connection.socket.write(clipboardPacket);
            connection.bytesSent += clipboardPacket.length;
        }
    }
    getClipboard(socketId) {
        const session = this.findSessionBySocketId(socketId);
        if (!session || session.status !== 'connected')
            return;
        const connection = this.rdpConnections.get(session.id);
        if (connection && connection.isConnected) {
            const requestPacket = this.buildClipboardRequestPacket();
            connection.socket.write(requestPacket);
            connection.bytesSent += requestPacket.length;
        }
    }
    buildClipboardPacket(data) {
        const dataBuffer = Buffer.from(JSON.stringify(data), 'utf8');
        const packet = Buffer.alloc(11 + dataBuffer.length);
        packet.writeUInt8(0x03, 0);
        packet.writeUInt8(0x00, 1);
        packet.writeUInt16BE(11 + dataBuffer.length, 2);
        packet.writeUInt8(0x05, 4);
        packet.writeUInt32BE(dataBuffer.length, 5);
        dataBuffer.copy(packet, 9);
        return packet;
    }
    buildClipboardRequestPacket() {
        const packet = Buffer.alloc(11);
        packet.writeUInt8(0x03, 0);
        packet.writeUInt8(0x00, 1);
        packet.writeUInt16BE(11, 2);
        packet.writeUInt8(0x05, 4);
        packet.writeUInt8(0x01, 5);
        packet.writeUInt32BE(0, 6);
        return packet;
    }
    changeQuality(socketId, quality) {
        const session = this.findSessionBySocketId(socketId);
        if (!session || session.status !== 'connected')
            return;
        session.config.quality = quality;
        session.lastActivity = new Date();
        this.emit('qualityChanged', { sessionId: session.id, quality });
    }
    setFullscreen(socketId, enabled) {
        const session = this.findSessionBySocketId(socketId);
        if (!session || session.status !== 'connected')
            return;
        session.lastActivity = new Date();
        this.emit('fullscreenChanged', { sessionId: session.id, enabled });
    }
    setMonitor(socketId, monitorIndex) {
        const session = this.findSessionBySocketId(socketId);
        if (!session || session.status !== 'connected')
            return;
        session.lastActivity = new Date();
        this.emit('monitorChanged', { sessionId: session.id, monitorIndex });
    }
    findSessionBySocketId(socketId) {
        for (const session of this.sessions.values()) {
            if (session.socketId === socketId) {
                return session;
            }
        }
        return undefined;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    async shutdown() {
        this.logger.info('Shutting down RDP Session Manager...');
        for (const [, processor] of this.frameProcessors) {
            clearInterval(processor);
        }
        this.frameProcessors.clear();
        for (const session of this.sessions.values()) {
            await this.disconnectSession(session.socketId);
        }
        this.sessions.clear();
        this.rdpConnections.clear();
        this.logger.info('RDP Session Manager shutdown complete');
    }
}
exports.RDPSessionManager = RDPSessionManager;
//# sourceMappingURL=RDPSessionManager.js.map