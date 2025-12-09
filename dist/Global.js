"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomCustomConfigsList = exports.maxTimeSSHConnection = exports.maxLengthLog = exports.clientRoomFirstPort = exports.wsPort = exports.expressPort = exports.clientPort = exports.serverRoomFirstPort = exports.serverPort = void 0;
/**
 * Porta principal do servidor Haxball
 * @constant {number}
 */
exports.serverPort = 9500;
/**
 * Primeira porta para salas Haxball
 * @constant {number}
 */
exports.serverRoomFirstPort = 9501;
/**
 * Porta do cliente de debugging
 * @constant {number}
 */
exports.clientPort = 9600;
/**
 * Porta do servidor Express
 * @constant {number}
 */
exports.expressPort = 9601;
/**
 * Porta do servidor WebSocket
 * @constant {number}
 */
exports.wsPort = 9602;
/**
 * Primeira porta para salas de cliente
 * @constant {number}
 */
exports.clientRoomFirstPort = 9603;
/**
 * Comprimento maximo de mensagens de log
 * @constant {number}
 */
exports.maxLengthLog = 300;
/**
 * Tempo maximo de conexao SSH em milissegundos
 * @constant {number}
 * @deprecated Nao utilizado em v5.0.0
 */
exports.maxTimeSSHConnection = 2 * 60 * 1000;
/**
 * Lista de configuracoes de sala personalizadas validas
 * @type {string[]}
 */
exports.roomCustomConfigsList = [
    "roomName",
    "playerName",
    "password",
    "maxPlayers",
    "public",
    "geo",
    "noPlayer"
];
//# sourceMappingURL=Global.js.map