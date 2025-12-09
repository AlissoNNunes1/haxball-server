// DEPRECATED: Este arquivo sera completamente reescrito na Phase 8 com haxball.js
// Por enquanto mantem interface basica para nao quebrar imports

export interface BrowserInfo {
    pid: number;
    link: string;
    remotePort?: number;
}

export class Server {
    browsers: BrowserInfo[] = [];

    constructor(_config?: any) {
        console.warn("Server.ts: Puppeteer implementation deprecated");
        console.warn("This class will be replaced with haxball.js in Phase 8");
    }

    async open(_botScript: string, _token: string, _customSettings?: any): Promise<BrowserInfo | null> {
        throw new Error("Puppeteer-based room opening is deprecated. Please wait for Phase 8 migration to haxball.js");
    }

    async close(_url: string): Promise<boolean> {
        console.warn("Room close functionality deprecated");
        return false;
    }

    async closeAll(): Promise<void> {
        console.warn("Close all functionality deprecated");
    }
}

//    __  ____ ____ _  _ 
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
