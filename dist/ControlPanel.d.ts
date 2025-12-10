import { PanelConfig } from './Global';
import { Server } from './Server';
export declare class ControlPanel {
    private server;
    private fileName?;
    private client;
    private prefix;
    private token;
    private mastersDiscordId;
    private maxRooms?;
    private bots;
    private customSettings;
    private mem;
    private cpu;
    private monitor;
    private esmRoomsCache;
    private panelConfig;
    constructor(server: Server, config: PanelConfig, fileName?: string | undefined);
    private transformSetting;
    private loadCustomSettings;
    private loadBots;
    private loadEsmRooms;
    private logError;
    private getRoomNameList;
    private command;
}
