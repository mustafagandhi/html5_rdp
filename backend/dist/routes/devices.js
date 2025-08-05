"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const DeviceRedirectionManager_1 = require("../services/DeviceRedirectionManager");
const AuthManager_1 = require("../services/AuthManager");
const Logger_1 = require("../utils/Logger");
const router = express_1.default.Router();
const logger = new Logger_1.Logger('DeviceRoutes');
const deviceManager = new DeviceRedirectionManager_1.DeviceRedirectionManager();
const authManager = new AuthManager_1.AuthManager();
router.get('/stats', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const stats = deviceManager.getDeviceStats();
        return res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        logger.error('Get device stats error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/usb', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const devices = deviceManager.getAvailableUSBDevices();
        return res.json({
            success: true,
            devices
        });
    }
    catch (error) {
        logger.error('Get USB devices error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/printers', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const devices = deviceManager.getAvailablePrinterDevices();
        return res.json({
            success: true,
            devices
        });
    }
    catch (error) {
        logger.error('Get printer devices error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/audio', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const devices = deviceManager.getAvailableAudioDevices();
        return res.json({
            success: true,
            devices
        });
    }
    catch (error) {
        logger.error('Get audio devices error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/connected/:sessionId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const { sessionId } = req.params;
        const devices = deviceManager.getConnectedDevices(sessionId);
        res.json({
            success: true,
            devices: devices.map(device => ({
                id: device.id,
                type: device.type,
                name: device.name,
                vendorId: device.vendorId,
                productId: device.productId,
                serialNumber: device.serialNumber,
                isConnected: device.isConnected,
                isActive: device.isActive,
                permissions: device.permissions,
                createdAt: device.createdAt,
                lastActivity: device.lastActivity
            }))
        });
    }
    catch (error) {
        logger.error('Get connected devices error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/connect/:sessionId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const { sessionId } = req.params;
        const { type, name, vendorId, productId, serialNumber, permissions } = req.body;
        if (!type || !name) {
            return res.status(400).json({
                success: false,
                error: 'Device type and name are required'
            });
        }
        const result = await deviceManager.connectDevice(sessionId, {
            type,
            name,
            vendorId,
            productId,
            serialNumber,
            permissions: permissions || 'readwrite'
        });
        if (result.success) {
            logger.info(`Device connected: ${result.deviceName} (${result.deviceType}) to session ${sessionId}`);
            return res.json({
                success: true,
                deviceId: result.deviceId,
                deviceName: result.deviceName,
                deviceType: result.deviceType
            });
        }
        else {
            return res.status(400).json({
                success: false,
                error: result.error
            });
        }
    }
    catch (error) {
        logger.error('Connect device error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/disconnect/:sessionId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const { sessionId } = req.params;
        const { deviceId } = req.body;
        if (!deviceId) {
            return res.status(400).json({
                success: false,
                error: 'Device ID is required'
            });
        }
        const success = await deviceManager.disconnectDevice(sessionId, { deviceId });
        if (success) {
            logger.info(`Device disconnected: ${deviceId} from session ${sessionId}`);
            return res.json({
                success: true,
                message: 'Device disconnected successfully'
            });
        }
        else {
            return res.status(404).json({
                success: false,
                error: 'Device not found or already disconnected'
            });
        }
    }
    catch (error) {
        logger.error('Disconnect device error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.get('/:sessionId/:deviceId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const { deviceId } = req.params;
        const device = deviceManager.getDevice(deviceId);
        if (!device) {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }
        return res.json({
            success: true,
            device: {
                id: device.id,
                type: device.type,
                name: device.name,
                vendorId: device.vendorId,
                productId: device.productId,
                serialNumber: device.serialNumber,
                isConnected: device.isConnected,
                isActive: device.isActive,
                permissions: device.permissions,
                createdAt: device.createdAt,
                lastActivity: device.lastActivity
            }
        });
    }
    catch (error) {
        logger.error('Get device error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.delete('/:sessionId/:deviceId', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        const { deviceId } = req.params;
        const success = deviceManager.removeDevice(deviceId);
        if (success) {
            logger.info(`Device removed: ${deviceId}`);
            return res.json({
                success: true,
                message: 'Device removed successfully'
            });
        }
        else {
            return res.status(404).json({
                success: false,
                error: 'Device not found'
            });
        }
    }
    catch (error) {
        logger.error('Remove device error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/usb', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { vendorId, productId, manufacturer, product, serialNumber, deviceClass, deviceSubClass, protocol } = req.body;
        if (!vendorId || !productId || !manufacturer || !product) {
            return res.status(400).json({
                success: false,
                error: 'Vendor ID, product ID, manufacturer, and product are required'
            });
        }
        deviceManager.addUSBDevice({
            vendorId,
            productId,
            manufacturer,
            product,
            serialNumber,
            deviceClass: deviceClass || 0,
            deviceSubClass: deviceSubClass || 0,
            protocol: protocol || 0
        });
        logger.info(`USB device added: ${product}`);
        return res.status(201).json({
            success: true,
            message: 'USB device added successfully'
        });
    }
    catch (error) {
        logger.error('Add USB device error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/printers', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { name, port, driver, isDefault, isNetwork, capabilities } = req.body;
        if (!name || !port || !driver) {
            return res.status(400).json({
                success: false,
                error: 'Name, port, and driver are required'
            });
        }
        deviceManager.addPrinterDevice({
            name,
            port,
            driver,
            isDefault: isDefault || false,
            isNetwork: isNetwork || false,
            capabilities: capabilities || ['print']
        });
        logger.info(`Printer device added: ${name}`);
        return res.status(201).json({
            success: true,
            message: 'Printer device added successfully'
        });
    }
    catch (error) {
        logger.error('Add printer device error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
router.post('/audio', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const user = authManager.getUserFromToken(token);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        const { name, type, sampleRate, channels, isDefault } = req.body;
        if (!name || !type || !sampleRate || !channels) {
            return res.status(400).json({
                success: false,
                error: 'Name, type, sample rate, and channels are required'
            });
        }
        if (!['input', 'output'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Type must be either "input" or "output"'
            });
        }
        deviceManager.addAudioDevice({
            name,
            type,
            sampleRate: parseInt(sampleRate),
            channels: parseInt(channels),
            isDefault: isDefault || false
        });
        logger.info(`Audio device added: ${name}`);
        return res.status(201).json({
            success: true,
            message: 'Audio device added successfully'
        });
    }
    catch (error) {
        logger.error('Add audio device error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=devices.js.map