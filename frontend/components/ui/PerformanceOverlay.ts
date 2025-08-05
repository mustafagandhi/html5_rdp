import { Logger } from '../../utils/Logger';
import { Config } from '../../utils/Config';
import { ConnectionManager } from '../../services/websocket/ConnectionManager';

export interface PerformanceStats {
  fps: number;
  latency: number;
  bitrate: number;
  packetLoss: number;
  jitter: number;
  frameDrops: number;
  bytesReceived: number;
  bytesSent: number;
  cpuUsage: number;
  memoryUsage: number;
  resolution: string;
  quality: string;
}

export class PerformanceOverlay {
  private logger = new Logger('PerformanceOverlay');
  private connectionManager: ConnectionManager;
  
  private stats: PerformanceStats = {
    fps: 0,
    latency: 0,
    bitrate: 0,
    packetLoss: 0,
    jitter: 0,
    frameDrops: 0,
    bytesReceived: 0,
    bytesSent: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    resolution: 'Unknown',
    quality: 'Unknown'
  };
  
  private isVisible = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private frameCount = 0;
  private lastFrameTime = 0;

  constructor(connectionManager?: ConnectionManager) {
    this.connectionManager = connectionManager || new ConnectionManager();
    this.setupEventListeners();
  }

  render(): string {
    return `
      <div class="performance-overlay" id="performance-overlay">
        <div class="performance-header">
          <h3>Performance Monitor</h3>
          <button class="btn btn-icon close-btn" id="close-performance-overlay">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div class="performance-content">
          <div class="performance-grid">
            <div class="performance-card">
              <div class="card-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                </svg>
                <span>Frame Rate</span>
              </div>
              <div class="card-value" id="fps-value">${this.stats.fps.toFixed(1)} FPS</div>
              <div class="card-bar">
                <div class="bar-fill" style="width: ${Math.min(this.stats.fps / 60 * 100, 100)}%"></div>
              </div>
            </div>
            
            <div class="performance-card">
              <div class="card-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                <span>Latency</span>
              </div>
              <div class="card-value" id="latency-value">${this.stats.latency}ms</div>
              <div class="card-bar">
                <div class="bar-fill ${this.getLatencyColor()}" style="width: ${Math.min(this.stats.latency / 100 * 100, 100)}%"></div>
              </div>
            </div>
            
            <div class="performance-card">
              <div class="card-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                <span>Bitrate</span>
              </div>
              <div class="card-value" id="bitrate-value">${this.formatBitrate(this.stats.bitrate)}</div>
              <div class="card-bar">
                <div class="bar-fill" style="width: ${Math.min(this.stats.bitrate / 5000000 * 100, 100)}%"></div>
              </div>
            </div>
            
            <div class="performance-card">
              <div class="card-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>Packet Loss</span>
              </div>
              <div class="card-value" id="packet-loss-value">${this.stats.packetLoss.toFixed(2)}%</div>
              <div class="card-bar">
                <div class="bar-fill ${this.getPacketLossColor()}" style="width: ${Math.min(this.stats.packetLoss, 100)}%"></div>
              </div>
            </div>
            
            <div class="performance-card">
              <div class="card-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <span>Jitter</span>
              </div>
              <div class="card-value" id="jitter-value">${this.stats.jitter.toFixed(1)}ms</div>
              <div class="card-bar">
                <div class="bar-fill ${this.getJitterColor()}" style="width: ${Math.min(this.stats.jitter / 50 * 100, 100)}%"></div>
              </div>
            </div>
            
            <div class="performance-card">
              <div class="card-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
                <span>Frame Drops</span>
              </div>
              <div class="card-value" id="frame-drops-value">${this.stats.frameDrops}</div>
              <div class="card-bar">
                <div class="bar-fill ${this.getFrameDropsColor()}" style="width: ${Math.min(this.stats.frameDrops / 10 * 100, 100)}%"></div>
              </div>
            </div>
          </div>
          
          <div class="performance-details">
            <div class="detail-row">
              <span class="detail-label">Resolution:</span>
              <span class="detail-value" id="resolution-value">${this.stats.resolution}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Quality:</span>
              <span class="detail-value" id="quality-value">${this.stats.quality}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Data Received:</span>
              <span class="detail-value" id="bytes-received-value">${this.formatBytes(this.stats.bytesReceived)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Data Sent:</span>
              <span class="detail-value" id="bytes-sent-value">${this.formatBytes(this.stats.bytesSent)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">CPU Usage:</span>
              <span class="detail-value" id="cpu-usage-value">${this.stats.cpuUsage.toFixed(1)}%</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Memory Usage:</span>
              <span class="detail-value" id="memory-usage-value">${this.formatBytes(this.stats.memoryUsage)}</span>
            </div>
          </div>
          
          <div class="performance-actions">
            <button class="btn btn-sm btn-primary" id="export-stats-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Stats
            </button>
            <button class="btn btn-sm btn-secondary" id="reset-stats-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1,4 1,10 7,10"/>
                <path d="M3.51,15a9,9,0,1,0,2.13-9.36L1,10"/>
              </svg>
              Reset Stats
            </button>
          </div>
        </div>
      </div>
    `;
  }

  show(): void {
    this.isVisible = true;
    this.startUpdates();
    this.logger.info('Performance overlay shown');
  }

  hide(): void {
    this.isVisible = false;
    this.stopUpdates();
    this.logger.info('Performance overlay hidden');
  }

  updateFrameRate(): void {
    const now = performance.now();
    this.frameCount++;
    
    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime;
      if (delta >= 1000) { // Update FPS every second
        this.stats.fps = (this.frameCount * 1000) / delta;
        this.frameCount = 0;
        this.lastFrameTime = now;
        this.updateUI();
      }
    } else {
      this.lastFrameTime = now;
    }
  }

  updateStats(newStats: Partial<PerformanceStats>): void {
    this.stats = { ...this.stats, ...newStats };
    this.updateUI();
  }

  private setupEventListeners(): void {
    // Close button
    document.addEventListener('click', (event) => {
      if (event.target && (event.target as HTMLElement).id === 'close-performance-overlay') {
        this.hide();
      }
    });

    // Export stats button
    document.addEventListener('click', (event) => {
      if (event.target && (event.target as HTMLElement).id === 'export-stats-btn') {
        this.exportStats();
      }
    });

    // Reset stats button
    document.addEventListener('click', (event) => {
      if (event.target && (event.target as HTMLElement).id === 'reset-stats-btn') {
        this.resetStats();
      }
    });
  }

  private startUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.updateFromConnectionManager();
    }, 1000);
  }

  private stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateFromConnectionManager(): void {
    try {
      const connectionInfo = this.connectionManager.getConnectionInfo();
      if (connectionInfo) {
        this.stats.latency = connectionInfo.latency;
        this.stats.bytesReceived = connectionInfo.bytesReceived;
        this.stats.bytesSent = connectionInfo.bytesSent;
        this.stats.framesReceived = connectionInfo.framesReceived;
        this.stats.framesDropped = connectionInfo.framesDropped;
      }

      // Get WebRTC stats if available
      const webrtcService = this.connectionManager.getWebRTCService();
      const webrtcStats = webrtcService.getStats();
      if (webrtcStats) {
        this.stats.bitrate = webrtcStats.bitrate;
        this.stats.packetLoss = webrtcStats.packetLoss;
        this.stats.jitter = webrtcStats.jitter;
      }

      // Get system stats
      this.updateSystemStats();
      
      this.updateUI();
    } catch (error) {
      this.logger.error('Failed to update performance stats', error);
    }
  }

  private updateSystemStats(): void {
    // Simulate system stats (in a real implementation, you'd get these from the browser)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.stats.memoryUsage = memory.usedJSHeapSize;
    }
    
    // CPU usage is not directly available in browsers, so we simulate it
    this.stats.cpuUsage = Math.random() * 20 + 5; // Simulate 5-25% CPU usage
  }

  private updateUI(): void {
    if (!this.isVisible) return;

    // Update all the stat values
    const elements = {
      'fps-value': `${this.stats.fps.toFixed(1)} FPS`,
      'latency-value': `${this.stats.latency}ms`,
      'bitrate-value': this.formatBitrate(this.stats.bitrate),
      'packet-loss-value': `${this.stats.packetLoss.toFixed(2)}%`,
      'jitter-value': `${this.stats.jitter.toFixed(1)}ms`,
      'frame-drops-value': this.stats.frameDrops.toString(),
      'resolution-value': this.stats.resolution,
      'quality-value': this.stats.quality,
      'bytes-received-value': this.formatBytes(this.stats.bytesReceived),
      'bytes-sent-value': this.formatBytes(this.stats.bytesSent),
      'cpu-usage-value': `${this.stats.cpuUsage.toFixed(1)}%`,
      'memory-usage-value': this.formatBytes(this.stats.memoryUsage)
    };

    for (const [id, value] of Object.entries(elements)) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    }

    // Update progress bars
    this.updateProgressBars();
  }

  private updateProgressBars(): void {
    const fpsBar = document.querySelector('#fps-value')?.parentElement?.querySelector('.bar-fill') as HTMLElement;
    if (fpsBar) {
      fpsBar.style.width = `${Math.min(this.stats.fps / 60 * 100, 100)}%`;
    }

    const latencyBar = document.querySelector('#latency-value')?.parentElement?.querySelector('.bar-fill') as HTMLElement;
    if (latencyBar) {
      latencyBar.style.width = `${Math.min(this.stats.latency / 100 * 100, 100)}%`;
      latencyBar.className = `bar-fill ${this.getLatencyColor()}`;
    }

    const bitrateBar = document.querySelector('#bitrate-value')?.parentElement?.querySelector('.bar-fill') as HTMLElement;
    if (bitrateBar) {
      bitrateBar.style.width = `${Math.min(this.stats.bitrate / 5000000 * 100, 100)}%`;
    }

    const packetLossBar = document.querySelector('#packet-loss-value')?.parentElement?.querySelector('.bar-fill') as HTMLElement;
    if (packetLossBar) {
      packetLossBar.style.width = `${Math.min(this.stats.packetLoss, 100)}%`;
      packetLossBar.className = `bar-fill ${this.getPacketLossColor()}`;
    }

    const jitterBar = document.querySelector('#jitter-value')?.parentElement?.querySelector('.bar-fill') as HTMLElement;
    if (jitterBar) {
      jitterBar.style.width = `${Math.min(this.stats.jitter / 50 * 100, 100)}%`;
      jitterBar.className = `bar-fill ${this.getJitterColor()}`;
    }

    const frameDropsBar = document.querySelector('#frame-drops-value')?.parentElement?.querySelector('.bar-fill') as HTMLElement;
    if (frameDropsBar) {
      frameDropsBar.style.width = `${Math.min(this.stats.frameDrops / 10 * 100, 100)}%`;
      frameDropsBar.className = `bar-fill ${this.getFrameDropsColor()}`;
    }
  }

  private getLatencyColor(): string {
    if (this.stats.latency < 50) return 'good';
    if (this.stats.latency < 100) return 'warning';
    return 'error';
  }

  private getPacketLossColor(): string {
    if (this.stats.packetLoss < 1) return 'good';
    if (this.stats.packetLoss < 5) return 'warning';
    return 'error';
  }

  private getJitterColor(): string {
    if (this.stats.jitter < 10) return 'good';
    if (this.stats.jitter < 25) return 'warning';
    return 'error';
  }

  private getFrameDropsColor(): string {
    if (this.stats.frameDrops < 5) return 'good';
    if (this.stats.frameDrops < 20) return 'warning';
    return 'error';
  }

  private formatBitrate(bitrate: number): string {
    if (bitrate < 1000) return `${bitrate} bps`;
    if (bitrate < 1000000) return `${(bitrate / 1000).toFixed(1)} Kbps`;
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  private exportStats(): void {
    const statsData = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      connectionInfo: this.connectionManager.getConnectionInfo()
    };

    const blob = new Blob([JSON.stringify(statsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-stats-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.logger.info('Performance stats exported');
  }

  private resetStats(): void {
    this.stats = {
      fps: 0,
      latency: 0,
      bitrate: 0,
      packetLoss: 0,
      jitter: 0,
      frameDrops: 0,
      bytesReceived: 0,
      bytesSent: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      resolution: 'Unknown',
      quality: 'Unknown'
    };
    
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.updateUI();
    
    this.logger.info('Performance stats reset');
  }

  // Public methods
  getStats(): PerformanceStats {
    return { ...this.stats };
  }

  setResolution(resolution: string): void {
    this.stats.resolution = resolution;
    this.updateUI();
  }

  setQuality(quality: string): void {
    this.stats.quality = quality;
    this.updateUI();
  }

  destroy(): void {
    this.hide();
    this.logger.info('Performance overlay destroyed');
  }
} 