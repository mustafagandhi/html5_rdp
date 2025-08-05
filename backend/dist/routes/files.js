"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const FileTransferManager_1 = require("../services/FileTransferManager");
const AuthManager_1 = require("../services/AuthManager");
const Logger_1 = require("../utils/Logger");
const router = express_1.default.Router();
const logger = new Logger_1.Logger('FileRoutes');
const fileTransferManager = new FileTransferManager_1.FileTransferManager();
const authManager = new AuthManager_1.AuthManager();
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
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const stats = fileTransferManager.getTransferStats();
        return res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        logger.error('Get file stats error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/transfers/:sessionId', async (req, res) => {
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
        const transfers = fileTransferManager.getAllTransfers(sessionId);
        res.json({
            success: true,
            transfers: transfers.map(transfer => ({
                id: transfer.id,
                type: transfer.type,
                fileName: transfer.fileName,
                fileSize: transfer.fileSize,
                mimeType: transfer.mimeType,
                status: transfer.status,
                progress: transfer.progress,
                startTime: transfer.startTime,
                endTime: transfer.endTime,
                error: transfer.error
            }))
        });
    }
    catch (error) {
        logger.error('Get transfers error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/transfers/:sessionId/:transferId', async (req, res) => {
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
        const { transferId } = req.params;
        const transfer = fileTransferManager.getTransfer(transferId);
        if (!transfer) {
            return res.status(404).json({
                success: false,
                error: 'Transfer not found'
            });
        }
        return res.json({
            success: true,
            transfer: {
                id: transfer.id,
                type: transfer.type,
                fileName: transfer.fileName,
                fileSize: transfer.fileSize,
                mimeType: transfer.mimeType,
                status: transfer.status,
                progress: transfer.progress,
                startTime: transfer.startTime,
                endTime: transfer.endTime,
                error: transfer.error
            }
        });
    }
    catch (error) {
        logger.error('Get transfer error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.delete('/transfers/:sessionId/:transferId', async (req, res) => {
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
        const { transferId } = req.params;
        const success = fileTransferManager.cancelTransfer(transferId);
        if (success) {
            logger.info(`Transfer cancelled: ${transferId}`);
            return res.json({
                success: true,
                message: 'Transfer cancelled successfully'
            });
        }
        else {
            return res.status(404).json({
                success: false,
                error: 'Transfer not found or cannot be cancelled'
            });
        }
    }
    catch (error) {
        logger.error('Cancel transfer error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/folders/:sessionId', async (req, res) => {
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
        const folders = fileTransferManager.getVirtualFolders(sessionId);
        res.json({
            success: true,
            folders: folders.map(folder => ({
                id: folder.id,
                name: folder.name,
                path: folder.path,
                permissions: folder.permissions,
                isActive: folder.isActive,
                createdAt: folder.createdAt
            }))
        });
    }
    catch (error) {
        logger.error('Get virtual folders error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/folders/:sessionId', async (req, res) => {
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
        const { name, path, permissions } = req.body;
        if (!name || !path) {
            return res.status(400).json({
                success: false,
                error: 'Name and path are required'
            });
        }
        const folder = fileTransferManager.createVirtualFolder(sessionId, {
            name,
            path,
            permissions: permissions || 'readwrite'
        });
        logger.info(`Virtual folder created: ${folder.name} for session ${sessionId}`);
        return res.status(201).json({
            success: true,
            folder: {
                id: folder.id,
                name: folder.name,
                path: folder.path,
                permissions: folder.permissions,
                isActive: folder.isActive,
                createdAt: folder.createdAt
            }
        });
    }
    catch (error) {
        logger.error('Create virtual folder error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.delete('/folders/:sessionId/:folderId', async (req, res) => {
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
        const { folderId } = req.params;
        const success = fileTransferManager.deleteVirtualFolder(folderId);
        if (success) {
            logger.info(`Virtual folder deleted: ${folderId}`);
            return res.json({
                success: true,
                message: 'Virtual folder deleted successfully'
            });
        }
        else {
            return res.status(404).json({
                success: false,
                error: 'Virtual folder not found'
            });
        }
    }
    catch (error) {
        logger.error('Delete virtual folder error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/list/:sessionId', async (req, res) => {
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
        const { path } = req.query;
        if (!path || typeof path !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Path parameter is required'
            });
        }
        const contents = await fileTransferManager.listDirectory(path);
        return res.json({
            success: true,
            path,
            contents
        });
    }
    catch (error) {
        logger.error('List directory error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/mkdir/:sessionId', async (req, res) => {
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
        const { path } = req.body;
        if (!path) {
            return res.status(400).json({
                success: false,
                error: 'Path is required'
            });
        }
        const success = await fileTransferManager.createDirectory(path);
        if (success) {
            logger.info(`Directory created: ${path}`);
            return res.json({
                success: true,
                message: 'Directory created successfully'
            });
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'Directory already exists or cannot be created'
            });
        }
    }
    catch (error) {
        logger.error('Create directory error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.delete('/file/:sessionId', async (req, res) => {
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
        const { path } = req.body;
        if (!path) {
            return res.status(400).json({
                success: false,
                error: 'Path is required'
            });
        }
        const success = await fileTransferManager.deleteFile(path);
        if (success) {
            logger.info(`File deleted: ${path}`);
            return res.json({
                success: true,
                message: 'File deleted successfully'
            });
        }
        else {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
    }
    catch (error) {
        logger.error('Delete file error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.put('/move/:sessionId', async (req, res) => {
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
        const { sourcePath, destinationPath } = req.body;
        if (!sourcePath || !destinationPath) {
            return res.status(400).json({
                success: false,
                error: 'Source and destination paths are required'
            });
        }
        const success = await fileTransferManager.moveFile(sourcePath, destinationPath);
        if (success) {
            logger.info(`File moved: ${sourcePath} to ${destinationPath}`);
            return res.json({
                success: true,
                message: 'File moved successfully'
            });
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'File could not be moved'
            });
        }
    }
    catch (error) {
        logger.error('Move file error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.put('/copy/:sessionId', async (req, res) => {
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
        const { sourcePath, destinationPath } = req.body;
        if (!sourcePath || !destinationPath) {
            return res.status(400).json({
                success: false,
                error: 'Source and destination paths are required'
            });
        }
        const success = await fileTransferManager.copyFile(sourcePath, destinationPath);
        if (success) {
            logger.info(`File copied: ${sourcePath} to ${destinationPath}`);
            return res.json({
                success: true,
                message: 'File copied successfully'
            });
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'File could not be copied'
            });
        }
    }
    catch (error) {
        logger.error('Copy file error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=files.js.map