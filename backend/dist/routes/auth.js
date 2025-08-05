"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AuthManager_1 = require("../services/AuthManager");
const Logger_1 = require("../utils/Logger");
const router = express_1.default.Router();
const logger = new Logger_1.Logger('AuthRoutes');
const authManager = new AuthManager_1.AuthManager();
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }
        const result = await authManager.authenticateWithCredentials(username, password);
        if (result.success) {
            logger.info(`User logged in: ${username}`);
            return res.json({
                success: true,
                token: result.token,
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    role: result.user.role,
                    permissions: result.user.permissions
                }
            });
        }
        else {
            logger.warn(`Failed login attempt for user: ${username}`);
            return res.status(401).json({
                success: false,
                error: result.error
            });
        }
    }
    catch (error) {
        logger.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/validate', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (user) {
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions
                }
            });
        }
        else {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
    }
    catch (error) {
        logger.error('Token validation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (user) {
            const newToken = authManager.generateToken(user);
            return res.json({
                success: true,
                token: newToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions
                }
            });
        }
        else {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
    }
    catch (error) {
        logger.error('Token refresh error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/logout', async (req, res) => {
    try {
        const { token } = req.body;
        if (token) {
            logger.info('User logged out');
        }
        return res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        logger.error('Logout error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (user) {
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions,
                    lastLogin: user.lastLogin
                }
            });
        }
        else {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
    }
    catch (error) {
        logger.error('Get current user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/users', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const currentUser = authManager.getUserFromToken(token);
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { username, email, role, permissions } = req.body;
        if (!username || !email) {
            return res.status(400).json({
                success: false,
                error: 'Username and email are required'
            });
        }
        const user = authManager.createUser({
            username,
            email,
            role: role || 'user',
            permissions: permissions || ['rdp:connect', 'rdp:disconnect']
        });
        logger.info(`User created by admin: ${username}`);
        return res.status(201).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        });
    }
    catch (error) {
        logger.error('Create user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/users', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const currentUser = authManager.getUserFromToken(token);
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const users = authManager.getAllUsers().map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            lastLogin: user.lastLogin,
            isActive: user.isActive
        }));
        return res.json({
            success: true,
            users
        });
    }
    catch (error) {
        logger.error('Get users error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.put('/users/:userId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const currentUser = authManager.getUserFromToken(token);
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { userId } = req.params;
        const updates = req.body;
        const user = authManager.updateUser(userId, updates);
        if (user) {
            logger.info(`User updated by admin: ${user.username}`);
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    permissions: user.permissions,
                    lastLogin: user.lastLogin,
                    isActive: user.isActive
                }
            });
        }
        else {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
    }
    catch (error) {
        logger.error('Update user error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.delete('/users/:userId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const currentUser = authManager.getUserFromToken(token);
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { userId } = req.params;
        const success = authManager.deleteUser(userId);
        if (success) {
            logger.info(`User deleted by admin: ${userId}`);
            return res.json({
                success: true,
                message: 'User deleted successfully'
            });
        }
        else {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
    }
    catch (error) {
        logger.error('Delete user error:', error);
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
        const currentUser = authManager.getUserFromToken(token);
        if (!currentUser || currentUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const stats = {
            totalUsers: authManager.getAllUsers().length,
            activeSessions: authManager.getActiveSessionsCount(),
            totalUsersByRole: authManager.getAllUsers().reduce((acc, user) => {
                acc[user.role] = (acc[user.role] || 0) + 1;
                return acc;
            }, {})
        };
        return res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        logger.error('Get stats error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map