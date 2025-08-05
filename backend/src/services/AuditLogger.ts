import { Logger } from '../utils/Logger';
import { EventEmitter } from 'events';
import { createWriteStream, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

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

export class AuditLogger extends EventEmitter {
  private logger = new Logger('AuditLogger');
  private auditEvents: Map<string, AuditEvent> = new Map();
  private sessionAudits: Map<string, SessionAudit> = new Map();
  private auditLogDir: string;
  private auditLogFile: string;
  private sessionLogFile: string;
  private errorLogFile: string;

  constructor() {
    super();
    this.auditLogDir = join(process.cwd(), 'logs', 'audit');
    this.auditLogFile = join(this.auditLogDir, 'audit.log');
    this.sessionLogFile = join(this.auditLogDir, 'sessions.log');
    this.errorLogFile = join(this.auditLogDir, 'errors.log');
    this.ensureLogDirectory();
    this.logger.info('Audit Logger initialized');
  }

  private ensureLogDirectory(): void {
    if (!existsSync(this.auditLogDir)) {
      mkdirSync(this.auditLogDir, { recursive: true });
    }
  }

  public logConnection(clientId: string, data: any): void {
    const event: AuditEvent = {
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

  public logRDPSession(clientId: string, data: any): void {
    const sessionId = data.sessionId || `session_${Date.now()}`;
    
    const sessionAudit: SessionAudit = {
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

    const event: AuditEvent = {
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

  public logRDPDisconnect(clientId: string): void {
    const event: AuditEvent = {
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

  public logDisconnect(clientId: string): void {
    const event: AuditEvent = {
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

  public logAuthentication(clientId: string, data: any): void {
    const event: AuditEvent = {
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

  public logFileTransfer(sessionId: string, data: any): void {
    const event: AuditEvent = {
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

  public logDeviceConnection(sessionId: string, data: any): void {
    const event: AuditEvent = {
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

  public logDeviceDisconnection(sessionId: string, data: any): void {
    const event: AuditEvent = {
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

  public logError(sessionId: string, error: any): void {
    const event: AuditEvent = {
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

  public logSecurityEvent(sessionId: string, data: any): void {
    const event: AuditEvent = {
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

  public logClipboardAccess(sessionId: string, data: any): void {
    const event: AuditEvent = {
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

  public logQualityChange(sessionId: string, data: any): void {
    const event: AuditEvent = {
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

  private logAuditEvent(event: AuditEvent): void {
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
    appendFileSync(this.auditLogFile, logLine);
    
    this.emit('auditEvent', event);
    this.logger.info(`Audit event logged: ${event.eventType} (${event.severity})`);
  }

  private logSessionEvent(sessionId: string, event: AuditEvent): void {
    const session = this.sessionAudits.get(sessionId);
    if (session) {
      session.events.push(event);
      
      // Update session statistics
      if (event.eventType === 'file_transfer') {
        session.filesTransferred++;
        session.bytesTransferred += event.eventData.fileSize || 0;
      } else if (event.eventType === 'device_connected') {
        session.devicesConnected++;
      } else if (event.eventType === 'error') {
        session.errors.push(event.eventData.message);
      }
    }
  }

  private logErrorEvent(error: any): void {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      type: error.name
    };

    const logLine = JSON.stringify(errorEntry) + '\n';
    appendFileSync(this.errorLogFile, logLine);
  }

  public endSession(sessionId: string): void {
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
      appendFileSync(this.sessionLogFile, logLine);
      
      this.logger.info(`Session ended: ${sessionId} (duration: ${session.duration}ms)`);
    }
  }

  public getAuditEvents(filters?: any): AuditEvent[] {
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

  public getSessionAudit(sessionId: string): SessionAudit | undefined {
    return this.sessionAudits.get(sessionId);
  }

  public getAllSessionAudits(): SessionAudit[] {
    return Array.from(this.sessionAudits.values());
  }

  public getAuditStats(): any {
    const events = Array.from(this.auditEvents.values());
    const sessions = Array.from(this.sessionAudits.values());
    
    const eventCounts = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as any);
    
    const severityCounts = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as any);
    
    const sourceCounts = events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {} as any);
    
    const activeSessions = sessions.filter(s => !s.endTime).length;
    const totalSessions = sessions.length;
    const totalDuration = sessions
      .filter(s => s.duration)
      .reduce((sum, s) => sum + s.duration!, 0);
    
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

  public cleanupOldEvents(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
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