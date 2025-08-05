"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTransferManager = void 0;
const Logger_1 = require("../utils/Logger");
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
const uuid_1 = require("uuid");
const sharp_1 = __importDefault(require("sharp"));
class FileTransferManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.logger = new Logger_1.Logger('FileTransferManager');
        this.transfers = new Map();
        this.virtualFolders = new Map();
        this.uploadDir = (0, path_1.join)(process.cwd(), 'uploads');
        this.downloadDir = (0, path_1.join)(process.cwd(), 'downloads');
        this.ensureDirectories();
        this.logger.info('File Transfer Manager initialized');
    }
    ensureDirectories() {
        if (!(0, fs_1.existsSync)(this.uploadDir)) {
            (0, fs_1.mkdirSync)(this.uploadDir, { recursive: true });
        }
        if (!(0, fs_1.existsSync)(this.downloadDir)) {
            (0, fs_1.mkdirSync)(this.downloadDir, { recursive: true });
        }
    }
    async handleUpload(sessionId, data) {
        const transferId = (0, uuid_1.v4)();
        const transfer = {
            id: transferId,
            sessionId,
            type: 'upload',
            fileName: data.fileName,
            filePath: (0, path_1.join)(this.uploadDir, `${transferId}_${data.fileName}`),
            fileSize: data.fileSize,
            mimeType: data.mimeType,
            status: 'pending',
            progress: 0,
            startTime: new Date()
        };
        this.transfers.set(transferId, transfer);
        this.logger.info(`File upload started: ${transfer.fileName} (${transfer.fileSize} bytes)`);
        try {
            if (data.fileData) {
                await this.processFileUpload(transfer, data.fileData);
            }
            this.emit('fileUploaded', { transfer, sessionId });
            return {
                success: true,
                transferId,
                fileName: transfer.fileName,
                fileSize: transfer.fileSize
            };
        }
        catch (error) {
            transfer.status = 'failed';
            transfer.error = error.message;
            transfer.endTime = new Date();
            this.logger.error(`File upload failed: ${transfer.fileName}`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async processFileUpload(transfer, fileData) {
        return new Promise((resolve, reject) => {
            try {
                const buffer = Buffer.from(fileData, 'base64');
                const writeStream = (0, fs_1.createWriteStream)(transfer.filePath);
                writeStream.on('error', (error) => {
                    reject(error);
                });
                writeStream.on('finish', () => {
                    transfer.status = 'completed';
                    transfer.progress = 100;
                    transfer.endTime = new Date();
                    this.logger.info(`File upload completed: ${transfer.fileName}`);
                    resolve();
                });
                this.processFileByType(buffer, transfer.mimeType)
                    .then((processedBuffer) => {
                    writeStream.write(processedBuffer);
                    writeStream.end();
                })
                    .catch(reject);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async processFileByType(buffer, mimeType) {
        if (mimeType.startsWith('image/')) {
            return this.processImage(buffer, mimeType);
        }
        if (mimeType.startsWith('video/')) {
            return this.processVideo(buffer, mimeType);
        }
        if (mimeType.startsWith('audio/')) {
            return this.processAudio(buffer, mimeType);
        }
        return buffer;
    }
    async processImage(buffer, mimeType) {
        try {
            const image = (0, sharp_1.default)(buffer);
            const metadata = await image.metadata();
            if (metadata.width && metadata.width > 1920) {
                image.resize(1920, null, { withoutEnlargement: true });
            }
            if (mimeType === 'image/jpeg') {
                return await image.jpeg({ quality: 85 }).toBuffer();
            }
            else if (mimeType === 'image/png') {
                return await image.png({ compressionLevel: 6 }).toBuffer();
            }
            else if (mimeType === 'image/webp') {
                return await image.webp({ quality: 85 }).toBuffer();
            }
            return await image.toBuffer();
        }
        catch (error) {
            this.logger.warn('Image processing failed, returning original:', error);
            return buffer;
        }
    }
    async processVideo(buffer, mimeType) {
        return buffer;
    }
    async processAudio(buffer, mimeType) {
        return buffer;
    }
    async handleDownload(sessionId, data) {
        const transferId = (0, uuid_1.v4)();
        const transfer = {
            id: transferId,
            sessionId,
            type: 'download',
            fileName: data.fileName,
            filePath: data.filePath,
            fileSize: 0,
            mimeType: data.mimeType || 'application/octet-stream',
            status: 'pending',
            progress: 0,
            startTime: new Date()
        };
        this.transfers.set(transferId, transfer);
        this.logger.info(`File download started: ${transfer.fileName}`);
        try {
            const fileData = await this.readFileForDownload(transfer);
            transfer.status = 'completed';
            transfer.progress = 100;
            transfer.endTime = new Date();
            this.logger.info(`File download completed: ${transfer.fileName}`);
            this.emit('fileDownloaded', { transfer, sessionId });
            return {
                success: true,
                transferId,
                fileName: transfer.fileName,
                fileSize: fileData.length,
                fileData: fileData.toString('base64'),
                mimeType: transfer.mimeType
            };
        }
        catch (error) {
            transfer.status = 'failed';
            transfer.error = error.message;
            transfer.endTime = new Date();
            this.logger.error(`File download failed: ${transfer.fileName}`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async readFileForDownload(transfer) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const readStream = (0, fs_1.createReadStream)(transfer.filePath);
            readStream.on('data', (chunk) => {
                chunks.push(Buffer.from(chunk));
                transfer.progress = Math.min(95, (chunks.length * 1024) / transfer.fileSize * 100);
            });
            readStream.on('error', (error) => {
                reject(error);
            });
            readStream.on('end', () => {
                const buffer = Buffer.concat(chunks);
                transfer.fileSize = buffer.length;
                resolve(buffer);
            });
        });
    }
    createVirtualFolder(sessionId, data) {
        const folderId = (0, uuid_1.v4)();
        const virtualFolder = {
            id: folderId,
            sessionId,
            name: data.name,
            path: data.path,
            permissions: data.permissions || 'readwrite',
            isActive: true,
            createdAt: new Date()
        };
        this.virtualFolders.set(folderId, virtualFolder);
        this.logger.info(`Virtual folder created: ${virtualFolder.name} at ${virtualFolder.path}`);
        this.emit('virtualFolderCreated', { virtualFolder, sessionId });
        return virtualFolder;
    }
    deleteVirtualFolder(folderId) {
        const folder = this.virtualFolders.get(folderId);
        if (!folder) {
            return false;
        }
        this.virtualFolders.delete(folderId);
        this.logger.info(`Virtual folder deleted: ${folder.name}`);
        this.emit('virtualFolderDeleted', { folderId });
        return true;
    }
    getVirtualFolders(sessionId) {
        return Array.from(this.virtualFolders.values())
            .filter(folder => folder.sessionId === sessionId && folder.isActive);
    }
    async listDirectory(path) {
        return [
            { name: 'example.txt', type: 'file', size: 1024, modified: new Date() },
            { name: 'folder', type: 'directory', size: 0, modified: new Date() }
        ];
    }
    async createDirectory(path) {
        try {
            if (!(0, fs_1.existsSync)(path)) {
                (0, fs_1.mkdirSync)(path, { recursive: true });
                return true;
            }
            return false;
        }
        catch (error) {
            this.logger.error('Failed to create directory:', error);
            return false;
        }
    }
    async deleteFile(path) {
        try {
            if ((0, fs_1.existsSync)(path)) {
                const fs = require('fs').promises;
                await fs.unlink(path);
                return true;
            }
            return false;
        }
        catch (error) {
            this.logger.error('Failed to delete file:', error);
            return false;
        }
    }
    async moveFile(sourcePath, destinationPath) {
        try {
            const fs = require('fs').promises;
            await fs.rename(sourcePath, destinationPath);
            return true;
        }
        catch (error) {
            this.logger.error('Failed to move file:', error);
            return false;
        }
    }
    async copyFile(sourcePath, destinationPath) {
        try {
            const fs = require('fs').promises;
            await fs.copyFile(sourcePath, destinationPath);
            return true;
        }
        catch (error) {
            this.logger.error('Failed to copy file:', error);
            return false;
        }
    }
    getTransfer(transferId) {
        return this.transfers.get(transferId);
    }
    getAllTransfers(sessionId) {
        const transfers = Array.from(this.transfers.values());
        if (sessionId) {
            return transfers.filter(transfer => transfer.sessionId === sessionId);
        }
        return transfers;
    }
    cancelTransfer(transferId) {
        const transfer = this.transfers.get(transferId);
        if (!transfer || transfer.status !== 'in-progress') {
            return false;
        }
        transfer.status = 'cancelled';
        transfer.endTime = new Date();
        this.logger.info(`Transfer cancelled: ${transfer.fileName}`);
        this.emit('transferCancelled', { transfer });
        return true;
    }
    cleanupCompletedTransfers() {
        const now = new Date();
        const maxAge = 24 * 60 * 60 * 1000;
        for (const [transferId, transfer] of this.transfers.entries()) {
            if (transfer.status === 'completed' && transfer.endTime) {
                if (now.getTime() - transfer.endTime.getTime() > maxAge) {
                    this.transfers.delete(transferId);
                    this.logger.info(`Cleaned up completed transfer: ${transfer.fileName}`);
                }
            }
        }
    }
    getTransferStats() {
        const transfers = Array.from(this.transfers.values());
        const completed = transfers.filter(t => t.status === 'completed').length;
        const failed = transfers.filter(t => t.status === 'failed').length;
        const inProgress = transfers.filter(t => t.status === 'in-progress').length;
        const totalSize = transfers
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + t.fileSize, 0);
        return {
            total: transfers.length,
            completed,
            failed,
            inProgress,
            totalSize,
            virtualFolders: this.virtualFolders.size
        };
    }
}
exports.FileTransferManager = FileTransferManager;
//# sourceMappingURL=FileTransferManager.js.map