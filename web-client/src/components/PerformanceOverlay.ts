import { Logger } from '../utils/Logger';

export interface PerformanceMetrics {
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
}

export class PerformanceOverlay {
  private logger = new Logger('PerformanceOverlay');
  private metrics: PerformanceMetrics = {
    fps: 0,
    latency: 0,
    bitrate: 0,
    packetLoss: 0,
    jitter: 0,
    frameDrops: 0,
    bytesReceived: 0,
    bytesSent: 0,
    cpuUsage: 0,
    memoryUsage: 0
  };
  
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimes: number[] = [];
  private maxFrameTimes = 60;

  render(): string {
    return `
      <div class="performance-overlay-container">
        <div class="performance-header">
          <h3>Performance Metrics</h3>
          <button class="btn btn-sm btn-outline" id="close-performance-btn">×</button>
        </div>
        
        <div class="performance-grid">
          <div class="metric-card">
            <div class="metric-label">FPS</div>
            <div class="metric-value" id="fps-value">${this.metrics.fps.toFixed(1)}</div>
            <div class="metric-unit">frames/sec</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">Latency</div>
            <div class="metric-value" id="latency-value">${this.metrics.latency.toFixed(0)}</div>
            <div class="metric-unit">ms</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">Bitrate</div>
            <div class="metric-value" id="bitrate-value">${this.formatBitrate(this.metrics.bitrate)}</div>
            <div class="metric-unit">bps</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">Packet Loss</div>
            <div class="metric-value" id="packet-loss-value">${this.metrics.packetLoss.toFixed(1)}</div>
            <div class="metric-unit">%</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">Jitter</div>
            <div class="metric-value" id="jitter-value">${this.metrics.jitter.toFixed(1)}</div>
            <div class="metric-unit">ms</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">Frame Drops</div>
            <div class="metric-value" id="frame-drops-value">${this.metrics.frameDrops}</div>
            <div class="metric-unit">frames</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">Data Received</div>
            <div class="metric-value" id="bytes-received-value">${this.formatBytes(this.metrics.bytesReceived)}</div>
            <div class="metric-unit">total</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">Data Sent</div>
            <div class="metric-value" id="bytes-sent-value">${this.formatBytes(this.metrics.bytesSent)}</div>
            <div class="metric-unit">total</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">CPU Usage</div>
            <div class="metric-value" id="cpu-usage-value">${this.metrics.cpuUsage.toFixed(1)}</div>
            <div class="metric-unit">%</div>
          </div>
          
          <div class="metric-card">
            <div class="metric-label">Memory Usage</div>
            <div class="metric-value" id="memory-usage-value">${this.formatBytes(this.metrics.memoryUsage)}</div>
            <div class="metric-unit">used</div>
          </div>
        </div>
        
        <div class="performance-charts">
          <div class="chart-container">
            <h4>FPS History</h4>
            <canvas id="fps-chart" width="300" height="100"></canvas>
          </div>
          
          <div class="chart-container">
            <h4>Latency History</h4>
            <canvas id="latency-chart" width="300" height="100"></canvas>
          </div>
        </div>
        
        <div class="performance-actions">
          <button class="btn btn-sm btn-outline" id="export-metrics-btn">
            Export Metrics
          </button>
          <button class="btn btn-sm btn-outline" id="reset-metrics-btn">
            Reset Counters
          </button>
        </div>
      </div>
    `;
  }

  updateFrameRate(): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    
    if (this.lastFrameTime > 0) {
      this.frameTimes.push(frameTime);
      if (this.frameTimes.length > this.maxFrameTimes) {
        this.frameTimes.shift();
      }
      
      // Calculate average FPS
      const averageFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
      this.metrics.fps = 1000 / averageFrameTime;
    }
    
    this.lastFrameTime = now;
    this.frameCount++;
    
    this.updateDisplay();
  }

  updateMetrics(newMetrics: Partial<PerformanceMetrics>): void {
    this.metrics = { ...this.metrics, ...newMetrics };
    this.updateDisplay();
  }

  updateConnectionStats(stats: any): void {
    if (stats) {
      this.metrics.latency = stats.latency || 0;
      this.metrics.bitrate = stats.bitrate || 0;
      this.metrics.packetLoss = stats.packetLoss || 0;
      this.metrics.jitter = stats.jitter || 0;
      this.metrics.bytesReceived = stats.bytesReceived || 0;
      this.metrics.bytesSent = stats.bytesSent || 0;
      this.metrics.frameDrops = stats.framesDropped || 0;
    }
    
    this.updateDisplay();
  }

  updateSystemStats(): void {
    // Get CPU usage (simplified - in a real app you'd use performance API)
    if ('performance' in window) {
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.memoryUsage = memory.usedJSHeapSize;
      }
    }
    
    // Estimate CPU usage based on frame processing time
    if (this.frameTimes.length > 0) {
      const avgFrameTime = this.frameTimes[this.frameTimes.length - 1];
      this.metrics.cpuUsage = Math.min(100, (avgFrameTime / 16.67) * 100); // 16.67ms = 60fps
    }
    
    this.updateDisplay();
  }

  private updateDisplay(): void {
    // Update metric values in the DOM
    const elements = {
      'fps-value': this.metrics.fps.toFixed(1),
      'latency-value': this.metrics.latency.toFixed(0),
      'bitrate-value': this.formatBitrate(this.metrics.bitrate),
      'packet-loss-value': this.metrics.packetLoss.toFixed(1),
      'jitter-value': this.metrics.jitter.toFixed(1),
      'frame-drops-value': this.metrics.frameDrops.toString(),
      'bytes-received-value': this.formatBytes(this.metrics.bytesReceived),
      'bytes-sent-value': this.formatBytes(this.metrics.bytesSent),
      'cpu-usage-value': this.metrics.cpuUsage.toFixed(1),
      'memory-usage-value': this.formatBytes(this.metrics.memoryUsage)
    };
    
    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
    
    // Update charts
    this.updateCharts();
  }

  private updateCharts(): void {
    this.updateFPSChart();
    this.updateLatencyChart();
  }

  private updateFPSChart(): void {
    const canvas = document.getElementById('fps-chart') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw FPS history
    const maxFPS = 60;
    const data = this.frameTimes.slice(-30).map(time => 1000 / time);
    
    if (data.length > 1) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      data.forEach((fps, index) => {
        const x = (index / (data.length - 1)) * canvas.width;
        const y = canvas.height - (fps / maxFPS) * canvas.height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }
  }

  private updateLatencyChart(): void {
    const canvas = document.getElementById('latency-chart') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw latency history (simplified - would need actual latency data)
    const maxLatency = 100;
    const data = this.frameTimes.slice(-30).map(time => time);
    
    if (data.length > 1) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      data.forEach((latency, index) => {
        const x = (index / (data.length - 1)) * canvas.width;
        const y = canvas.height - (latency / maxLatency) * canvas.height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
    }
  }

  private formatBitrate(bps: number): string {
    if (bps >= 1000000) {
      return (bps / 1000000).toFixed(1) + 'M';
    } else if (bps >= 1000) {
      return (bps / 1000).toFixed(1) + 'K';
    } else {
      return bps.toFixed(0);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes >= 1073741824) {
      return (bytes / 1073741824).toFixed(1) + 'GB';
    } else if (bytes >= 1048576) {
      return (bytes / 1048576).toFixed(1) + 'MB';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(1) + 'KB';
    } else {
      return bytes.toString();
    }
  }

  exportMetrics(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      frameCount: this.frameCount,
      frameTimes: this.frameTimes
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  resetCounters(): void {
    this.metrics = {
      fps: 0,
      latency: 0,
      bitrate: 0,
      packetLoss: 0,
      jitter: 0,
      frameDrops: 0,
      bytesReceived: 0,
      bytesSent: 0,
      cpuUsage: 0,
      memoryUsage: 0
    };
    
    this.frameCount = 0;
    this.frameTimes = [];
    this.lastFrameTime = 0;
    
    this.updateDisplay();
    this.logger.info('Performance counters reset');
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
} 