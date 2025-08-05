import { EventEmitter } from 'events';
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
export declare class DeviceRedirectionManager extends EventEmitter {
    private logger;
    private devices;
    private usbDevices;
    private printerDevices;
    private audioDevices;
    constructor();
    private initializeDefaultDevices;
    connectDevice(sessionId: string, data: any): Promise<any>;
    private connectDeviceByType;
    private connectUSBDevice;
    private connectPrinterDevice;
    private connectCameraDevice;
    private connectMicrophoneDevice;
    private connectSpeakerDevice;
    private connectSmartCardDevice;
    private connectScannerDevice;
    private connectStorageDevice;
    disconnectDevice(sessionId: string, data: any): Promise<boolean>;
    private disconnectDeviceByType;
    sendDeviceData(deviceId: string, data: any): void;
    private processDeviceData;
    private processUSBData;
    private processPrinterData;
    private processCameraData;
    private processMicrophoneData;
    private processSpeakerData;
    private processSmartCardData;
    private processScannerData;
    private processStorageData;
    getAvailableUSBDevices(): USBDevice[];
    getAvailablePrinterDevices(): PrinterDevice[];
    getAvailableAudioDevices(): AudioDevice[];
    getConnectedDevices(sessionId: string): RedirectedDevice[];
    getAllDevices(): RedirectedDevice[];
    getDevice(deviceId: string): RedirectedDevice | undefined;
    private findDeviceBySessionAndId;
    addUSBDevice(device: USBDevice): void;
    addPrinterDevice(device: PrinterDevice): void;
    addAudioDevice(device: AudioDevice): void;
    removeDevice(deviceId: string): boolean;
    getDeviceStats(): any;
    cleanupInactiveDevices(): void;
}
//# sourceMappingURL=DeviceRedirectionManager.d.ts.map