import { Logger } from '../utils/Logger';
import { Config } from '../utils/Config';
import { ConnectionManager, ConnectionState, ConnectionType } from '../services/ConnectionManager';
import { CanvasRenderer } from './CanvasRenderer';
import { InputHandler } from './InputHandler';
import { ConnectionPanel } from './ConnectionPanel';
import { PerformanceOverlay } from './PerformanceOverlay';
import { SettingsPanel } from './SettingsPanel';
import { FileTransferPanel } from './FileTransferPanel';
import { DeviceRedirectionPanel } from './DeviceRedirectionPanel';

export interface AppState {
  isConnected: boolean;
  isConnecting: boolean;
  isHost: boolean;
  isClient: boolean;
  connectionInfo: any;
  showSettings: boolean;
  showPerformanceOverlay: boolean;
  showFileTransfer: boolean;
  showDeviceRedirection: boolean;
  theme: 'light' | 'dark' | 'auto';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  connectionCode: string;
  screenShareActive: boolean;
}

export class App {
  private logger = new Logger('App');
  private config = Config.getInstance();
  
  private connectionManager: ConnectionManager;
  private canvasRenderer!: CanvasRenderer;
  private inputHandler!: InputHandler;
  private connectionPanel!: ConnectionPanel;
  private performanceOverlay!: PerformanceOverlay;
  private settingsPanel!: SettingsPanel;
  private fileTransferPanel!: FileTransferPanel;
  private deviceRedirectionPanel!: DeviceRedirectionPanel;
  
  private appElement: HTMLElement | null = null;
  private state: AppState;
  
  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.state = this.getInitialState();
    
    this.setupComponents();
    this.setupEventListeners();
    this.applyTheme();
    
    this.logger.info('Agentless App initialized');
  }

  mount(selector: string): void {
    this.appElement = document.querySelector(selector);
    if (!this.appElement) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    this.render();
    this.logger.info('App mounted');
  }

  private getInitialState(): AppState {
    return {
      isConnected: false,
      isConnecting: false,
      isHost: false,
      isClient: false,
      connectionInfo: null,
      showSettings: false,
      showPerformanceOverlay: false,
      showFileTransfer: false,
      showDeviceRedirection: false,
      theme: (this.config.get('ui') as any).theme,
      quality: (this.config.get('display') as any).defaultQuality,
      connectionCode: '',
      screenShareActive: false
    };
  }

  private setupComponents(): void {
    // Initialize canvas renderer
    this.canvasRenderer = new CanvasRenderer();
    
    // Initialize input handler
    this.inputHandler = new InputHandler(this.connectionManager);
    
    // Initialize UI components
    this.connectionPanel = new ConnectionPanel(this.connectionManager);
    this.performanceOverlay = new PerformanceOverlay();
    this.settingsPanel = new SettingsPanel();
    this.fileTransferPanel = new FileTransferPanel();
    this.deviceRedirectionPanel = new DeviceRedirectionPanel();
  }

  private setupEventListeners(): void {
    // Connection manager events
    this.connectionManager.on('hostSessionStarted', (data: any) => {
      this.state.connectionCode = data.connectionCode;
      this.state.isHost = true;
      this.state.isClient = false;
      this.updateUI();
      this.logger.info('Host session started', data);
    });
    
    this.connectionManager.on('connected', (connectionInfo) => {
      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.state.connectionInfo = connectionInfo;
      this.state.isHost = connectionInfo.isHost;
      this.state.isClient = connectionInfo.isClient;
      this.updateUI();
      this.logger.info('Connection established');
    });
    
    this.connectionManager.on('disconnected', (connectionInfo) => {
      this.state.isConnected = false;
      this.state.isConnecting = false;
      this.state.connectionInfo = connectionInfo;
      this.state.screenShareActive = false;
      this.updateUI();
      this.logger.info('Connection lost');
    });
    
    this.connectionManager.on('connectionStateChanged', (connectionInfo) => {
      this.state.connectionInfo = connectionInfo;
      this.state.isConnecting = connectionInfo.state === ConnectionState.CONNECTING;
      this.updateUI();
    });
    
    this.connectionManager.on('connectionFailed', (error) => {
      this.state.isConnected = false;
      this.state.isConnecting = false;
      this.updateUI();
      this.logger.error('Connection failed', error);
    });
    
    this.connectionManager.on('screenShareStarted', () => {
      this.state.screenShareActive = true;
      this.updateUI();
      this.logger.info('Screen sharing started');
    });
    
    this.connectionManager.on('screenShareStopped', () => {
      this.state.screenShareActive = false;
      this.updateUI();
      this.logger.info('Screen sharing stopped');
    });
    
    this.connectionManager.on('fileTransferStarted', () => {
      this.state.showFileTransfer = true;
      this.updateUI();
      this.logger.info('File transfer started');
    });
    
    this.connectionManager.on('deviceRedirectionStarted', () => {
      this.state.showDeviceRedirection = true;
      this.updateUI();
      this.logger.info('Device redirection started');
    });
    
    this.connectionManager.on('qualityChanged', (quality) => {
      this.state.quality = quality;
      this.updateUI();
    });
    
    // Canvas renderer events
    this.canvasRenderer.on('frameReceived', () => {
      this.performanceOverlay.updateFrameRate();
    });
    
    // Input handler events
    this.inputHandler.on('input', (event) => {
      this.logger.debug('Input event received', event);
    });
  }

  private render(): void {
    if (!this.appElement) return;

    this.appElement.innerHTML = `
      <div class="app-container" data-theme="${this.state.theme}">
        <!-- Header -->
        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title">Real Remote Desktop</h1>
            <span class="app-subtitle">Agentless Browser-to-Browser</span>
          </div>
          <div class="header-center">
            ${this.state.isConnected ? `
              <div class="connection-status connected">
                <span class="status-indicator"></span>
                <span class="status-text">Connected</span>
                ${this.state.isHost ? '<span class="role-badge host">Host</span>' : ''}
                ${this.state.isClient ? '<span class="role-badge client">Client</span>' : ''}
              </div>
            ` : `
              <div class="connection-status disconnected">
                <span class="status-indicator"></span>
                <span class="status-text">Disconnected</span>
              </div>
            `}
          </div>
          <div class="header-right">
            <button class="btn btn-secondary" onclick="window.app.togglePerformanceOverlay()">
              <span class="icon">📊</span>
            </button>
            <button class="btn btn-secondary" onclick="window.app.toggleSettings()">
              <span class="icon">⚙️</span>
            </button>
            <button class="btn btn-secondary" onclick="window.app.toggleTheme()">
              <span class="icon">🌙</span>
            </button>
          </div>
        </header>

        <!-- Main Content -->
        <main class="app-main">
          <!-- Connection Panel -->
          ${!this.state.isConnected ? `
            <div class="connection-panel-container">
              <div class="connection-panel">
                <h2>Start Remote Desktop Session</h2>
                <div class="connection-options">
                  <div class="option-card" onclick="window.app.startHostSession()">
                    <div class="option-icon">🖥️</div>
                    <h3>Share My Screen</h3>
                    <p>Start a host session and share your screen with others</p>
                    <button class="btn btn-primary">Start Host Session</button>
                  </div>
                  <div class="option-card" onclick="window.app.showJoinDialog()">
                    <div class="option-icon">👁️</div>
                    <h3>Join Session</h3>
                    <p>Connect to a host session using a connection code</p>
                    <button class="btn btn-primary">Join Session</button>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Canvas Container -->
          ${this.state.isConnected ? `
            <div class="canvas-container">
              <canvas id="remote-canvas" width="1920" height="1080"></canvas>
              
              <!-- Connection Code Display (Host) -->
              ${this.state.isHost && this.state.connectionCode ? `
                <div class="connection-code-display">
                  <div class="code-container">
                    <span class="code-label">Connection Code:</span>
                    <span class="code-value">${this.state.connectionCode}</span>
                    <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${this.state.connectionCode}')">
                      📋 Copy
                    </button>
                  </div>
                </div>
              ` : ''}

              <!-- Control Panel -->
              <div class="control-panel">
                <div class="control-group">
                  <button class="btn btn-secondary" onclick="window.app.toggleFileTransfer()">
                    📁 File Transfer
                  </button>
                  <button class="btn btn-secondary" onclick="window.app.toggleDeviceRedirection()">
                    🔌 Devices
                  </button>
                  <button class="btn btn-secondary" onclick="window.app.toggleClipboard()">
                    📋 Clipboard
                  </button>
                </div>
                <div class="control-group">
                  <select class="quality-selector" onchange="window.app.changeQuality(this.value)">
                    <option value="low" ${this.state.quality === 'low' ? 'selected' : ''}>Low Quality</option>
                    <option value="medium" ${this.state.quality === 'medium' ? 'selected' : ''}>Medium Quality</option>
                    <option value="high" ${this.state.quality === 'high' ? 'selected' : ''}>High Quality</option>
                    <option value="ultra" ${this.state.quality === 'ultra' ? 'selected' : ''}>Ultra Quality</option>
                  </select>
                  <button class="btn btn-secondary" onclick="window.app.toggleFullscreen()">
                    ⛶ Fullscreen
                  </button>
                </div>
              </div>
            </div>
          ` : ''}
        </main>

        <!-- Footer -->
        <footer class="app-footer">
          <div class="footer-left">
            <span class="version">v1.0.0</span>
          </div>
          <div class="footer-center">
            <span class="status-text">
              ${this.state.isConnected ? 
                `${this.state.isHost ? 'Hosting' : 'Connected to'} remote session` : 
                'Ready to connect'
              }
            </span>
          </div>
          <div class="footer-right">
            <button class="btn btn-secondary" onclick="window.app.disconnect()" ${!this.state.isConnected ? 'disabled' : ''}>
              Disconnect
            </button>
          </div>
        </footer>

        <!-- Modals -->
        ${this.state.showSettings ? `
          <div class="modal-overlay" onclick="window.app.toggleSettings()">
            <div class="modal-content" onclick="event.stopPropagation()">
              <div class="modal-header">
                <h3>Settings</h3>
                <button class="modal-close" onclick="window.app.toggleSettings()">×</button>
              </div>
              <div class="modal-body">
                <div class="settings-section">
                  <h4>Connection</h4>
                  <div class="setting-item">
                    <label>Enable Audio</label>
                    <input type="checkbox" ${this.config.get('webrtc').enableAudio ? 'checked' : ''}>
                  </div>
                  <div class="setting-item">
                    <label>Enable Video</label>
                    <input type="checkbox" ${this.config.get('webrtc').enableVideo ? 'checked' : ''}>
                  </div>
                </div>
                <div class="settings-section">
                  <h4>Security</h4>
                  <div class="setting-item">
                    <label>Enable Clipboard Sync</label>
                    <input type="checkbox" ${this.config.get('security').enableClipboard ? 'checked' : ''}>
                  </div>
                  <div class="setting-item">
                    <label>Enable File Transfer</label>
                    <input type="checkbox" ${this.config.get('security').enableFileTransfer ? 'checked' : ''}>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${this.state.showFileTransfer ? `
          <div class="modal-overlay" onclick="window.app.toggleFileTransfer()">
            <div class="modal-content" onclick="event.stopPropagation()">
              <div class="modal-header">
                <h3>File Transfer</h3>
                <button class="modal-close" onclick="window.app.toggleFileTransfer()">×</button>
              </div>
              <div class="modal-body">
                <div class="file-transfer-area">
                  <div class="upload-area">
                    <h4>Upload Files</h4>
                    <input type="file" multiple>
                    <button class="btn btn-primary">Upload</button>
                  </div>
                  <div class="download-area">
                    <h4>Download Files</h4>
                    <div class="file-list">
                      <div class="file-item">
                        <span class="file-name">example.txt</span>
                        <button class="btn btn-secondary">Download</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}

        ${this.state.showDeviceRedirection ? `
          <div class="modal-overlay" onclick="window.app.toggleDeviceRedirection()">
            <div class="modal-content" onclick="event.stopPropagation()">
              <div class="modal-header">
                <h3>Device Redirection</h3>
                <button class="modal-close" onclick="window.app.toggleDeviceRedirection()">×</button>
              </div>
              <div class="modal-body">
                <div class="device-list">
                  <div class="device-item">
                    <span class="device-name">USB Device</span>
                    <button class="btn btn-secondary">Connect</button>
                  </div>
                  <div class="device-item">
                    <span class="device-name">Printer</span>
                    <button class="btn btn-secondary">Connect</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.setupEventHandlers();
    this.initializeCanvas();
  }

  private setupEventHandlers(): void {
    // Make app methods available globally
    (window as any).app = {
      startHostSession: () => this.startHostSession(),
      showJoinDialog: () => this.showJoinDialog(),
      toggleSettings: () => this.toggleSettings(),
      toggleFileTransfer: () => this.toggleFileTransfer(),
      toggleDeviceRedirection: () => this.toggleDeviceRedirection(),
      togglePerformanceOverlay: () => this.togglePerformanceOverlay(),
      toggleTheme: () => this.toggleTheme(),
      toggleFullscreen: () => this.toggleFullscreen(),
      changeQuality: (quality: string) => this.changeQuality(quality),
      disconnect: () => this.disconnect()
    };

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcut(event);
    });
  }

  private initializeCanvas(): void {
    if (this.state.isConnected) {
      const canvas = document.getElementById('remote-canvas') as HTMLCanvasElement;
      if (canvas) {
        this.canvasRenderer.attachToCanvas(canvas);
        this.inputHandler.attachToCanvas(canvas);
      }
    }
  }

  private updateUI(): void {
    this.render();
  }

  private async startHostSession(): Promise<void> {
    try {
      this.state.isConnecting = true;
      this.updateUI();
      
      await this.connectionManager.startHostSession({
        isHost: true,
        quality: this.state.quality,
        enableAudio: (this.config.get('webrtc') as any).enableAudio,
        enableVideo: (this.config.get('webrtc') as any).enableVideo,
        enableClipboard: (this.config.get('security') as any).enableClipboard,
        enableFileTransfer: (this.config.get('security') as any).enableFileTransfer,
        enableDeviceRedirection: true,
        enableFolderMounting: true
      });
      
      this.logger.info('Host session started successfully');
    } catch (error) {
      this.logger.error('Failed to start host session', error);
      this.state.isConnecting = false;
      this.updateUI();
    }
  }

  private showJoinDialog(): void {
    const code = prompt('Enter connection code:');
    if (code) {
      this.joinClientSession(code);
    }
  }

  private async joinClientSession(connectionCode: string): Promise<void> {
    try {
      this.state.isConnecting = true;
      this.updateUI();
      
      await this.connectionManager.joinClientSession(connectionCode, {
        isHost: false,
        quality: this.state.quality,
        enableAudio: (this.config.get('webrtc') as any).enableAudio,
        enableVideo: (this.config.get('webrtc') as any).enableVideo,
        enableClipboard: (this.config.get('security') as any).enableClipboard,
        enableFileTransfer: (this.config.get('security') as any).enableFileTransfer,
        enableDeviceRedirection: true,
        enableFolderMounting: true
      });
      
      this.logger.info('Client session joined successfully');
    } catch (error) {
      this.logger.error('Failed to join client session', error);
      this.state.isConnecting = false;
      this.updateUI();
    }
  }

  private toggleSettings(): void {
    this.state.showSettings = !this.state.showSettings;
    this.updateUI();
  }

  private toggleFileTransfer(): void {
    this.state.showFileTransfer = !this.state.showFileTransfer;
    this.updateUI();
  }

  private toggleDeviceRedirection(): void {
    this.state.showDeviceRedirection = !this.state.showDeviceRedirection;
    this.updateUI();
  }

  private togglePerformanceOverlay(): void {
    this.state.showPerformanceOverlay = !this.state.showPerformanceOverlay;
    this.updateUI();
  }

  private toggleTheme(): void {
    const themes = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(this.state.theme);
    this.state.theme = themes[(currentIndex + 1) % themes.length];
    this.applyTheme();
    this.updateUI();
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private changeQuality(quality: string): void {
    if (['low', 'medium', 'high', 'ultra'].includes(quality)) {
      this.state.quality = quality as any;
      this.connectionManager.updateQuality(quality as any);
      this.updateUI();
    }
  }

  private disconnect(): void {
    this.connectionManager.disconnect();
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.connectionCode = '';
    this.state.screenShareActive = false;
    this.updateUI();
  }

  private handleKeyboardShortcut(event: KeyboardEvent): void {
    // Quality shortcuts
    if (event.ctrlKey && event.key >= '1' && event.key <= '4') {
      const qualities = ['low', 'medium', 'high', 'ultra'];
      const quality = qualities[parseInt(event.key) - 1];
      if (quality) {
        this.changeQuality(quality);
      }
    }

    // Fullscreen
    if (event.key === 'F11') {
      event.preventDefault();
      this.toggleFullscreen();
    }

    // Performance overlay
    if (event.key === 'F12') {
      event.preventDefault();
      this.togglePerformanceOverlay();
    }

    // Escape to close modals
    if (event.key === 'Escape') {
      this.state.showSettings = false;
      this.state.showFileTransfer = false;
      this.state.showDeviceRedirection = false;
      this.updateUI();
    }
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.state.theme);
  }
} 