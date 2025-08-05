import { Logger } from '../../utils/Logger';
import { EventEmitter } from '../../utils/EventEmitter';
import { Config } from '../../utils/Config';

export interface FrameData {
  width: number;
  height: number;
  data: ImageData | ArrayBuffer | Blob;
  timestamp: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface RenderStats {
  fps: number;
  frameCount: number;
  lastFrameTime: number;
  averageFrameTime: number;
  droppedFrames: number;
  totalFrames: number;
}

export class CanvasRenderer extends EventEmitter {
  private logger = new Logger('CanvasRenderer');
  private config = Config.getInstance();
  
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  
  private frameQueue: FrameData[] = [];
  private maxQueueSize = 10;
  private isRendering = false;
  
  private stats: RenderStats = {
    fps: 0,
    frameCount: 0,
    lastFrameTime: 0,
    averageFrameTime: 0,
    droppedFrames: 0,
    totalFrames: 0
  };
  
  private frameTimes: number[] = [];
  private maxFrameTimes = 60;
  
  private scaleMode: 'fit' | 'fill' | 'stretch' = 'fit';
  private maintainAspectRatio = true;

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    
    if (!this.ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    this.setupCanvas();
    this.startRenderLoop();
    
    this.logger.info('Canvas renderer initialized');
  }

  destroy(): void {
    this.stopRenderLoop();
    this.frameQueue = [];
    this.canvas = null;
    this.ctx = null;
    
    this.logger.info('Canvas renderer destroyed');
  }

  addFrame(frameData: FrameData): void {
    // Add frame to queue
    this.frameQueue.push(frameData);
    
    // Limit queue size
    if (this.frameQueue.length > this.maxQueueSize) {
      const dropped = this.frameQueue.shift();
      if (dropped) {
        this.stats.droppedFrames++;
      }
    }
    
    this.stats.totalFrames++;
  }

  setScaleMode(mode: 'fit' | 'fill' | 'stretch'): void {
    this.scaleMode = mode;
    this.logger.info(`Scale mode changed to ${mode}`);
  }

  setMaintainAspectRatio(maintain: boolean): void {
    this.maintainAspectRatio = maintain;
  }

  getStats(): RenderStats {
    return { ...this.stats };
  }

  private setupCanvas(): void {
    if (!this.canvas) return;
    
    // Set canvas size to match container
    this.resizeCanvas();
    
    // Setup event listeners for resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
    
    // Setup fullscreen change listener
    document.addEventListener('fullscreenchange', () => {
      this.resizeCanvas();
    });
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;
    
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    this.logger.debug('Canvas resized', { width: this.canvas.width, height: this.canvas.height });
  }

  private startRenderLoop(): void {
    if (this.isRendering) return;
    
    this.isRendering = true;
    this.renderLoop();
  }

  private stopRenderLoop(): void {
    this.isRendering = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private renderLoop(): void {
    if (!this.isRendering) return;
    
    const startTime = performance.now();
    
    // Process frame queue
    this.processFrameQueue();
    
    // Update stats
    this.updateStats(startTime);
    
    // Continue loop
    this.animationFrameId = requestAnimationFrame(() => {
      this.renderLoop();
    });
  }

  private processFrameQueue(): void {
    if (!this.ctx || !this.canvas || this.frameQueue.length === 0) return;
    
    const frame = this.frameQueue.shift();
    if (!frame) return;
    
    try {
      this.renderFrame(frame);
      this.stats.frameCount++;
      this.emit('frameReceived');
      
    } catch (error) {
      this.logger.error('Failed to render frame', error);
      this.stats.droppedFrames++;
    }
  }

  private async renderFrame(frame: FrameData): Promise<void> {
    if (!this.ctx || !this.canvas) return;
    
    let imageData: ImageData | ImageBitmap | null = null;
    
    // Convert frame data to image
    if (frame.data instanceof ImageData) {
      imageData = frame.data;
    } else if (frame.data instanceof ArrayBuffer) {
      imageData = await this.createImageFromArrayBuffer(frame.data, frame.width, frame.height);
    } else if (frame.data instanceof Blob) {
      imageData = await this.createImageFromBlob(frame.data);
    }
    
    if (!imageData) {
      throw new Error('Failed to create image from frame data');
    }
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Calculate scaling
    const { x, y, width, height } = this.calculateScaledDimensions(
      imageData.width,
      imageData.height,
      this.canvas.width,
      this.canvas.height
    );
    
    // Draw image
    if (imageData instanceof ImageData) {
      // Create temporary canvas for ImageData
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(imageData, 0, 0);
      
      this.ctx.drawImage(tempCanvas, x, y, width, height);
    } else {
      this.ctx.drawImage(imageData, x, y, width, height);
    }
  }

  private async createImageFromArrayBuffer(buffer: ArrayBuffer, width: number, height: number): Promise<ImageBitmap> {
    const blob = new Blob([buffer], { type: 'image/png' });
    return createImageBitmap(blob);
  }

  private async createImageFromBlob(blob: Blob): Promise<ImageBitmap> {
    return createImageBitmap(blob);
  }

  private calculateScaledDimensions(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number
  ): { x: number; y: number; width: number; height: number } {
    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = targetWidth / targetHeight;
    
    let x = 0;
    let y = 0;
    let width = targetWidth;
    let height = targetHeight;
    
    switch (this.scaleMode) {
      case 'fit':
        if (this.maintainAspectRatio) {
          if (sourceAspect > targetAspect) {
            // Source is wider
            width = targetWidth;
            height = targetWidth / sourceAspect;
            y = (targetHeight - height) / 2;
          } else {
            // Source is taller
            height = targetHeight;
            width = targetHeight * sourceAspect;
            x = (targetWidth - width) / 2;
          }
        }
        break;
        
      case 'fill':
        if (this.maintainAspectRatio) {
          if (sourceAspect > targetAspect) {
            // Source is wider - crop height
            height = targetHeight;
            width = targetHeight * sourceAspect;
            x = (targetWidth - width) / 2;
          } else {
            // Source is taller - crop width
            width = targetWidth;
            height = targetWidth / sourceAspect;
            y = (targetHeight - height) / 2;
          }
        }
        break;
        
      case 'stretch':
        // Use full target dimensions
        break;
    }
    
    return { x, y, width, height };
  }

  private updateStats(frameTime: number): void {
    const now = performance.now();
    const frameDuration = now - frameTime;
    
    // Update frame times array
    this.frameTimes.push(frameDuration);
    if (this.frameTimes.length > this.maxFrameTimes) {
      this.frameTimes.shift();
    }
    
    // Calculate average frame time
    const totalFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0);
    this.stats.averageFrameTime = totalFrameTime / this.frameTimes.length;
    
    // Calculate FPS
    this.stats.fps = 1000 / this.stats.averageFrameTime;
    
    this.stats.lastFrameTime = frameDuration;
  }

  // Public methods for external control
  setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    // Adjust queue size based on quality
    const qualitySettings = {
      low: 5,
      medium: 10,
      high: 15,
      ultra: 20
    };
    
    this.maxQueueSize = qualitySettings[quality];
    
    // Trim queue if needed
    while (this.frameQueue.length > this.maxQueueSize) {
      this.frameQueue.shift();
      this.stats.droppedFrames++;
    }
    
    this.logger.info(`Quality set to ${quality}, queue size: ${this.maxQueueSize}`);
  }

  clearCanvas(): void {
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.frameQueue = [];
    this.stats.frameCount = 0;
  }

  takeScreenshot(): string {
    if (!this.canvas) return '';
    
    return this.canvas.toDataURL('image/png');
  }
} 