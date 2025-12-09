import { promises as fs } from "fs";
import path from "path";

import { HaxballServerConfig } from "../Global";

function validate(object: any): object is HaxballServerConfig {
    if (!(object as HaxballServerConfig).server) return false;
    if (!(object as HaxballServerConfig).panel) return false;

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
        if ((err as any).message === 'Invalid configuration') {
            throw err;
        }
        
        throw {
            message: `Error while loading or parsing config file`,
            error: err
        };
    }
}