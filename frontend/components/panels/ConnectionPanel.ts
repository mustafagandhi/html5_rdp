import { Logger } from '../../utils/Logger';
import { Config } from '../../utils/Config';
import { ConnectionManager, ConnectionOptions } from '../../services/ConnectionManager';

export interface ConnectionFormData {
  host: string;
  port: number;
  secure: boolean;
  token?: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  enableAudio: boolean;
  enableVideo: boolean;
  enableClipboard: boolean;
  enableFileTransfer: boolean;
}

export class ConnectionPanel {
  private logger = new Logger('ConnectionPanel');
  private config = Config.getInstance();
  private connectionManager: ConnectionManager;
  
  private formData: ConnectionFormData;
  private isConnecting = false;
  private errorMessage = '';

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.formData = this.getDefaultFormData();
    this.setupEventListeners();
  }

  render(): string {
    return `
      <div class="connection-panel">
        <div class="connection-header">
          <h2>Connect to Remote Desktop</h2>
          <p class="connection-subtitle">Enter the connection details to connect to your remote desktop agent</p>
        </div>
        
        <form class="connection-form" id="connection-form">
          <div class="form-group">
            <label for="host">Host Address</label>
            <input 
              type="text" 
              id="host" 
              name="host" 
              value="${this.formData.host}"
              placeholder="localhost or IP address"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="port">Port</label>
            <input 
              type="number" 
              id="port" 
              name="port" 
              value="${this.formData.port}"
              min="1" 
              max="65535" 
              required
            />
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="secure" 
                name="secure"
                ${this.formData.secure ? 'checked' : ''}
              />
              <span class="checkmark"></span>
              Use secure connection (WSS/HTTPS)
            </label>
          </div>
          
          <div class="form-group">
            <label for="token">Authentication Token (Optional)</label>
            <input 
              type="password" 
              id="token" 
              name="token" 
              value="${this.formData.token || ''}"
              placeholder="Enter authentication token"
            />
          </div>
          
          <div class="form-group">
            <label for="quality">Video Quality</label>
            <select id="quality" name="quality">
              <option value="low" ${this.formData.quality === 'low' ? 'selected' : ''}>Low (480p)</option>
              <option value="medium" ${this.formData.quality === 'medium' ? 'selected' : ''}>Medium (720p)</option>
              <option value="high" ${this.formData.quality === 'high' ? 'selected' : ''}>High (1080p)</option>
              <option value="ultra" ${this.formData.quality === 'ultra' ? 'selected' : ''}>Ultra (4K)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="enableVideo" 
                name="enableVideo"
                ${this.formData.enableVideo ? 'checked' : ''}
              />
              <span class="checkmark"></span>
              Enable video streaming
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="enableAudio" 
                name="enableAudio"
                ${this.formData.enableAudio ? 'checked' : ''}
              />
              <span class="checkmark"></span>
              Enable audio streaming
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="enableClipboard" 
                name="enableClipboard"
                ${this.formData.enableClipboard ? 'checked' : ''}
              />
              <span class="checkmark"></span>
              Enable clipboard sharing
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="enableFileTransfer" 
                name="enableFileTransfer"
                ${this.formData.enableFileTransfer ? 'checked' : ''}
              />
              <span class="checkmark"></span>
              Enable file transfer
            </label>
          </div>
          
          ${this.errorMessage ? `
            <div class="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              ${this.errorMessage}
            </div>
          ` : ''}
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="btn btn-primary connect-btn"
              ${this.isConnecting ? 'disabled' : ''}
            >
              ${this.isConnecting ? `
                <div class="spinner"></div>
                Connecting...
              ` : `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
                Connect
              `}
            </button>
            
            <button type="button" class="btn btn-secondary" id="quick-connect-btn">
              Quick Connect
            </button>
          </div>
        </form>
        
        <div class="connection-help">
          <h3>Quick Start</h3>
          <ol>
            <li>Ensure the Real Remote Desktop Agent is running on your target machine</li>
            <li>Enter the host address (usually localhost or the machine's IP)</li>
            <li>Use the default port 8080 unless you've configured a different port</li>
            <li>Click "Connect" to establish the connection</li>
          </ol>
          
          <div class="help-tips">
            <h4>Tips:</h4>
            <ul>
              <li>Use "Quick Connect" to connect with default settings</li>
              <li>Enable secure connection for encrypted communication</li>
              <li>Lower quality settings work better on slower connections</li>
              <li>Clipboard and file transfer require agent support</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  private getDefaultFormData(): ConnectionFormData {
    const defaultConnection = this.config.getDefaultConnection();
    
    return {
      host: defaultConnection.host,
      port: defaultConnection.port,
      secure: defaultConnection.secure,
      token: '',
      quality: this.config.getQuality(),
      enableAudio: this.config.get('webrtc').enableAudio,
      enableVideo: this.config.get('webrtc').enableVideo,
      enableClipboard: this.config.get('security').enableClipboard,
      enableFileTransfer: this.config.get('security').enableFileTransfer
    };
  }

  private setupEventListeners(): void {
    // Form submission
    document.addEventListener('submit', (event) => {
      if (event.target && (event.target as HTMLElement).id === 'connection-form') {
        event.preventDefault();
        this.handleFormSubmit();
      }
    });

    // Quick connect button
    document.addEventListener('click', (event) => {
      if (event.target && (event.target as HTMLElement).id === 'quick-connect-btn') {
        this.handleQuickConnect();
      }
    });

    // Form field changes
    document.addEventListener('change', (event) => {
      if (event.target && (event.target as HTMLElement).closest('#connection-form')) {
        this.handleFormChange(event.target as HTMLInputElement | HTMLSelectElement);
      }
    });
  }

  private handleFormSubmit(): void {
    if (this.isConnecting) return;

    this.errorMessage = '';
    
    // Validate form
    if (!this.validateForm()) {
      return;
    }

    this.isConnecting = true;
    this.updateUI();

    // Convert form data to connection options
    const options: ConnectionOptions = {
      host: this.formData.host,
      port: this.formData.port,
      secure: this.formData.secure,
      token: this.formData.token || undefined,
      quality: this.formData.quality,
      enableAudio: this.formData.enableAudio,
      enableVideo: this.formData.enableVideo,
      enableClipboard: this.formData.enableClipboard,
      enableFileTransfer: this.formData.enableFileTransfer
    };

    // Attempt connection
    this.connectionManager.connect(options)
      .then(() => {
        this.logger.info('Connection established successfully');
        this.saveFormData();
      })
      .catch((error) => {
        this.logger.error('Connection failed', error);
        this.errorMessage = this.getErrorMessage(error);
        this.isConnecting = false;
        this.updateUI();
      });
  }

  private handleQuickConnect(): void {
    // Use default settings for quick connect
    const options: ConnectionOptions = {
      host: 'localhost',
      port: 8080,
      secure: false,
      quality: 'medium',
      enableAudio: false,
      enableVideo: true,
      enableClipboard: true,
      enableFileTransfer: true
    };

    this.isConnecting = true;
    this.updateUI();

    this.connectionManager.connect(options)
      .then(() => {
        this.logger.info('Quick connect successful');
      })
      .catch((error) => {
        this.logger.error('Quick connect failed', error);
        this.errorMessage = this.getErrorMessage(error);
        this.isConnecting = false;
        this.updateUI();
      });
  }

  private handleFormChange(element: HTMLInputElement | HTMLSelectElement): void {
    const name = element.name;
    const value = element.type === 'checkbox' ? (element as HTMLInputElement).checked : element.value;

    switch (name) {
      case 'host':
        this.formData.host = value as string;
        break;
      case 'port':
        this.formData.port = parseInt(value as string, 10);
        break;
      case 'secure':
        this.formData.secure = value as boolean;
        break;
      case 'token':
        this.formData.token = value as string;
        break;
      case 'quality':
        this.formData.quality = value as 'low' | 'medium' | 'high' | 'ultra';
        break;
      case 'enableVideo':
        this.formData.enableVideo = value as boolean;
        break;
      case 'enableAudio':
        this.formData.enableAudio = value as boolean;
        break;
      case 'enableClipboard':
        this.formData.enableClipboard = value as boolean;
        break;
      case 'enableFileTransfer':
        this.formData.enableFileTransfer = value as boolean;
        break;
    }
  }

  private validateForm(): boolean {
    // Validate host
    if (!this.formData.host || this.formData.host.trim() === '') {
      this.errorMessage = 'Host address is required';
      this.updateUI();
      return false;
    }

    // Validate port
    if (this.formData.port < 1 || this.formData.port > 65535) {
      this.errorMessage = 'Port must be between 1 and 65535';
      this.updateUI();
      return false;
    }

    // Validate host format
    const hostRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$|^localhost$|^(\d{1,3}\.){3}\d{1,3}$/;
    if (!hostRegex.test(this.formData.host)) {
      this.errorMessage = 'Invalid host address format';
      this.updateUI();
      return false;
    }

    return true;
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    if (error && error.message) {
      return error.message;
    }
    
    return 'Connection failed. Please check your settings and try again.';
  }

  private saveFormData(): void {
    // Save connection settings to config
    this.config.setDefaultConnection(
      this.formData.host,
      this.formData.port,
      this.formData.secure
    );
    
    this.config.setQuality(this.formData.quality);
    this.config.set('webrtc.enableAudio', this.formData.enableAudio);
    this.config.set('webrtc.enableVideo', this.formData.enableVideo);
    this.config.set('security.enableClipboard', this.formData.enableClipboard);
    this.config.set('security.enableFileTransfer', this.formData.enableFileTransfer);
  }

  private updateUI(): void {
    const form = document.getElementById('connection-form');
    if (form) {
      // Update form with current data
      const hostInput = form.querySelector('#host') as HTMLInputElement;
      const portInput = form.querySelector('#port') as HTMLInputElement;
      const secureInput = form.querySelector('#secure') as HTMLInputElement;
      const tokenInput = form.querySelector('#token') as HTMLInputElement;
      const qualitySelect = form.querySelector('#quality') as HTMLSelectElement;
      const enableVideoInput = form.querySelector('#enableVideo') as HTMLInputElement;
      const enableAudioInput = form.querySelector('#enableAudio') as HTMLInputElement;
      const enableClipboardInput = form.querySelector('#enableClipboard') as HTMLInputElement;
      const enableFileTransferInput = form.querySelector('#enableFileTransfer') as HTMLInputElement;

      if (hostInput) hostInput.value = this.formData.host;
      if (portInput) portInput.value = this.formData.port.toString();
      if (secureInput) secureInput.checked = this.formData.secure;
      if (tokenInput) tokenInput.value = this.formData.token || '';
      if (qualitySelect) qualitySelect.value = this.formData.quality;
      if (enableVideoInput) enableVideoInput.checked = this.formData.enableVideo;
      if (enableAudioInput) enableAudioInput.checked = this.formData.enableAudio;
      if (enableClipboardInput) enableClipboardInput.checked = this.formData.enableClipboard;
      if (enableFileTransferInput) enableFileTransferInput.checked = this.formData.enableFileTransfer;

      // Update connect button
      const connectBtn = form.querySelector('.connect-btn') as HTMLButtonElement;
      if (connectBtn) {
        connectBtn.disabled = this.isConnecting;
        connectBtn.innerHTML = this.isConnecting ? `
          <div class="spinner"></div>
          Connecting...
        ` : `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
            <path d="m12 5 7 7-7 7"/>
          </svg>
          Connect
        `;
      }
    }

    // Update error message
    const errorElement = document.querySelector('.error-message');
    if (errorElement) {
      if (this.errorMessage) {
        errorElement.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          ${this.errorMessage}
        `;
        errorElement.style.display = 'block';
      } else {
        errorElement.style.display = 'none';
      }
    }
  }

  // Public methods
  setFormData(data: Partial<ConnectionFormData>): void {
    this.formData = { ...this.formData, ...data };
    this.updateUI();
  }

  getFormData(): ConnectionFormData {
    return { ...this.formData };
  }

  reset(): void {
    this.formData = this.getDefaultFormData();
    this.errorMessage = '';
    this.isConnecting = false;
    this.updateUI();
  }

  setError(message: string): void {
    this.errorMessage = message;
    this.updateUI();
  }

  clearError(): void {
    this.errorMessage = '';
    this.updateUI();
  }
} 