import { Logger } from '../utils/Logger';
import { Config } from '../utils/Config';
import { ConnectionManager, ConnectionState, ConnectionType } from '../services/websocket/ConnectionManager';
import { CanvasRenderer } from '../components/rdp/CanvasRenderer';
import { InputHandler } from '../components/rdp/InputHandler';
import { ConnectionPanel } from '../components/panels/ConnectionPanel';
import { PerformanceOverlay } from '../components/ui/PerformanceOverlay';
import { SettingsPanel } from '../components/panels/SettingsPanel';
import { FileTransferPanel } from '../components/panels/FileTransferPanel';
import { DeviceRedirectionPanel } from '../components/panels/DeviceRedirectionPanel';

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
      this.state.isHost = true;
      this.state.isConnected = true;
      this.state.connectionInfo = data;
      this.state.connectionCode = data.connectionCode;
      this.updateUI();
    });

    this.connectionManager.on('clientSessionStarted', (data: any) => {
      this.state.isClient = true;
      this.state.isConnected = true;
      this.state.connectionInfo = data;
      this.updateUI();
    });

    this.connectionManager.on('disconnected', () => {
      this.state.isConnected = false;
      this.state.isHost = false;
      this.state.isClient = false;
      this.state.connectionInfo = null;
      this.state.connectionCode = '';
      this.updateUI();
    });

    this.connectionManager.on('error', (error: any) => {
      this.logger.error('Connection error:', error);
      this.state.isConnected = false;
      this.state.isConnecting = false;
      this.updateUI();
    });
  }

  private render(): void {
    if (!this.appElement) return;

    this.appElement.innerHTML = `
      <div class="app-container">
        <header class="app-header">
          <div class="header-left">
            <h1 class="app-title">Real Remote Desktop</h1>
            <div class="connection-status ${this.state.isConnected ? 'connected' : 'disconnected'}">
              ${this.state.isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          
          <div class="header-right">
            <button class="btn btn-icon" onclick="this.toggleSettings()" title="Settings">
              ⚙️
            </button>
            <button class="btn btn-icon" onclick="this.toggleFileTransfer()" title="File Transfer">
              📁
            </button>
            <button class="btn btn-icon" onclick="this.toggleDeviceRedirection()" title="Device Redirection">
              🔌
            </button>
            <button class="btn btn-icon" onclick="this.togglePerformanceOverlay()" title="Performance">
              📊
            </button>
            <button class="btn btn-icon" onclick="this.toggleTheme()" title="Toggle Theme">
              ${this.state.theme === 'dark' ? '☀️' : '🌙'}
            </button>
            ${this.state.isConnected ? `
              <button class="btn btn-icon" onclick="this.toggleFullscreen()" title="Fullscreen">
                ⛶
              </button>
            ` : ''}
          </div>
        </header>
        
        <main class="app-main">
          ${this.state.isConnected ? `
            <div class="rdp-viewport">
              <canvas id="rdp-canvas" class="rdp-canvas"></canvas>
              <div class="viewport-overlay">
                <div class="quality-indicator">${this.state.quality}</div>
                <div class="connection-info">
                  ${this.state.isHost ? 'Hosting' : 'Connected to'} ${this.state.connectionInfo?.host || 'remote'}
                </div>
              </div>
            </div>
          ` : `
            <div class="welcome-screen">
              <div class="welcome-content">
                <h2>Welcome to Real Remote Desktop</h2>
                <p>Connect to remote Windows machines with full RDP feature parity</p>
                
                <div class="connection-options">
                  <button class="btn btn-primary" onclick="this.startHostSession()">
                    <i class="icon">🖥️</i>
                    Host Session
                  </button>
                  <button class="btn btn-secondary" onclick="this.showJoinDialog()">
                    <i class="icon">🔗</i>
                    Join Session
                  </button>
                </div>
                
                <div class="features-list">
                  <div class="feature">
                    <span class="feature-icon">🎯</span>
                    <span>100% RDP Feature Parity</span>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">🔒</span>
                    <span>Secure TLS Encryption</span>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">📁</span>
                    <span>File Transfer & Clipboard Sync</span>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">🔌</span>
                    <span>Device Redirection (USB, Audio, Printers)</span>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">🖥️</span>
                    <span>Multi-Monitor Support</span>
                  </div>
                </div>
              </div>
            </div>
          `}
        </main>
        
        <footer class="app-footer">
          <div class="footer-left">
            <span class="version">v1.0.0</span>
          </div>
          <div class="footer-right">
            <span class="status">Agentless RDP Client</span>
          </div>
        </footer>
      </div>
      
      <!-- Panels -->
      <div id="connection-panel"></div>
      <div id="settings-panel"></div>
      <div id="file-transfer-panel"></div>
      <div id="device-redirection-panel"></div>
      <div id="performance-overlay"></div>
    `;

    this.setupEventHandlers();
    this.mountComponents();
  }

  private setupEventHandlers(): void {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcut(e);
    });

    // Canvas setup
    if (this.state.isConnected) {
      this.initializeCanvas();
    }
  }

  private mountComponents(): void {
    // Mount all panels
    this.connectionPanel.mount('#connection-panel');
    this.settingsPanel.mount('#settings-panel');
    this.fileTransferPanel.mount('#file-transfer-panel');
    this.deviceRedirectionPanel.mount('#device-redirection-panel');
    this.performanceOverlay.mount('#performance-overlay');
  }

  private initializeCanvas(): void {
    const canvas = document.getElementById('rdp-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.canvasRenderer.initialize(canvas);
    }
  }

  private updateUI(): void {
    // Update connection status
    const statusElement = document.querySelector('.connection-status');
    if (statusElement) {
      statusElement.textContent = this.state.isConnected ? 'Connected' : 'Disconnected';
      statusElement.className = `connection-status ${this.state.isConnected ? 'connected' : 'disconnected'}`;
    }

    // Update quality indicator
    const qualityElement = document.querySelector('.quality-indicator');
    if (qualityElement) {
      qualityElement.textContent = this.state.quality;
    }

    // Update connection info
    const infoElement = document.querySelector('.connection-info');
    if (infoElement) {
      infoElement.textContent = this.state.isHost ? 'Hosting' : 'Connected to';
    }
  }

  private async startHostSession(): Promise<void> {
    try {
      this.state.isConnecting = true;
      this.updateUI();
      
      await this.connectionManager.startHostSession();
      
      this.state.isConnecting = false;
      this.updateUI();
    } catch (error) {
      this.logger.error('Failed to start host session:', error);
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
      
      await this.connectionManager.joinClientSession(connectionCode);
      
      this.state.isConnecting = false;
      this.updateUI();
    } catch (error) {
      this.logger.error('Failed to join client session:', error);
      this.state.isConnecting = false;
      this.updateUI();
    }
  }

  private toggleSettings(): void {
    this.state.showSettings = !this.state.showSettings;
    if (this.state.showSettings) {
      this.settingsPanel.show();
    } else {
      this.settingsPanel.hide();
    }
  }

  private toggleFileTransfer(): void {
    this.state.showFileTransfer = !this.state.showFileTransfer;
    if (this.state.showFileTransfer) {
      this.fileTransferPanel.show();
    } else {
      this.fileTransferPanel.hide();
    }
  }

  private toggleDeviceRedirection(): void {
    this.state.showDeviceRedirection = !this.state.showDeviceRedirection;
    if (this.state.showDeviceRedirection) {
      this.deviceRedirectionPanel.show();
    } else {
      this.deviceRedirectionPanel.hide();
    }
  }

  private togglePerformanceOverlay(): void {
    this.state.showPerformanceOverlay = !this.state.showPerformanceOverlay;
    if (this.state.showPerformanceOverlay) {
      this.performanceOverlay.show();
    } else {
      this.performanceOverlay.hide();
    }
  }

  private toggleTheme(): void {
    this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.render();
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private changeQuality(quality: string): void {
    this.state.quality = quality as any;
    this.connectionManager.changeQuality(quality);
    this.updateUI();
  }

  private disconnect(): void {
    this.connectionManager.disconnect();
    this.state.isConnected = false;
    this.state.isHost = false;
    this.state.isClient = false;
    this.state.connectionInfo = null;
    this.state.connectionCode = '';
    this.render();
  }

  private handleKeyboardShortcut(event: KeyboardEvent): void {
    // Ctrl/Cmd + Q: Quit
    if ((event.ctrlKey || event.metaKey) && event.key === 'q') {
      event.preventDefault();
      this.disconnect();
    }
    
    // Ctrl/Cmd + S: Settings
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.toggleSettings();
    }
    
    // Ctrl/Cmd + F: File Transfer
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      this.toggleFileTransfer();
    }
    
    // Ctrl/Cmd + D: Device Redirection
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      event.preventDefault();
      this.toggleDeviceRedirection();
    }
    
    // F11: Fullscreen
    if (event.key === 'F11') {
      event.preventDefault();
      this.toggleFullscreen();
    }
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.state.theme);
    
    // Update theme in config
    this.config.set('ui.theme', this.state.theme);
  }
} 