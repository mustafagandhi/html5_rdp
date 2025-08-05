import { EventEmitter } from 'events';
export interface AuditEvent {
    id: string;
    timestamp: Date;
    sessionId?: string;
    userId?: string;
    clientId?: string;
    eventType: string;
    eventData: any;
    ipAddress?: string;
    userAgent?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: 'rdp' | 'auth' | 'file' | 'device' | 'system';
}
export interface SessionAudit {
    sessionId: string;
    userId: string;
    clientId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    host: string;
    port: number;
    username: string;
    ipAddress: string;
    userAgent: string;
    events: AuditEvent[];
    bytesTransferred: number;
    filesTransferred: number;
    devicesConnected: number;
    errors: string[];
}
export declare class AuditLogger extends EventEmitter {
    private logger;
    private auditEvents;
    private sessionAudits;
    private auditLogDir;
    private auditLogFile;
    private sessionLogFile;
    private errorLogFile;
    constructor();
    private ensureLogDirectory;
    logConnection(clientId: string, data: any): void;
    logRDPSession(clientId: string, data: any): void;
    logRDPDisconnect(clientId: string): void;
    logDisconnect(clientId: string): void;
    logAuthentication(clientId: string, data: any): void;
    logFileTransfer(sessionId: string, data: any): void;
    logDeviceConnection(sessionId: string, data: any): void;
    logDeviceDisconnection(sessionId: string, data: any): void;
    logError(sessionId: string, error: any): void;
    logSecurityEvent(sessionId: string, data: any): void;
    logClipboardAccess(sessionId: string, data: any): void;
    logQualityChange(sessionId: string, data: any): void;
    private logAuditEvent;
    private logSessionEvent;
    private logErrorEvent;
    endSession(sessionId: string): void;
    getAuditEvents(filters?: any): AuditEvent[];
    getSessionAudit(sessionId: string): SessionAudit | undefined;
    getAllSessionAudits(): SessionAudit[];
    getAuditStats(): any;
    cleanupOldEvents(maxAge?: number): void;
}
//# sourceMappingURL=AuditLogger.d.ts.map