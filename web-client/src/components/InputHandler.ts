import { Logger } from '../utils/Logger';
import { ConnectionManager } from '../services/ConnectionManager';
import { EventEmitter } from '../utils/EventEmitter';
import { Config } from '../utils/Config';

export interface InputEvent {
  type: 'mouse' | 'keyboard' | 'touch' | 'wheel';
  action: string;
  data: any;
  timestamp: number;
}

export interface MouseEvent {
  type: 'mousedown' | 'mouseup' | 'mousemove' | 'click' | 'dblclick' | 'contextmenu';
  button: number;
  x: number;
  y: number;
  deltaX?: number;
  deltaY?: number;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}

export interface KeyboardEvent {
  type: 'keydown' | 'keyup' | 'keypress';
  key: string;
  keyCode: number;
  code: string;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
  repeat: boolean;
}

export interface TouchEvent {
  type: 'touchstart' | 'touchend' | 'touchmove';
  touches: Array<{
    id: number;
    x: number;
    y: number;
    pressure: number;
  }>;
  changedTouches: Array<{
    id: number;
    x: number;
    y: number;
    pressure: number;
  }>;
}

export interface WheelEvent {
  type: 'wheel';
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  deltaMode: number;
  x: number;
  y: number;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
}

export class InputHandler extends EventEmitter {
  private logger = new Logger('InputHandler');
  private config = Config.getInstance();
  private connectionManager: ConnectionManager;
  
  private canvas: HTMLCanvasElement | null = null;
  private isEnabled = true;
  private isCapturing = false;
  
  private mousePosition = { x: 0, y: 0 };
  private pressedKeys = new Set<string>();
  private pressedButtons = new Set<number>();
  
  private inputQueue: InputEvent[] = [];
  private maxQueueSize = 100;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(connectionManager: ConnectionManager) {
    super();
    this.connectionManager = connectionManager;
    
    this.setupInputProcessing();
    this.logger.info('Input handler initialized');
  }

  enable(): void {
    this.isEnabled = true;
    this.logger.info('Input handler enabled');
  }

  disable(): void {
    this.isEnabled = false;
    this.logger.info('Input handler disabled');
  }

  attachToCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.setupEventListeners();
    this.logger.info('Input handler attached to canvas');
  }

  detachFromCanvas(): void {
    this.removeEventListeners();
    this.canvas = null;
    this.logger.info('Input handler detached from canvas');
  }

  startCapture(): void {
    this.isCapturing = true;
    this.logger.info('Input capture started');
  }

  stopCapture(): void {
    this.isCapturing = false;
    this.logger.info('Input capture stopped');
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;
    
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    // Keyboard events
    this.canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.canvas.addEventListener('keyup', this.handleKeyUp.bind(this));
    this.canvas.addEventListener('keypress', this.handleKeyPress.bind(this));
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    
    // Wheel events
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    
    // Focus events
    this.canvas.addEventListener('focus', this.handleFocus.bind(this));
    this.canvas.addEventListener('blur', this.handleBlur.bind(this));
    
    // Prevent default behaviors
    this.canvas.addEventListener('dragstart', (e) => e.preventDefault());
    this.canvas.addEventListener('selectstart', (e) => e.preventDefault());
  }

  private removeEventListeners(): void {
    if (!this.canvas) return;
    
    // Remove all event listeners
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    this.canvas.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.canvas.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.canvas.removeEventListener('keypress', this.handleKeyPress.bind(this));
    
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    
    this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.removeEventListener('focus', this.handleFocus.bind(this));
    this.canvas.removeEventListener('blur', this.handleBlur.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const mouseEvent: MouseEvent = {
      type: 'mousedown',
      button: event.button,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };
    
    this.pressedButtons.add(event.button);
    this.addInputEvent('mouse', 'mousedown', mouseEvent);
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const mouseEvent: MouseEvent = {
      type: 'mouseup',
      button: event.button,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };
    
    this.pressedButtons.delete(event.button);
    this.addInputEvent('mouse', 'mouseup', mouseEvent);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const newX = this.getRelativeX(event.clientX);
    const newY = this.getRelativeY(event.clientY);
    
    const mouseEvent: MouseEvent = {
      type: 'mousemove',
      button: event.button,
      x: newX,
      y: newY,
      deltaX: newX - this.mousePosition.x,
      deltaY: newY - this.mousePosition.y,
      modifiers: this.getModifiers(event)
    };
    
    this.mousePosition = { x: newX, y: newY };
    this.addInputEvent('mouse', 'mousemove', mouseEvent);
  }

  private handleClick(event: MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const mouseEvent: MouseEvent = {
      type: 'click',
      button: event.button,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };
    
    this.addInputEvent('mouse', 'click', mouseEvent);
  }

  private handleDoubleClick(event: MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const mouseEvent: MouseEvent = {
      type: 'dblclick',
      button: event.button,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };
    
    this.addInputEvent('mouse', 'dblclick', mouseEvent);
  }

  private handleContextMenu(event: MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const mouseEvent: MouseEvent = {
      type: 'contextmenu',
      button: event.button,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };
    
    this.addInputEvent('mouse', 'contextmenu', mouseEvent);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const keyboardEvent: KeyboardEvent = {
      type: 'keydown',
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      modifiers: this.getModifiers(event),
      repeat: event.repeat
    };
    
    this.pressedKeys.add(event.code);
    this.addInputEvent('keyboard', 'keydown', keyboardEvent);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const keyboardEvent: KeyboardEvent = {
      type: 'keyup',
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      modifiers: this.getModifiers(event),
      repeat: false
    };
    
    this.pressedKeys.delete(event.code);
    this.addInputEvent('keyboard', 'keyup', keyboardEvent);
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const keyboardEvent: KeyboardEvent = {
      type: 'keypress',
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      modifiers: this.getModifiers(event),
      repeat: false
    };
    
    this.addInputEvent('keyboard', 'keypress', keyboardEvent);
  }

  private handleTouchStart(event: TouchEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const touchEvent: TouchEvent = {
      type: 'touchstart',
      touches: this.getTouchArray(event.touches),
      changedTouches: this.getTouchArray(event.changedTouches)
    };
    
    this.addInputEvent('touch', 'touchstart', touchEvent);
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const touchEvent: TouchEvent = {
      type: 'touchend',
      touches: this.getTouchArray(event.touches),
      changedTouches: this.getTouchArray(event.changedTouches)
    };
    
    this.addInputEvent('touch', 'touchend', touchEvent);
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const touchEvent: TouchEvent = {
      type: 'touchmove',
      touches: this.getTouchArray(event.touches),
      changedTouches: this.getTouchArray(event.changedTouches)
    };
    
    this.addInputEvent('touch', 'touchmove', touchEvent);
  }

  private handleWheel(event: WheelEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;
    
    event.preventDefault();
    
    const wheelEvent: WheelEvent = {
      type: 'wheel',
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaZ: event.deltaZ,
      deltaMode: event.deltaMode,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };
    
    this.addInputEvent('wheel', 'wheel', wheelEvent);
  }

  private handleFocus(event: FocusEvent): void {
    this.logger.debug('Canvas focused');
  }

  private handleBlur(event: FocusEvent): void {
    this.logger.debug('Canvas blurred');
    // Release all pressed keys and buttons when canvas loses focus
    this.pressedKeys.clear();
    this.pressedButtons.clear();
  }

  private getRelativeX(clientX: number): number {
    if (!this.canvas) return 0;
    const rect = this.canvas.getBoundingClientRect();
    return (clientX - rect.left) / rect.width;
  }

  private getRelativeY(clientY: number): number {
    if (!this.canvas) return 0;
    const rect = this.canvas.getBoundingClientRect();
    return (clientY - rect.top) / rect.height;
  }

  private getModifiers(event: MouseEvent | KeyboardEvent | WheelEvent): {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  } {
    return {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey
    };
  }

  private getTouchArray(touchList: TouchList): Array<{
    id: number;
    x: number;
    y: number;
    pressure: number;
  }> {
    const touches = [];
    for (let i = 0; i < touchList.length; i++) {
      const touch = touchList[i];
      touches.push({
        id: touch.identifier,
        x: this.getRelativeX(touch.clientX),
        y: this.getRelativeY(touch.clientY),
        pressure: touch.force || 1.0
      });
    }
    return touches;
  }

  private addInputEvent(type: string, action: string, data: any): void {
    const inputEvent: InputEvent = {
      type: type as any,
      action,
      data,
      timestamp: Date.now()
    };
    
    this.inputQueue.push(inputEvent);
    
    // Limit queue size
    if (this.inputQueue.length > this.maxQueueSize) {
      this.inputQueue.shift();
    }
    
    this.emit('inputEvent', inputEvent);
  }

  private setupInputProcessing(): void {
    // Process input queue at regular intervals
    this.processingInterval = setInterval(() => {
      this.processInputQueue();
    }, 16); // ~60 FPS
  }

  private processInputQueue(): void {
    if (!this.connectionManager.isConnected() || this.inputQueue.length === 0) {
      return;
    }
    
    // Send all queued events
    while (this.inputQueue.length > 0) {
      const event = this.inputQueue.shift();
      if (event) {
        try {
          this.connectionManager.getWebRTCService().sendInputEvent(event);
        } catch (error) {
          this.logger.error('Failed to send input event', error);
        }
      }
    }
  }

  // Public methods
  getPressedKeys(): string[] {
    return Array.from(this.pressedKeys);
  }

  getPressedButtons(): number[] {
    return Array.from(this.pressedButtons);
  }

  clearPressedKeys(): void {
    this.pressedKeys.clear();
  }

  clearPressedButtons(): void {
    this.pressedButtons.clear();
  }

  destroy(): void {
    this.stopCapture();
    this.detachFromCanvas();
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.inputQueue = [];
    this.logger.info('Input handler destroyed');
  }
} 