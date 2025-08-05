import express from 'express';
import { AuditLogger } from '../services/AuditLogger';
import { AuthManager } from '../services/AuthManager';
import { Logger } from '../utils/Logger';

const router = express.Router();
const logger = new Logger('AuditRoutes');
const auditLogger = new AuditLogger();
const authManager = new AuthManager();

// Get audit events with filters
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

    const {
      sessionId,
      eventType,
      severity,
      source,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    const filters: any = {};
    if (sessionId) filters.sessionId = sessionId as string;
    if (eventType) filters.eventType = eventType as string;
    if (severity) filters.severity = severity as string;
    if (source) filters.source = source as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const events = auditLogger.getAuditEvents(filters);
    const paginatedEvents = events.slice(offset as number, (offset as number) + (limit as number));
    
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
      limit: limit as number,
      offset: offset as number
    });
  } catch (error) {
    logger.error('Get audit events error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get session audit
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

    // Check if user has access to this session audit
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
  } catch (error) {
    logger.error('Get session audit error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all session audits
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
  } catch (error) {
    logger.error('Get session audits error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get audit statistics
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
  } catch (error) {
    logger.error('Get audit stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get audit events by user
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
    
    // Check if user has access to this data
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
  } catch (error) {
    logger.error('Get user audit events error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get audit events by session
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
  } catch (error) {
    logger.error('Get session audit events error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get audit events by type
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
  } catch (error) {
    logger.error('Get event type audit events error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get audit events by severity
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
  } catch (error) {
    logger.error('Get severity audit events error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get audit events by source
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
  } catch (error) {
    logger.error('Get source audit events error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Clean up old audit events (admin only)
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
    const ageInMs = maxAge ? parseInt(maxAge) : 30 * 24 * 60 * 60 * 1000; // 30 days default
    
    auditLogger.cleanupOldEvents(ageInMs);
    
    logger.info('Audit cleanup completed');
    return res.json({
      success: true,
      message: 'Audit cleanup completed successfully'
    });
  } catch (error) {
    logger.error('Audit cleanup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router; 