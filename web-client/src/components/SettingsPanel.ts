import { Logger } from '../utils/Logger';
import { Config } from '../utils/Config';

export interface SettingsData {
  // Display settings
  defaultQuality: 'low' | 'medium' | 'high' | 'ultra';
  autoQuality: boolean;
  fullscreenOnConnect: boolean;
  showPerformanceOverlay: boolean;
  enableHardwareAcceleration: boolean;
  
  // Input settings
  enableMouseCapture: boolean;
  enableKeyboardCapture: boolean;
  enableTouchCapture: boolean;
  enableClipboard: boolean;
  enableFileTransfer: boolean;
  mouseSensitivity: number;
  keyboardRepeatDelay: number;
  
  // Connection settings
  connectionTimeout: number;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  
  // UI settings
  theme: 'light' | 'dark' | 'auto';
  language: string;
  showConnectionStatus: boolean;
  showPerformanceMetrics: boolean;
  enableNotifications: boolean;
  enableKeyboardShortcuts: boolean;
  
  // Security settings
  enableEncryption: boolean;
  requireAuthentication: boolean;
  sessionTimeout: number;
  maxFailedAttempts: number;
  enableAuditLogging: boolean;
  
  // Performance settings
  enableWebWorkers: boolean;
  enableServiceWorker: boolean;
  enableCaching: boolean;
  maxMemoryUsage: number;
  enableProfiling: boolean;
}

export class SettingsPanel {
  private logger = new Logger('SettingsPanel');
  private config = Config.getInstance();
  private settings: SettingsData;

  constructor() {
    this.settings = this.loadSettings();
  }

  render(): string {
    return `
      <div class="settings-panel-container">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="btn btn-sm btn-outline" id="close-settings-btn">×</button>
        </div>
        
        <div class="settings-content">
          <div class="settings-tabs">
            <button class="tab-btn active" data-tab="display">Display</button>
            <button class="tab-btn" data-tab="input">Input</button>
            <button class="tab-btn" data-tab="connection">Connection</button>
            <button class="tab-btn" data-tab="ui">Interface</button>
            <button class="tab-btn" data-tab="security">Security</button>
            <button class="tab-btn" data-tab="performance">Performance</button>
          </div>
          
          <div class="settings-sections">
            <!-- Display Settings -->
            <div class="settings-section active" id="display-section">
              <h3>Display Settings</h3>
              
              <div class="form-group">
                <label for="default-quality">Default Quality</label>
                <select id="default-quality" name="defaultQuality">
                  <option value="low" ${this.settings.defaultQuality === 'low' ? 'selected' : ''}>Low (Fast)</option>
                  <option value="medium" ${this.settings.defaultQuality === 'medium' ? 'selected' : ''}>Medium (Balanced)</option>
                  <option value="high" ${this.settings.defaultQuality === 'high' ? 'selected' : ''}>High (Quality)</option>
                  <option value="ultra" ${this.settings.defaultQuality === 'ultra' ? 'selected' : ''}>Ultra (Best)</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="auto-quality" name="autoQuality" ${this.settings.autoQuality ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Auto-adjust quality based on performance
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="fullscreen-connect" name="fullscreenOnConnect" ${this.settings.fullscreenOnConnect ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enter fullscreen on connection
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="show-performance" name="showPerformanceOverlay" ${this.settings.showPerformanceOverlay ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Show performance overlay by default
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="hardware-acceleration" name="enableHardwareAcceleration" ${this.settings.enableHardwareAcceleration ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable hardware acceleration
                </label>
              </div>
            </div>
            
            <!-- Input Settings -->
            <div class="settings-section" id="input-section">
              <h3>Input Settings</h3>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-mouse" name="enableMouseCapture" ${this.settings.enableMouseCapture ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable mouse capture
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-keyboard" name="enableKeyboardCapture" ${this.settings.enableKeyboardCapture ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable keyboard capture
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-touch" name="enableTouchCapture" ${this.settings.enableTouchCapture ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable touch capture
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-clipboard" name="enableClipboard" ${this.settings.enableClipboard ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable clipboard sharing
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-file-transfer" name="enableFileTransfer" ${this.settings.enableFileTransfer ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable file transfer
                </label>
              </div>
              
              <div class="form-group">
                <label for="mouse-sensitivity">Mouse Sensitivity</label>
                <input type="range" id="mouse-sensitivity" name="mouseSensitivity" 
                       min="0.1" max="3.0" step="0.1" value="${this.settings.mouseSensitivity}">
                <span class="range-value">${this.settings.mouseSensitivity}</span>
              </div>
              
              <div class="form-group">
                <label for="keyboard-repeat-delay">Keyboard Repeat Delay (ms)</label>
                <input type="number" id="keyboard-repeat-delay" name="keyboardRepeatDelay" 
                       min="100" max="2000" step="50" value="${this.settings.keyboardRepeatDelay}">
              </div>
            </div>
            
            <!-- Connection Settings -->
            <div class="settings-section" id="connection-section">
              <h3>Connection Settings</h3>
              
              <div class="form-group">
                <label for="connection-timeout">Connection Timeout (ms)</label>
                <input type="number" id="connection-timeout" name="connectionTimeout" 
                       min="5000" max="60000" step="1000" value="${this.settings.connectionTimeout}">
              </div>
              
              <div class="form-group">
                <label for="reconnect-attempts">Reconnection Attempts</label>
                <input type="number" id="reconnect-attempts" name="reconnectAttempts" 
                       min="1" max="10" step="1" value="${this.settings.reconnectAttempts}">
              </div>
              
              <div class="form-group">
                <label for="reconnect-delay">Reconnection Delay (ms)</label>
                <input type="number" id="reconnect-delay" name="reconnectDelay" 
                       min="500" max="10000" step="500" value="${this.settings.reconnectDelay}">
              </div>
              
              <div class="form-group">
                <label for="heartbeat-interval">Heartbeat Interval (ms)</label>
                <input type="number" id="heartbeat-interval" name="heartbeatInterval" 
                       min="10000" max="60000" step="5000" value="${this.settings.heartbeatInterval}">
              </div>
            </div>
            
            <!-- UI Settings -->
            <div class="settings-section" id="ui-section">
              <h3>Interface Settings</h3>
              
              <div class="form-group">
                <label for="theme">Theme</label>
                <select id="theme" name="theme">
                  <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Light</option>
                  <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                  <option value="auto" ${this.settings.theme === 'auto' ? 'selected' : ''}>Auto</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="language">Language</label>
                <select id="language" name="language">
                  <option value="en" ${this.settings.language === 'en' ? 'selected' : ''}>English</option>
                  <option value="es" ${this.settings.language === 'es' ? 'selected' : ''}>Español</option>
                  <option value="fr" ${this.settings.language === 'fr' ? 'selected' : ''}>Français</option>
                  <option value="de" ${this.settings.language === 'de' ? 'selected' : ''}>Deutsch</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="show-connection-status" name="showConnectionStatus" ${this.settings.showConnectionStatus ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Show connection status
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="show-performance-metrics" name="showPerformanceMetrics" ${this.settings.showPerformanceMetrics ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Show performance metrics
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-notifications" name="enableNotifications" ${this.settings.enableNotifications ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable notifications
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-keyboard-shortcuts" name="enableKeyboardShortcuts" ${this.settings.enableKeyboardShortcuts ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable keyboard shortcuts
                </label>
              </div>
            </div>
            
            <!-- Security Settings -->
            <div class="settings-section" id="security-section">
              <h3>Security Settings</h3>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-encryption" name="enableEncryption" ${this.settings.enableEncryption ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable encryption
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="require-authentication" name="requireAuthentication" ${this.settings.requireAuthentication ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Require authentication
                </label>
              </div>
              
              <div class="form-group">
                <label for="session-timeout">Session Timeout (minutes)</label>
                <input type="number" id="session-timeout" name="sessionTimeout" 
                       min="5" max="480" step="5" value="${Math.round(this.settings.sessionTimeout / 60000)}">
              </div>
              
              <div class="form-group">
                <label for="max-failed-attempts">Max Failed Login Attempts</label>
                <input type="number" id="max-failed-attempts" name="maxFailedAttempts" 
                       min="1" max="10" step="1" value="${this.settings.maxFailedAttempts}">
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-audit-logging" name="enableAuditLogging" ${this.settings.enableAuditLogging ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable audit logging
                </label>
              </div>
            </div>
            
            <!-- Performance Settings -->
            <div class="settings-section" id="performance-section">
              <h3>Performance Settings</h3>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-web-workers" name="enableWebWorkers" ${this.settings.enableWebWorkers ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable Web Workers
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-service-worker" name="enableServiceWorker" ${this.settings.enableServiceWorker ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable Service Worker
                </label>
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-caching" name="enableCaching" ${this.settings.enableCaching ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable caching
                </label>
              </div>
              
              <div class="form-group">
                <label for="max-memory-usage">Max Memory Usage (MB)</label>
                <input type="number" id="max-memory-usage" name="maxMemoryUsage" 
                       min="64" max="2048" step="64" value="${Math.round(this.settings.maxMemoryUsage / (1024 * 1024))}">
              </div>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="enable-profiling" name="enableProfiling" ${this.settings.enableProfiling ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  Enable performance profiling
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-actions">
          <button class="btn btn-primary" id="save-settings-btn">Save Settings</button>
          <button class="btn btn-secondary" id="reset-settings-btn">Reset to Defaults</button>
          <button class="btn btn-outline" id="export-settings-btn">Export Settings</button>
          <button class="btn btn-outline" id="import-settings-btn">Import Settings</button>
        </div>
      </div>
    `;
  }

  private loadSettings(): SettingsData {
    const config = this.config;
    
    return {
      // Display settings
      defaultQuality: config.get('display').defaultQuality,
      autoQuality: config.get('display').autoQuality,
      fullscreenOnConnect: config.get('display').fullscreenOnConnect,
      showPerformanceOverlay: config.get('display').showPerformanceOverlay,
      enableHardwareAcceleration: config.get('display').enableHardwareAcceleration,
      
      // Input settings
      enableMouseCapture: config.get('input').enableMouseCapture,
      enableKeyboardCapture: config.get('input').enableKeyboardCapture,
      enableTouchCapture: config.get('input').enableTouchCapture,
      enableClipboard: config.get('input').enableClipboard,
      enableFileTransfer: config.get('input').enableFileTransfer,
      mouseSensitivity: config.get('input').mouseSensitivity,
      keyboardRepeatDelay: config.get('input').keyboardRepeatDelay,
      
      // Connection settings
      connectionTimeout: config.get('connection').connectionTimeout,
      reconnectAttempts: config.get('connection').reconnectAttempts,
      reconnectDelay: config.get('connection').reconnectDelay,
      heartbeatInterval: config.get('connection').heartbeatInterval,
      
      // UI settings
      theme: config.get('ui').theme,
      language: config.get('ui').language,
      showConnectionStatus: config.get('ui').showConnectionStatus,
      showPerformanceMetrics: config.get('ui').showPerformanceMetrics,
      enableNotifications: config.get('ui').enableNotifications,
      enableKeyboardShortcuts: config.get('ui').enableKeyboardShortcuts,
      
      // Security settings
      enableEncryption: config.get('security').enableEncryption,
      requireAuthentication: config.get('security').requireAuthentication,
      sessionTimeout: config.get('security').sessionTimeout,
      maxFailedAttempts: config.get('security').maxFailedAttempts,
      enableAuditLogging: config.get('security').enableAuditLogging,
      
      // Performance settings
      enableWebWorkers: config.get('performance').enableWebWorkers,
      enableServiceWorker: config.get('performance').enableServiceWorker,
      enableCaching: config.get('performance').enableCaching,
      maxMemoryUsage: config.get('performance').maxMemoryUsage,
      enableProfiling: config.get('performance').enableProfiling
    };
  }

  saveSettings(): void {
    try {
      // Update configuration
      this.config.update('display', {
        defaultQuality: this.settings.defaultQuality,
        autoQuality: this.settings.autoQuality,
        fullscreenOnConnect: this.settings.fullscreenOnConnect,
        showPerformanceOverlay: this.settings.showPerformanceOverlay,
        enableHardwareAcceleration: this.settings.enableHardwareAcceleration
      });
      
      this.config.update('input', {
        enableMouseCapture: this.settings.enableMouseCapture,
        enableKeyboardCapture: this.settings.enableKeyboardCapture,
        enableTouchCapture: this.settings.enableTouchCapture,
        enableClipboard: this.settings.enableClipboard,
        enableFileTransfer: this.settings.enableFileTransfer,
        mouseSensitivity: this.settings.mouseSensitivity,
        keyboardRepeatDelay: this.settings.keyboardRepeatDelay
      });
      
      this.config.update('connection', {
        connectionTimeout: this.settings.connectionTimeout,
        reconnectAttempts: this.settings.reconnectAttempts,
        reconnectDelay: this.settings.reconnectDelay,
        heartbeatInterval: this.settings.heartbeatInterval
      });
      
      this.config.update('ui', {
        theme: this.settings.theme,
        language: this.settings.language,
        showConnectionStatus: this.settings.showConnectionStatus,
        showPerformanceMetrics: this.settings.showPerformanceMetrics,
        enableNotifications: this.settings.enableNotifications,
        enableKeyboardShortcuts: this.settings.enableKeyboardShortcuts
      });
      
      this.config.update('security', {
        enableEncryption: this.settings.enableEncryption,
        requireAuthentication: this.settings.requireAuthentication,
        sessionTimeout: this.settings.sessionTimeout,
        maxFailedAttempts: this.settings.maxFailedAttempts,
        enableAuditLogging: this.settings.enableAuditLogging
      });
      
      this.config.update('performance', {
        enableWebWorkers: this.settings.enableWebWorkers,
        enableServiceWorker: this.settings.enableServiceWorker,
        enableCaching: this.settings.enableCaching,
        maxMemoryUsage: this.settings.maxMemoryUsage,
        enableProfiling: this.settings.enableProfiling
      });
      
      this.logger.info('Settings saved successfully');
      
    } catch (error) {
      this.logger.error('Failed to save settings', error);
      throw error;
    }
  }

  resetToDefaults(): void {
    this.config.reset();
    this.settings = this.loadSettings();
    this.logger.info('Settings reset to defaults');
  }

  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  importSettings(settingsJson: string): void {
    try {
      const importedSettings = JSON.parse(settingsJson);
      this.settings = { ...this.settings, ...importedSettings };
      this.logger.info('Settings imported successfully');
    } catch (error) {
      this.logger.error('Failed to import settings', error);
      throw new Error('Invalid settings format');
    }
  }

  updateSetting(key: keyof SettingsData, value: any): void {
    (this.settings as any)[key] = value;
  }

  getSettings(): SettingsData {
    return { ...this.settings };
  }
} 