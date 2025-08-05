import { Logger } from '../../utils/Logger';
import { Config } from '../../utils/Config';

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'usb' | 'printer' | 'smartcard' | 'camera' | 'microphone' | 'speaker';
  connected: boolean;
  enabled: boolean;
}

export class DeviceRedirectionPanel {
  private logger = new Logger('DeviceRedirectionPanel');
  private container: HTMLElement | null = null;
  private isVisible = false;
  private devices: DeviceInfo[] = [];

  constructor() {
    this.logger.info('Device Redirection Panel initialized');
    this.initializeDevices();
  }

  private initializeDevices(): void {
    // Initialize with common device types
    this.devices = [
      { id: 'usb-1', name: 'USB Device 1', type: 'usb', connected: false, enabled: false },
      { id: 'printer-1', name: 'Default Printer', type: 'printer', connected: false, enabled: false },
      { id: 'smartcard-1', name: 'Smart Card Reader', type: 'smartcard', connected: false, enabled: false },
      { id: 'camera-1', name: 'Web Camera', type: 'camera', connected: false, enabled: false },
      { id: 'mic-1', name: 'Microphone', type: 'microphone', connected: false, enabled: false },
      { id: 'speaker-1', name: 'Speakers', type: 'speaker', connected: false, enabled: false }
    ];
  }

  public mount(selector: string): void {
    this.container = document.querySelector(selector);
    if (!this.container) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    this.render();
    this.logger.info('Device Redirection Panel mounted');
  }

  public show(): void {
    this.isVisible = true;
    this.updateUI();
  }

  public hide(): void {
    this.isVisible = false;
    this.updateUI();
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    this.updateUI();
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="device-redirection-panel ${this.isVisible ? 'visible' : ''}">
        <div class="device-redirection-header">
          <h3>Device Redirection</h3>
          <button class="close-btn" onclick="this.hide()">×</button>
        </div>
        
        <div class="device-redirection-content">
          <div class="device-categories">
            <div class="category usb-devices">
              <h4>USB Devices</h4>
              <div class="device-list" id="usb-devices">
                ${this.renderDeviceCategory('usb')}
              </div>
            </div>
            
            <div class="category audio-devices">
              <h4>Audio Devices</h4>
              <div class="device-list" id="audio-devices">
                ${this.renderDeviceCategory('microphone')}
                ${this.renderDeviceCategory('speaker')}
              </div>
            </div>
            
            <div class="category peripheral-devices">
              <h4>Peripheral Devices</h4>
              <div class="device-list" id="peripheral-devices">
                ${this.renderDeviceCategory('printer')}
                ${this.renderDeviceCategory('smartcard')}
                ${this.renderDeviceCategory('camera')}
              </div>
            </div>
          </div>
          
          <div class="device-controls">
            <button class="btn btn-primary" onclick="this.scanForDevices()">
              <i class="icon">🔍</i>
              Scan for Devices
            </button>
            <button class="btn btn-secondary" onclick="this.refreshDevices()">
              <i class="icon">🔄</i>
              Refresh
            </button>
          </div>
        </div>
      </div>
    `;

    this.setupEventHandlers();
  }

  private renderDeviceCategory(type: string): string {
    const categoryDevices = this.devices.filter(device => device.type === type);
    
    if (categoryDevices.length === 0) {
      return '<div class="empty-state">No devices found</div>';
    }

    return categoryDevices.map(device => `
      <div class="device-item ${device.connected ? 'connected' : ''}" data-device-id="${device.id}">
        <div class="device-info">
          <div class="device-icon">${this.getDeviceIcon(device.type)}</div>
          <div class="device-details">
            <div class="device-name">${device.name}</div>
            <div class="device-status">${device.connected ? 'Connected' : 'Disconnected'}</div>
          </div>
        </div>
        
        <div class="device-controls">
          <label class="toggle-switch">
            <input type="checkbox" 
                   ${device.enabled ? 'checked' : ''} 
                   onchange="this.toggleDevice('${device.id}', this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `).join('');
  }

  private getDeviceIcon(type: string): string {
    const icons = {
      usb: '🔌',
      printer: '🖨️',
      smartcard: '💳',
      camera: '📷',
      microphone: '🎤',
      speaker: '🔊'
    };
    return icons[type as keyof typeof icons] || '📱';
  }

  private setupEventHandlers(): void {
    // Device toggle handlers
    const toggles = document.querySelectorAll('input[type="checkbox"]');
    toggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const deviceId = target.closest('.device-item')?.dataset.deviceId;
        if (deviceId) {
          this.toggleDevice(deviceId, target.checked);
        }
      });
    });
  }

  public toggleDevice(deviceId: string, enabled: boolean): void {
    const device = this.devices.find(d => d.id === deviceId);
    if (device) {
      device.enabled = enabled;
      this.logger.info(`${enabled ? 'Enabled' : 'Disabled'} device: ${device.name}`);
      
      // Simulate device connection/disconnection
      if (enabled) {
        setTimeout(() => {
          device.connected = true;
          this.updateDeviceUI(deviceId);
        }, 1000);
      } else {
        device.connected = false;
        this.updateDeviceUI(deviceId);
      }
    }
  }

  private updateDeviceUI(deviceId: string): void {
    const deviceItem = document.querySelector(`[data-device-id="${deviceId}"]`);
    if (deviceItem) {
      const device = this.devices.find(d => d.id === deviceId);
      if (device) {
        deviceItem.classList.toggle('connected', device.connected);
        const statusElement = deviceItem.querySelector('.device-status');
        if (statusElement) {
          statusElement.textContent = device.connected ? 'Connected' : 'Disconnected';
        }
      }
    }
  }

  public scanForDevices(): void {
    this.logger.info('Scanning for devices...');
    
    // Simulate device discovery
    setTimeout(() => {
      const newDevices: DeviceInfo[] = [
        { id: 'usb-2', name: 'USB Flash Drive', type: 'usb', connected: true, enabled: false },
        { id: 'printer-2', name: 'Network Printer', type: 'printer', connected: true, enabled: false },
        { id: 'camera-2', name: 'HD Webcam', type: 'camera', connected: true, enabled: false }
      ];
      
      this.devices.push(...newDevices);
      this.render();
      this.logger.info(`Found ${newDevices.length} new devices`);
    }, 2000);
  }

  public refreshDevices(): void {
    this.logger.info('Refreshing device list...');
    this.render();
  }

  private updateUI(): void {
    if (this.container) {
      const panel = this.container.querySelector('.device-redirection-panel');
      if (panel) {
        panel.classList.toggle('visible', this.isVisible);
      }
    }
  }

  public getConnectedDevices(): DeviceInfo[] {
    return this.devices.filter(device => device.connected && device.enabled);
  }

  public getDeviceById(deviceId: string): DeviceInfo | undefined {
    return this.devices.find(device => device.id === deviceId);
  }
} 