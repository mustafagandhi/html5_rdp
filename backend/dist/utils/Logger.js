"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = require("path");
const fs_1 = require("fs");
class Logger {
    constructor(context) {
        this.context = context;
        this.logger = this.createLogger();
    }
    createLogger() {
        const logDir = (0, path_1.join)(process.cwd(), 'logs');
        if (!(0, fs_1.existsSync)(logDir)) {
            (0, fs_1.mkdirSync)(logDir, { recursive: true });
        }
        const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
        const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, context, ...meta }) => {
            return `${timestamp} [${level}] [${context || this.context}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        }));
        return winston_1.default.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: logFormat,
            defaultMeta: { context: this.context },
            transports: [
                new winston_1.default.transports.Console({
                    format: consoleFormat
                }),
                new winston_1.default.transports.File({
                    filename: (0, path_1.join)(logDir, 'combined.log'),
                    maxsize: 10 * 1024 * 1024,
                    maxFiles: 5,
                    tailable: true
                }),
                new winston_1.default.transports.File({
                    filename: (0, path_1.join)(logDir, 'error.log'),
                    level: 'error',
                    maxsize: 10 * 1024 * 1024,
                    maxFiles: 5,
                    tailable: true
                }),
                ...(process.env.NODE_ENV === 'development' ? [
                    new winston_1.default.transports.File({
                        filename: (0, path_1.join)(logDir, 'debug.log'),
                        level: 'debug',
                        maxsize: 10 * 1024 * 1024,
                        maxFiles: 3,
                        tailable: true
                    })
                ] : [])
            ]
        });
    }
    info(message, meta) {
        this.logger.info(message, meta);
    }
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    error(message, meta) {
        this.logger.error(message, meta);
    }
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    verbose(message, meta) {
        this.logger.verbose(message, meta);
    }
    silly(message, meta) {
        this.logger.silly(message, meta);
    }
    log(level, message, meta) {
        this.logger.log(level, message, meta);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map