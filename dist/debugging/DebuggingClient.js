"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebuggingClient = void 0;
const net_1 = __importDefault(require("net"));
const events_1 = __importDefault(require("events"));
const DebuggingServer_1 = require("./DebuggingServer");
const getAvailablePort_1 = require("../utils/getAvailablePort");
const Global = __importStar(require("../Global"));
class DebuggingClient extends events_1.default {
    roomsConn = [];
    client;
    get rooms() {
        return this.roomsConn.map(r => r.client);
    }
    get size() {
        return this.rooms.length;
    }
    constructor() {
        super();
    }
    listen(port) {
        this.client = new net_1.default.Socket();
        this.client.connect(port, 'localhost', () => {
            console.log("Listening to client tunnel");
        });
        this.client.on('data', async (data) => {
            try {
                const str = data.toString("utf-8");
                const json = JSON.parse(str);
                if (json.type === DebuggingServer_1.RoomDebuggingMessageType.UpdateRooms) {
                    const r = [];
                    let prevPort = Global.clientRoomFirstPort;
                    for (const serverPort of json.message) {
                        const availablePort = await (0, getAvailablePort_1.getAvailablePort)(prevPort);
                        r.push({ server: serverPort, client: availablePort });
                        prevPort = availablePort + 1;
                    }
                    this.roomsConn = r;
                    this.emit("set", r);
                }
                if (json.type === DebuggingServer_1.RoomDebuggingMessageType.AddRoom) {
                    const port = await (0, getAvailablePort_1.getAvailablePort)(Global.clientRoomFirstPort);
                    this.roomsConn.push({ server: json.message, client: port });
                    this.emit("add", json.message, port);
                }
                if (json.type === DebuggingServer_1.RoomDebuggingMessageType.RemoveRoom) {
                    const port = this.roomsConn.find(r => r.server === json.message)?.client;
                    this.roomsConn = this.roomsConn.filter(r => r.server !== json.message);
                    this.emit("remove", json.message, port);
                }
            }
            catch (err) {
                console.error(err);
            }
        });
        this.client.on('close', () => {
            console.log('Connection to debugging server closed');
        });
        this.client.on("error", (err) => {
            console.error(err);
            this.client?.destroy();
        });
        this.client.on("timeout", () => {
            console.log('Connection to debugging server timed out');
            this.client?.destroy();
        });
    }
}
exports.DebuggingClient = DebuggingClient;
//# sourceMappingURL=DebuggingClient.js.map