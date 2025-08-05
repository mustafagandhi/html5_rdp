import { Logger } from '../../utils/Logger';
import { RDPService } from '../../services/rdp/RDPService';

export class RDPConnectionPanel {
  private logger = new Logger('RDPConnectionPanel');
  private rdpService: RDPService;
  private element: HTMLElement | null = null;

  constructor(rdpService: RDPService) {
    this.rdpService = rdpService;
  }

  mount(selector: string): void {
    this.element = document.querySelector(selector);
    if (!this.element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="rdp-connection-panel">
        <h2>Connect to Remote Desktop</h2>
        <form id="rdp-connection-form">
          <div class="form-group">
            <label for="rdp-host">Hostname or IP Address</label>
            <input type="text" id="rdp-host" name="host" required placeholder="192.168.1.100">
          </div>
          
          <div class="form-group">
            <label for="rdp-port">Port</label>
            <input type="number" id="rdp-port" name="port" value="3389" min="1" max="65535">
          </div>
          
          <div class="form-group">
            <label for="rdp-username">Username</label>
            <input type="text" id="rdp-username" name="username" required placeholder="Administrator">
          </div>
          
          <div class="form-group">
            <label for="rdp-password">Password</label>
            <input type="password" id="rdp-password" name="password" required>
          </div>
          
          <div class="form-group">
            <label for="rdp-domain">Domain (optional)</label>
            <input type="text" id="rdp-domain" name="domain" placeholder="WORKGROUP">
          </div>
          
          <div class="form-group">
            <label for="rdp-quality">Quality</label>
            <select id="rdp-quality" name="quality">
              <option value="low">Low (Fast)</option>
              <option value="medium" selected>Medium (Balanced)</option>
              <option value="high">High (Quality)</option>
              <option value="ultra">Ultra (Best)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="rdp-audio" name="enableAudio" checked>
              Enable Audio
            </label>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="rdp-clipboard" name="enableClipboard" checked>
              Enable Clipboard Sync
            </label>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="rdp-file-transfer" name="enableFileTransfer" checked>
              Enable File Transfer
            </label>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="rdp-device-redirection" name="enableDeviceRedirection" checked>
              Enable Device Redirection
            </label>
          </div>
          
          <button type="submit" class="btn btn-primary">
            <i class="icon-connect"></i> Connect to Remote Desktop
          </button>
        </form>
      </div>
    `;
  }

  private setupEventListeners(): void {
    const form = document.getElementById('rdp-connection-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleConnect();
      });
    }
  }

  private handleConnect(): void {
    const host = (document.getElementById('rdp-host') as HTMLInputElement)?.value;
    const port = parseInt((document.getElementById('rdp-port') as HTMLInputElement)?.value || '3389');
    const username = (document.getElementById('rdp-username') as HTMLInputElement)?.value;
    const password = (document.getElementById('rdp-password') as HTMLInputElement)?.value;
    const domain = (document.getElementById('rdp-domain') as HTMLInputElement)?.value;
    const quality = (document.getElementById('rdp-quality') as HTMLSelectElement)?.value as any;
    const enableAudio = (document.getElementById('rdp-audio') as HTMLInputElement)?.checked;
    const enableClipboard = (document.getElementById('rdp-clipboard') as HTMLInputElement)?.checked;
    const enableFileTransfer = (document.getElementById('rdp-file-transfer') as HTMLInputElement)?.checked;
    const enableDeviceRedirection = (document.getElementById('rdp-device-redirection') as HTMLInputElement)?.checked;

    if (!host || !username || !password) {
      this.logger.error('Missing required fields');
      return;
    }

    const config = {
      host,
      port,
      username,
      password,
      domain: domain || undefined,
      quality,
      enableAudio: enableAudio || false,
      enableClipboard: enableClipboard || false,
      enableFileTransfer: enableFileTransfer || false,
      enableDeviceRedirection: enableDeviceRedirection || false,
      enablePrinterRedirection: false,
      enableSmartCardRedirection: false,
      enableUSBRedirection: false,
      enableCameraRedirection: false,
      enableMicrophoneRedirection: false,
      enableSpeakerRedirection: false,
      enableMultiMonitor: false,
      monitorCount: 1,
      colorDepth: 24,
      width: 1920,
      height: 1080,
      frameRate: 30,
      compressionLevel: 6,
      encryptionLevel: 'high',
      authenticationLevel: 'high',
      timeout: 30000,
      reconnectAttempts: 3,
      reconnectDelay: 5000
    };

    this.logger.info(`Connecting to RDP server: ${host}:${port}`);
    this.rdpService.connect(config);
  }
} 