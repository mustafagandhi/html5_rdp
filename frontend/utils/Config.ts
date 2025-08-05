import { Logger } from './Logger';

export interface ConnectionConfig {
  defaultHost: string;
  defaultPort: number;
  defaultSecure: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  maxBitrate: number;
  maxFramerate: number;
  enableAudio: boolean;
  enableVideo: boolean;
}

export interface DisplayConfig {
  defaultQuality: 'low' | 'medium' | 'high' | 'ultra';
  defaultScaleMode: 'fit' | 'fill' | 'stretch';
  maintainAspectRatio: boolean;
  enableHardwareAcceleration: boolean;
  maxFrameQueueSize: number;
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'auto';
  showPerformanceOverlay: boolean;
  showConnectionInfo: boolean;
  enableKeyboardShortcuts: boolean;
  enableContextMenu: boolean;
  language: string;
}

export interface SecurityConfig {
  enableClipboard: boolean;
  enableFileTransfer: boolean;
  enableAudioCapture: boolean;
  enablePrinting: boolean;
  maxFileSize: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
  enableRemote: boolean;
  maxLogEntries: number;
}

export interface AppConfig {
  connection: ConnectionConfig;
  webrtc: WebRTCConfig;
  display: DisplayConfig;
  ui: UIConfig;
  security: SecurityConfig;
  logging: LoggingConfig;
}

export class Config {
  private static instance: Config;
  private logger = new Logger('Config');
  private config: AppConfig;
  private storageKey = 'real-remote-desktop-config';

  private constructor() {
    this.config = this.getDefaultConfig();
    this.loadFromStorage();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  static init(): void {
    Config.getInstance();
  }

  get<T>(path: string): T {
    const keys = path.split('.');
    let value: any = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        throw new Error(`Config path not found: ${path}`);
      }
    }
    
    return value as T;
  }

  set<T>(path: string, value: T): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current: any = this.config;
    
    for (const key of keys) {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[lastKey] = value;
    this.saveToStorage();
    this.logger.debug(`Config updated: ${path} = ${JSON.stringify(value)}`);
  }

  reset(): void {
    this.config = this.getDefaultConfig();
    this.saveToStorage();
    this.logger.info('Configuration reset to defaults');
  }

  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  import(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson);
      this.config = this.mergeConfigs(this.getDefaultConfig(), importedConfig);
      this.saveToStorage();
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
        defaultPort: 4000,
        defaultSecure: false,
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        heartbeatInterval: 30000,
        connectionTimeout: 10000
      },
      webrtc: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        maxBitrate: 5000000, // 5 Mbps
        maxFramerate: 60,
        enableAudio: false,
        enableVideo: true
      },
      display: {
        defaultQuality: 'medium',
        defaultScaleMode: 'fit',
        maintainAspectRatio: true,
        enableHardwareAcceleration: true,
        maxFrameQueueSize: 10
      },
      ui: {
        theme: 'auto',
        showPerformanceOverlay: false,
        showConnectionInfo: true,
        enableKeyboardShortcuts: true,
        enableContextMenu: false,
        language: 'en'
      },
      security: {
        enableClipboard: true,
        enableFileTransfer: true,
        enableAudioCapture: false,
        enablePrinting: false,
        maxFileSize: 100 * 1024 * 1024 // 100 MB
      },
      logging: {
        level: 'info',
        enableConsole: true,
        enableRemote: false,
        maxLogEntries: 1000
      }
    };
  }

  private mergeConfigs(defaultConfig: AppConfig, userConfig: any): AppConfig {
    const merged = { ...defaultConfig };
    
    for (const [section, sectionConfig] of Object.entries(userConfig)) {
      if (section in merged && typeof sectionConfig === 'object') {
        merged[section as keyof AppConfig] = {
          ...merged[section as keyof AppConfig],
          ...sectionConfig
        };
      }
    }
    
    return merged;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const userConfig = JSON.parse(stored);
        this.config = this.mergeConfigs(this.getDefaultConfig(), userConfig);
        this.logger.debug('Configuration loaded from storage');
      }
    } catch (error) {
      this.logger.warn('Failed to load configuration from storage', error);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
      this.logger.debug('Configuration saved to storage');
    } catch (error) {
      this.logger.warn('Failed to save configuration to storage', error);
    }
  }

  // Convenience methods for common config access
  getConnectionConfig(): ConnectionConfig {
    return this.config.connection;
  }

  getWebRTCConfig(): WebRTCConfig {
    return this.config.webrtc;
  }

  getDisplayConfig(): DisplayConfig {
    return this.config.display;
  }

  getUIConfig(): UIConfig {
    return this.config.ui;
  }

  getSecurityConfig(): SecurityConfig {
    return this.config.security;
  }

  getLoggingConfig(): LoggingConfig {
    return this.config.logging;
  }

  // Theme management
  getTheme(): 'light' | 'dark' {
    const theme = this.config.ui.theme;
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.set('ui.theme', theme);
  }

  // Quality management
  getQuality(): 'low' | 'medium' | 'high' | 'ultra' {
    return this.config.display.defaultQuality;
  }

  setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    this.set('display.defaultQuality', quality);
  }

  // Connection management
  getDefaultConnection(): { host: string; port: number; secure: boolean } {
    return {
      host: this.config.connection.defaultHost,
      port: this.config.connection.defaultPort,
      secure: this.config.connection.defaultSecure
    };
  }

  setDefaultConnection(host: string, port: number, secure: boolean): void {
    this.set('connection.defaultHost', host);
    this.set('connection.defaultPort', port);
    this.set('connection.defaultSecure', secure);
  }

  // Validation
  validate(): boolean {
    try {
      // Validate connection config
      if (this.config.connection.defaultPort < 1 || this.config.connection.defaultPort > 65535) {
        throw new Error('Invalid default port');
      }

      // Validate display config
      const validQualities = ['low', 'medium', 'high', 'ultra'];
      if (!validQualities.includes(this.config.display.defaultQuality)) {
        throw new Error('Invalid default quality');
      }

      // Validate UI config
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(this.config.ui.theme)) {
        throw new Error('Invalid theme');
      }

      return true;
    } catch (error) {
      this.logger.error('Configuration validation failed', error);
      return false;
    }
  }
} 