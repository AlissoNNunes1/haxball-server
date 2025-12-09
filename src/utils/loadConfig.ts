import { promises as fs } from "fs";
import path from "path";

import { HaxballServerConfig } from "../Global";

function validate(object: unknown): object is HaxballServerConfig {
    if (!object || typeof object !== 'object') return false;
    const config = object as Record<string, unknown>;
    if (!config.server || typeof config.server !== 'object') return false;
    if (!config.panel || typeof config.panel !== 'object') return false;

    return true;
}

export async function loadConfig(file?: string): Promise<HaxballServerConfig> {
    const filePath = file == null || file == "" ? path.resolve(path.resolve('.'), "config.json") : file;

    try {
        const data = await fs.readFile(filePath, { encoding: "utf-8" });
        const json = JSON.parse(data);

        if (!validate(json)) {
            throw {
                message: `Invalid configuration`,
                error: null
            };
        }

        return json;
    } catch (err) {
        if (err && typeof err === 'object' && 'message' in err && err.message === 'Invalid configuration') {
            throw err;
        }
        
        throw {
            message: `Error while loading or parsing config file`,
            error: err
        };
    }
}