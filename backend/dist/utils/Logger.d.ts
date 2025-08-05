export declare class Logger {
    private logger;
    private context;
    constructor(context: string);
    private createLogger;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    verbose(message: string, meta?: any): void;
    silly(message: string, meta?: any): void;
    log(level: string, message: string, meta?: any): void;
}
//# sourceMappingURL=Logger.d.ts.map