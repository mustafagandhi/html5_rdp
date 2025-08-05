"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceRedirectionManager = void 0;
const Logger_1 = require("../utils/Logger");
const events_1 = require("events");
const uuid_1 = require("uuid");
class DeviceRedirectionManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.logger = new Logger_1.Logger('DeviceRedirectionManager');
        this.devices = new Map();
        this.usbDevices = new Map();
        this.printerDevices = new Map();
        this.audioDevices = new Map();
        this.initializeDefaultDevices();
        this.logger.info('Device Redirection Manager initialized');
    }
    initializeDefaultDevices() {
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
    async connectDevice(sessionId, data) {
        const deviceId = (0, uuid_1.v4)();
        const device = {
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
        }
        catch (error) {
            device.isConnected = false;
            device.isActive = false;
            this.logger.error(`Device connection failed: ${device.name}`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async connectDeviceByType(device, data) {
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
    async connectUSBDevice(device, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) {
                    this.logger.info(`USB device connected: ${device.name}`);
                    resolve();
                }
                else {
                    reject(new Error('USB device connection failed'));
                }
            }, 500);
        });
    }
    async connectPrinterDevice(device, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.05) {
                    this.logger.info(`Printer device connected: ${device.name}`);
                    resolve();
                }
                else {
                    reject(new Error('Printer device connection failed'));
                }
            }, 300);
        });
    }
    async connectCameraDevice(device, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) {
                    this.logger.info(`Camera device connected: ${device.name}`);
                    resolve();
                }
                else {
                    reject(new Error('Camera device connection failed'));
                }
            }, 400);
        });
    }
    async connectMicrophoneDevice(device, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.05) {
                    this.logger.info(`Microphone device connected: ${device.name}`);
                    resolve();
                }
                else {
                    reject(new Error('Microphone device connection failed'));
                }
            }, 200);
        });
    }
    async connectSpeakerDevice(device, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.05) {
                    this.logger.info(`Speaker device connected: ${device.name}`);
                    resolve();
                }
                else {
                    reject(new Error('Speaker device connection failed'));
                }
            }, 200);
        });
    }
    async connectSmartCardDevice(device, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.2) {
                    this.logger.info(`Smart card device connected: ${device.name}`);
                    resolve();
                }
                else {
                    reject(new Error('Smart card device connection failed'));
                }
            }, 600);
        });
    }
    async connectScannerDevice(device, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.15) {
                    this.logger.info(`Scanner device connected: ${device.name}`);
                    resolve();
                }
                else {
                    reject(new Error('Scanner device connection failed'));
                }
            }, 500);
        });
    }
    async connectStorageDevice(device, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) {
                    this.logger.info(`Storage device connected: ${device.name}`);
                    resolve();
                }
                else {
                    reject(new Error('Storage device connection failed'));
                }
            }, 400);
        });
    }
    async disconnectDevice(sessionId, data) {
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
        }
        catch (error) {
            this.logger.error(`Device disconnect failed: ${device.name}`, error);
            return false;
        }
    }
    async disconnectDeviceByType(device) {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.logger.info(`${device.type} device disconnected: ${device.name}`);
                resolve();
            }, 100);
        });
    }
    sendDeviceData(deviceId, data) {
        const device = this.devices.get(deviceId);
        if (!device || !device.isConnected) {
            return;
        }
        device.lastActivity = new Date();
        this.processDeviceData(device, data);
        this.emit('deviceDataReceived', { device, data });
    }
    processDeviceData(device, data) {
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
    processUSBData(device, data) {
        this.logger.debug(`USB data received from ${device.name}:`, data);
    }
    processPrinterData(device, data) {
        this.logger.debug(`Printer data received from ${device.name}:`, data);
    }
    processCameraData(device, data) {
        this.logger.debug(`Camera data received from ${device.name}:`, data);
    }
    processMicrophoneData(device, data) {
        this.logger.debug(`Microphone data received from ${device.name}:`, data);
    }
    processSpeakerData(device, data) {
        this.logger.debug(`Speaker data received from ${device.name}:`, data);
    }
    processSmartCardData(device, data) {
        this.logger.debug(`Smart card data received from ${device.name}:`, data);
    }
    processScannerData(device, data) {
        this.logger.debug(`Scanner data received from ${device.name}:`, data);
    }
    processStorageData(device, data) {
        this.logger.debug(`Storage data received from ${device.name}:`, data);
    }
    getAvailableUSBDevices() {
        return Array.from(this.usbDevices.values());
    }
    getAvailablePrinterDevices() {
        return Array.from(this.printerDevices.values());
    }
    getAvailableAudioDevices() {
        return Array.from(this.audioDevices.values());
    }
    getConnectedDevices(sessionId) {
        return Array.from(this.devices.values())
            .filter(device => device.sessionId === sessionId && device.isConnected);
    }
    getAllDevices() {
        return Array.from(this.devices.values());
    }
    getDevice(deviceId) {
        return this.devices.get(deviceId);
    }
    findDeviceBySessionAndId(sessionId, deviceId) {
        for (const device of this.devices.values()) {
            if (device.sessionId === sessionId && device.id === deviceId) {
                return device;
            }
        }
        return undefined;
    }
    addUSBDevice(device) {
        const deviceId = `usb_${Date.now()}`;
        this.usbDevices.set(deviceId, device);
        this.logger.info(`USB device added: ${device.product}`);
    }
    addPrinterDevice(device) {
        const deviceId = `printer_${Date.now()}`;
        this.printerDevices.set(deviceId, device);
        this.logger.info(`Printer device added: ${device.name}`);
    }
    addAudioDevice(device) {
        const deviceId = `audio_${Date.now()}`;
        this.audioDevices.set(deviceId, device);
        this.logger.info(`Audio device added: ${device.name}`);
    }
    removeDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (!device) {
            return false;
        }
        this.devices.delete(deviceId);
        this.logger.info(`Device removed: ${device.name}`);
        return true;
    }
    getDeviceStats() {
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
    cleanupInactiveDevices() {
        const now = new Date();
        const maxInactiveTime = 30 * 60 * 1000;
        for (const [deviceId, device] of this.devices.entries()) {
            if (!device.isConnected &&
                now.getTime() - device.lastActivity.getTime() > maxInactiveTime) {
                this.devices.delete(deviceId);
                this.logger.info(`Cleaned up inactive device: ${device.name}`);
            }
        }
    }
}
exports.DeviceRedirectionManager = DeviceRedirectionManager;
//# sourceMappingURL=DeviceRedirectionManager.js.map