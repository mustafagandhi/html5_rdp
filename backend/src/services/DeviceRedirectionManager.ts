import { Logger } from '../utils/Logger';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface RedirectedDevice {
  id: string;
  sessionId: string;
  type: 'usb' | 'printer' | 'camera' | 'microphone' | 'speaker' | 'smartcard' | 'scanner' | 'storage';
  name: string;
  vendorId?: string;
  productId?: string;
  serialNumber?: string;
  isConnected: boolean;
  isActive: boolean;
  permissions: 'read' | 'write' | 'readwrite';
  createdAt: Date;
  lastActivity: Date;
}

export interface USBDevice {
  vendorId: string;
  productId: string;
  manufacturer: string;
  product: string;
  serialNumber?: string;
  deviceClass: number;
  deviceSubClass: number;
  protocol: number;
}

export interface PrinterDevice {
  name: string;
  port: string;
  driver: string;
  isDefault: boolean;
  isNetwork: boolean;
  capabilities: string[];
}

export interface AudioDevice {
  name: string;
  type: 'input' | 'output';
  sampleRate: number;
  channels: number;
  isDefault: boolean;
}

export class DeviceRedirectionManager extends EventEmitter {
  private logger = new Logger('DeviceRedirectionManager');
  private devices: Map<string, RedirectedDevice> = new Map();
  private usbDevices: Map<string, USBDevice> = new Map();
  private printerDevices: Map<string, PrinterDevice> = new Map();
  private audioDevices: Map<string, AudioDevice> = new Map();

  constructor() {
    super();
    this.initializeDefaultDevices();
    this.logger.info('Device Redirection Manager initialized');
  }

  private initializeDefaultDevices(): void {
    // Initialize USB devices
    this.usbDevices.set('usb_1', {
      vendorId: '045e',
      productId: '0745',
      manufacturer: 'Microsoft',
      product: 'Xbox 360 Controller',
      deviceClass: 3,
      deviceSubClass: 0,
      protocol: 0
    });

    this.usbDevices.set('usb_2', {
      vendorId: '046d',
      productId: 'c332',
      manufacturer: 'Logitech',
      product: 'USB Keyboard',
      deviceClass: 3,
      deviceSubClass: 1,
      protocol: 1
    });

    // Initialize printer devices
    this.printerDevices.set('printer_1', {
      name: 'HP LaserJet Pro',
      port: 'USB001',
      driver: 'HP LaserJet Pro',
      isDefault: true,
      isNetwork: false,
      capabilities: ['print', 'scan', 'copy']
    });

    this.printerDevices.set('printer_2', {
      name: 'Canon PIXMA',
      port: 'USB002',
      driver: 'Canon PIXMA',
      isDefault: false,
      isNetwork: false,
      capabilities: ['print', 'scan']
    });

    // Initialize audio devices
    this.audioDevices.set('audio_1', {
      name: 'Built-in Microphone',
      type: 'input',
      sampleRate: 44100,
      channels: 1,
      isDefault: true
    });

    this.audioDevices.set('audio_2', {
      name: 'Built-in Speakers',
      type: 'output',
      sampleRate: 44100,
      channels: 2,
      isDefault: true
    });

    this.logger.info('Default devices initialized');
  }

  public async connectDevice(sessionId: string, data: any): Promise<any> {
    const deviceId = uuidv4();
    
    const device: RedirectedDevice = {
      id: deviceId,
      sessionId,
      type: data.type,
      name: data.name,
      vendorId: data.vendorId,
      productId: data.productId,
      serialNumber: data.serialNumber,
      isConnected: false,
      isActive: true,
      permissions: data.permissions || 'readwrite',
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.devices.set(deviceId, device);
    this.logger.info(`Device connection started: ${device.name} (${device.type})`);

    try {
      // Connect device based on type
      await this.connectDeviceByType(device, data);
      
      device.isConnected = true;
      device.lastActivity = new Date();
      
      this.logger.info(`Device connected successfully: ${device.name}`);
      this.emit('deviceConnected', { device, sessionId });
      
      return {
        success: true,
        deviceId,
        deviceName: device.name,
        deviceType: device.type
      };
    } catch (error) {
      device.isConnected = false;
      device.isActive = false;
      
      this.logger.error(`Device connection failed: ${device.name}`, error);
      
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async connectDeviceByType(device: RedirectedDevice, data: any): Promise<void> {
    switch (device.type) {
      case 'usb':
        return this.connectUSBDevice(device, data);
      case 'printer':
        return this.connectPrinterDevice(device, data);
      case 'camera':
        return this.connectCameraDevice(device, data);
      case 'microphone':
        return this.connectMicrophoneDevice(device, data);
      case 'speaker':
        return this.connectSpeakerDevice(device, data);
      case 'smartcard':
        return this.connectSmartCardDevice(device, data);
      case 'scanner':
        return this.connectScannerDevice(device, data);
      case 'storage':
        return this.connectStorageDevice(device, data);
      default:
        throw new Error(`Unsupported device type: ${device.type}`);
    }
  }

  private async connectUSBDevice(device: RedirectedDevice, data: any): Promise<void> {
    // Simulate USB device connection
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          this.logger.info(`USB device connected: ${device.name}`);
          resolve();
        } else {
          reject(new Error('USB device connection failed'));
        }
      }, 500);
    });
  }

  private async connectPrinterDevice(device: RedirectedDevice, data: any): Promise<void> {
    // Simulate printer device connection
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.05) { // 95% success rate
          this.logger.info(`Printer device connected: ${device.name}`);
          resolve();
        } else {
          reject(new Error('Printer device connection failed'));
        }
      }, 300);
    });
  }

  private async connectCameraDevice(device: RedirectedDevice, data: any): Promise<void> {
    // Simulate camera device connection
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          this.logger.info(`Camera device connected: ${device.name}`);
          resolve();
        } else {
          reject(new Error('Camera device connection failed'));
        }
      }, 400);
    });
  }

  private async connectMicrophoneDevice(device: RedirectedDevice, data: any): Promise<void> {
    // Simulate microphone device connection
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.05) { // 95% success rate
          this.logger.info(`Microphone device connected: ${device.name}`);
          resolve();
        } else {
          reject(new Error('Microphone device connection failed'));
        }
      }, 200);
    });
  }

  private async connectSpeakerDevice(device: RedirectedDevice, data: any): Promise<void> {
    // Simulate speaker device connection
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.05) { // 95% success rate
          this.logger.info(`Speaker device connected: ${device.name}`);
          resolve();
        } else {
          reject(new Error('Speaker device connection failed'));
        }
      }, 200);
    });
  }

  private async connectSmartCardDevice(device: RedirectedDevice, data: any): Promise<void> {
    // Simulate smart card device connection
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.2) { // 80% success rate
          this.logger.info(`Smart card device connected: ${device.name}`);
          resolve();
        } else {
          reject(new Error('Smart card device connection failed'));
        }
      }, 600);
    });
  }

  private async connectScannerDevice(device: RedirectedDevice, data: any): Promise<void> {
    // Simulate scanner device connection
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.15) { // 85% success rate
          this.logger.info(`Scanner device connected: ${device.name}`);
          resolve();
        } else {
          reject(new Error('Scanner device connection failed'));
        }
      }, 500);
    });
  }

  private async connectStorageDevice(device: RedirectedDevice, data: any): Promise<void> {
    // Simulate storage device connection
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          this.logger.info(`Storage device connected: ${device.name}`);
          resolve();
        } else {
          reject(new Error('Storage device connection failed'));
        }
      }, 400);
    });
  }

  public async disconnectDevice(sessionId: string, data: any): Promise<boolean> {
    const device = this.findDeviceBySessionAndId(sessionId, data.deviceId);
    if (!device) {
      this.logger.warn(`Device not found: ${data.deviceId}`);
      return false;
    }

    try {
      await this.disconnectDeviceByType(device);
      
      device.isConnected = false;
      device.isActive = false;
      device.lastActivity = new Date();
      
      this.logger.info(`Device disconnected: ${device.name}`);
      this.emit('deviceDisconnected', { device, sessionId });
      
      return true;
    } catch (error) {
      this.logger.error(`Device disconnect failed: ${device.name}`, error);
      return false;
    }
  }

  private async disconnectDeviceByType(device: RedirectedDevice): Promise<void> {
    // Simulate device disconnection
    return new Promise((resolve) => {
      setTimeout(() => {
        this.logger.info(`${device.type} device disconnected: ${device.name}`);
        resolve();
      }, 100);
    });
  }

  public sendDeviceData(deviceId: string, data: any): void {
    const device = this.devices.get(deviceId);
    if (!device || !device.isConnected) {
      return;
    }

    device.lastActivity = new Date();
    
    // Process device data based on type
    this.processDeviceData(device, data);
    
    this.emit('deviceDataReceived', { device, data });
  }

  private processDeviceData(device: RedirectedDevice, data: any): void {
    switch (device.type) {
      case 'usb':
        this.processUSBData(device, data);
        break;
      case 'printer':
        this.processPrinterData(device, data);
        break;
      case 'camera':
        this.processCameraData(device, data);
        break;
      case 'microphone':
        this.processMicrophoneData(device, data);
        break;
      case 'speaker':
        this.processSpeakerData(device, data);
        break;
      case 'smartcard':
        this.processSmartCardData(device, data);
        break;
      case 'scanner':
        this.processScannerData(device, data);
        break;
      case 'storage':
        this.processStorageData(device, data);
        break;
    }
  }

  private processUSBData(device: RedirectedDevice, data: any): void {
    this.logger.debug(`USB data received from ${device.name}:`, data);
  }

  private processPrinterData(device: RedirectedDevice, data: any): void {
    this.logger.debug(`Printer data received from ${device.name}:`, data);
  }

  private processCameraData(device: RedirectedDevice, data: any): void {
    this.logger.debug(`Camera data received from ${device.name}:`, data);
  }

  private processMicrophoneData(device: RedirectedDevice, data: any): void {
    this.logger.debug(`Microphone data received from ${device.name}:`, data);
  }

  private processSpeakerData(device: RedirectedDevice, data: any): void {
    this.logger.debug(`Speaker data received from ${device.name}:`, data);
  }

  private processSmartCardData(device: RedirectedDevice, data: any): void {
    this.logger.debug(`Smart card data received from ${device.name}:`, data);
  }

  private processScannerData(device: RedirectedDevice, data: any): void {
    this.logger.debug(`Scanner data received from ${device.name}:`, data);
  }

  private processStorageData(device: RedirectedDevice, data: any): void {
    this.logger.debug(`Storage data received from ${device.name}:`, data);
  }

  public getAvailableUSBDevices(): USBDevice[] {
    return Array.from(this.usbDevices.values());
  }

  public getAvailablePrinterDevices(): PrinterDevice[] {
    return Array.from(this.printerDevices.values());
  }

  public getAvailableAudioDevices(): AudioDevice[] {
    return Array.from(this.audioDevices.values());
  }

  public getConnectedDevices(sessionId: string): RedirectedDevice[] {
    return Array.from(this.devices.values())
      .filter(device => device.sessionId === sessionId && device.isConnected);
  }

  public getAllDevices(): RedirectedDevice[] {
    return Array.from(this.devices.values());
  }

  public getDevice(deviceId: string): RedirectedDevice | undefined {
    return this.devices.get(deviceId);
  }

  private findDeviceBySessionAndId(sessionId: string, deviceId: string): RedirectedDevice | undefined {
    for (const device of this.devices.values()) {
      if (device.sessionId === sessionId && device.id === deviceId) {
        return device;
      }
    }
    return undefined;
  }

  public addUSBDevice(device: USBDevice): void {
    const deviceId = `usb_${Date.now()}`;
    this.usbDevices.set(deviceId, device);
    this.logger.info(`USB device added: ${device.product}`);
  }

  public addPrinterDevice(device: PrinterDevice): void {
    const deviceId = `printer_${Date.now()}`;
    this.printerDevices.set(deviceId, device);
    this.logger.info(`Printer device added: ${device.name}`);
  }

  public addAudioDevice(device: AudioDevice): void {
    const deviceId = `audio_${Date.now()}`;
    this.audioDevices.set(deviceId, device);
    this.logger.info(`Audio device added: ${device.name}`);
  }

  public removeDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) {
      return false;
    }

    this.devices.delete(deviceId);
    this.logger.info(`Device removed: ${device.name}`);
    return true;
  }

  public getDeviceStats(): any {
    const devices = Array.from(this.devices.values());
    const connected = devices.filter(d => d.isConnected).length;
    const usb = devices.filter(d => d.type === 'usb').length;
    const printer = devices.filter(d => d.type === 'printer').length;
    const camera = devices.filter(d => d.type === 'camera').length;
    const audio = devices.filter(d => d.type === 'microphone' || d.type === 'speaker').length;

    return {
      total: devices.length,
      connected,
      usb,
      printer,
      camera,
      audio,
      availableUSB: this.usbDevices.size,
      availablePrinter: this.printerDevices.size,
      availableAudio: this.audioDevices.size
    };
  }

  public cleanupInactiveDevices(): void {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [deviceId, device] of this.devices.entries()) {
      if (!device.isConnected && 
          now.getTime() - device.lastActivity.getTime() > maxInactiveTime) {
        this.devices.delete(deviceId);
        this.logger.info(`Cleaned up inactive device: ${device.name}`);
      }
    }
  }
} 