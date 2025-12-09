"use strict";
// DEPRECATED: Implementacao Puppeteer - sera totalmente reescrita na Phase 8 com haxball.js
// Esta versao stub permite compilacao mas todas funcionalidades estao desabilitadas
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
class Server {
    browsers = [];
    constructor(_config) {
        console.warn("=".repeat(80));
        console.warn("WARNING: Server.ts uses deprecated Puppeteer implementation");
        console.warn("Room management is disabled until Phase 8 migration to haxball.js");
        console.warn("=".repeat(80));
    }
    async open(_script, _tokens, _name, _settings) {
        throw new Error("Puppeteer-based room opening is deprecated.\\n" +
            "This functionality will be restored in Phase 8 with haxball.js implementation.\\n" +
            "For now, this is a compilation stub only.");
    }
    async close(_pidOrTitle) {
        console.warn("Room close functionality deprecated until Phase 8");
        return false;
    }
}
exports.Server = Server;
//    __  ____ ____ _  _ 
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
//# sourceMappingURL=Server.js.map