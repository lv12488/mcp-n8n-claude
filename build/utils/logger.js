"use strict";
// Расширенный логгер для работы с Claude App MCP
// Добавляет временные метки и вывод ключевой информации
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
/**
 * Создает форматированную строку для лога с временной меткой и уровнем логирования
 */
function formatLogMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `${timestamp} [n8n-workflow-builder] [${level}] ${message}`;
}
exports.logger = {
    info: function (message = '', ...args) {
        if (message) {
            console.error(formatLogMessage('info', message));
            if (args.length > 0) {
                console.error(...args);
            }
        }
    },
    warn: function (message = '', ...args) {
        if (message) {
            console.error(formatLogMessage('warn', message));
            if (args.length > 0) {
                console.error(...args);
            }
        }
    },
    error: function (message = '', ...args) {
        if (message) {
            console.error(formatLogMessage('error', message));
            if (args.length > 0) {
                console.error(...args);
            }
        }
    },
    debug: function (message = '', ...args) {
        if (message) {
            console.error(formatLogMessage('debug', message));
            if (args.length > 0) {
                console.error(...args);
            }
        }
    },
    log: function (message = '', ...args) {
        if (message) {
            console.error(formatLogMessage('log', message));
            if (args.length > 0) {
                console.error(...args);
            }
        }
    }
};
exports.default = exports.logger;
