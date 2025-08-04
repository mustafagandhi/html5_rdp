import { Logger } from './Logger';

export interface ErrorInfo {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  data?: any;
}

export class ErrorHandler {
  private static logger = new Logger('ErrorHandler');
  private static errors: ErrorInfo[] = [];
  private static maxErrors = 100;
  private static isInitialized = false;

  static init(): void {
    if (this.isInitialized) return;
    
    this.setupGlobalErrorHandling();
    this.setupUnhandledRejectionHandling();
    this.setupNetworkErrorHandling();
    
    this.isInitialized = true;
    this.logger.info('Error handler initialized');
  }

  static handleError(error: Error | string, data?: any): void {
    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      type: error instanceof Error ? error.constructor.name : 'UnknownError',
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: navigator.userAgent,
      url: window.location.href,
      data
    };

    this.errors.push(errorInfo);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    this.logger.error(errorInfo.message, error instanceof Error ? error : undefined, data);
    this.showUserFriendlyError(errorInfo);
  }

  static handleNetworkError(error: Error, url: string, method: string): void {
    const networkError = new Error(`Network error: ${method} ${url} - ${error.message}`);
    this.handleError(networkError, { url, method });
  }

  static handleWebRTCError(error: Error, context: string): void {
    const webrtcError = new Error(`WebRTC error in ${context}: ${error.message}`);
    this.handleError(webrtcError, { context });
  }

  static handleConnectionError(error: Error, connectionType: string): void {
    const connectionError = new Error(`Connection error (${connectionType}): ${error.message}`);
    this.handleError(connectionError, { connectionType });
  }

  private static setupGlobalErrorHandling(): void {
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }

  private static setupUnhandledRejectionHandling(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.handleError(error, { type: 'unhandledrejection' });
    });
  }

  private static setupNetworkErrorHandling(): void {
    // Override fetch to catch network errors
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        return await originalFetch(input, init);
      } catch (error) {
        const url = typeof input === 'string' ? input : input.toString();
        const method = init?.method || 'GET';
        this.handleNetworkError(error as Error, url, method);
        throw error;
      }
    };
  }

  private static generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static showUserFriendlyError(errorInfo: ErrorInfo): void {
    // Don't show errors for network issues that might be temporary
    if (this.isTemporaryError(errorInfo)) {
      return;
    }

    const errorMessage = this.getUserFriendlyMessage(errorInfo);
    
    // Create error notification
    this.showErrorNotification(errorMessage, errorInfo.id);
  }

  private static isTemporaryError(errorInfo: ErrorInfo): boolean {
    const temporaryPatterns = [
      /network error/i,
      /connection refused/i,
      /timeout/i,
      /offline/i,
      /no internet connection/i
    ];

    return temporaryPatterns.some(pattern => pattern.test(errorInfo.message));
  }

  private static getUserFriendlyMessage(errorInfo: ErrorInfo): string {
    const errorMessages: Record<string, string> = {
      'NetworkError': 'Unable to connect to the server. Please check your internet connection.',
      'WebRTCPeerConnectionError': 'Failed to establish secure connection. Please try refreshing the page.',
      'MediaDevicesError': 'Unable to access camera or microphone. Please check your permissions.',
      'CanvasError': 'Display error occurred. Please refresh the page.',
      'WebSocketError': 'Connection lost. Attempting to reconnect...',
      'AuthenticationError': 'Authentication failed. Please log in again.',
      'PermissionError': 'Permission denied. Please check your browser settings.',
      'QuotaExceededError': 'Storage limit reached. Please clear some data.',
      'TypeError': 'An unexpected error occurred. Please refresh the page.',
      'ReferenceError': 'An unexpected error occurred. Please refresh the page.',
      'SyntaxError': 'An unexpected error occurred. Please refresh the page.',
      'RangeError': 'An unexpected error occurred. Please refresh the page.',
      'EvalError': 'An unexpected error occurred. Please refresh the page.',
      'URIError': 'An unexpected error occurred. Please refresh the page.'
    };

    return errorMessages[errorInfo.type] || 'An unexpected error occurred. Please try again.';
  }

  private static showErrorNotification(message: string, errorId: string): void {
    // Remove existing error notifications
    const existingNotifications = document.querySelectorAll('.error-notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${message}</div>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const content = notification.querySelector('.error-content') as HTMLElement;
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const messageEl = notification.querySelector('.error-message') as HTMLElement;
    messageEl.style.cssText = `
      flex: 1;
      color: #991b1b;
      font-size: 14px;
      line-height: 1.4;
    `;

    const closeBtn = notification.querySelector('.error-close') as HTMLElement;
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 18px;
      color: #991b1b;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  static getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  static clearErrors(): void {
    this.errors = [];
  }

  static exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  static isRecoverable(error: Error): boolean {
    const recoverableErrors = [
      'NetworkError',
      'WebSocketError',
      'WebRTCPeerConnectionError'
    ];

    return recoverableErrors.some(type => error.constructor.name.includes(type));
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          this.handleError(lastError, { retryAttempts: attempt });
          throw lastError;
        }

        this.logger.warn(`Operation failed, retrying... (${attempt}/${maxRetries})`, { error: lastError.message });
        
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError!;
  }
} 