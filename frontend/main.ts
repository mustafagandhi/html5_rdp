import './styles/main.css';
import { App } from './components/App';
import { Logger } from './utils/Logger';
import { ErrorHandler } from './utils/ErrorHandler';
import { Config } from './utils/Config';

// Initialize global error handling
ErrorHandler.init();

// Initialize logger
const logger = new Logger('Main');

// Initialize configuration
Config.init();

// Initialize the application
async function initApp() {
  try {
    logger.info('Initializing HTML5 RDP Client...');
    
    // Check browser compatibility for RDP client
    if (!checkBrowserCompatibility()) {
      throw new Error('Browser not compatible with HTML5 RDP Client');
    }
    
    // Initialize WebRTC adapter for RDP
    await import('webrtc-adapter');
    
    // Create and mount the app
    const app = new App();
    app.mount('#app');
    
    // Make app globally accessible
    (window as any).app = app;
    
    // Hide loading screen
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    logger.info('HTML5 RDP Client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize HTML5 RDP Client:', error);
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
  logger.info('HTML5 RDP Client shutting down...');
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    logger.info('Page hidden, pausing RDP updates');
  } else {
    logger.info('Page visible, resuming RDP updates');
  }
});

// Export for debugging
(window as any).HTML5RDP = {
  logger,
  config: Config
}; 