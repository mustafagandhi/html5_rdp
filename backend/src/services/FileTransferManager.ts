import { Logger } from '../utils/Logger';
import { EventEmitter } from 'events';
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

export interface FileTransfer {
  id: string;
  sessionId: string;
  type: 'upload' | 'download';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export interface VirtualFolder {
  id: string;
  sessionId: string;
  name: string;
  path: string;
  permissions: 'read' | 'write' | 'readwrite';
  isActive: boolean;
  createdAt: Date;
}

export class FileTransferManager extends EventEmitter {
  private logger = new Logger('FileTransferManager');
  private transfers: Map<string, FileTransfer> = new Map();
  private virtualFolders: Map<string, VirtualFolder> = new Map();
  private uploadDir: string;
  private downloadDir: string;

  constructor() {
    super();
    this.uploadDir = join(process.cwd(), 'uploads');
    this.downloadDir = join(process.cwd(), 'downloads');
    this.ensureDirectories();
    this.logger.info('File Transfer Manager initialized');
  }

  private ensureDirectories(): void {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!existsSync(this.downloadDir)) {
      mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  public async handleUpload(sessionId: string, data: any): Promise<any> {
    const transferId = uuidv4();
    
    const transfer: FileTransfer = {
      id: transferId,
      sessionId,
      type: 'upload',
      fileName: data.fileName,
      filePath: join(this.uploadDir, `${transferId}_${data.fileName}`),
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      status: 'pending',
      progress: 0,
      startTime: new Date()
    };

    this.transfers.set(transferId, transfer);
    this.logger.info(`File upload started: ${transfer.fileName} (${transfer.fileSize} bytes)`);

    try {
      // Handle file data
      if (data.fileData) {
        await this.processFileUpload(transfer, data.fileData);
      }

      // Emit upload event
      this.emit('fileUploaded', { transfer, sessionId });

      return {
        success: true,
        transferId,
        fileName: transfer.fileName,
        fileSize: transfer.fileSize
      };
    } catch (error) {
      transfer.status = 'failed';
      transfer.error = (error as Error).message;
      transfer.endTime = new Date();
      
      this.logger.error(`File upload failed: ${transfer.fileName}`, error);
      
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async processFileUpload(transfer: FileTransfer, fileData: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(fileData, 'base64');
        
        // Write file to disk
        const writeStream = createWriteStream(transfer.filePath);
        
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

        // Process file based on type
        this.processFileByType(buffer, transfer.mimeType)
          .then((processedBuffer) => {
            writeStream.write(processedBuffer);
            writeStream.end();
          })
          .catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  private async processFileByType(buffer: Buffer, mimeType: string): Promise<Buffer> {
    // Process images
    if (mimeType.startsWith('image/')) {
      return this.processImage(buffer, mimeType);
    }
    
    // Process videos
    if (mimeType.startsWith('video/')) {
      return this.processVideo(buffer, mimeType);
    }
    
    // Process audio
    if (mimeType.startsWith('audio/')) {
      return this.processAudio(buffer, mimeType);
    }
    
    // For other file types, return as-is
    return buffer;
  }

  private async processImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      
      // Get image metadata
      const metadata = await image.metadata();
      
      // Resize if too large
      if (metadata.width && metadata.width > 1920) {
        image.resize(1920, null, { withoutEnlargement: true });
      }
      
      // Optimize based on format
      if (mimeType === 'image/jpeg') {
        return await image.jpeg({ quality: 85 }).toBuffer();
      } else if (mimeType === 'image/png') {
        return await image.png({ compressionLevel: 6 }).toBuffer();
      } else if (mimeType === 'image/webp') {
        return await image.webp({ quality: 85 }).toBuffer();
      }
      
      return await image.toBuffer();
    } catch (error) {
      this.logger.warn('Image processing failed, returning original:', error);
      return buffer;
    }
  }

  private async processVideo(buffer: Buffer, mimeType: string): Promise<Buffer> {
    // For videos, we'll just return the original buffer for now
    // In a real implementation, you might want to transcode to a more efficient format
    return buffer;
  }

  private async processAudio(buffer: Buffer, mimeType: string): Promise<Buffer> {
    // For audio, we'll just return the original buffer for now
    // In a real implementation, you might want to transcode to a more efficient format
    return buffer;
  }

  public async handleDownload(sessionId: string, data: any): Promise<any> {
    const transferId = uuidv4();
    
    const transfer: FileTransfer = {
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
      
      // Emit download event
      this.emit('fileDownloaded', { transfer, sessionId });

      return {
        success: true,
        transferId,
        fileName: transfer.fileName,
        fileSize: fileData.length,
        fileData: fileData.toString('base64'),
        mimeType: transfer.mimeType
      };
    } catch (error) {
      transfer.status = 'failed';
      transfer.error = (error as Error).message;
      transfer.endTime = new Date();
      
      this.logger.error(`File download failed: ${transfer.fileName}`, error);
      
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async readFileForDownload(transfer: FileTransfer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const readStream = createReadStream(transfer.filePath);
      
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

  public createVirtualFolder(sessionId: string, data: any): VirtualFolder {
    const folderId = uuidv4();
    
    const virtualFolder: VirtualFolder = {
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

  public deleteVirtualFolder(folderId: string): boolean {
    const folder = this.virtualFolders.get(folderId);
    if (!folder) {
      return false;
    }

    this.virtualFolders.delete(folderId);
    this.logger.info(`Virtual folder deleted: ${folder.name}`);
    
    this.emit('virtualFolderDeleted', { folderId });
    return true;
  }

  public getVirtualFolders(sessionId: string): VirtualFolder[] {
    return Array.from(this.virtualFolders.values())
      .filter(folder => folder.sessionId === sessionId && folder.isActive);
  }

  public async listDirectory(path: string): Promise<any[]> {
    // This would implement directory listing
    // For now, return a mock implementation
    return [
      { name: 'example.txt', type: 'file', size: 1024, modified: new Date() },
      { name: 'folder', type: 'directory', size: 0, modified: new Date() }
    ];
  }

  public async createDirectory(path: string): Promise<boolean> {
    try {
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to create directory:', error);
      return false;
    }
  }

  public async deleteFile(path: string): Promise<boolean> {
    try {
      if (existsSync(path)) {
        const fs = require('fs').promises;
        await fs.unlink(path);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to delete file:', error);
      return false;
    }
  }

  public async moveFile(sourcePath: string, destinationPath: string): Promise<boolean> {
    try {
      const fs = require('fs').promises;
      await fs.rename(sourcePath, destinationPath);
      return true;
    } catch (error) {
      this.logger.error('Failed to move file:', error);
      return false;
    }
  }

  public async copyFile(sourcePath: string, destinationPath: string): Promise<boolean> {
    try {
      const fs = require('fs').promises;
      await fs.copyFile(sourcePath, destinationPath);
      return true;
    } catch (error) {
      this.logger.error('Failed to copy file:', error);
      return false;
    }
  }

  public getTransfer(transferId: string): FileTransfer | undefined {
    return this.transfers.get(transferId);
  }

  public getAllTransfers(sessionId?: string): FileTransfer[] {
    const transfers = Array.from(this.transfers.values());
    if (sessionId) {
      return transfers.filter(transfer => transfer.sessionId === sessionId);
    }
    return transfers;
  }

  public cancelTransfer(transferId: string): boolean {
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

  public cleanupCompletedTransfers(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [transferId, transfer] of this.transfers.entries()) {
      if (transfer.status === 'completed' && transfer.endTime) {
        if (now.getTime() - transfer.endTime.getTime() > maxAge) {
          this.transfers.delete(transferId);
          this.logger.info(`Cleaned up completed transfer: ${transfer.fileName}`);
        }
      }
    }
  }

  public getTransferStats(): any {
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