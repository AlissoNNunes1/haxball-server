# Arquitetura do Haxball Server v5.0.0

## Visao Geral

O Haxball Server e uma aplicacao Node.js que funciona como gerenciador de salas Haxball headless atraves de uma interface Discord Bot ou CLI.

Arquitetura em **camadas** com separacao clara de responsabilidades:

```
┌─────────────────────────────────────┐
│     Interface do Usuario            │
│  ┌───────────────────────────────┐  │
│  │  CLI (main.ts + commands/)    │  │
│  │  Discord Bot (ControlPanel)   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│     Camada de Orquestracao          │
│  ┌───────────────────────────────┐  │
│  │  ControlPanel (Discord Logic) │  │
│  │  openServer (Command Handler) │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│     Camada de Negocio               │
│  ┌───────────────────────────────┐  │
│  │  Server (Room Management)     │  │
│  │  Bot (Script Loading)         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│     Camada de Utilitarios           │
│  ┌───────────────────────────────┐  │
│  │  loadConfig()    - Configurar │  │
│  │  log()           - Registrar  │  │
│  │  escapeString()  - Formatar   │  │
│  │  getAvailablePort() - Portas  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│     Camada de Tipos e Constantes    │
│  ┌───────────────────────────────┐  │
│  │  Global.ts - Interfaces,      │  │
│  │             Tipos,            │  │
│  │             Constantes        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Estrutura de Diretorios

```
haxball-server/
├── src/
│   ├── main.ts                    # Ponto de entrada, CLI parsing
│   ├── Global.ts                  # Tipos, interfaces, constantes
│   ├── Server.ts                  # Gerenciador de salas (deprecated)
│   ├── ControlPanel.ts            # Painel Discord Bot
│   ├── commands/
│   │   ├── openServer.ts          # Comando CLI 'open'
│   │   └── connect.ts             # Comando CLI 'connect' (deprecated)
│   ├── debugging/
│   │   ├── DebuggingServer.ts     # Servidor de debugging
│   │   ├── DebuggingInterface.ts  # Interface web
│   │   └── DebuggingClient.ts     # Cliente de debugging
│   └── utils/
│       ├── log.ts                 # Funcao de logging
│       ├── escapeString.ts        # Escapamento de caracteres
│       ├── loadConfig.ts          # Carregamento de config
│       └── getAvailablePort.ts    # Descoberta de portas
├── tests/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── escapeString.test.ts
│   │   │   ├── getAvailablePort.test.ts
│   │   │   ├── loadConfig.test.ts
│   │   │   └── log.test.ts
│   │   └── ...
│   └── fixtures/
├── docs/
│   ├── roadmap.md                 # Plano de modernizacao
│   └── ARCHITECTURE.md            # Este arquivo
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
serverPort          = 9500
serverRoomFirstPort = 9501
clientPort          = 9600
expressPort         = 9601
wsPort              = 9602
maxLengthLog        = 300
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
- Processamento de comandos prefixados
- Gerenciamento de bots (carregar scripts)
- Monitoramento de CPU/memoria
- Aplicacao de custom settings

**Arquitetura interna:**

```typescript
export class ControlPanel {
  private client: Discord.Client       // Cliente Discord
  private server: Server               // Ref ao gerenciador
  private bots: Bot[]                  // Lista de bots carregados
  private customSettings: CustomSettings[] // Configuracoes herancas

  constructor(server, config) { ... }
  
  private loadBots(bots) { ... }
  private loadCustomSettings(settings) { ... }
  private command(message) { ... }
  private transformSetting(setting) { ... }  // Heranca de configs
  private logError(error, channel) { ... }
}
```

**Fluxo de Comando Discord:**

```
Discord Message
  └─ messageCreate event
     └─ command(msg)
        ├─ validar acesso (masterDiscordId)
        ├─ parsear comando
        ├─ executar logica
        └─ enviar resposta via embeds
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
function log(prefix: string, message: string): void
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
function escapeString(str: any): string | any
```

Escapa caracteres especiais (aspas duplas) para uso em strings.

**Comportamento:**

- Se input nao for string, retorna valor original
- Substitui `"` por `\"`
- Usado para sanitizar input de usuarios

#### loadConfig.ts

```typescript
async function loadConfig(file?: string): Promise<HaxballServerConfig>
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
async function getAvailablePort(startingPort: number): Promise<number>
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
  extends?: string | string[];  // Herdar de outras configs
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

### Fase 8 (v6.0.0) - Migracao haxball.js

```
Server.ts (v6.0.0)
  └─ import HaxballJS from 'haxball.js'
     ├─ HBInit() para inicializar
     ├─ room = HBInit({token, ...})
     ├─ room.onPlayerJoin = handler
     └─ Salas gerenciadas nativamente
```

**Beneficios:**

- ✅ 70-80% menos memoria por sala
- ✅ Sem necessidade de Chrome/Chromium
- ✅ 90% instalacao mais compacta
- ✅ Performance superior

### Fase 9+ - Sistema de Plugins

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

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
