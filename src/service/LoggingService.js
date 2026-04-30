"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateLoggingService = CreateLoggingService;
class LoggingService {
    stamp(level, message) {
        return `${new Date().toISOString()} [${level}] ${message}`;
    }
    info(message) {
        console.log(this.stamp("INFO", message));
    }
    warn(message) {
        console.warn(this.stamp("WARN", message));
    }
    error(message) {
        console.error(this.stamp("ERROR", message));
    }
}
let loggingServiceInstance = null;
function CreateLoggingService() {
    if (loggingServiceInstance === null) {
        loggingServiceInstance = new LoggingService();
    }
    return loggingServiceInstance;
}
