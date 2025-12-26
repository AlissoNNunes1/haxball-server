# Arquitetura do Haxball Server v5.1.0

## Visao Geral

O Haxball Server e uma aplicacao Node.js que funciona como gerenciador de salas Haxball headless atraves de uma interface Discord Bot ou CLI, com sistema integrado de autenticacao e contas de jogadores.

### Salas Temporarias de Campeonato

- CLI `championship` (main.ts) e slash command `/championship open|close` permitem abrir/encerrar salas efemeras com nomes dinamicos (HOME x AWAY) usando presets em `shared/config/championship.cjs`.
- Utilitario `src/utils/championship.ts` resolve presets com heranca, aplica chaves `reserved.haxball.*`, regras e mapa, e aponta para bot dedicado.
- Bot `bots/cha-championship.js` desativa balanceamento, aplica handlers globais e mapa customizado/padrao, mantendo monitoramento e auth existentes.

Arquitetura em **camadas** com separacao clara de responsabilidades:

```
┌─────────────────────────────────────────────────┐
│         Interface do Usuario                    │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  CLI (main.ts) │    │ Discord Bot      │    │
│  │  + commands/   │    │ (ControlPanel +  │    │
│  │                │    │  AuthCommands)   │    │
│  └────────────────┘    └──────────────────┘    │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │ Sala Haxball   │    │ REST API         │    │
│  │ (RoomAuth)     │    │ (AuthAPI)        │    │
│  └────────────────┘    └──────────────────┘    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│     Camada de Orquestracao                      │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  ControlPanel  │    │  AuthService     │    │
│  │  (Discord)     │    │  (Core Logic)    │    │
│  └────────────────┘    └──────────────────┘    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│     Camada de Negocio                           │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  Server (Room) │    │  Bot (Scripts)   │    │
│  │  RoomMonitor   │    │  RoomAuthHandler │    │
│  └────────────────┘    └──────────────────┘    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│     Camada de Persistencia                      │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  auth-client   │    │  database/client │    │
│  │  (Auth DB)     │    │  (Stats DB)      │    │
│  └────────────────┘    └──────────────────┘    │
│  ┌───────────────────────────────────────┐     │
│  │  SQLite (haxball.sqlite)              │     │
│  └───────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│     Camada de Utilitarios e Tipos               │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  utils/        │    │  Global.ts       │    │
│  │  (Helpers)     │    │  auth/types.ts   │    │
│  └────────────────┘    └──────────────────┘    │
└─────────────────────────────────────────────────┘
```

## Estrutura de Diretorios

```
haxball-server/
├── src/
│   ├── main.ts                    # Ponto de entrada, CLI parsing
│   ├── Global.ts                  # Tipos, interfaces, constantes
│   ├── Server.ts                  # Gerenciador de salas
│   ├── ControlPanel.ts            # Painel Discord Bot
│   ├── auth/                      # Sistema de Autenticacao (FASE 9)
│   │   ├── types.ts               # Tipos e interfaces de auth
│   │   ├── AuthService.ts         # Servico de autenticacao
│   │   ├── AuthCommands.ts        # Comandos Discord de auth
│   │   ├── RoomAuthHandler.ts     # Auth dentro das salas
│   │   └── AuthAPI.ts             # API REST de auth
│   ├── database/                  # Camada de Persistencia
│   │   ├── schema.ts              # Schema original (stats)
│   │   ├── schema-auth.ts         # Schema de autenticacao
│   │   ├── client.ts              # Cliente DB original
│   │   └── auth-client.ts         # Cliente DB de auth
│   ├── commands/
│   │   ├── openServer.ts          # Comando CLI 'open'
│   │   └── connect.ts             # Comando CLI 'connect' (deprecated)
│   ├── debugging/
│   │   ├── DebuggingServer.ts     # Servidor de debugging
│   │   ├── DebuggingInterface.ts  # Interface web
│   │   ├── RoomMonitor.ts         # Monitor de salas
│   │   └── WebMonitor.ts          # Monitor web
│   └── utils/
│       ├── log.ts                 # Funcao de logging
│       ├── Logger.ts              # Sistema de logging
│       ├── escapeString.ts        # Escapamento de caracteres
│       ├── loadConfig.ts          # Carregamento de config
│       └── getAvailablePort.ts    # Descoberta de portas
├── tests/
│   ├── unit/
│   │   ├── auth/
│   │   │   └── AuthService.test.ts # Testes do AuthService
│   │   └── utils/
│   │       ├── escapeString.test.ts
│   │       ├── getAvailablePort.test.ts
│   │       ├── loadConfig.test.ts
│   │       └── log.test.ts
│   ├── integration/
│   │   ├── bot-compatibility.test.ts
│   │   └── room-lifecycle.test.ts
│   └── benchmarks/
│       ├── memory.bench.ts
│       └── performance.bench.ts
├── shared/                        # Codigo compartilhado entre salas
│   ├── handlers/                  # Handlers globais reutilizaveis
│   │   ├── playerHandlers.cjs     # Gerenciamento de jogadores
│   │   ├── chatHandlers.cjs       # Sistema de chat (team, PM)
│   │   ├── goalHandlers.cjs       # Eventos de gol e assistencia
│   │   ├── matchHandlers.cjs      # Inicio, fim e controle de partida
│   │   └── README.md              # Documentacao dos handlers
│   ├── config/                    # Configuracoes globais
│   │   ├── commands.cjs           # Sistema de comandos globais
│   │   ├── maps.cjs               # Mapas compartilhados
│   │   ├── messages.cjs           # Mensagens padrao
│   │   └── utils.cjs              # Utilitarios gerais
│   └── utils/                     # Utilidades compartilhadas
│       ├── celebrationUtils.cjs   # Animacoes e celebracoes
│       └── README.md              # Documentacao das utilities
├── bots/                          # Scripts de salas Haxball
│   ├── cha-stadium/              # Sala principal CHA
│   │   ├── handlers.cjs           # Handlers especificos
│   │   ├── main.cjs               # Inicializacao
│   │   ├── messages.cjs           # Mensagens personalizadas
│   │   └── rules.cjs              # Regras (formacoes, offside)
│   └── todos_jogam/               # Sala "Todos Jogam"
│       └── handlers.cjs           # Handlers com stats
├── docs/
│   ├── roadmap.md                 # Plano de modernizacao
│   ├── ARCHITECTURE.md            # Este arquivo
│   ├── ACCOUNTS.md                # Sistema de Contas (FASE 9)
│   ├── HANDLERS_GUIDE.md          # Guia de Handlers Globais (NOVO)
│   ├── REFACTORING_PLAN.md        # Plano de refatoracao (NOVO)
│   ├── BOT_COMPATIBILITY.md       # Compatibilidade de bots
│   └── haxball_documentation/     # Docs API Haxball
├── package.json                   # Dependencias e scripts
├── tsconfig.json                  # Configuracao TypeScript
├── jest.config.js                 # Configuracao Jest
├── README.md                       # Documentacao principal
├── CONTRIBUTING.md                # Guia para contribuidores
└── CHANGELOG.md                   # Historico de mudancas
```

## Componentes Principais

### 1. Global.ts - Camada de Tipos

Define todas as interfaces e tipos compartilhados no projeto.

**Tipos principais:**

```typescript
// Configuracao completa
interface HaxballServerConfig {
  server: ServerConfig;
  panel: PanelConfig;
}

// Configuracao do servidor
interface ServerConfig {
  proxyEnabled?: boolean;
  proxyServers?: string[];
  execPath: string;
  maxMemoryUsage: number;
}

// Configuracao do painel Discord
interface PanelConfig {
  discordToken: string;
  discordPrefix: string;
  bots: BotList;
  mastersDiscordId: string[];
  customSettings?: CustomSettingsList;
  maxRooms?: number;
}

// Configuracoes personalizadas de salas
interface CustomSettings {
  extends?: string | string[]; // Heranca
  [key: string]: string | number | boolean | string[] | undefined;
}
```

**Constantes:**

```typescript
serverPort = 9500;
serverRoomFirstPort = 9501;
clientPort = 9600;
expressPort = 9601;
wsPort = 9602;
maxLengthLog = 300;
```

### 2. main.ts - Interface CLI

Ponto de entrada da aplicacao. Define comandos CLI usando `yargs`.

**Fluxo:**

```
main.ts
  └─ yargs parse arguments
     ├─ open command
     │  └─ openServer.ts
     └─ connect command (deprecated)
```

**Comandos disponiveis:**

- `open [file]` - Abre servidor com config.json
- `connect` - Deprecated, mostra mensagem de erro

**Exemplo:**

```bash
haxball-server open config.json
haxball-server open  # Procura por config.json no CWD
```

### 3. commands/openServer.ts - Handler do Comando

Orquestra a inicializacao completa do servidor.

**Fluxo:**

```
openServer(file?)
  ├─ loadConfig(file)           # Carrega e valida config
  ├─ new Server(config.server)  # Inicializa gerenciador de salas
  ├─ new ControlPanel(...)      # Inicializa painel Discord
  └─ try/catch -> log error & exit(1)
```

**Error Handling:**

```typescript
try {
  const config = await loadConfig(file);
  const server = new Server(config.server);
  new ControlPanel(server, config.panel, file);
} catch (err: unknown) {
  // Type-safe error handling
  console.error(errorMessage);
  process.exit(1);
}
```

### 4. ControlPanel.ts - Painel Discord

Gerenciador do Discord bot que fornece interface para controlar salas.

**Responsabilidades:**

- Autenticacao com Discord via token
- Processamento de comandos via Slash Commands (`/comando`)
- Separacao de canais: admin e geral
- Gerenciamento de bots (carregar scripts)
- Monitoramento de CPU/memoria
- Aplicacao de custom settings
- Integracao com sistema de autenticacao

**Arquitetura interna:**

```typescript
export class ControlPanel {
  private client: Discord.Client       // Cliente Discord
  private server: Server               // Ref ao gerenciador
  private bots: Bot[]                  // Lista de bots carregados
  private customSettings: CustomSettings[] // Configuracoes herancas
  private adminChannelId?: string      // Canal exclusivo admin
  private generalChannelId?: string    // Canal publico geral
  private authCommands: AuthCommands   // Comandos autenticacao

  constructor(server, config) { ... }

  private loadBots(bots) { ... }
  private loadCustomSettings(settings) { ... }
  private handleSlashCommand(interaction) { ... }
  private command(message) { ... }  // DEPRECATED
  private transformSetting(setting) { ... }  // Heranca de configs
  private logError(error, channel) { ... }
}
```

**Fluxo de Comando Discord (Slash Commands):**

```
Discord Interaction
  └─ interactionCreate event
     └─ handleSlashCommand(interaction)
        ├─ identificar tipo de comando
        │  ├─ Auth Commands (register, linkdiscord, profile, etc)
        │  │  ├─ verificar generalChannelId (se configurado)
        │  │  └─ authCommands.handleInteraction()
        │  └─ Admin Commands (open, close, info, etc)
        │     ├─ verificar masterDiscordId
        │     ├─ verificar adminChannelId (se configurado)
        │     └─ executar comando admin
        └─ enviar resposta via interaction.reply()
```

**Separacao de Canais:**

```
adminChannelId (opcional)
  └─ Comandos admin: /help, /open, /close, /reload, /info, /meminfo, /metrics, /exit
     └─ Apenas masters (mastersDiscordId)
     └─ Se configurado, comandos DEVEM ser usados neste canal

generalChannelId (opcional)
  └─ Comandos auth: /register, /linkdiscord, /profile, /ranking, /top, /authhelp
     └─ Todos os usuarios
     └─ Se configurado, comandos DEVEM ser usados neste canal

Sem canais configurados
  └─ Comandos funcionam em qualquer canal (com restricoes de permissao)
```

**Classe Bot interna:**

```typescript
class Bot {
  constructor(name: string, path: string, displayName?: string)

  read(): Promise<string>
    // Le arquivo do bot script

  run(server, data, tokens, settings?): Promise<...>
    // Executa bot em sala
}
```

### 5. Server.ts - Gerenciador de Salas (DEPRECATED)

**NOTA: Esta classe e um stub em v5.0.0 e sera completamente reescrita em v6.0.0 com haxball.js**

Atualmente, lancar erro indicando que funcionalidade foi desabilitada.

```typescript
class Server {
  browsers: BrowserInfo[] = [];

  constructor(config: ServerConfig) {
    console.warn('Server.ts uses deprecated Puppeteer implementation');
  }

  async open(...): Promise<...> {
    throw new Error('Puppeteer-based room opening is deprecated');
  }

  async close(...): Promise<boolean> {
    console.warn('Room close functionality deprecated');
    return false;
  }
}
```

**Interface BrowserInfo (para referencia futura):**

```typescript
interface BrowserInfo {
  pid: number;
  link: string;
  remotePort?: number;
  process?: () => Process | null;
  pages?: () => Promise<Page[]>;
}
```

**Plano para v6.0.0:**

Sera reescrita para usar `haxball.js` em vez de Puppeteer:

- Gerenciamento nativo de salas via haxball.js
- Suporte a proxy integrado
- Reducao de memoria 70-80%
- Scripts de bot carregados diretamente
- Logging e metricas estruturadas

### 6. utils/ - Camada de Utilitarios

Funcoes auxiliares reutilizaveis.

#### log.ts

```typescript
function log(prefix: string, message: string): void;
```

Registra mensagem com timestamp em formato `[HH:MM:SS] [PREFIX] mensagem`

- Trunca mensagens > 300 caracteres
- Timestamp em formato brasileiro

**Exemplo:**

```typescript
log('SERVER', 'Sala aberta com sucesso');
// [14:30:45] [SERVER] Sala aberta com sucesso
```

#### escapeString.ts

```typescript
function escapeString(str: any): string | any;
```

Escapa caracteres especiais (aspas duplas) para uso em strings.

**Comportamento:**

- Se input nao for string, retorna valor original
- Substitui `"` por `\"`
- Usado para sanitizar input de usuarios

#### loadConfig.ts

```typescript
async function loadConfig(file?: string): Promise<HaxballServerConfig>;
```

Carrega e valida arquivo de configuracao JSON.

**Fluxo:**

```
loadConfig(file)
  ├─ resolve(file) → caminho padrao config.json
  ├─ fs.promises.readFile(filePath)
  ├─ JSON.parse(data)
  ├─ validate(json)
     └─ verifica server e panel presentes
  └─ throw error se invalido
```

**Validacao (type guard):**

```typescript
function validate(object: unknown): object is HaxballServerConfig {
  if (!object || typeof object !== 'object') return false;
  const config = object as Record<string, unknown>;
  if (!config.server || typeof config.server !== 'object') return false;
  if (!config.panel || typeof config.panel !== 'object') return false;
  return true;
}
```

#### getAvailablePort.ts (DEPRECATED)

```typescript
async function getAvailablePort(startingPort: number): Promise<number>;
```

Stub que retorna porta fornecida sem verificacao.

**Sera implementado em v6.0.0 com haxball.js**

## Padroes de Design

### 1. Type Guards

Usada tipagem forte com `unknown` e type guards:

```typescript
function isConfig(obj: unknown): obj is HaxballServerConfig {
  // Validacao segura de tipo
}

function process(obj: unknown) {
  if (!isConfig(obj)) throw new Error('Invalid');
  // Agora TypeScript sabe que obj é HaxballServerConfig
  return obj.server.execPath;
}
```

### 2. Async/Await

Tudo usa Promises com async/await em vez de callbacks:

```typescript
// ❌ Evitar callbacks
fs.readFile(path, (err, data) => { ... });

// ✅ Preferir async/await
const data = await fs.readFile(path, 'utf-8');
```

### 3. Separacao de Responsabilidades

Cada classe tem responsabilidade unica:

- `main.ts` - CLI parsing
- `openServer.ts` - Orquestracao de startup
- `ControlPanel.ts` - Logica Discord
- `Server.ts` - Gerenciamento de salas
- `utils/*` - Funcoes auxiliares

### 4. Heranca de Configuracoes

CustomSettings suporta heranca via campo `extends`:

```typescript
interface CustomSettings {
  extends?: string | string[]; // Herdar de outras configs
  [key: string]: string | number | boolean | string[] | undefined;
}
```

**Exemplo:**

```json
{
  "customSettings": {
    "base": { "maxPlayers": 16 },
    "futsal": { "extends": "base", "maxPlayers": 10 }
  }
}
```

## Fluxo Completo: Iniciar Servidor

```
1. Usuario executa: haxball-server open config.json

2. main.ts (CLI)
   └─ yargs parse: file = 'config.json'
      └─ handler chama openServer('config.json')

3. openServer.ts (Comando CLI)
   └─ loadConfig('config.json')
      ├─ fs.promises.readFile('config.json')
      ├─ JSON.parse(data)
      ├─ validate(json)
      └─ return HaxballServerConfig

4. Server.ts (Initialization)
   └─ new Server(config.server)
      └─ console.warn('Puppeteer deprecated')
      └─ browsers = []

5. ControlPanel.ts (Discord Bot)
   └─ new ControlPanel(server, config.panel, file)
      ├─ this.loadBots(config.bots)
      │  └─ Cria array de Bot objects
      ├─ this.loadCustomSettings(config.customSettings)
      │  └─ Processa heranca
      ├─ this.client = new Discord.Client({intents})
      ├─ client.on('ready', ...)
      ├─ client.on('messageCreate', ...)
      └─ client.login(token)

6. Runtime
   └─ Bot aguarda mensagens Discord
      └─ processamento de comandos
         └─ interacao com Server (desabilitada em v5.0.0)
```

## Fluxo: Processar Comando Discord

```
Discord User envia: !open futsal token123

ControlPanel.messageCreate event
  └─ command(message)
     ├─ validar: sender em mastersDiscordId?
     ├─ parsear: "!open futsal token123"
     ├─ comando = "open", args = ["futsal", "token123"]
     ├─ validar: maxRooms atingido?
     ├─ buscar bot por nome "futsal"
     ├─ bot.read() → carrega script
     ├─ bot.run(server, script, token, settings)
     │  └─ server.open(...) → ERROR (deprecated)
     └─ catch error → logError(error, channel)
        └─ envia embed com mensagem de erro
```

## Debugging

### Estrutura de Debugging (Deprecated em v5.0.0)

```
debugging/
├── DebuggingServer.ts    # Servidor Express
├── DebuggingInterface.ts # Interface web (HTML)
└── DebuggingClient.ts    # Cliente WebSocket
```

Sera re-implementado em v6.0.0 com:

- Sistema de logging estruturado
- Web interface com monitoramento em tempo real
- Metricas de CPU/memoria
- Historico de salas

## Testes

Testes em `tests/unit/utils/` cobrem funcionalidades criticas:

- `escapeString.test.ts` - 11 testes, 100% cobertura
- `log.test.ts` - 5 testes, 100% cobertura
- `loadConfig.test.ts` - 8 testes, 100% cobertura
- `getAvailablePort.test.ts` - 4 testes, 100% cobertura

**Total: 29 testes passando, 70%+ coverage**

## Decisoes de Design

### Por que TypeScript Strict?

- Detecta tipos errados em tempo de compilacao
- Previne erros em runtime
- Melhor IDE autocomplete
- Documentacao automatica via tipos

### Por que Async/Await?

- Legibilidade superior a callbacks
- Try/catch para error handling
- Cancelavel (via AbortController)
- Stack traces melhores

### Por que Type Guards?

- Validacao segura de dados externos (JSON)
- Previne erros de tipo
- Documentacao explicita de contrato

### Por que Camadas?

- Separacao de responsabilidades
- Facilita testing (mock de camadas)
- Maior reusabilidade
- Arquitetura escalavel

## Roadmap

### Fase 8 (v5.0.0) - Migracao haxball.js ✅ COMPLETO

```
Server.ts (v5.0.0)
  └─ import HaxballJS from 'haxball.js'
     ├─ HBInit() para inicializar
     ├─ room = HBInit({token, ...})
     ├─ room.onPlayerJoin = handler
     └─ Salas gerenciadas nativamente
```

**Beneficios Realizados:**

- ✅ 70-80% menos memoria por sala
- ✅ Sem necessidade de Chrome/Chromium
- ✅ 90% instalacao mais compacta
- ✅ Performance superior

### Fase 9 (v5.1.0) - Sistema de Contas e Autenticacao ✅ COMPLETO

```
auth/
├── AuthService.ts           # Logica de auth (PBKDF2, tokens)
├── AuthCommands.ts          # Comandos Discord
├── RoomAuthHandler.ts       # Auth na sala Haxball
├── AuthAPI.ts               # REST API
└── types.ts                 # Interfaces

database/
├── auth-client.ts           # Cliente DB de auth
└── schema-auth.ts           # Schema SQLite
```

**Funcionalidades Implementadas:**

- ✅ Registro via Discord (!register)
- ✅ Login na sala (/login)
- ✅ Conta unificada (pontos, ranking, moedas)
- ✅ API REST para consultas
- ✅ Seguranca (PBKDF2, brute force protection)
- ✅ Sessoes com tokens
- ✅ Documentacao completa (docs/ACCOUNTS.md)

### Fase 9.5 (v5.2.0) - Sistema de Handlers Globais ✅ COMPLETO

```
shared/
├── handlers/                     # Handlers globais reutilizaveis
│   ├── playerHandlers.cjs        # Gerenciamento de jogadores
│   ├── chatHandlers.cjs          # Sistema de chat (team, PM)
│   ├── goalHandlers.cjs          # Eventos de gol e assistencia
│   ├── matchHandlers.cjs         # Inicio, fim e controle de partida
│   └── README.md                 # Documentacao dos handlers
├── utils/
│   ├── celebrationUtils.cjs      # Animacoes e celebracoes
│   └── README.md                 # Documentacao das utilities
└── config/
    └── commands.cjs              # Sistema de comandos integrado
```

**Funcionalidades Implementadas:**

- ✅ Player Handlers: normalizePlayerName, findPlayerByName, formatPlayerName
- ✅ Chat Handlers: handleTeamChat, handlePrivateMessage, processChatMessage
- ✅ Goal Handlers: handleGoal, calculateGoalInfo, announceGoal
- ✅ Match Handlers: handleMatchStart, handleMatchEnd, handleExtraTime
- ✅ Celebration Utils: avatarCelebration, goalCelebration, assistCelebration
- ✅ Ball/Warning Utils: ballWarning, offsideWarning, foulWarning
- ✅ Sistema de comandos: t (team chat), @@ (PM), !help, !discord, etc
- ✅ 66 testes unitarios + 2 suites de integracao
- ✅ Migracao completa de cha-stadium e todos_jogam
- ✅ ~100+ linhas de codigo duplicado eliminadas
- ✅ Documentacao completa (docs/HANDLERS_GUIDE.md, docs/REFACTORING_PLAN.md)

**Arquitetura de Handlers:**

Os handlers globais seguem o principio de **reusabilidade com customizacao**:

1. **Handlers Base**: Fornecem funcionalidade padrao para todas as salas
2. **Mensagens Customizadas**: Salas podem sobrescrever mensagens especificas
3. **Callbacks**: Permitem injetar logica customizada sem modificar handlers
4. **Modularidade**: Cada handler tem responsabilidade unica e bem definida

**Exemplo de Uso:**

```javascript
const { handleGoal } = require('../../shared/handlers/goalHandlers.cjs');
const { goalCelebration } = require('../../shared/utils/celebrationUtils.cjs');

// Uso basico (mensagens padrao)
room.onTeamGoal = (team) => handleGoal(room, team, gameState);

// Com customizacao e callbacks
const customMessages = { ownGoal: 'Gol contra mano, serio?' };
const callbacks = {
  onScorerCelebration: (room, scorer) => goalCelebration(room, scorer.team),
};
handleGoal(room, team, gameState, customMessages, callbacks);
```

**Beneficios Realizados:**

- ✅ Experiencia consistente entre salas
- ✅ Facil criacao de novas salas (menos codigo boilerplate)
- ✅ Manutencao centralizada (bugs corrigidos uma vez)
- ✅ Sistema de testes robusto (260+ testes passando)

### Fase 10 - Sistema de Balanceamento Hibrido

**Objetivo:** Balanceamento inteligente usando Elo por posicao + performance recente

```bash
balance/
├── EloCalculator.ts         # Calculo de Elo dinamico
├── PositionRating.ts        # Elo por posicao (GK/DEF/MID/ATA)
├── PerformanceTracker.ts    # Tracking de performance recente
├── BalanceAlgorithm.ts      # Algoritmo hibrido
└── types.ts                 # Interfaces
```

**Funcionalidades Planejadas:**

- [ ] Elo geral + Elo por posicao
- [ ] Decay temporal (jogadores inativos perdem rating)
- [ ] Performance recente (ultimos N jogos)
- [ ] Balanceamento automatico ao iniciar partida
- [ ] Algoritmo expansivel (preparado para ML)

### Fase 11 - Base de Estatisticas Avancadas

**Objetivo:** Sistema extensivel de coleta e analise de stats

```
stats/
├── collectors/
│   ├── BasicStatsCollector.ts    # Gols, assists, defesas
│   ├── AdvancedStatsCollector.ts # Toques, passes, interceptacoes
│   └── HeatmapCollector.ts       # Mapa de calor
├── analyzers/
│   └── PerformanceAnalyzer.ts    # Analise de performance
└── exporters/
    ├── JSONExporter.ts
    └── CSVExporter.ts
```

**Funcionalidades Planejadas:**

- [ ] Stats basicas (gols, assists, defesas)
- [ ] Stats avancadas (toques, passes, heatmap)
- [ ] Sistema de coleta modular (collectors)
- [ ] API para exportacao de dados
- [ ] Preparacao para machine learning

### Fase 12+ - Sistema de Plugins

```
plugins/
├── stats/
├── webhooks/
└── custom-commands/
```

Com interface plugin:

```typescript
interface Plugin {
  name: string;
  version: string;
  init(server): void;
  onRoomOpen(room): void;
  onRoomClose(room): void;
}
```

## Conclusao

O Haxball Server v5.0.0 proporciona base solida com:

- ✅ TypeScript moderno com tipos strict
- ✅ Async/await em toda base
- ✅ Testes automatizados (70%+ coverage)
- ✅ Documentacao completa (JSDoc)
- ✅ Arquitetura camadas bem definidas

Proximos passos em v6.0.0:

- 📋 Migracao para haxball.js
- 📋 Sistema de plugins
- 📋 Web interface de monitoramento

// **\_\_** \_**\_ \_ _
// / _\/ \_**) **\_) )( \
// / \_** \_**) \/ (
// \_/\_(\_\_**(\_**\_|\_\_**/
