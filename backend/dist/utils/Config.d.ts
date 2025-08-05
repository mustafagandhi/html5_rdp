export interface ServerConfig {
    host: string;
    port: number;
    ssl: {
        enabled: boolean;
        cert: string;
        key: string;
    };
}
export interface AuthConfig {
    jwtSecret: string;
    sessionMaxAge: number;
    allowAnonymous: boolean;
    maxLoginAttempts: number;
    lockoutDuration: number;
}
export interface RDPConfig {
    defaultPort: number;
    timeout: number;
    reconnectAttempts: number;
    reconnectDelay: number;
    enableNLA: boolean;
    enableTLS: boolean;
    enableCredSSP: boolean;
    enableGFX: boolean;
    enableAudio: boolean;
    enableClipboard: boolean;
    enableFileTransfer: boolean;
    enableDeviceRedirection: boolean;
    enablePrinterRedirection: boolean;
    enableSmartCardRedirection: boolean;
    enableUSBRedirection: boolean;
    enableCameraRedirection: boolean;
    enableMicrophoneRedirection: boolean;
    enableSpeakerRedirection: boolean;
    enableMultiMonitor: boolean;
    maxSessions: number;
    maxSessionDuration: number;
}
export interface WebSocketConfig {
    pingInterval: number;
    pingTimeout: number;
    upgradeTimeout: number;
    maxHttpBufferSize: number;
    allowEIO3: boolean;
    cors: {
        origin: string[];
        methods: string[];
        credentials: boolean;
    };
}
export interface FileTransferConfig {
    maxFileSize: number;
    allowedTypes: string[];
    uploadDir: string;
    downloadDir: string;
    enableCompression: boolean;
    enableEncryption: boolean;
    maxConcurrentTransfers: number;
}
export interface DeviceConfig {
    enableUSB: boolean;
    enablePrinter: boolean;
    enableCamera: boolean;
    enableMicrophone: boolean;
    enableSpeaker: boolean;
    enableSmartCard: boolean;
    enableScanner: boolean;
    enableStorage: boolean;
    maxDevicesPerSession: number;
}
export interface AuditConfig {
    enabled: boolean;
    logLevel: string;
    retentionDays: number;
    logFile: string;
    includeSensitiveData: boolean;
}
export interface CORSConfig {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
}
export interface AppConfig {
    server: ServerConfig;
    auth: AuthConfig;
    rdp: RDPConfig;
    websocket: WebSocketConfig;
    fileTransfer: FileTransferConfig;
    device: DeviceConfig;
    audit: AuditConfig;
    cors: CORSConfig;
}
export declare class Config {
    private static instance;
    private config;
    private constructor();
    static getInstance(): Config;
    private loadConfig;
    private mergeConfig;
    get(key: string): any;
    set(key: string, value: any): void;
    getAll(): AppConfig;
    reload(): void;
    validate(): string[];
    isDevelopment(): boolean;
    isProduction(): boolean;
    isTest(): boolean;
}
//# sourceMappingURL=Config.d.ts.map