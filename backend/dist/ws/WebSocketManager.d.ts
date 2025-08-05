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
export declare class WebSocketManager extends EventEmitter {
    private logger;
    private io;
    private clients;
    constructor(io: SocketIOServer);
    handleConnection(socket: Socket): void;
    handleDisconnection(socketId: string): void;
    private setupClientHandlers;
    private handleAuthentication;
    private handleRDPConnect;
    private handleRDPDisconnect;
    private handleMouseInput;
    private handleKeyboardInput;
    private handleTouchInput;
    private handleClipboardSet;
    private handleClipboardGet;
    private handleFileUpload;
    private handleFileDownload;
    private handleDeviceConnect;
    private handleDeviceDisconnect;
    private handleQualityChange;
    private handleFullscreenChange;
    private handleMonitorChange;
    sendFrame(clientId: string, frame: Buffer): void;
    sendClipboardData(clientId: string, data: any): void;
    sendFileData(clientId: string, data: any): void;
    sendDeviceData(clientId: string, data: any): void;
    sendError(clientId: string, error: string): void;
    setClientAuthenticated(clientId: string, sessionId?: string): void;
    getClient(clientId: string): WebSocketClient | undefined;
    getAllClients(): WebSocketClient[];
    getConnectedClientsCount(): number;
    broadcastToAll(event: string, data: any): void;
    broadcastToAuthenticated(event: string, data: any): void;
}
//# sourceMappingURL=WebSocketManager.d.ts.map