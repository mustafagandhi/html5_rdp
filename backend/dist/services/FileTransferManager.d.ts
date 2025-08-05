import { EventEmitter } from 'events';
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
export declare class FileTransferManager extends EventEmitter {
    private logger;
    private transfers;
    private virtualFolders;
    private uploadDir;
    private downloadDir;
    constructor();
    private ensureDirectories;
    handleUpload(sessionId: string, data: any): Promise<any>;
    private processFileUpload;
    private processFileByType;
    private processImage;
    private processVideo;
    private processAudio;
    handleDownload(sessionId: string, data: any): Promise<any>;
    private readFileForDownload;
    createVirtualFolder(sessionId: string, data: any): VirtualFolder;
    deleteVirtualFolder(folderId: string): boolean;
    getVirtualFolders(sessionId: string): VirtualFolder[];
    listDirectory(path: string): Promise<any[]>;
    createDirectory(path: string): Promise<boolean>;
    deleteFile(path: string): Promise<boolean>;
    moveFile(sourcePath: string, destinationPath: string): Promise<boolean>;
    copyFile(sourcePath: string, destinationPath: string): Promise<boolean>;
    getTransfer(transferId: string): FileTransfer | undefined;
    getAllTransfers(sessionId?: string): FileTransfer[];
    cancelTransfer(transferId: string): boolean;
    cleanupCompletedTransfers(): void;
    getTransferStats(): any;
}
//# sourceMappingURL=FileTransferManager.d.ts.map