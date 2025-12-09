// DEPRECATED: Implementacao Puppeteer - sera totalmente reescrita na Phase 8 com haxball.js
// Esta versao stub permite compilacao mas todas funcionalidades estao desabilitadas

import { CustomSettings, ServerConfig } from "./Global";

export interface BrowserInfo {
    pid: number;
    link: string;
    remotePort?: number;
    process?: () => { pid?: number } | null;
    pages?: () => Promise<any[]>;
}

export class Server {
    browsers: BrowserInfo[] = [];

    constructor(_config: ServerConfig) {
        console.warn("=".repeat(80));
        console.warn("WARNING: Server.ts uses deprecated Puppeteer implementation");
        console.warn("Room management is disabled until Phase 8 migration to haxball.js");
        console.warn("=".repeat(80));
    }

    async open(
        _script: string,
        _tokens: string | string[],
        _name?: string,
        _settings?: CustomSettings
    ): Promise<{ link: string; pid: number; remotePort?: number } | null> {
        throw new Error(
            "Puppeteer-based room opening is deprecated.\\n" +
            "This functionality will be restored in Phase 8 with haxball.js implementation.\\n" +
            "For now, this is a compilation stub only."
        );
    }

    async close(_pidOrTitle: string | number): Promise<boolean> {
        console.warn("Room close functionality deprecated until Phase 8");
        return false;
    }
}

//    __  ____ ____ _  _ 
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/