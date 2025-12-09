import { CustomSettings, ServerConfig } from "./Global";
export interface BrowserInfo {
    pid: number;
    link: string;
    remotePort?: number;
    process?: () => {
        pid?: number;
    } | null;
    pages?: () => Promise<any[]>;
}
export declare class Server {
    browsers: BrowserInfo[];
    constructor(_config: ServerConfig);
    open(_script: string, _tokens: string | string[], _name?: string, _settings?: CustomSettings): Promise<{
        link: string;
        pid: number;
        remotePort?: number;
    } | null>;
    close(_pidOrTitle: string | number): Promise<boolean>;
}
