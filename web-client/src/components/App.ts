import { Logger } from '../utils/Logger';
import { Config } from '../utils/Config';
import { ConnectionManager, ConnectionState } from '../services/ConnectionManager';
import { CanvasRenderer } from './CanvasRenderer';
import { InputHandler } from './InputHandler';
import { ConnectionPanel } from './ConnectionPanel';
import { PerformanceOverlay } from './PerformanceOverlay';
import { SettingsPanel } from './SettingsPanel';

export interface AppState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionInfo: any;
  showSettings: boolean;
  showPerformanceOverlay: boolean;
  theme: 'light' | 'dark' | 'auto';
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export class App {
  private logger = new Logger('App');
  private config = Config.getInstance();
  
  private connectionManager: ConnectionManager;
  private canvasRenderer: CanvasRenderer;
  private inputHandler: InputHandler;
  private connectionPanel: ConnectionPanel;
  private performanceOverlay: PerformanceOverlay;
  private settingsPanel: SettingsPanel;
  
  private appElement: HTMLElement | null = null;
  private state: AppState;
  
  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.state = this.getInitialState();
    
    this.setupComponents();
    this.setupEventListeners();
    this.applyTheme();
    
    this.logger.info('App initialized');
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
      connectionInfo: null,
      showSettings: false,
      showPerformanceOverlay: false,
      theme: this.config.get('ui').theme,
      quality: this.config.get('display').defaultQuality
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
  }

  private setupEventListeners(): void {
    // Connection manager events
    this.connectionManager.on('connected', (connectionInfo) => {
      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.state.connectionInfo = connectionInfo;
      this.updateUI();
      this.logger.info('Connection established');
    });
    
    this.connectionManager.on('disconnected', (connectionInfo) => {
      this.state.isConnected = false;
      this.state.isConnecting = false;
      this.state.connectionInfo = connectionInfo;
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
    
    this.connectionManager.on('qualityChanged', (quality) => {
      this.state.quality = quality;
      this.updateUI();
    });
    
    // Canvas renderer events
    this.canvasRenderer.on('frameReceived', () => {
      this.performanceOverlay.updateFrameRate();
    });
    
    // Input handler events
    this.inputHandler.on('inputEvent', (event) => {
      this.logger.debug('Input event captured', event);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcut(event);
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
          </div>
          <div class="header-center">
            <div class="connection-status">
              <span class="status-indicator ${this.state.isConnected ? 'connected' : 'disconnected'}"></span>
              <span class="status-text">
                ${this.state.isConnecting ? 'Connecting...' : 
                  this.state.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div class="header-right">
            <button class="btn btn-icon" id="settings-btn" title="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
              </svg>
            </button>
            <button class="btn btn-icon" id="performance-btn" title="Performance Overlay">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3v18h18"/>
                <path d="m9 9 2 2 4-4"/>
              </svg>
            </button>
            <button class="btn btn-icon" id="fullscreen-btn" title="Fullscreen">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
              </svg>
            </button>
          </div>
        </header>
        
        <!-- Main Content -->
        <main class="app-main">
          <!-- Connection Panel (when not connected) -->
          <div class="connection-panel" id="connection-panel" style="display: ${this.state.isConnected ? 'none' : 'block'}">
            ${this.connectionPanel.render()}
          </div>
          
          <!-- Canvas Container (when connected) -->
          <div class="canvas-container" id="canvas-container" style="display: ${this.state.isConnected ? 'block' : 'none'}">
            <div class="canvas-wrapper">
              <canvas id="remote-canvas" class="remote-canvas"></canvas>
              <div class="canvas-overlay">
                <div class="quality-indicator">
                  Quality: ${this.state.quality}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Performance Overlay -->
          <div class="performance-overlay" id="performance-overlay" style="display: ${this.state.showPerformanceOverlay ? 'block' : 'none'}">
            ${this.performanceOverlay.render()}
          </div>
        </main>
        
        <!-- Settings Panel -->
        <div class="settings-panel" id="settings-panel" style="display: ${this.state.showSettings ? 'block' : 'none'}">
          ${this.settingsPanel.render()}
        </div>
        
        <!-- Footer -->
        <footer class="app-footer">
          <div class="footer-left">
            <span class="version">v${__VERSION__}</span>
          </div>
          <div class="footer-center">
            <span class="connection-info">
              ${this.state.connectionInfo ? 
                `${this.state.connectionInfo.host}:${this.state.connectionInfo.port}` : 
                'Not connected'}
            </span>
          </div>
          <div class="footer-right">
            <span class="quality-info">
              ${this.state.quality} quality
            </span>
          </div>
        </footer>
      </div>
    `;
    
    this.setupEventHandlers();
    this.initializeCanvas();
  }

  private setupEventHandlers(): void {
    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.state.showSettings = !this.state.showSettings;
        this.updateUI();
      });
    }
    
    // Performance overlay button
    const performanceBtn = document.getElementById('performance-btn');
    if (performanceBtn) {
      performanceBtn.addEventListener('click', () => {
        this.state.showPerformanceOverlay = !this.state.showPerformanceOverlay;
        this.updateUI();
      });
    }
    
    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }
  }

  private initializeCanvas(): void {
    const canvas = document.getElementById('remote-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.canvasRenderer.initialize(canvas);
    }
  }

  private updateUI(): void {
    this.render();
  }

  private handleKeyboardShortcut(event: KeyboardEvent): void {
    // Only handle shortcuts when not typing in input fields
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    const isCtrl = event.ctrlKey || event.metaKey;
    
    switch (event.key) {
      case 'F11':
        event.preventDefault();
        this.toggleFullscreen();
        break;
      case 'F12':
        event.preventDefault();
        this.state.showPerformanceOverlay = !this.state.showPerformanceOverlay;
        this.updateUI();
        break;
      case 'Escape':
        if (this.state.showSettings) {
          this.state.showSettings = false;
          this.updateUI();
        }
        break;
      case '1':
      case '2':
      case '3':
      case '4':
        if (isCtrl) {
          event.preventDefault();
          const qualities = ['low', 'medium', 'high', 'ultra'];
          const quality = qualities[parseInt(event.key) - 1];
          if (quality) {
            this.connectionManager.updateQuality(quality);
          }
        }
        break;
    }
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      const canvasContainer = document.getElementById('canvas-container');
      if (canvasContainer) {
        canvasContainer.requestFullscreen();
      }
    } else {
      document.exitFullscreen();
    }
  }

  private applyTheme(): void {
    const theme = this.state.theme;
    let actualTheme = theme;
    
    if (theme === 'auto') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    document.documentElement.setAttribute('data-theme', actualTheme);
  }
} 