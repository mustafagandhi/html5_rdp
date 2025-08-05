"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
const Logger_1 = require("../utils/Logger");
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
class AuditLogger extends events_1.EventEmitter {
    constructor() {
        super();
        this.logger = new Logger_1.Logger('AuditLogger');
        this.auditEvents = new Map();
        this.sessionAudits = new Map();
        this.auditLogDir = (0, path_1.join)(process.cwd(), 'logs', 'audit');
        this.auditLogFile = (0, path_1.join)(this.auditLogDir, 'audit.log');
        this.sessionLogFile = (0, path_1.join)(this.auditLogDir, 'sessions.log');
        this.errorLogFile = (0, path_1.join)(this.auditLogDir, 'errors.log');
        this.ensureLogDirectory();
        this.logger.info('Audit Logger initialized');
    }
    ensureLogDirectory() {
        if (!(0, fs_1.existsSync)(this.auditLogDir)) {
            (0, fs_1.mkdirSync)(this.auditLogDir, { recursive: true });
        }
    }
    logConnection(clientId, data) {
        const event = {
            id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            clientId,
            eventType: 'connection',
            eventData: {
                userAgent: data.userAgent,
                ipAddress: data.ipAddress,
                protocol: data.protocol
            },
            severity: 'low',
            source: 'auth'
        };
        this.logAuditEvent(event);
    }
    logRDPSession(clientId, data) {
        const sessionId = data.sessionId || `session_${Date.now()}`;
        const sessionAudit = {
            sessionId,
            userId: data.userId || 'unknown',
            clientId,
            startTime: new Date(),
            host: data.host,
            port: data.port,
            username: data.username,
            ipAddress: data.ipAddress || 'unknown',
            userAgent: data.userAgent || 'unknown',
            events: [],
            bytesTransferred: 0,
            filesTransferred: 0,
            devicesConnected: 0,
            errors: []
        };
        this.sessionAudits.set(sessionId, sessionAudit);
        const event = {
            id: `rdp_start_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            sessionId,
            clientId,
            eventType: 'rdp_session_started',
            eventData: {
                host: data.host,
                port: data.port,
                username: data.username,
                quality: data.quality,
                features: data.features
            },
            severity: 'medium',
            source: 'rdp'
        };
        this.logAuditEvent(event);
        this.logSessionEvent(sessionId, event);
    }
    logRDPDisconnect(clientId) {
        const event = {
            id: `rdp_end_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            clientId,
            eventType: 'rdp_session_ended',
            eventData: {
                reason: 'client_disconnect'
            },
            severity: 'low',
            source: 'rdp'
        };
        this.logAuditEvent(event);
    }
    logDisconnect(clientId) {
        const event = {
            id: `disconn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            clientId,
            eventType: 'disconnection',
            eventData: {
                reason: 'client_disconnect'
            },
            severity: 'low',
            source: 'auth'
        };
        this.logAuditEvent(event);
    }
    logAuthentication(clientId, data) {
        const event = {
            id: `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            clientId,
            eventType: 'authentication',
            eventData: {
                method: data.method,
                username: data.username,
                success: data.success,
                ipAddress: data.ipAddress
            },
            severity: data.success ? 'low' : 'high',
            source: 'auth'
        };
        this.logAuditEvent(event);
    }
    logFileTransfer(sessionId, data) {
        const event = {
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            sessionId,
            eventType: 'file_transfer',
            eventData: {
                type: data.type,
                fileName: data.fileName,
                fileSize: data.fileSize,
                success: data.success
            },
            severity: 'medium',
            source: 'file'
        };
        this.logAuditEvent(event);
        this.logSessionEvent(sessionId, event);
    }
    logDeviceConnection(sessionId, data) {
        const event = {
            id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            sessionId,
            eventType: 'device_connected',
            eventData: {
                deviceType: data.deviceType,
                deviceName: data.deviceName,
                deviceId: data.deviceId
            },
            severity: 'medium',
            source: 'device'
        };
        this.logAuditEvent(event);
        this.logSessionEvent(sessionId, event);
    }
    logDeviceDisconnection(sessionId, data) {
        const event = {
            id: `device_disconn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            sessionId,
            eventType: 'device_disconnected',
            eventData: {
                deviceType: data.deviceType,
                deviceName: data.deviceName,
                deviceId: data.deviceId
            },
            severity: 'low',
            source: 'device'
        };
        this.logAuditEvent(event);
        this.logSessionEvent(sessionId, event);
    }
    logError(sessionId, error) {
        const event = {
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            sessionId,
            eventType: 'error',
            eventData: {
                message: error.message,
                stack: error.stack,
                type: error.name
            },
            severity: 'high',
            source: 'system'
        };
        this.logAuditEvent(event);
        this.logErrorEvent(error);
    }
    logSecurityEvent(sessionId, data) {
        const event = {
            id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            sessionId,
            eventType: 'security_event',
            eventData: data,
            severity: data.severity || 'medium',
            source: 'system'
        };
        this.logAuditEvent(event);
        this.logSessionEvent(sessionId, event);
    }
    logClipboardAccess(sessionId, data) {
        const event = {
            id: `clipboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            sessionId,
            eventType: 'clipboard_access',
            eventData: {
                action: data.action,
                dataSize: data.dataSize,
                dataType: data.dataType
            },
            severity: 'medium',
            source: 'rdp'
        };
        this.logAuditEvent(event);
        this.logSessionEvent(sessionId, event);
    }
    logQualityChange(sessionId, data) {
        const event = {
            id: `quality_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            sessionId,
            eventType: 'quality_changed',
            eventData: {
                oldQuality: data.oldQuality,
                newQuality: data.newQuality
            },
            severity: 'low',
            source: 'rdp'
        };
        this.logAuditEvent(event);
        this.logSessionEvent(sessionId, event);
    }
    logAuditEvent(event) {
        this.auditEvents.set(event.id, event);
        const logEntry = {
            timestamp: event.timestamp.toISOString(),
            id: event.id,
            sessionId: event.sessionId,
            clientId: event.clientId,
            eventType: event.eventType,
            severity: event.severity,
            source: event.source,
            data: event.eventData
        };
        const logLine = JSON.stringify(logEntry) + '\n';
        (0, fs_1.appendFileSync)(this.auditLogFile, logLine);
        this.emit('auditEvent', event);
        this.logger.info(`Audit event logged: ${event.eventType} (${event.severity})`);
    }
    logSessionEvent(sessionId, event) {
        const session = this.sessionAudits.get(sessionId);
        if (session) {
            session.events.push(event);
            if (event.eventType === 'file_transfer') {
                session.filesTransferred++;
                session.bytesTransferred += event.eventData.fileSize || 0;
            }
            else if (event.eventType === 'device_connected') {
                session.devicesConnected++;
            }
            else if (event.eventType === 'error') {
                session.errors.push(event.eventData.message);
            }
        }
    }
    logErrorEvent(error) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack,
            type: error.name
        };
        const logLine = JSON.stringify(errorEntry) + '\n';
        (0, fs_1.appendFileSync)(this.errorLogFile, logLine);
    }
    endSession(sessionId) {
        const session = this.sessionAudits.get(sessionId);
        if (session) {
            session.endTime = new Date();
            session.duration = session.endTime.getTime() - session.startTime.getTime();
            const sessionEntry = {
                sessionId: session.sessionId,
                userId: session.userId,
                clientId: session.clientId,
                startTime: session.startTime.toISOString(),
                endTime: session.endTime.toISOString(),
                duration: session.duration,
                host: session.host,
                port: session.port,
                username: session.username,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                bytesTransferred: session.bytesTransferred,
                filesTransferred: session.filesTransferred,
                devicesConnected: session.devicesConnected,
                errorCount: session.errors.length
            };
            const logLine = JSON.stringify(sessionEntry) + '\n';
            (0, fs_1.appendFileSync)(this.sessionLogFile, logLine);
            this.logger.info(`Session ended: ${sessionId} (duration: ${session.duration}ms)`);
        }
    }
    getAuditEvents(filters) {
        let events = Array.from(this.auditEvents.values());
        if (filters) {
            if (filters.sessionId) {
                events = events.filter(e => e.sessionId === filters.sessionId);
            }
            if (filters.eventType) {
                events = events.filter(e => e.eventType === filters.eventType);
            }
            if (filters.severity) {
                events = events.filter(e => e.severity === filters.severity);
            }
            if (filters.source) {
                events = events.filter(e => e.source === filters.source);
            }
            if (filters.startDate) {
                events = events.filter(e => e.timestamp >= filters.startDate);
            }
            if (filters.endDate) {
                events = events.filter(e => e.timestamp <= filters.endDate);
            }
        }
        return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    getSessionAudit(sessionId) {
        return this.sessionAudits.get(sessionId);
    }
    getAllSessionAudits() {
        return Array.from(this.sessionAudits.values());
    }
    getAuditStats() {
        const events = Array.from(this.auditEvents.values());
        const sessions = Array.from(this.sessionAudits.values());
        const eventCounts = events.reduce((acc, event) => {
            acc[event.eventType] = (acc[event.eventType] || 0) + 1;
            return acc;
        }, {});
        const severityCounts = events.reduce((acc, event) => {
            acc[event.severity] = (acc[event.severity] || 0) + 1;
            return acc;
        }, {});
        const sourceCounts = events.reduce((acc, event) => {
            acc[event.source] = (acc[event.source] || 0) + 1;
            return acc;
        }, {});
        const activeSessions = sessions.filter(s => !s.endTime).length;
        const totalSessions = sessions.length;
        const totalDuration = sessions
            .filter(s => s.duration)
            .reduce((sum, s) => sum + s.duration, 0);
        const totalBytesTransferred = sessions.reduce((sum, s) => sum + s.bytesTransferred, 0);
        const totalFilesTransferred = sessions.reduce((sum, s) => sum + s.filesTransferred, 0);
        const totalDevicesConnected = sessions.reduce((sum, s) => sum + s.devicesConnected, 0);
        return {
            totalEvents: events.length,
            eventCounts,
            severityCounts,
            sourceCounts,
            activeSessions,
            totalSessions,
            averageSessionDuration: totalSessions > 0 ? totalDuration / totalSessions : 0,
            totalBytesTransferred,
            totalFilesTransferred,
            totalDevicesConnected
        };
    }
    cleanupOldEvents(maxAge = 30 * 24 * 60 * 60 * 1000) {
        const cutoff = new Date(Date.now() - maxAge);
        for (const [eventId, event] of this.auditEvents.entries()) {
            if (event.timestamp < cutoff) {
                this.auditEvents.delete(eventId);
            }
        }
        for (const [sessionId, session] of this.sessionAudits.entries()) {
            if (session.endTime && session.endTime < cutoff) {
                this.sessionAudits.delete(sessionId);
            }
        }
        this.logger.info('Cleaned up old audit events');
    }
}
exports.AuditLogger = AuditLogger;
//# sourceMappingURL=AuditLogger.js.map