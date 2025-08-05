import { Logger } from '../../utils/Logger';
import { Config } from '../../utils/Config';

export class FileTransferPanel {
  private logger = new Logger('FileTransferPanel');
  private container: HTMLElement | null = null;
  private isVisible = false;

  constructor() {
    this.logger.info('File Transfer Panel initialized');
  }

  public mount(selector: string): void {
    this.container = document.querySelector(selector);
    if (!this.container) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    this.render();
    this.logger.info('File Transfer Panel mounted');
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
      <div class="file-transfer-panel ${this.isVisible ? 'visible' : ''}">
        <div class="file-transfer-header">
          <h3>File Transfer</h3>
          <button class="close-btn" onclick="this.hide()">×</button>
        </div>
        
        <div class="file-transfer-content">
          <div class="upload-section">
            <div class="drop-zone" id="drop-zone">
              <div class="drop-zone-content">
                <i class="upload-icon">📁</i>
                <p>Drag and drop files here to upload</p>
                <p>or click to browse</p>
                <input type="file" id="file-input" multiple style="display: none;">
              </div>
            </div>
            
            <div class="upload-list" id="upload-list">
              <div class="empty-state">No uploads yet</div>
            </div>
          </div>
          
          <div class="download-section">
            <div class="download-list" id="download-list">
              <div class="empty-state">No downloads yet</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    if (dropZone) {
      dropZone.addEventListener('click', () => {
        if (fileInput) {
          fileInput.click();
        }
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer?.files || []);
        this.handleFiles(files);
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files) {
          this.handleFiles(Array.from(target.files));
        }
      });
    }
  }

  private handleFiles(files: File[]): void {
    files.forEach(file => {
      this.logger.info(`File selected for upload: ${file.name} (${this.formatFileSize(file.size)})`);
      this.addUploadItem(file);
    });
  }

  private addUploadItem(file: File): void {
    const uploadList = document.getElementById('upload-list');
    if (!uploadList) return;

    const item = document.createElement('div');
    item.className = 'upload-item';
    item.innerHTML = `
      <div class="upload-info">
        <div class="upload-name">${file.name}</div>
        <div class="upload-size">${this.formatFileSize(file.size)}</div>
      </div>
      <div class="upload-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-text">0%</div>
      </div>
      <div class="upload-status">
        <span class="status-badge pending">Pending</span>
        <button class="action-btn remove" onclick="this.removeUpload(this)">×</button>
      </div>
    `;

    uploadList.appendChild(item);
    this.simulateUpload(item);
  }

  private simulateUpload(item: HTMLElement): void {
    const progressFill = item.querySelector('.progress-fill') as HTMLElement;
    const progressText = item.querySelector('.progress-text') as HTMLElement;
    const statusBadge = item.querySelector('.status-badge') as HTMLElement;

    statusBadge.textContent = 'Uploading';
    statusBadge.className = 'status-badge uploading';

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        statusBadge.textContent = 'Completed';
        statusBadge.className = 'status-badge completed';
        clearInterval(interval);
      }
      
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `${progress.toFixed(1)}%`;
    }, 100);
  }

  private removeUpload(button: HTMLElement): void {
    const item = button.closest('.upload-item');
    if (item) {
      item.remove();
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private updateUI(): void {
    if (this.container) {
      const panel = this.container.querySelector('.file-transfer-panel');
      if (panel) {
        panel.classList.toggle('visible', this.isVisible);
      }
    }
  }
} 