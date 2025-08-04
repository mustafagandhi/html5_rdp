export type EventHandler<T = any> = (data: T) => void;

export interface EventMap {
  [event: string]: EventHandler[];
}

export class EventEmitter {
  private events: EventMap = {};

  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }

  off<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.events[event]) return;
    
    const index = this.events[event].indexOf(handler);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }
  }

  emit<T = any>(event: string, data?: T): void {
    if (!this.events[event]) return;
    
    this.events[event].forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  once<T = any>(event: string, handler: EventHandler<T>): void {
    const onceHandler = (data: T) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  listenerCount(event: string): number {
    return this.events[event]?.length || 0;
  }

  eventNames(): string[] {
    return Object.keys(this.events);
  }
} 