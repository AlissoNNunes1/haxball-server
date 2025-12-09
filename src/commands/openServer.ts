import { Server } from "../Server";
import { ControlPanel } from "../ControlPanel";

import { loadConfig } from "../utils/loadConfig";

export async function openServer(file?: string): Promise<void> {
    try {
        const config = await loadConfig(file);
        const server = new Server(config.server);
        new ControlPanel(server, config.panel, file);
    } catch (err: unknown) {
        const errorMessage = err && typeof err === 'object' && 'message' in err 
            ? String((err as { message: unknown }).message)
            : 'Unknown error';
        const hasError = err && typeof err === 'object' && 'error' in err;
        console.error(hasError ? `${errorMessage}, ${(err as { error: unknown }).error}` : errorMessage);
        process.exit(1);
    }
}