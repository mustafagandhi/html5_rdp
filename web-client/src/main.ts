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
    
    // Check browser compatibility
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
  const requiredFeatures = [
    'WebRTC',
    'Canvas',
    'WebSocket',
    'localStorage',
    'crypto',
    'fetch'
  ];
  
  for (const feature of requiredFeatures) {
    if (!(feature in window)) {
      logger.error(`Required feature not supported: ${feature}`);
      return false;
    }
  }
  
  // Check for WebRTC specific features
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    logger.error('WebRTC media devices not supported');
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