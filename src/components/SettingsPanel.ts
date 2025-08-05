import { Logger } from '../utils/Logger';
import { Config } from '../utils/Config';

export interface SettingsSection {
  id: string;
  title: string;
  description: string;
  settings: SettingItem[];
}

export interface SettingItem {
  id: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  label: string;
  description?: string;
  value: any;
  options?: { value: any; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export class SettingsPanel {
  private logger = new Logger('SettingsPanel');
  private config = Config.getInstance();
  
  private sections: SettingsSection[] = [];
  private isVisible = false;
  private hasUnsavedChanges = false;

  constructor() {
    this.initializeSections();
    this.setupEventListeners();
  }

  render(): string {
    return `
      <div class="settings-panel" id="settings-panel">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="btn btn-icon close-btn" id="close-settings-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div class="settings-content">
          <div class="settings-sidebar">
            <nav class="settings-nav">
              ${this.sections.map(section => `
                <button class="nav-item" data-section="${section.id}">
                  <span class="nav-title">${section.title}</span>
                  <span class="nav-description">${section.description}</span>
                </button>
              `).join('')}
            </nav>
          </div>
          
          <div class="settings-main">
            ${this.sections.map(section => `
              <div class="settings-section" id="section-${section.id}" style="display: ${section.id === 'connection' ? 'block' : 'none'}">
                <div class="section-header">
                  <h3>${section.title}</h3>
                  <p class="section-description">${section.description}</p>
                </div>
                
                <div class="section-content">
                  ${section.settings.map(setting => this.renderSetting(setting)).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="settings-footer">
          <div class="footer-actions">
            <button class="btn btn-secondary" id="reset-settings-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1,4 1,10 7,10"/>
                <path d="M3.51,15a9,9,0,1,0,2.13-9.36L1,10"/>
              </svg>
              Reset to Defaults
            </button>
            <button class="btn btn-outline" id="export-settings-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Settings
            </button>
            <button class="btn btn-outline" id="import-settings-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import Settings
            </button>
          </div>
          
          <div class="footer-buttons">
            <button class="btn btn-secondary" id="cancel-settings-btn">Cancel</button>
            <button class="btn btn-primary" id="save-settings-btn" ${this.hasUnsavedChanges ? '' : 'disabled'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>
              Save Changes
            </button>
          </div>
        </div>
        
        <input type="file" id="import-settings-file" accept=".json" style="display: none;">
      </div>
    `;
  }

  show(): void {
    this.isVisible = true;
    this.hasUnsavedChanges = false;
    this.updateUI();
    this.logger.info('Settings panel shown');
  }

  hide(): void {
    this.isVisible = false;
    this.logger.info('Settings panel hidden');
  }

  private initializeSections(): void {
    this.sections = [
      {
        id: 'connection',
        title: 'Connection',
        description: 'Configure connection settings and defaults',
        settings: [
          {
            id: 'defaultHost',
            type: 'text',
            label: 'Default Host',
            description: 'Default host address for connections',
            value: this.config.get('connection.defaultHost'),
            placeholder: 'localhost'
          },
          {
            id: 'defaultPort',
            type: 'number',
            label: 'Default Port',
            description: 'Default port number for connections',
            value: this.config.get('connection.defaultPort'),
            min: 1,
            max: 65535
          },
          {
            id: 'defaultSecure',
            type: 'checkbox',
            label: 'Use Secure Connection by Default',
            description: 'Enable WSS/HTTPS by default',
            value: this.config.get('connection.defaultSecure')
          },
          {
            id: 'reconnectAttempts',
            type: 'number',
            label: 'Reconnection Attempts',
            description: 'Maximum number of reconnection attempts',
            value: this.config.get('connection.reconnectAttempts'),
            min: 1,
            max: 20
          },
          {
            id: 'reconnectDelay',
            type: 'number',
            label: 'Reconnection Delay (ms)',
            description: 'Delay between reconnection attempts',
            value: this.config.get('connection.reconnectDelay'),
            min: 100,
            max: 10000,
            step: 100
          }
        ]
      },
      {
        id: 'display',
        title: 'Display',
        description: 'Configure video quality and display settings',
        settings: [
          {
            id: 'defaultQuality',
            type: 'select',
            label: 'Default Quality',
            description: 'Default video quality setting',
            value: this.config.get('display.defaultQuality'),
            options: [
              { value: 'low', label: 'Low (480p)' },
              { value: 'medium', label: 'Medium (720p)' },
              { value: 'high', label: 'High (1080p)' },
              { value: 'ultra', label: 'Ultra (4K)' }
            ]
          },
          {
            id: 'defaultScaleMode',
            type: 'select',
            label: 'Default Scale Mode',
            description: 'How the remote desktop should be scaled',
            value: this.config.get('display.defaultScaleMode'),
            options: [
              { value: 'fit', label: 'Fit to Screen' },
              { value: 'fill', label: 'Fill Screen' },
              { value: 'stretch', label: 'Stretch' }
            ]
          },
          {
            id: 'maintainAspectRatio',
            type: 'checkbox',
            label: 'Maintain Aspect Ratio',
            description: 'Keep the original aspect ratio when scaling',
            value: this.config.get('display.maintainAspectRatio')
          },
          {
            id: 'enableHardwareAcceleration',
            type: 'checkbox',
            label: 'Enable Hardware Acceleration',
            description: 'Use GPU acceleration when available',
            value: this.config.get('display.enableHardwareAcceleration')
          },
          {
            id: 'maxFrameQueueSize',
            type: 'number',
            label: 'Max Frame Queue Size',
            description: 'Maximum number of frames to buffer',
            value: this.config.get('display.maxFrameQueueSize'),
            min: 1,
            max: 50
          }
        ]
      },
      {
        id: 'webrtc',
        title: 'WebRTC',
        description: 'Configure WebRTC connection settings',
        settings: [
          {
            id: 'maxBitrate',
            type: 'number',
            label: 'Maximum Bitrate (bps)',
            description: 'Maximum video bitrate in bits per second',
            value: this.config.get('webrtc.maxBitrate'),
            min: 100000,
            max: 10000000,
            step: 100000
          },
          {
            id: 'maxFramerate',
            type: 'number',
            label: 'Maximum Framerate',
            description: 'Maximum video framerate',
            value: this.config.get('webrtc.maxFramerate'),
            min: 1,
            max: 60
          },
          {
            id: 'enableAudio',
            type: 'checkbox',
            label: 'Enable Audio',
            description: 'Enable audio streaming',
            value: this.config.get('webrtc.enableAudio')
          },
          {
            id: 'enableVideo',
            type: 'checkbox',
            label: 'Enable Video',
            description: 'Enable video streaming',
            value: this.config.get('webrtc.enableVideo')
          }
        ]
      },
      {
        id: 'security',
        title: 'Security',
        description: 'Configure security and privacy settings',
        settings: [
          {
            id: 'enableClipboard',
            type: 'checkbox',
            label: 'Enable Clipboard Sharing',
            description: 'Allow clipboard synchronization between client and server',
            value: this.config.get('security.enableClipboard')
          },
          {
            id: 'enableFileTransfer',
            type: 'checkbox',
            label: 'Enable File Transfer',
            description: 'Allow file transfer between client and server',
            value: this.config.get('security.enableFileTransfer')
          },
          {
            id: 'enableAudioCapture',
            type: 'checkbox',
            label: 'Enable Audio Capture',
            description: 'Allow audio capture from the remote system',
            value: this.config.get('security.enableAudioCapture')
          },
          {
            id: 'enablePrinting',
            type: 'checkbox',
            label: 'Enable Printing',
            description: 'Allow printing from the remote session',
            value: this.config.get('security.enablePrinting')
          },
          {
            id: 'maxFileSize',
            type: 'number',
            label: 'Maximum File Size (bytes)',
            description: 'Maximum file size for transfers',
            value: this.config.get('security.maxFileSize'),
            min: 1024,
            max: 1073741824, // 1GB
            step: 1024
          }
        ]
      },
      {
        id: 'ui',
        title: 'Interface',
        description: 'Configure user interface settings',
        settings: [
          {
            id: 'theme',
            type: 'select',
            label: 'Theme',
            description: 'Application theme',
            value: this.config.get('ui.theme'),
            options: [
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto (System)' }
            ]
          },
          {
            id: 'showPerformanceOverlay',
            type: 'checkbox',
            label: 'Show Performance Overlay',
            description: 'Show performance statistics overlay',
            value: this.config.get('ui.showPerformanceOverlay')
          },
          {
            id: 'showConnectionInfo',
            type: 'checkbox',
            label: 'Show Connection Info',
            description: 'Display connection information in the interface',
            value: this.config.get('ui.showConnectionInfo')
          },
          {
            id: 'enableKeyboardShortcuts',
            type: 'checkbox',
            label: 'Enable Keyboard Shortcuts',
            description: 'Enable keyboard shortcuts for common actions',
            value: this.config.get('ui.enableKeyboardShortcuts')
          },
          {
            id: 'enableContextMenu',
            type: 'checkbox',
            label: 'Enable Context Menu',
            description: 'Show context menu on right-click',
            value: this.config.get('ui.enableContextMenu')
          },
          {
            id: 'language',
            type: 'select',
            label: 'Language',
            description: 'Application language',
            value: this.config.get('ui.language'),
            options: [
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' },
              { value: 'ja', label: '日本語' },
              { value: 'zh', label: '中文' }
            ]
          }
        ]
      },
      {
        id: 'logging',
        title: 'Logging',
        description: 'Configure logging and debugging settings',
        settings: [
          {
            id: 'level',
            type: 'select',
            label: 'Log Level',
            description: 'Minimum log level to display',
            value: this.config.get('logging.level'),
            options: [
              { value: 'debug', label: 'Debug' },
              { value: 'info', label: 'Info' },
              { value: 'warn', label: 'Warning' },
              { value: 'error', label: 'Error' }
            ]
          },
          {
            id: 'enableConsole',
            type: 'checkbox',
            label: 'Enable Console Logging',
            description: 'Log messages to browser console',
            value: this.config.get('logging.enableConsole')
          },
          {
            id: 'enableRemote',
            type: 'checkbox',
            label: 'Enable Remote Logging',
            description: 'Send logs to remote server',
            value: this.config.get('logging.enableRemote')
          },
          {
            id: 'maxLogEntries',
            type: 'number',
            label: 'Max Log Entries',
            description: 'Maximum number of log entries to keep in memory',
            value: this.config.get('logging.maxLogEntries'),
            min: 100,
            max: 10000,
            step: 100
          }
        ]
      }
    ];
  }

  private renderSetting(setting: SettingItem): string {
    const inputId = `setting-${setting.id}`;
    
    switch (setting.type) {
      case 'text':
        return `
          <div class="setting-item">
            <label for="${inputId}" class="setting-label">${setting.label}</label>
            <input 
              type="text" 
              id="${inputId}" 
              value="${setting.value}" 
              placeholder="${setting.placeholder || ''}"
              class="setting-input"
              data-setting="${setting.id}"
            />
            ${setting.description ? `<p class="setting-description">${setting.description}</p>` : ''}
          </div>
        `;
        
      case 'number':
        return `
          <div class="setting-item">
            <label for="${inputId}" class="setting-label">${setting.label}</label>
            <input 
              type="number" 
              id="${inputId}" 
              value="${setting.value}" 
              min="${setting.min || ''}" 
              max="${setting.max || ''}" 
              step="${setting.step || ''}"
              class="setting-input"
              data-setting="${setting.id}"
            />
            ${setting.description ? `<p class="setting-description">${setting.description}</p>` : ''}
          </div>
        `;
        
      case 'select':
        return `
          <div class="setting-item">
            <label for="${inputId}" class="setting-label">${setting.label}</label>
            <select id="${inputId}" class="setting-input" data-setting="${setting.id}">
              ${setting.options?.map(option => `
                <option value="${option.value}" ${option.value === setting.value ? 'selected' : ''}>
                  ${option.label}
                </option>
              `).join('')}
            </select>
            ${setting.description ? `<p class="setting-description">${setting.description}</p>` : ''}
          </div>
        `;
        
      case 'checkbox':
        return `
          <div class="setting-item">
            <label class="setting-label checkbox-label">
              <input 
                type="checkbox" 
                id="${inputId}" 
                ${setting.value ? 'checked' : ''}
                class="setting-input"
                data-setting="${setting.id}"
              />
              <span class="checkmark"></span>
              ${setting.label}
            </label>
            ${setting.description ? `<p class="setting-description">${setting.description}</p>` : ''}
          </div>
        `;
        
      case 'textarea':
        return `
          <div class="setting-item">
            <label for="${inputId}" class="setting-label">${setting.label}</label>
            <textarea 
              id="${inputId}" 
              placeholder="${setting.placeholder || ''}"
              class="setting-input"
              data-setting="${setting.id}"
            >${setting.value}</textarea>
            ${setting.description ? `<p class="setting-description">${setting.description}</p>` : ''}
          </div>
        `;
        
      default:
        return '';
    }
  }

  private setupEventListeners(): void {
    // Navigation
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.classList.contains('nav-item')) {
        this.switchSection(target.dataset.section!);
      }
      
      if (target.id === 'close-settings-btn' || target.id === 'cancel-settings-btn') {
        this.hide();
      }
      
      if (target.id === 'save-settings-btn') {
        this.saveSettings();
      }
      
      if (target.id === 'reset-settings-btn') {
        this.resetSettings();
      }
      
      if (target.id === 'export-settings-btn') {
        this.exportSettings();
      }
      
      if (target.id === 'import-settings-btn') {
        this.importSettings();
      }
    });

    // Setting changes
    document.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (target.classList.contains('setting-input')) {
        this.handleSettingChange(target);
      }
    });

    // File import
    document.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.id === 'import-settings-file') {
        this.handleFileImport(target);
      }
    });
  }

  private switchSection(sectionId: string): void {
    // Hide all sections
    document.querySelectorAll('.settings-section').forEach(section => {
      (section as HTMLElement).style.display = 'none';
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`section-${sectionId}`);
    if (selectedSection) {
      selectedSection.style.display = 'block';
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeNavItem) {
      activeNavItem.classList.add('active');
    }
  }

  private handleSettingChange(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void {
    const settingId = element.dataset.setting;
    if (!settingId) return;
    
    let value: any;
    
    if (element.type === 'checkbox') {
      value = (element as HTMLInputElement).checked;
    } else if (element.type === 'number') {
      value = parseFloat(element.value);
    } else {
      value = element.value;
    }
    
    // Update the setting in the sections
    for (const section of this.sections) {
      const setting = section.settings.find(s => s.id === settingId);
      if (setting) {
        setting.value = value;
        break;
      }
    }
    
    this.hasUnsavedChanges = true;
    this.updateUI();
  }

  private saveSettings(): void {
    try {
      // Apply all settings to config
      for (const section of this.sections) {
        for (const setting of section.settings) {
          const configPath = `${section.id}.${setting.id}`;
          this.config.set(configPath, setting.value);
        }
      }
      
      this.hasUnsavedChanges = false;
      this.updateUI();
      this.logger.info('Settings saved successfully');
      
      // Show success message
      this.showMessage('Settings saved successfully', 'success');
      
          } catch (error) {
        this.logger.error('Failed to save settings', error as Error);
        this.showMessage('Failed to save settings', 'error');
      }
  }

  private resetSettings(): void {
    if (confirm('Are you sure you want to reset all settings to their default values?')) {
      this.config.reset();
      this.initializeSections();
      this.hasUnsavedChanges = false;
      this.updateUI();
      this.logger.info('Settings reset to defaults');
      this.showMessage('Settings reset to defaults', 'success');
    }
  }

  private exportSettings(): void {
    try {
      const settingsData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        settings: this.config.export()
      };
      
      const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `real-remote-desktop-settings-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.logger.info('Settings exported successfully');
      this.showMessage('Settings exported successfully', 'success');
      
          } catch (error) {
        this.logger.error('Failed to export settings', error as Error);
        this.showMessage('Failed to export settings', 'error');
      }
  }

  private importSettings(): void {
    const fileInput = document.getElementById('import-settings-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  private handleFileImport(fileInput: HTMLInputElement): void {
    const file = fileInput.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const settingsData = JSON.parse(event.target?.result as string);
        this.config.import(settingsData.settings);
        this.initializeSections();
        this.hasUnsavedChanges = false;
        this.updateUI();
        
        this.logger.info('Settings imported successfully');
        this.showMessage('Settings imported successfully', 'success');
        
      } catch (error) {
        this.logger.error('Failed to import settings', error as Error);
        this.showMessage('Failed to import settings. Invalid file format.', 'error');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    fileInput.value = '';
  }

  private updateUI(): void {
    const saveBtn = document.getElementById('save-settings-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = !this.hasUnsavedChanges;
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    // Create a temporary message element
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;
    
    // Add to settings panel
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
      settingsPanel.appendChild(messageElement);
      
      // Remove after 3 seconds
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement);
        }
      }, 3000);
    }
  }

  // Public methods
  getSettings(): any {
    const settings: any = {};
    for (const section of this.sections) {
      settings[section.id] = {};
      for (const setting of section.settings) {
        settings[section.id][setting.id] = setting.value;
      }
    }
    return settings;
  }

  setSettings(settings: any): void {
    for (const [sectionId, sectionSettings] of Object.entries(settings)) {
      const section = this.sections.find(s => s.id === sectionId);
      if (section) {
        for (const [settingId, value] of Object.entries(sectionSettings as any)) {
          const setting = section.settings.find(s => s.id === settingId);
          if (setting) {
            setting.value = value;
          }
        }
      }
    }
    this.hasUnsavedChanges = true;
    this.updateUI();
  }

  destroy(): void {
    this.hide();
    this.logger.info('Settings panel destroyed');
  }
} 