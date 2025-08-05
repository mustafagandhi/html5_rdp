"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthManager = void 0;
const Logger_1 = require("../utils/Logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Config_1 = require("../utils/Config");
class AuthManager {
    constructor() {
        this.logger = new Logger_1.Logger('AuthManager');
        this.config = Config_1.Config.getInstance();
        this.users = new Map();
        this.sessions = new Map();
        this.initializeDefaultUsers();
    }
    initializeDefaultUsers() {
        const adminUser = {
            id: 'admin',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
            permissions: ['rdp:connect', 'rdp:disconnect', 'file:upload', 'file:download', 'device:redirect', 'clipboard:sync'],
            lastLogin: new Date(),
            isActive: true
        };
        const defaultUser = {
            id: 'user',
            username: 'user',
            email: 'user@example.com',
            role: 'user',
            permissions: ['rdp:connect', 'rdp:disconnect', 'file:upload', 'file:download'],
            lastLogin: new Date(),
            isActive: true
        };
        this.users.set('admin', adminUser);
        this.users.set('user', defaultUser);
        this.logger.info('Default users initialized');
    }
    async authenticateSocket(socket, data) {
        try {
            const { username, password, token } = data;
            if (token) {
                return this.authenticateWithToken(token);
            }
            if (username && password) {
                return this.authenticateWithCredentials(username, password);
            }
            if (this.config.get('auth').allowAnonymous) {
                return this.authenticateAnonymous(socket);
            }
            return {
                success: false,
                error: 'Authentication method not supported'
            };
        }
        catch (error) {
            this.logger.error('Authentication error:', error);
            return {
                success: false,
                error: 'Authentication failed'
            };
        }
    }
    async authenticateWithToken(token) {
        try {
            const secret = this.config.get('auth').jwtSecret;
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            const user = this.users.get(decoded.userId);
            if (!user || !user.isActive) {
                return {
                    success: false,
                    error: 'Invalid or expired token'
                };
            }
            user.lastLogin = new Date();
            return {
                success: true,
                token,
                user
            };
        }
        catch (error) {
            this.logger.error('Token authentication error:', error);
            return {
                success: false,
                error: 'Invalid token'
            };
        }
    }
    async authenticateWithCredentials(username, password) {
        try {
            const user = this.findUserByUsername(username);
            if (!user || !user.isActive) {
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            }
            const isValidPassword = await this.validatePassword(password, user);
            if (!isValidPassword) {
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            }
            user.lastLogin = new Date();
            const token = this.generateToken(user);
            return {
                success: true,
                token,
                user
            };
        }
        catch (error) {
            this.logger.error('Credential authentication error:', error);
            return {
                success: false,
                error: 'Authentication failed'
            };
        }
    }
    authenticateAnonymous(socket) {
        const anonymousUser = {
            id: `anon_${socket.id}`,
            username: 'anonymous',
            email: 'anonymous@example.com',
            role: 'guest',
            permissions: ['rdp:connect', 'rdp:disconnect'],
            lastLogin: new Date(),
            isActive: true
        };
        const token = this.generateToken(anonymousUser);
        return {
            success: true,
            token,
            user: anonymousUser
        };
    }
    async validatePassword(password, user) {
        if (user.username === 'admin' && password === 'admin123') {
            return true;
        }
        if (user.username === 'user' && password === 'user123') {
            return true;
        }
        return false;
    }
    generateToken(user) {
        const secret = this.config.get('auth').jwtSecret;
        const payload = {
            userId: user.id,
            username: user.username,
            role: user.role,
            permissions: user.permissions,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        };
        return jsonwebtoken_1.default.sign(payload, secret);
    }
    findUserByUsername(username) {
        for (const user of this.users.values()) {
            if (user.username === username) {
                return user;
            }
        }
        return undefined;
    }
    verifyPermission(token, permission) {
        try {
            const secret = this.config.get('auth').jwtSecret;
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            const user = this.users.get(decoded.userId);
            if (!user || !user.isActive) {
                return false;
            }
            return user.permissions.includes(permission);
        }
        catch (error) {
            return false;
        }
    }
    getUserFromToken(token) {
        try {
            const secret = this.config.get('auth').jwtSecret;
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            const user = this.users.get(decoded.userId);
            if (!user || !user.isActive) {
                return null;
            }
            return user;
        }
        catch (error) {
            return null;
        }
    }
    createUser(userData) {
        const user = {
            id: userData.id || `user_${Date.now()}`,
            username: userData.username || '',
            email: userData.email || '',
            role: userData.role || 'user',
            permissions: userData.permissions || ['rdp:connect', 'rdp:disconnect'],
            lastLogin: new Date(),
            isActive: true
        };
        this.users.set(user.id, user);
        this.logger.info(`Created user: ${user.username}`);
        return user;
    }
    updateUser(userId, updates) {
        const user = this.users.get(userId);
        if (!user) {
            return null;
        }
        Object.assign(user, updates);
        this.users.set(userId, user);
        this.logger.info(`Updated user: ${user.username}`);
        return user;
    }
    deleteUser(userId) {
        const user = this.users.get(userId);
        if (!user) {
            return false;
        }
        this.users.delete(userId);
        this.logger.info(`Deleted user: ${user.username}`);
        return true;
    }
    getAllUsers() {
        return Array.from(this.users.values());
    }
    getUser(userId) {
        return this.users.get(userId);
    }
    createSession(userId, sessionData) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.sessions.set(sessionId, {
            userId,
            createdAt: new Date(),
            lastActivity: new Date(),
            data: sessionData
        });
        this.logger.info(`Created session: ${sessionId} for user: ${userId}`);
        return sessionId;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    updateSessionActivity(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = new Date();
        }
    }
    deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }
        this.sessions.delete(sessionId);
        this.logger.info(`Deleted session: ${sessionId}`);
        return true;
    }
    cleanupExpiredSessions() {
        const maxAge = this.config.get('auth').sessionMaxAge || 24 * 60 * 60 * 1000;
        const now = new Date();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now.getTime() - session.lastActivity.getTime() > maxAge) {
                this.sessions.delete(sessionId);
                this.logger.info(`Cleaned up expired session: ${sessionId}`);
            }
        }
    }
    getActiveSessionsCount() {
        return this.sessions.size;
    }
}
exports.AuthManager = AuthManager;
//# sourceMappingURL=AuthManager.js.map