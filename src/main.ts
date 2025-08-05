import './styles/main.css';
import { App } from './components/App';
import { ConnectionManager } from './services/ConnectionManager';
import { Logger } from './utils/Logger';
import { ErrorHandler } from './utils/ErrorHandler';
import { Config } from './utils/Config';

// Initialize global error handling
ErrorHandler.init();

// Initialize logger
const logger = new Logger('Main');

// Initialize configuration
Config.init();

// Initialize connection manager
const connectionManager = new ConnectionManager();

// Initialize the application
async function initApp() {
  try {
    logger.info('Initializing Real Remote Desktop application...');
    
    // Check browser compatibility for agentless remote desktop
    if (!checkBrowserCompatibility()) {
      throw new Error('Browser not compatible with Real Remote Desktop');
    }
    
    // Initialize WebRTC adapter
    await import('webrtc-adapter');
    
    // Create and mount the app
    const app = new App(connectionManager);
    app.mount('#app');
    
    // Hide loading screen
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    ErrorHandler.handleError(error);
  }
}

function checkBrowserCompatibility(): boolean {
  // Check for basic features
  if (!('HTMLCanvasElement' in window)) {
    logger.error('Canvas not supported');
    return false;
  }
  
  if (!('WebSocket' in window)) {
    logger.error('WebSocket not supported');
    return false;
  }
  
  if (!('localStorage' in window)) {
    logger.error('localStorage not supported');
    return false;
  }
  
  if (!('crypto' in window)) {
    logger.error('Crypto not supported');
    return false;
  }
  
  if (!('fetch' in window)) {
    logger.error('Fetch not supported');
    return false;
  }
  
  // Check for WebRTC specific features
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    logger.error('WebRTC media devices not supported');
    return false;
  }
  
  // Check for RTCPeerConnection
  if (!('RTCPeerConnection' in window)) {
    logger.error('RTCPeerConnection not supported');
    return false;
  }
  
  // Check for screen capture API
  if (!navigator.mediaDevices.getDisplayMedia) {
    logger.error('Screen capture not supported');
    return false;
  }
  
  // Check for File System Access API (optional)
  if (!('showOpenFilePicker' in window)) {
    logger.warn('File System Access API not supported - file transfer will be limited');
  }
  
  // Check for Web USB API (optional)
  if (!('usb' in navigator)) {
    logger.warn('Web USB API not supported - device redirection will be limited');
  }
  
  return true;
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Handle unload events
window.addEventListener('beforeunload', () => {
  logger.info('Application shutting down...');
  connectionManager.disconnect();
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    logger.info('Page hidden, pausing connection updates');
    connectionManager.pause();
  } else {
    logger.info('Page visible, resuming connection updates');
    connectionManager.resume();
  }
});

// Export for debugging
(window as any).RealRemoteDesktop = {
  connectionManager,
  logger,
  config: Config
}; 