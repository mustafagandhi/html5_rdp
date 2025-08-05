"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AuditLogger_1 = require("../services/AuditLogger");
const AuthManager_1 = require("../services/AuthManager");
const Logger_1 = require("../utils/Logger");
const router = express_1.default.Router();
const logger = new Logger_1.Logger('AuditRoutes');
const auditLogger = new AuditLogger_1.AuditLogger();
const authManager = new AuthManager_1.AuthManager();
router.get('/events', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { sessionId, eventType, severity, source, startDate, endDate, limit = 100, offset = 0 } = req.query;
        const filters = {};
        if (sessionId)
            filters.sessionId = sessionId;
        if (eventType)
            filters.eventType = eventType;
        if (severity)
            filters.severity = severity;
        if (source)
            filters.source = source;
        if (startDate)
            filters.startDate = new Date(startDate);
        if (endDate)
            filters.endDate = new Date(endDate);
        const events = auditLogger.getAuditEvents(filters);
        const paginatedEvents = events.slice(offset, offset + limit);
        res.json({
            success: true,
            events: paginatedEvents.map(event => ({
                id: event.id,
                timestamp: event.timestamp,
                sessionId: event.sessionId,
                userId: event.userId,
                clientId: event.clientId,
                eventType: event.eventType,
                eventData: event.eventData,
                ipAddress: event.ipAddress,
                userAgent: event.userAgent,
                severity: event.severity,
                source: event.source
            })),
            total: events.length,
            limit: limit,
            offset: offset
        });
    }
    catch (error) {
        logger.error('Get audit events error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const { sessionId } = req.params;
        const sessionAudit = auditLogger.getSessionAudit(sessionId);
        if (!sessionAudit) {
            return res.status(404).json({
                success: false,
                error: 'Session audit not found'
            });
        }
        if (user.role !== 'admin' && sessionAudit.userId !== user.id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        res.json({
            success: true,
            sessionAudit: {
                sessionId: sessionAudit.sessionId,
                userId: sessionAudit.userId,
                clientId: sessionAudit.clientId,
                startTime: sessionAudit.startTime,
                endTime: sessionAudit.endTime,
                duration: sessionAudit.duration,
                host: sessionAudit.host,
                port: sessionAudit.port,
                username: sessionAudit.username,
                ipAddress: sessionAudit.ipAddress,
                userAgent: sessionAudit.userAgent,
                bytesTransferred: sessionAudit.bytesTransferred,
                filesTransferred: sessionAudit.filesTransferred,
                devicesConnected: sessionAudit.devicesConnected,
                errorCount: sessionAudit.errors.length,
                events: sessionAudit.events.map(event => ({
                    id: event.id,
                    timestamp: event.timestamp,
                    eventType: event.eventType,
                    severity: event.severity,
                    source: event.source,
                    eventData: event.eventData
                }))
            }
        });
    }
    catch (error) {
        logger.error('Get session audit error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/sessions', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const sessions = auditLogger.getAllSessionAudits();
        res.json({
            success: true,
            sessions: sessions.map(session => ({
                sessionId: session.sessionId,
                userId: session.userId,
                clientId: session.clientId,
                startTime: session.startTime,
                endTime: session.endTime,
                duration: session.duration,
                host: session.host,
                port: session.port,
                username: session.username,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                bytesTransferred: session.bytesTransferred,
                filesTransferred: session.filesTransferred,
                devicesConnected: session.devicesConnected,
                errorCount: session.errors.length,
                eventCount: session.events.length
            }))
        });
    }
    catch (error) {
        logger.error('Get session audits error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const stats = auditLogger.getAuditStats();
        return res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        logger.error('Get audit stats error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/events/user/:userId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const { userId } = req.params;
        if (user.role !== 'admin' && user.id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        const events = auditLogger.getAuditEvents({ userId });
        res.json({
            success: true,
            events: events.map(event => ({
                id: event.id,
                timestamp: event.timestamp,
                sessionId: event.sessionId,
                eventType: event.eventType,
                eventData: event.eventData,
                severity: event.severity,
                source: event.source
            }))
        });
    }
    catch (error) {
        logger.error('Get user audit events error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/events/session/:sessionId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const { sessionId } = req.params;
        const events = auditLogger.getAuditEvents({ sessionId });
        res.json({
            success: true,
            events: events.map(event => ({
                id: event.id,
                timestamp: event.timestamp,
                userId: event.userId,
                clientId: event.clientId,
                eventType: event.eventType,
                eventData: event.eventData,
                severity: event.severity,
                source: event.source
            }))
        });
    }
    catch (error) {
        logger.error('Get session audit events error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/events/type/:eventType', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { eventType } = req.params;
        const events = auditLogger.getAuditEvents({ eventType });
        res.json({
            success: true,
            events: events.map(event => ({
                id: event.id,
                timestamp: event.timestamp,
                sessionId: event.sessionId,
                userId: event.userId,
                clientId: event.clientId,
                eventData: event.eventData,
                severity: event.severity,
                source: event.source
            }))
        });
    }
    catch (error) {
        logger.error('Get event type audit events error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/events/severity/:severity', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { severity } = req.params;
        const events = auditLogger.getAuditEvents({ severity });
        res.json({
            success: true,
            events: events.map(event => ({
                id: event.id,
                timestamp: event.timestamp,
                sessionId: event.sessionId,
                userId: event.userId,
                clientId: event.clientId,
                eventType: event.eventType,
                eventData: event.eventData,
                source: event.source
            }))
        });
    }
    catch (error) {
        logger.error('Get severity audit events error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/events/source/:source', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { source } = req.params;
        const events = auditLogger.getAuditEvents({ source });
        res.json({
            success: true,
            events: events.map(event => ({
                id: event.id,
                timestamp: event.timestamp,
                sessionId: event.sessionId,
                userId: event.userId,
                clientId: event.clientId,
                eventType: event.eventType,
                eventData: event.eventData,
                severity: event.severity
            }))
        });
    }
    catch (error) {
        logger.error('Get source audit events error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/cleanup', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { maxAge } = req.body;
        const ageInMs = maxAge ? parseInt(maxAge) : 30 * 24 * 60 * 60 * 1000;
        auditLogger.cleanupOldEvents(ageInMs);
        logger.info('Audit cleanup completed');
        return res.json({
            success: true,
            message: 'Audit cleanup completed successfully'
        });
    }
    catch (error) {
        logger.error('Audit cleanup error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=audit.js.map