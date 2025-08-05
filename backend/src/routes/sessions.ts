import express from 'express';
import { RDPSessionManager } from '../core/RDPSessionManager';
import { AuthManager } from '../services/AuthManager';
import { Logger } from '../utils/Logger';

const router = express.Router();
const logger = new Logger('SessionRoutes');
const rdpSessionManager = new RDPSessionManager();
const authManager = new AuthManager();

// Get all active sessions
router.get('/', async (req, res) => {
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

    const sessions = rdpSessionManager.getAllSessions();
    
    // Filter sessions based on user role
    const filteredSessions = user.role === 'admin' 
      ? sessions 
      : sessions.filter(session => session.socketId === user.id);

    res.json({
      success: true,
      sessions: filteredSessions.map(session => ({
        id: session.id,
        socketId: session.socketId,
        status: session.status,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        frameCount: session.frameCount,
        bytesReceived: session.bytesReceived,
        bytesSent: session.bytesSent,
        config: {
          host: session.config.host,
          port: session.config.port,
          username: session.config.username,
          quality: session.config.quality,
          width: session.config.width,
          height: session.config.height
        },
        error: session.error
      }))
    });
  } catch (error) {
    logger.error('Get sessions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get specific session
router.get('/:sessionId', async (req, res) => {
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
    const session = rdpSessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if user has access to this session
    if (user.role !== 'admin' && session.socketId !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    return res.json({
      success: true,
      session: {
        id: session.id,
        socketId: session.socketId,
        status: session.status,
        startTime: session.startTime,
        lastActivity: session.lastActivity,
        frameCount: session.frameCount,
        bytesReceived: session.bytesReceived,
        bytesSent: session.bytesSent,
        config: session.config,
        error: session.error
      }
    });
  } catch (error) {
    logger.error('Get session error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create new session
router.post('/', async (req, res) => {
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

    // Check if user has permission to create sessions
    if (!user.permissions.includes('rdp:connect')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied'
      });
    }

    const {
      host,
      port,
      username,
      password,
      domain,
      enableNLA,
      enableTLS,
      enableCredSSP,
      enableGFX,
      enableAudio,
      enableClipboard,
      enableFileTransfer,
      enableDeviceRedirection,
      enablePrinterRedirection,
      enableSmartCardRedirection,
      enableUSBRedirection,
      enableCameraRedirection,
      enableMicrophoneRedirection,
      enableSpeakerRedirection,
      enableMultiMonitor,
      monitorCount,
      colorDepth,
      width,
      height,
      quality,
      frameRate,
      compressionLevel,
      encryptionLevel,
      authenticationLevel,
      timeout,
      reconnectAttempts,
      reconnectDelay
    } = req.body;

    if (!host || !port || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Host, port, username, and password are required'
      });
    }

    const config = {
      host,
      port: parseInt(port),
      username,
      password,
      domain,
      enableNLA: enableNLA !== false,
      enableTLS: enableTLS !== false,
      enableCredSSP: enableCredSSP !== false,
      enableGFX: enableGFX !== false,
      enableAudio: enableAudio !== false,
      enableClipboard: enableClipboard !== false,
      enableFileTransfer: enableFileTransfer !== false,
      enableDeviceRedirection: enableDeviceRedirection !== false,
      enablePrinterRedirection: enablePrinterRedirection !== false,
      enableSmartCardRedirection: enableSmartCardRedirection !== false,
      enableUSBRedirection: enableUSBRedirection !== false,
      enableCameraRedirection: enableCameraRedirection !== false,
      enableMicrophoneRedirection: enableMicrophoneRedirection !== false,
      enableSpeakerRedirection: enableSpeakerRedirection !== false,
      enableMultiMonitor: enableMultiMonitor !== false,
      monitorCount: monitorCount || 1,
      colorDepth: colorDepth || 24,
      width: width || 1920,
      height: height || 1080,
      quality: quality || 'medium',
      frameRate: frameRate || 30,
      compressionLevel: compressionLevel || 6,
      encryptionLevel: encryptionLevel || 'medium',
      authenticationLevel: authenticationLevel || 'medium',
      timeout: timeout || 30000,
      reconnectAttempts: reconnectAttempts || 3,
      reconnectDelay: reconnectDelay || 5000
    };

    const session = await rdpSessionManager.createSession(user.id, config);
    
    logger.info(`RDP session created: ${session.id} to ${host}:${port}`);
    
    return res.status(201).json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        startTime: session.startTime,
        config: {
          host: session.config.host,
          port: session.config.port,
          username: session.config.username,
          quality: session.config.quality,
          width: session.config.width,
          height: session.config.height
        }
      }
    });
  } catch (error) {
    logger.error('Create session error:', error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error'
    });
  }
});

// Disconnect session
router.delete('/:sessionId', async (req, res) => {
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
    const session = rdpSessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if user has access to this session
    if (user.role !== 'admin' && session.socketId !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await rdpSessionManager.disconnectSession(session.socketId);
    
    logger.info(`RDP session disconnected: ${sessionId}`);
    
    return res.json({
      success: true,
      message: 'Session disconnected successfully'
    });
  } catch (error) {
    logger.error('Disconnect session error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get session statistics
router.get('/:sessionId/stats', async (req, res) => {
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
    const session = rdpSessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if user has access to this session
    if (user.role !== 'admin' && session.socketId !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const now = new Date();
    const duration = now.getTime() - session.startTime.getTime();
    const fps = session.frameCount > 0 ? Math.round(session.frameCount / (duration / 1000)) : 0;
    const bandwidth = session.bytesReceived + session.bytesSent;

    return res.json({
      success: true,
      stats: {
        sessionId: session.id,
        status: session.status,
        duration,
        frameCount: session.frameCount,
        fps,
        bytesReceived: session.bytesReceived,
        bytesSent: session.bytesSent,
        bandwidth,
        lastActivity: session.lastActivity,
        error: session.error
      }
    });
  } catch (error) {
    logger.error('Get session stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Change session quality
router.patch('/:sessionId/quality', async (req, res) => {
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
    const { quality } = req.body;
    
    if (!quality || !['low', 'medium', 'high', 'ultra'].includes(quality)) {
      return res.status(400).json({
        success: false,
        error: 'Valid quality level is required (low, medium, high, ultra)'
      });
    }

    const session = rdpSessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if user has access to this session
    if (user.role !== 'admin' && session.socketId !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    rdpSessionManager.changeQuality(session.socketId, quality);
    
    logger.info(`Session quality changed: ${sessionId} to ${quality}`);
    
    return res.json({
      success: true,
      message: 'Quality changed successfully',
      quality
    });
  } catch (error) {
    logger.error('Change session quality error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all sessions statistics (admin only)
router.get('/stats/overview', async (req, res) => {
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

    const sessions = rdpSessionManager.getAllSessions();
    const now = new Date();
    
    const stats = {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'connected').length,
      connectingSessions: sessions.filter(s => s.status === 'connecting').length,
      errorSessions: sessions.filter(s => s.status === 'error').length,
      totalFrameCount: sessions.reduce((sum, s) => sum + s.frameCount, 0),
      totalBytesReceived: sessions.reduce((sum, s) => sum + s.bytesReceived, 0),
      totalBytesSent: sessions.reduce((sum, s) => sum + s.bytesSent, 0),
      averageSessionDuration: sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (now.getTime() - s.startTime.getTime()), 0) / sessions.length
        : 0,
      sessionsByQuality: sessions.reduce((acc, s) => {
        acc[s.config.quality] = (acc[s.config.quality] || 0) + 1;
        return acc;
      }, {} as any)
    };

    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Get sessions overview error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router; 