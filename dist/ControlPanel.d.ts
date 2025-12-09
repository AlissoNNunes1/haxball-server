import { PanelConfig } from './Global';
import { Server } from './Server';
/**
 * Painel de controle para gerenciar servidores Haxball via Discord bot
 * Fornece interface Discord para:
 * - Abrir/fechar salas
 * - Gerenciar bots
 * - Monitorar CPU/memoria
 * - Aplicar configuracoes personalizadas
 * @class ControlPanel
 */
export declare class ControlPanel {
    private server;
    private fileName?;
    private client;
    private cpu;
    private mem;
    private prefix;
    private token;
    private mastersDiscordId;
    private bots;
    private customSettings?;
    private maxRooms?;
    private monitor;
    /**
     * Inicializa o painel de controle Discord
     * @param {Server} server - Instancia do gerenciador de servidores
     * @param {PanelConfig} config - Configuracoes do painel
     * @param {string} [fileName] - Nome do arquivo de configuracao (opcional)
     */
    constructor(server: Server, config: PanelConfig, fileName?: string | undefined);
    private transformSetting;
    private loadCustomSettings;
    private loadBots;
    private logError;
    private getRoomNameList;
    private command;
}
