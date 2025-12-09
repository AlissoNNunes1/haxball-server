import { Server } from "../Server";
import { ControlPanel } from "../ControlPanel";

import { loadConfig } from "../utils/loadConfig";

export async function openServer(file?: string): Promise<void> {
    try {
        const config = await loadConfig(file);
        const server = new Server(config.server);
        new ControlPanel(server, config.panel, file);
    } catch (err: any) {
        console.error(err.error ? err.message + ", " + err.error : err.message);
        process.exit(1);
    }
}