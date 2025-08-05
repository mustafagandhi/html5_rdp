import { Logger } from '../utils/Logger';
import { Config } from '../utils/Config';
import { RDPService } from '../services/rdp/RDPService';
import { CanvasRenderer } from './rdp/CanvasRenderer';
import { InputHandler } from './rdp/InputHandler';
import { RDPConnectionPanel } from './rdp/RDPConnectionPanel';
import { PerformanceOverlay } from './ui/PerformanceOverlay';
import { SettingsPanel } from './panels/SettingsPanel';
import { FileTransferPanel } from './panels/FileTransferPanel';
import { DeviceRedirectionPanel } from './panels/DeviceRedirectionPanel';

export interface RDPConnectionState {
  host: string;
  port: number;
  username: string;
  password: string;
  domain?: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  enableAudio: boolean;
  enableClipboard: boolean;
  enableFileTransfer: boolean;
  enableDeviceRedirection: boolean;
  enablePrinterRedirection: boolean;
  enableMultiMonitor: boolean;
  colorDepth: number;
  width: number;
  height: number;
}

export interface AppState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: RDPConnectionState | null;
  showSettings: boolean;
  showPerformanceOverlay: boolean;
  showFileTransfer: boolean;
  showDeviceRedirection: boolean;
  theme: 'light' | 'dark' | 'auto';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  fullscreen: boolean;
  error: string | null;
}

export class App {
  private logger = new Logger('App');
  private config = Config.getInstance();
  
  private rdpService: RDPService;
  private canvasRenderer!: CanvasRenderer;
  private inputHandler!: InputHandler;
  private rdpConnectionPanel!: RDPConnectionPanel;
  private performanceOverlay!: PerformanceOverlay;
  private settingsPanel!: SettingsPanel;
  private fileTransferPanel!: FileTransferPanel;
  private deviceRedirectionPanel!: DeviceRedirectionPanel;
  
  private appElement: HTMLElement | null = null;
  private state: AppState;
  
  constructor() {
    this.rdpService = new RDPService();
    this.state = this.getInitialState();
    
    this.setupComponents();
    this.setupEventListeners();
    this.applyTheme();
    
    this.logger.info('HTML5 RDP Client initialized');
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
      connectionState: null,
      showSettings: false,
      showPerformanceOverlay: false,
      showFileTransfer: false,
      showDeviceRedirection: false,
      theme: (this.config.get('ui') as any).theme,
      quality: (this.config.get('display') as any).defaultQuality,
      fullscreen: false,
      error: null
    };
  }

  private setupComponents(): void {
    // Initialize canvas renderer for RDP display
    this.canvasRenderer = new CanvasRenderer();
    
    // Initialize input handler for RDP input forwarding
    this.inputHandler = new InputHandler(this.rdpService);
    
    // Initialize UI components
    this.rdpConnectionPanel = new RDPConnectionPanel(this.rdpService);
    this.performanceOverlay = new PerformanceOverlay();
    this.settingsPanel = new SettingsPanel();
    this.fileTransferPanel = new FileTransferPanel();
    this.deviceRedirectionPanel = new DeviceRedirectionPanel();
  }

  private setupEventListeners(): void {
    // RDP Service events
    this.rdpService.on('connecting', (connection: any) => {
      this.state.isConnecting = true;
      this.state.error = null;
      this.updateUI();
      this.logger.info('Connecting to RDP server...');
    });

    this.rdpService.on('connected', (connection: any) => {
      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.state.connectionState = connection.config;
      this.state.error = null;
      this.updateUI();
      this.logger.info('Connected to RDP server');
    });

    this.rdpService.on('disconnected', () => {
      this.state.isConnected = false;
      this.state.isConnecting = false;
      this.state.connectionState = null;
      this.updateUI();
      this.logger.info('Disconnected from RDP server');
    });

    this.rdpService.on('error', (error: any) => {
      this.state.isConnected = false;
      this.state.isConnecting = false;
      this.state.error = error.message || 'Connection failed';
      this.updateUI();
      this.logger.error('RDP connection error:', error);
    });

    // Canvas renderer events
    this.canvasRenderer.on('frame', (frameData: any) => {
      // Handle incoming RDP frame data
      this.logger.debug('Received RDP frame');
    });

    // Input handler events
    this.inputHandler.on('input', (inputData: any) => {
      // Forward input to RDP server
      this.rdpService.sendMouseInput(inputData.x, inputData.y, inputData.button, inputData.action);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcut(event);
    });
  }

  private render(): void {
    if (!this.appElement) return;

    this.appElement.innerHTML = `
      <div class="app-container ${this.state.theme}">
        <!-- Header -->
        <header class="app-header">
          <div class="header-left">
            <h1>HTML5 RDP Client</h1>
          </div>
          <div class="header-right">
            <button class="btn btn-secondary" onclick="app.toggleSettings()">
              <i class="icon-settings"></i> Settings
            </button>
            <button class="btn btn-secondary" onclick="app.togglePerformanceOverlay()">
              <i class="icon-performance"></i> Performance
            </button>
            ${this.state.isConnected ? `
              <button class="btn btn-secondary" onclick="app.toggleFileTransfer()">
                <i class="icon-file"></i> Files
              </button>
              <button class="btn btn-secondary" onclick="app.toggleDeviceRedirection()">
                <i class="icon-device"></i> Devices
              </button>
              <button class="btn btn-danger" onclick="app.disconnect()">
                <i class="icon-disconnect"></i> Disconnect
              </button>
            ` : ''}
          </div>
        </header>

        <!-- Main Content -->
        <main class="app-main">
          ${!this.state.isConnected ? `
            <!-- Connection Panel -->
            <div class="connection-container">
              <div class="connection-panel">
                <h2>Connect to Remote Desktop</h2>
                <div class="connection-form">
                  <div class="form-group">
                    <label for="rdp-host">Hostname or IP Address</label>
                    <input type="text" id="rdp-host" placeholder="192.168.1.100" required>
                  </div>
                  <div class="form-group">
                    <label for="rdp-port">Port</label>
                    <input type="number" id="rdp-port" value="3389" min="1" max="65535">
                  </div>
                  <div class="form-group">
                    <label for="rdp-username">Username</label>
                    <input type="text" id="rdp-username" placeholder="Administrator" required>
                  </div>
                  <div class="form-group">
                    <label for="rdp-password">Password</label>
                    <input type="password" id="rdp-password" required>
                  </div>
                  <div class="form-group">
                    <label for="rdp-domain">Domain (optional)</label>
                    <input type="text" id="rdp-domain" placeholder="WORKGROUP">
                  </div>
                  <div class="form-group">
                    <label for="rdp-quality">Quality</label>
                    <select id="rdp-quality">
                      <option value="low">Low (Fast)</option>
                      <option value="medium" selected>Medium (Balanced)</option>
                      <option value="high">High (Quality)</option>
                      <option value="ultra">Ultra (Best)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="rdp-audio" checked>
                      Enable Audio
                    </label>
                  </div>
                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="rdp-clipboard" checked>
                      Enable Clipboard Sync
                    </label>
                  </div>
                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="rdp-file-transfer" checked>
                      Enable File Transfer
                    </label>
                  </div>
                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="rdp-device-redirection" checked>
                      Enable Device Redirection
                    </label>
                  </div>
                  <button class="btn btn-primary" onclick="app.connect()">
                    <i class="icon-connect"></i> Connect
                  </button>
                </div>
              </div>
            </div>
          ` : `
            <!-- RDP Display -->
            <div class="rdp-container">
              <canvas id="rdp-canvas" class="rdp-canvas"></canvas>
              ${this.state.showPerformanceOverlay ? '<div id="performance-overlay"></div>' : ''}
            </div>
          `}
        </main>

        <!-- Error Display -->
        ${this.state.error ? `
          <div class="error-banner">
            <span class="error-message">${this.state.error}</span>
            <button class="btn btn-sm" onclick="app.clearError()">×</button>
          </div>
        ` : ''}

        <!-- Loading Overlay -->
        ${this.state.isConnecting ? `
          <div class="loading-overlay">
            <div class="loading-spinner"></div>
            <div class="loading-text">Connecting to remote desktop...</div>
          </div>
        ` : ''}
      </div>
    `;

    // Initialize components after DOM is ready
    setTimeout(() => {
      this.initializeComponents();
    }, 0);
  }

  private initializeComponents(): void {
    if (this.state.isConnected) {
      this.initializeCanvas();
    }
    
    // Initialize panels
    if (this.state.showSettings) {
      this.settingsPanel.mount('#settings-panel');
    }
    if (this.state.showFileTransfer) {
      this.fileTransferPanel.mount('#file-transfer-panel');
    }
    if (this.state.showDeviceRedirection) {
      this.deviceRedirectionPanel.mount('#device-redirection-panel');
    }
    if (this.state.showPerformanceOverlay) {
      this.performanceOverlay.mount('#performance-overlay');
    }
  }

  private initializeCanvas(): void {
    const canvas = document.getElementById('rdp-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.canvasRenderer.initialize(canvas);
    }
  }

  private updateUI(): void {
    this.render();
  }

  // Public methods for UI interaction
  public connect(): void {
    const host = (document.getElementById('rdp-host') as HTMLInputElement)?.value;
    const port = parseInt((document.getElementById('rdp-port') as HTMLInputElement)?.value || '3389');
    const username = (document.getElementById('rdp-username') as HTMLInputElement)?.value;
    const password = (document.getElementById('rdp-password') as HTMLInputElement)?.value;
    const domain = (document.getElementById('rdp-domain') as HTMLInputElement)?.value;
    const quality = (document.getElementById('rdp-quality') as HTMLSelectElement)?.value as any;
    const enableAudio = (document.getElementById('rdp-audio') as HTMLInputElement)?.checked;
    const enableClipboard = (document.getElementById('rdp-clipboard') as HTMLInputElement)?.checked;
    const enableFileTransfer = (document.getElementById('rdp-file-transfer') as HTMLInputElement)?.checked;
    const enableDeviceRedirection = (document.getElementById('rdp-device-redirection') as HTMLInputElement)?.checked;

    if (!host || !username || !password) {
      this.state.error = 'Please fill in all required fields';
      this.updateUI();
      return;
    }

    const config = {
      host,
      port,
      username,
      password,
      domain: domain || undefined,
      quality,
      enableAudio: enableAudio || false,
      enableClipboard: enableClipboard || false,
      enableFileTransfer: enableFileTransfer || false,
      enableDeviceRedirection: enableDeviceRedirection || false,
      enablePrinterRedirection: false,
      enableMultiMonitor: false,
      colorDepth: 24,
      width: 1920,
      height: 1080
    };

    this.rdpService.connect(config);
  }

  public disconnect(): void {
    this.rdpService.disconnect();
  }

  public toggleSettings(): void {
    this.state.showSettings = !this.state.showSettings;
    this.updateUI();
  }

  public toggleFileTransfer(): void {
    this.state.showFileTransfer = !this.state.showFileTransfer;
    this.updateUI();
  }

  public toggleDeviceRedirection(): void {
    this.state.showDeviceRedirection = !this.state.showDeviceRedirection;
    this.updateUI();
  }

  public togglePerformanceOverlay(): void {
    this.state.showPerformanceOverlay = !this.state.showPerformanceOverlay;
    this.updateUI();
  }

  public toggleTheme(): void {
    this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.updateUI();
  }

  public toggleFullscreen(): void {
    this.state.fullscreen = !this.state.fullscreen;
    if (this.state.fullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  public clearError(): void {
    this.state.error = null;
    this.updateUI();
  }

  private handleKeyboardShortcut(event: KeyboardEvent): void {
    // Ctrl+Alt+Del
    if (event.ctrlKey && event.altKey && event.key === 'Delete') {
      event.preventDefault();
      this.rdpService.sendKeyboardInput(0x2D, 0x53, 0x0001); // Ctrl+Alt+Del
    }
    
    // Ctrl+Alt+Break
    if (event.ctrlKey && event.altKey && event.key === 'Pause') {
      event.preventDefault();
      this.rdpService.sendKeyboardInput(0x03, 0x46, 0x0001); // Ctrl+Alt+Break
    }
    
    // F11 for fullscreen
    if (event.key === 'F11') {
      event.preventDefault();
      this.toggleFullscreen();
    }
    
    // Ctrl+Shift+O for performance overlay
    if (event.ctrlKey && event.shiftKey && event.key === 'O') {
      event.preventDefault();
      this.togglePerformanceOverlay();
    }
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.state.theme);
  }
}

// Make app globally accessible for UI interactions
declare global {
  interface Window {
    app: App;
  }
} 