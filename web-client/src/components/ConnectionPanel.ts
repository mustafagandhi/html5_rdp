import { Logger } from '../utils/Logger';
import { ConnectionManager } from '../services/ConnectionManager';
import { Config } from '../utils/Config';

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
  
  private savedConnections: ConnectionFormData[] = [];
  private currentFormData: ConnectionFormData;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.currentFormData = this.getDefaultFormData();
    this.loadSavedConnections();
  }

  render(): string {
    return `
      <div class="connection-panel-container">
        <div class="connection-header">
          <h2>Connect to Remote Desktop</h2>
          <p>Enter the connection details to establish a remote desktop session.</p>
        </div>
        
        <form class="connection-form" id="connection-form">
          <div class="form-group">
            <label for="host">Host Address</label>
            <input 
              type="text" 
              id="host" 
              name="host" 
              value="${this.currentFormData.host}"
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
              value="${this.currentFormData.port}"
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
                ${this.currentFormData.secure ? 'checked' : ''}
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
              value="${this.currentFormData.token || ''}"
              placeholder="Enter authentication token"
            />
          </div>
          
          <div class="form-group">
            <label for="quality">Quality</label>
            <select id="quality" name="quality">
              <option value="low" ${this.currentFormData.quality === 'low' ? 'selected' : ''}>Low (Fast)</option>
              <option value="medium" ${this.currentFormData.quality === 'medium' ? 'selected' : ''}>Medium (Balanced)</option>
              <option value="high" ${this.currentFormData.quality === 'high' ? 'selected' : ''}>High (Quality)</option>
              <option value="ultra" ${this.currentFormData.quality === 'ultra' ? 'selected' : ''}>Ultra (Best)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="enableAudio" 
                name="enableAudio"
                ${this.currentFormData.enableAudio ? 'checked' : ''}
              />
              <span class="checkmark"></span>
              Enable audio streaming
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="enableVideo" 
                name="enableVideo"
                ${this.currentFormData.enableVideo ? 'checked' : ''}
              />
              <span class="checkmark"></span>
              Enable video streaming
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="enableClipboard" 
                name="enableClipboard"
                ${this.currentFormData.enableClipboard ? 'checked' : ''}
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
                ${this.currentFormData.enableFileTransfer ? 'checked' : ''}
              />
              <span class="checkmark"></span>
              Enable file transfer
            </label>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="connect-btn">
              <span class="btn-text">Connect</span>
              <span class="btn-loading" style="display: none;">
                <div class="spinner"></div>
                Connecting...
              </span>
            </button>
            
            <button type="button" class="btn btn-secondary" id="save-btn">
              Save Connection
            </button>
            
            <button type="button" class="btn btn-outline" id="quick-connect-btn">
              Quick Connect
            </button>
          </div>
        </form>
        
        <div class="saved-connections" id="saved-connections">
          <h3>Saved Connections</h3>
          <div class="connections-list">
            ${this.renderSavedConnections()}
          </div>
        </div>
        
        <div class="connection-help">
          <h3>Connection Help</h3>
          <div class="help-content">
            <p><strong>Host:</strong> Enter the IP address or hostname of the remote desktop server.</p>
            <p><strong>Port:</strong> The port number the server is listening on (default: 8080).</p>
            <p><strong>Secure:</strong> Enable for encrypted connections (recommended for remote access).</p>
            <p><strong>Token:</strong> Authentication token if required by the server.</p>
            <p><strong>Quality:</strong> Choose based on your network speed and performance needs.</p>
          </div>
        </div>
      </div>
    `;
  }

  private renderSavedConnections(): string {
    if (this.savedConnections.length === 0) {
      return '<p class="no-connections">No saved connections</p>';
    }
    
    return this.savedConnections.map((connection, index) => `
      <div class="saved-connection" data-index="${index}">
        <div class="connection-info">
          <div class="connection-name">
            ${connection.host}:${connection.port}
          </div>
          <div class="connection-details">
            ${connection.secure ? 'Secure' : 'Insecure'} • ${connection.quality} quality
          </div>
        </div>
        <div class="connection-actions">
          <button class="btn btn-sm btn-primary" onclick="this.connectToSaved(${index})">
            Connect
          </button>
          <button class="btn btn-sm btn-outline" onclick="this.editSaved(${index})">
            Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="this.deleteSaved(${index})">
            Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  private getDefaultFormData(): ConnectionFormData {
    const config = this.config.get('connection');
    const display = this.config.get('display');
    const input = this.config.get('input');
    
    return {
      host: config.defaultHost,
      port: config.defaultPort,
      secure: config.defaultSecure,
      token: '',
      quality: display.defaultQuality,
      enableAudio: false,
      enableVideo: true,
      enableClipboard: input.enableClipboard,
      enableFileTransfer: input.enableFileTransfer
    };
  }

  private loadSavedConnections(): void {
    try {
      const saved = localStorage.getItem('real-remote-desktop-saved-connections');
      if (saved) {
        this.savedConnections = JSON.parse(saved);
      }
    } catch (error) {
      this.logger.error('Failed to load saved connections', error);
    }
  }

  private saveConnections(): void {
    try {
      localStorage.setItem('real-remote-desktop-saved-connections', JSON.stringify(this.savedConnections));
    } catch (error) {
      this.logger.error('Failed to save connections', error);
    }
  }

  // Public methods for external access
  connectToSaved(index: number): void {
    if (index >= 0 && index < this.savedConnections.length) {
      this.currentFormData = { ...this.savedConnections[index] };
      this.connect();
    }
  }

  editSaved(index: number): void {
    if (index >= 0 && index < this.savedConnections.length) {
      this.currentFormData = { ...this.savedConnections[index] };
      // Trigger re-render
      this.render();
    }
  }

  deleteSaved(index: number): void {
    if (index >= 0 && index < this.savedConnections.length) {
      this.savedConnections.splice(index, 1);
      this.saveConnections();
      // Trigger re-render
      this.render();
    }
  }

  saveCurrentConnection(): void {
    const connectionName = `${this.currentFormData.host}:${this.currentFormData.port}`;
    
    // Check if already exists
    const existingIndex = this.savedConnections.findIndex(
      conn => conn.host === this.currentFormData.host && conn.port === this.currentFormData.port
    );
    
    if (existingIndex >= 0) {
      this.savedConnections[existingIndex] = { ...this.currentFormData };
    } else {
      this.savedConnections.push({ ...this.currentFormData });
    }
    
    this.saveConnections();
    this.logger.info('Connection saved', connectionName);
  }

  quickConnect(): void {
    // Use default settings for quick connect
    this.currentFormData = this.getDefaultFormData();
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.logger.info('Attempting connection', this.currentFormData);
      
      await this.connectionManager.connect({
        host: this.currentFormData.host,
        port: this.currentFormData.port,
        secure: this.currentFormData.secure,
        token: this.currentFormData.token,
        quality: this.currentFormData.quality,
        enableAudio: this.currentFormData.enableAudio,
        enableVideo: this.currentFormData.enableVideo,
        enableClipboard: this.currentFormData.enableClipboard,
        enableFileTransfer: this.currentFormData.enableFileTransfer
      });
      
    } catch (error) {
      this.logger.error('Connection failed', error);
      throw error;
    }
  }

  // Form validation
  validateForm(): boolean {
    const host = this.currentFormData.host.trim();
    const port = this.currentFormData.port;
    
    if (!host) {
      throw new Error('Host address is required');
    }
    
    if (port < 1 || port > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }
    
    return true;
  }

  // Update form data from DOM
  updateFormData(): void {
    const form = document.getElementById('connection-form') as HTMLFormElement;
    if (!form) return;
    
    const formData = new FormData(form);
    
    this.currentFormData = {
      host: formData.get('host') as string,
      port: parseInt(formData.get('port') as string),
      secure: formData.has('secure'),
      token: formData.get('token') as string || undefined,
      quality: formData.get('quality') as 'low' | 'medium' | 'high' | 'ultra',
      enableAudio: formData.has('enableAudio'),
      enableVideo: formData.has('enableVideo'),
      enableClipboard: formData.has('enableClipboard'),
      enableFileTransfer: formData.has('enableFileTransfer')
    };
  }
} 