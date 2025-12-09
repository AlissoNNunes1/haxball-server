/**
 * Porta principal do servidor Haxball
 * @constant {number}
 */
export const serverPort = 9500;

/**
 * Primeira porta para salas Haxball
 * @constant {number}
 */
export const serverRoomFirstPort = 9501;

/**
 * Porta do cliente de debugging
 * @constant {number}
 */
export const clientPort = 9600;

/**
 * Porta do servidor Express
 * @constant {number}
 */
export const expressPort = 9601;

/**
 * Porta do servidor WebSocket
 * @constant {number}
 */
export const wsPort = 9602;

/**
 * Primeira porta para salas de cliente
 * @constant {number}
 */
export const clientRoomFirstPort = 9603;

/**
 * Comprimento maximo de mensagens de log
 * @constant {number}
 */
export const maxLengthLog = 300;

/**
 * Tempo maximo de conexao SSH em milissegundos
 * @constant {number}
 * @deprecated Nao utilizado em v5.0.0
 */
export const maxTimeSSHConnection = 2 * 60 * 1000;

/**
 * Lista de configuracoes de sala personalizadas validas
 * @type {string[]}
 */
export const roomCustomConfigsList = [
    "roomName",
    "playerName",
    "password",
    "maxPlayers",
    "public",
    "geo",
    "noPlayer"
];

/**
 * Tipo para lista de bots - pode ser objeto com nome:caminho ou array de objetos
 * @typedef {Object|Array} BotList
 */
type BotList = { [key: string]: string } | { name: string, path: string, displayName?: string }[];

/**
 * Configuracao do painel de controle Discord
 * @interface PanelConfig
 * @property {string} discordToken - Token do bot Discord
 * @property {string} discordPrefix - Prefixo dos comandos Discord
 * @property {BotList} bots - Lista de bots disponiveis
 * @property {string[]} mastersDiscordId - IDs dos usuarios com acesso master
 * @property {CustomSettingsList} [customSettings] - Configuracoes personalizadas opcionais
 * @property {number} [maxRooms] - Numero maximo de salas simultaneas
 */
export interface PanelConfig {
    discordToken: string;
    discordPrefix: string;
    bots: BotList;
    mastersDiscordId: string[];
    customSettings?: CustomSettingsList;
    maxRooms?: number;
}

/**
 * Configuracao do servidor Haxball
 * @interface ServerConfig
 * @property {boolean} [proxyEnabled] - Ativa uso de proxies
 * @property {string[]} [proxyServers] - Lista de servidores proxy disponiveis
 * @property {boolean} [disableCache] - Desativa cache do navegador
 * @property {boolean} [disableRemote] - Desativa debugging remoto
 * @property {string} [userDataDir] - Diretorio de dados do usuario
 * @property {boolean} [disableAnonymizeLocalIps] - Desativa anonimizacao de IPs locais
 * @property {string} execPath - Caminho do executavel do navegador (deprecated em v5.0.0)
 * @property {number} maxMemoryUsage - Uso maximo de memoria em MB
 */
export interface ServerConfig {
    proxyEnabled?: boolean,
    proxyServers?: string[],
    disableCache?: boolean,
    disableRemote?: boolean,
    userDataDir?: string,
    disableAnonymizeLocalIps?: boolean,
    execPath: string,
    maxMemoryUsage: number
}

/**
 * Configuracao completa do servidor Haxball
 * @interface HaxballServerConfig
 * @property {ServerConfig} server - Configuracoes do servidor
 * @property {PanelConfig} panel - Configuracoes do painel Discord
 */
export interface HaxballServerConfig {
    server: ServerConfig,
    panel: PanelConfig
}

/**
 * Configuracoes personalizadas para salas
 * @interface CustomSettings
 * @property {string|string[]} [extends] - Heranca de outras configuracoes
 * @property {string|number|boolean|string[]} [key] - Valores configuráveis da sala
 */
export interface CustomSettings {
    extends?: string | string[];
    [key: string]: string | number | boolean | string[] | undefined;
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/

export type ReservedCustomSettings =
    "reserved.haxball.roomName" |
    "reserved.haxball.playerName" |
    "reserved.haxball.password" |
    "reserved.haxball.maxPlayers" |
    "reserved.haxball.public" |
    "reserved.haxball.geo" |
    "reserved.haxball.noPlayer";

export type CustomSettingsList = {
    [key: string]: CustomSettings
};