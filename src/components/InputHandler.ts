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

export interface CustomMouseEvent {
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

export interface CustomKeyboardEvent {
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

export interface CustomTouchEvent {
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

export interface CustomWheelEvent {
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

    this.logger.info('Event listeners attached');
  }

  private removeEventListeners(): void {
    if (!this.canvas) return;

    // Mouse events
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu.bind(this));

    // Keyboard events
    this.canvas.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.canvas.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.canvas.removeEventListener('keypress', this.handleKeyPress.bind(this));

    // Touch events
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));

    // Wheel events
    this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));

    // Focus events
    this.canvas.removeEventListener('focus', this.handleFocus.bind(this));
    this.canvas.removeEventListener('blur', this.handleBlur.bind(this));

    this.logger.info('Event listeners removed');
  }

  private handleMouseDown(event: globalThis.MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomMouseEvent = {
      type: 'mousedown',
      button: event.button,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };

    this.mousePosition = { x: customEvent.x, y: customEvent.y };
    this.pressedButtons.add(event.button);

    this.addInputEvent('mouse', 'mousedown', customEvent);
  }

  private handleMouseUp(event: globalThis.MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomMouseEvent = {
      type: 'mouseup',
      button: event.button,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };

    this.mousePosition = { x: customEvent.x, y: customEvent.y };
    this.pressedButtons.delete(event.button);

    this.addInputEvent('mouse', 'mouseup', customEvent);
  }

  private handleMouseMove(event: globalThis.MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const newX = this.getRelativeX(event.clientX);
    const newY = this.getRelativeY(event.clientY);
    const deltaX = newX - this.mousePosition.x;
    const deltaY = newY - this.mousePosition.y;

    const customEvent: CustomMouseEvent = {
      type: 'mousemove',
      button: event.button,
      x: newX,
      y: newY,
      deltaX,
      deltaY,
      modifiers: this.getModifiers(event)
    };

    this.mousePosition = { x: newX, y: newY };

    this.addInputEvent('mouse', 'mousemove', customEvent);
  }

  private handleClick(event: globalThis.MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomMouseEvent = {
      type: 'click',
      button: event.button,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };

    this.addInputEvent('mouse', 'click', customEvent);
  }

  private handleDoubleClick(event: globalThis.MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomMouseEvent = {
      type: 'dblclick',
      button: event.button,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };

    this.addInputEvent('mouse', 'dblclick', customEvent);
  }

  private handleContextMenu(event: globalThis.MouseEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomMouseEvent = {
      type: 'contextmenu',
      button: event.button,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };

    this.addInputEvent('mouse', 'contextmenu', customEvent);
  }

  private handleKeyDown(event: globalThis.KeyboardEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomKeyboardEvent = {
      type: 'keydown',
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      modifiers: this.getModifiers(event),
      repeat: event.repeat
    };

    this.pressedKeys.add(event.key);

    this.addInputEvent('keyboard', 'keydown', customEvent);
  }

  private handleKeyUp(event: globalThis.KeyboardEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomKeyboardEvent = {
      type: 'keyup',
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      modifiers: this.getModifiers(event),
      repeat: event.repeat
    };

    this.pressedKeys.delete(event.key);

    this.addInputEvent('keyboard', 'keyup', customEvent);
  }

  private handleKeyPress(event: globalThis.KeyboardEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomKeyboardEvent = {
      type: 'keypress',
      key: event.key,
      keyCode: event.keyCode,
      code: event.code,
      modifiers: this.getModifiers(event),
      repeat: event.repeat
    };

    this.addInputEvent('keyboard', 'keypress', customEvent);
  }

  private handleTouchStart(event: globalThis.TouchEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomTouchEvent = {
      type: 'touchstart',
      touches: this.getTouchArray(event.touches),
      changedTouches: this.getTouchArray(event.changedTouches)
    };

    this.addInputEvent('touch', 'touchstart', customEvent);
  }

  private handleTouchEnd(event: globalThis.TouchEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomTouchEvent = {
      type: 'touchend',
      touches: this.getTouchArray(event.touches),
      changedTouches: this.getTouchArray(event.changedTouches)
    };

    this.addInputEvent('touch', 'touchend', customEvent);
  }

  private handleTouchMove(event: globalThis.TouchEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomTouchEvent = {
      type: 'touchmove',
      touches: this.getTouchArray(event.touches),
      changedTouches: this.getTouchArray(event.changedTouches)
    };

    this.addInputEvent('touch', 'touchmove', customEvent);
  }

  private handleWheel(event: globalThis.WheelEvent): void {
    if (!this.isEnabled || !this.isCapturing) return;

    event.preventDefault();
    event.stopPropagation();

    const customEvent: CustomWheelEvent = {
      type: 'wheel',
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaZ: event.deltaZ,
      deltaMode: event.deltaMode,
      x: this.getRelativeX(event.clientX),
      y: this.getRelativeY(event.clientY),
      modifiers: this.getModifiers(event)
    };

    this.addInputEvent('wheel', 'wheel', customEvent);
  }

  private handleFocus(event: globalThis.FocusEvent): void {
    this.logger.info('Canvas focused');
  }

  private handleBlur(event: globalThis.FocusEvent): void {
    this.logger.info('Canvas blurred');
  }

  private getRelativeX(clientX: number): number {
    if (!this.canvas) return clientX;
    const rect = this.canvas.getBoundingClientRect();
    return (clientX - rect.left) / rect.width * this.canvas.width;
  }

  private getRelativeY(clientY: number): number {
    if (!this.canvas) return clientY;
    const rect = this.canvas.getBoundingClientRect();
    return (clientY - rect.top) / rect.height * this.canvas.height;
  }

  private getModifiers(event: globalThis.MouseEvent | globalThis.KeyboardEvent | globalThis.WheelEvent): {
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

  private getTouchArray(touchList: globalThis.TouchList): Array<{
    id: number;
    x: number;
    y: number;
    pressure: number;
  }> {
    const touches: Array<{
      id: number;
      x: number;
      y: number;
      pressure: number;
    }> = [];

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
    if (!this.isEnabled || !this.isCapturing) return;

    const inputEvent: InputEvent = {
      type: type as 'mouse' | 'keyboard' | 'touch' | 'wheel',
      action,
      data,
      timestamp: Date.now()
    };

    this.inputQueue.push(inputEvent);

    // Limit queue size
    if (this.inputQueue.length > this.maxQueueSize) {
      this.inputQueue.shift();
    }

    this.emit('input', inputEvent);
  }

  private setupInputProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processInputQueue();
    }, 16); // ~60 FPS
  }

  private processInputQueue(): void {
    if (this.inputQueue.length === 0) return;

    const events = [...this.inputQueue];
    this.inputQueue = [];

    // Send events to connection manager
    try {
      this.connectionManager.sendInputEvents(events);
    } catch (error) {
      this.logger.error('Failed to send input events', error as Error);
    }
  }

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
    this.disable();
    this.stopCapture();
    this.detachFromCanvas();
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.logger.info('Input handler destroyed');
  }
} 