import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

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

export class Config {
  private static instance: Config;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadConfig(): AppConfig {
    // Load from environment variables first, then config file
    const config: AppConfig = {
      server: {
        host: process.env.SERVER_HOST || '0.0.0.0',
        port: parseInt(process.env.SERVER_PORT || '4000'),
        ssl: {
          enabled: process.env.SSL_ENABLED === 'true',
          cert: process.env.SSL_CERT || '',
          key: process.env.SSL_KEY || ''
        }
      },
      auth: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours
        allowAnonymous: process.env.ALLOW_ANONYMOUS === 'true',
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '300000') // 5 minutes
      },
      rdp: {
        defaultPort: parseInt(process.env.RDP_DEFAULT_PORT || '3389'),
        timeout: parseInt(process.env.RDP_TIMEOUT || '30000'),
        reconnectAttempts: parseInt(process.env.RDP_RECONNECT_ATTEMPTS || '3'),
        reconnectDelay: parseInt(process.env.RDP_RECONNECT_DELAY || '5000'),
        enableNLA: process.env.RDP_ENABLE_NLA !== 'false',
        enableTLS: process.env.RDP_ENABLE_TLS !== 'false',
        enableCredSSP: process.env.RDP_ENABLE_CREDSSP !== 'false',
        enableGFX: process.env.RDP_ENABLE_GFX !== 'false',
        enableAudio: process.env.RDP_ENABLE_AUDIO !== 'false',
        enableClipboard: process.env.RDP_ENABLE_CLIPBOARD !== 'false',
        enableFileTransfer: process.env.RDP_ENABLE_FILE_TRANSFER !== 'false',
        enableDeviceRedirection: process.env.RDP_ENABLE_DEVICE_REDIRECTION !== 'false',
        enablePrinterRedirection: process.env.RDP_ENABLE_PRINTER_REDIRECTION !== 'false',
        enableSmartCardRedirection: process.env.RDP_ENABLE_SMARTCARD_REDIRECTION !== 'false',
        enableUSBRedirection: process.env.RDP_ENABLE_USB_REDIRECTION !== 'false',
        enableCameraRedirection: process.env.RDP_ENABLE_CAMERA_REDIRECTION !== 'false',
        enableMicrophoneRedirection: process.env.RDP_ENABLE_MICROPHONE_REDIRECTION !== 'false',
        enableSpeakerRedirection: process.env.RDP_ENABLE_SPEAKER_REDIRECTION !== 'false',
        enableMultiMonitor: process.env.RDP_ENABLE_MULTI_MONITOR !== 'false',
        maxSessions: parseInt(process.env.RDP_MAX_SESSIONS || '100'),
        maxSessionDuration: parseInt(process.env.RDP_MAX_SESSION_DURATION || '28800000') // 8 hours
      },
      websocket: {
        pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000'),
        pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000'),
        upgradeTimeout: parseInt(process.env.WS_UPGRADE_TIMEOUT || '10000'),
        maxHttpBufferSize: parseInt(process.env.WS_MAX_HTTP_BUFFER_SIZE || '1e6'),
        allowEIO3: process.env.WS_ALLOW_EIO3 === 'true',
        cors: {
          origin: process.env.WS_CORS_ORIGIN ? process.env.WS_CORS_ORIGIN.split(',') : ['*'],
          methods: process.env.WS_CORS_METHODS ? process.env.WS_CORS_METHODS.split(',') : ['GET', 'POST'],
          credentials: process.env.WS_CORS_CREDENTIALS === 'true'
        }
      },
      fileTransfer: {
        maxFileSize: parseInt(process.env.FT_MAX_FILE_SIZE || '100000000'), // 100MB
        allowedTypes: process.env.FT_ALLOWED_TYPES ? process.env.FT_ALLOWED_TYPES.split(',') : ['*'],
        uploadDir: process.env.FT_UPLOAD_DIR || join(process.cwd(), 'uploads'),
        downloadDir: process.env.FT_DOWNLOAD_DIR || join(process.cwd(), 'downloads'),
        enableCompression: process.env.FT_ENABLE_COMPRESSION !== 'false',
        enableEncryption: process.env.FT_ENABLE_ENCRYPTION !== 'false',
        maxConcurrentTransfers: parseInt(process.env.FT_MAX_CONCURRENT_TRANSFERS || '5')
      },
      device: {
        enableUSB: process.env.DEVICE_ENABLE_USB !== 'false',
        enablePrinter: process.env.DEVICE_ENABLE_PRINTER !== 'false',
        enableCamera: process.env.DEVICE_ENABLE_CAMERA !== 'false',
        enableMicrophone: process.env.DEVICE_ENABLE_MICROPHONE !== 'false',
        enableSpeaker: process.env.DEVICE_ENABLE_SPEAKER !== 'false',
        enableSmartCard: process.env.DEVICE_ENABLE_SMARTCARD !== 'false',
        enableScanner: process.env.DEVICE_ENABLE_SCANNER !== 'false',
        enableStorage: process.env.DEVICE_ENABLE_STORAGE !== 'false',
        maxDevicesPerSession: parseInt(process.env.DEVICE_MAX_DEVICES_PER_SESSION || '10')
      },
      audit: {
        enabled: process.env.AUDIT_ENABLED !== 'false',
        logLevel: process.env.AUDIT_LOG_LEVEL || 'info',
        retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '30'),
        logFile: process.env.AUDIT_LOG_FILE || join(process.cwd(), 'logs', 'audit.log'),
        includeSensitiveData: process.env.AUDIT_INCLUDE_SENSITIVE_DATA === 'true'
      },
      cors: {
        allowedOrigins: process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : ['*'],
        allowedMethods: process.env.CORS_ALLOWED_METHODS ? process.env.CORS_ALLOWED_METHODS.split(',') : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: process.env.CORS_ALLOWED_HEADERS ? process.env.CORS_ALLOWED_HEADERS.split(',') : ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: process.env.CORS_CREDENTIALS === 'true',
        maxAge: parseInt(process.env.CORS_MAX_AGE || '86400')
      }
    };

    // Try to load from config file if it exists
    const configFile = join(process.cwd(), 'config.json');
    if (existsSync(configFile)) {
      try {
        const fileConfig = JSON.parse(readFileSync(configFile, 'utf8'));
        this.mergeConfig(config, fileConfig);
      } catch (error) {
        console.warn('Failed to load config file:', error);
      }
    }

    return config;
  }

  private mergeConfig(base: any, override: any): void {
    for (const key in override) {
      if (override.hasOwnProperty(key)) {
        if (typeof override[key] === 'object' && override[key] !== null && !Array.isArray(override[key])) {
          if (!base[key]) {
            base[key] = {};
          }
          this.mergeConfig(base[key], override[key]);
        } else {
          base[key] = override[key];
        }
      }
    }
  }

  public get(key: string): any {
    const keys = key.split('.');
    let value: any = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  public set(key: string, value: any): void {
    const keys = key.split('.');
    let current: any = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  public getAll(): AppConfig {
    return { ...this.config };
  }

  public reload(): void {
    this.config = this.loadConfig();
  }

  public validate(): string[] {
    const errors: string[] = [];
    
    // Validate required fields
    if (!this.config.auth.jwtSecret || this.config.auth.jwtSecret === 'your-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be set to a secure value');
    }
    
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('SERVER_PORT must be between 1 and 65535');
    }
    
    if (this.config.rdp.maxSessions < 1) {
      errors.push('RDP_MAX_SESSIONS must be at least 1');
    }
    
    if (this.config.fileTransfer.maxFileSize < 1) {
      errors.push('FT_MAX_FILE_SIZE must be at least 1');
    }
    
    return errors;
  }

  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  public isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }
} 