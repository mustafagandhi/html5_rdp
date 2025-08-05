import { Logger } from './Logger';

export interface AppConfig {
  // Connection settings
  connection: {
    defaultHost: string;
    defaultPort: number;
    defaultSecure: boolean;
    connectionTimeout: number;
    reconnectAttempts: number;
    reconnectDelay: number;
    heartbeatInterval: number;
  };
  
  // WebRTC settings
  webrtc: {
    iceServers: RTCIceServer[];
    maxBitrate: number;
    maxFramerate: number;
    videoCodec: string;
    audioCodec: string;
    enableAudio: boolean;
    enableVideo: boolean;
  };
  
  // Display settings
  display: {
    defaultQuality: 'low' | 'medium' | 'high' | 'ultra';
    autoQuality: boolean;
    fullscreenOnConnect: boolean;
    showPerformanceOverlay: boolean;
    enableHardwareAcceleration: boolean;
  };
  
  // Input settings
  input: {
    enableMouseCapture: boolean;
    enableKeyboardCapture: boolean;
    enableTouchCapture: boolean;
    enableClipboard: boolean;
    enableFileTransfer: boolean;
    mouseSensitivity: number;
    keyboardRepeatDelay: number;
  };
  
  // Security settings
  security: {
    enableEncryption: boolean;
    requireAuthentication: boolean;
    sessionTimeout: number;
    maxFailedAttempts: number;
    enableAuditLogging: boolean;
  };
  
  // UI settings
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    showConnectionStatus: boolean;
    showPerformanceMetrics: boolean;
    enableNotifications: boolean;
    enableKeyboardShortcuts: boolean;
  };
  
  // Performance settings
  performance: {
    enableWebWorkers: boolean;
    enableServiceWorker: boolean;
    enableCaching: boolean;
    maxMemoryUsage: number;
    enableProfiling: boolean;
  };
}

export class Config {
  private static instance: Config;
  private config: AppConfig;
  private logger = new Logger('Config');

  static init(): void {
    if (!Config.instance) {
      Config.instance = new Config();
    }
  }

  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadUserPreferences();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      throw new Error('Config not initialized. Call Config.init() first.');
    }
    return Config.instance;
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value;
    this.saveUserPreferences();
    this.logger.info(`Configuration updated: ${String(key)}`, value);
  }

  update<K extends keyof AppConfig>(key: K, updates: Partial<AppConfig[K]>): void {
    this.config[key] = { ...this.config[key], ...updates };
    this.saveUserPreferences();
    this.logger.info(`Configuration partially updated: ${String(key)}`, updates);
  }

  reset(): void {
    this.config = this.getDefaultConfig();
    this.saveUserPreferences();
    this.logger.info('Configuration reset to defaults');
  }

  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  import(configString: string): void {
    try {
      const importedConfig = JSON.parse(configString);
      this.config = { ...this.getDefaultConfig(), ...importedConfig };
      this.saveUserPreferences();
      this.logger.info('Configuration imported successfully');
    } catch (error) {
      this.logger.error('Failed to import configuration', error);
      throw new Error('Invalid configuration format');
    }
  }

  private getDefaultConfig(): AppConfig {
    return {
      connection: {
        defaultHost: 'localhost',
        defaultPort: 8080,
        defaultSecure: false,
        connectionTimeout: 30000,
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        heartbeatInterval: 30000
      },
      
      webrtc: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        maxBitrate: 2000000, // 2 Mbps
        maxFramerate: 30,
        videoCodec: 'H.264',
        audioCodec: 'opus',
        enableAudio: false,
        enableVideo: true
      },
      
      display: {
        defaultQuality: 'medium',
        autoQuality: true,
        fullscreenOnConnect: false,
        showPerformanceOverlay: false,
        enableHardwareAcceleration: true
      },
      
      input: {
        enableMouseCapture: true,
        enableKeyboardCapture: true,
        enableTouchCapture: true,
        enableClipboard: false,
        enableFileTransfer: false,
        mouseSensitivity: 1.0,
        keyboardRepeatDelay: 500
      },
      
      security: {
        enableEncryption: true,
        requireAuthentication: true,
        sessionTimeout: 3600000, // 1 hour
        maxFailedAttempts: 3,
        enableAuditLogging: true
      },
      
      ui: {
        theme: 'auto',
        language: 'en',
        showConnectionStatus: true,
        showPerformanceMetrics: false,
        enableNotifications: true,
        enableKeyboardShortcuts: true
      },
      
      performance: {
        enableWebWorkers: true,
        enableServiceWorker: true,
        enableCaching: true,
        maxMemoryUsage: 512 * 1024 * 1024, // 512 MB
        enableProfiling: false
      }
    };
  }

  private loadUserPreferences(): void {
    try {
      const stored = localStorage.getItem('real-remote-desktop-config');
      if (stored) {
        const userConfig = JSON.parse(stored);
        this.config = { ...this.config, ...userConfig };
        this.logger.info('User preferences loaded');
      }
    } catch (error) {
      this.logger.warn('Failed to load user preferences, using defaults', error);
    }
  }

  private saveUserPreferences(): void {
    try {
      localStorage.setItem('real-remote-desktop-config', JSON.stringify(this.config));
      this.logger.debug('User preferences saved');
    } catch (error) {
      this.logger.error('Failed to save user preferences', error);
    }
  }

  // Environment-specific configuration
  getEnvironmentConfig(): Partial<AppConfig> {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isDevelopment) {
      return {
        connection: {
          ...this.config.connection,
          defaultHost: 'localhost',
          defaultPort: 3000
        },
        performance: {
          ...this.config.performance,
          enableProfiling: true
        }
      };
    }
    
    if (isProduction) {
      return {
        connection: {
          ...this.config.connection,
          defaultSecure: true
        },
        security: {
          ...this.config.security,
          enableEncryption: true,
          requireAuthentication: true
        },
        performance: {
          ...this.config.performance,
          enableProfiling: false
        }
      };
    }
    
    return {};
  }

  // Validation
  validate(): boolean {
    try {
      // Validate connection settings
      if (this.config.connection.defaultPort < 1 || this.config.connection.defaultPort > 65535) {
        throw new Error('Invalid port number');
      }
      
      if (this.config.connection.connectionTimeout < 1000) {
        throw new Error('Connection timeout too low');
      }
      
      // Validate WebRTC settings
      if (this.config.webrtc.maxBitrate < 100000) {
        throw new Error('Bitrate too low');
      }
      
      if (this.config.webrtc.maxFramerate < 1 || this.config.webrtc.maxFramerate > 60) {
        throw new Error('Invalid framerate');
      }
      
      // Validate security settings
      if (this.config.security.sessionTimeout < 60000) {
        throw new Error('Session timeout too low');
      }
      
      return true;
    } catch (error) {
      this.logger.error('Configuration validation failed', error);
      return false;
    }
  }

  // Migration support
  migrateFromVersion(version: string): void {
    this.logger.info(`Migrating configuration from version ${version}`);
    
    // Add migration logic here when needed
    // For now, just log the migration
  }
} 