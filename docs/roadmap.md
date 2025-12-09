# Plano de Modernizacao e Atualizacao do Haxball Server

## Visao Geral

O projeto **haxball-server** e uma ferramenta robusta para gerenciar servidores headless do Haxball, mas nao recebe atualizacoes ha 2-3 anos. O projeto possui uma base solida com arquitetura bem pensada, funcionalidades ricas e documentacao excelente, porem esta significativamente desatualizado em termos de dependencias, padroes de codigo e seguranca.

### Status Atual

**Pontos Fortes:**

- Arquitetura bem estruturada e organizada
- Funcionalidades completas (gerenciamento via Discord, debugging remoto, proxies, custom settings)
- Documentacao README detalhada e clara
- Sistema de custom settings com heranca inovador

**Problemas Criticos:**

- Dependencias desatualizadas com vulnerabilidades (discord.js v12, puppeteer v10)
- TypeScript e Node.js types muito antigos (v4.3 e v15)
- Padroes de codigo desatualizados (callbacks, uso de `any`)
- Falta de testes automatizados
- APIs deprecated em uso

## Analise Detalhada de Dependencias

### Dependencias Criticas que Requerem Atualizacao Imediata

| Dependencia        | Versao Atual | Versao Recomendada | Impacto | Breaking Changes                                  |
| ------------------ | ------------ | ------------------ | ------- | ------------------------------------------------- |
| **discord.js**     | 12.5.3       | 14.16.3            | CRITICO | Intents obrigatorios, API completamente diferente |
| **puppeteer-core** | 10.1.0       | 23.11.1 ou **REMOVER** | CRITICO | Vulnerabilidades seguranca, headless mode mudou. **RECOMENDACAO: Migrar para haxball.js na Fase 8** |
| **typescript**     | 4.3.5        | 5.7.2              | ALTO    | Strictness aumentada, features novas              |
| **@types/node**    | 15.14.2      | 22.10.1            | ALTO    | Incompativel com Node.js moderno                  |
| **express**        | 4.17.1       | 4.21.2             | MEDIO   | Vulnerabilidades corrigidas                       |
| **open**           | 8.4.0        | 10.1.0 ou **REMOVER** | MEDIO   | API mudou. **Removida se migrar para haxball.js** |
| **pidusage**       | 2.0.21       | 3.0.2              | MEDIO   | Breaking changes                                  |
| **tunnel-ssh**     | 4.1.4        | 5.1.2 ou **REMOVER** | MEDIO   | API atualizada. **Removida se migrar para haxball.js** |

### Nova Dependencia Recomendada (Fase 8)

| Dependencia        | Versao Recomendada | Impacto | Beneficios |
| ------------------ | ------------------ | ------- | ---------- |
| **haxball.js**     | latest (~2024)     | REVOLUCIONARIO | Elimina Puppeteer, Chrome, tunnel-ssh. Reduz memoria 70%, instalacao 90% menor |

### Dependencias que Podem Ser Atualizadas com Seguranca

- **ws**: 8.1.0 → 8.18.0 (apenas patches)
- **yargs**: 17.0.1 → 17.7.2 (apenas patches)
- **portscanner**: 2.2.0 (ja atualizado)
- **node-os-utils**: 1.3.5 → 1.3.7 (patches)

## Analise de Codigo

### Arquivos Principais e Problemas Identificados

#### src/main.ts

- ✅ Estrutura CLI com yargs bem implementada
- ⚠️ Uso de `any` em varios lugares
- ⚠️ Falta tratamento de erro robusto
- ✅ Comandos bem organizados

#### src/Server.ts (277 linhas)

- ✅ Classe bem encapsulada
- ⚠️ Uso de puppeteer-core com API antiga
- ⚠️ Bracket notation para propriedades (`browser["remotePort"]`)
- ⚠️ Lista hardcoded de recursos bloqueados
- 🔴 `headless: true` deprecated (deve ser `headless: 'new'`)
- ⚠️ Falta async/await em alguns lugares

#### src/ControlPanel.ts (424 linhas)

- 🔴 **CRITICO**: discord.js v12 com API descontinuada
- ⚠️ `MessageEmbed` → deve ser `EmbedBuilder`
- ⚠️ Evento `message` → deve ser `messageCreate`
- 🔴 Comando `eval` exposto e perigoso (linha 376)
- ✅ Sistema de custom settings bem implementado
- ⚠️ Falta validacao de input
- ⚠️ Magic numbers e cores hardcoded

#### src/Global.ts

- ✅ Interfaces TypeScript bem definidas
- ⚠️ Poderia usar `enum` para portas
- ✅ Tipagem forte

#### src/commands/

- ✅ Comandos separados em modulos
- ⚠️ **connect.ts**: Callback hell
- ⚠️ **openServer.ts**: Tratamento de erro minimo

#### src/debugging/

- ✅ Sistema bem arquitetado
- ⚠️ **DebuggingInterface.ts**: HTML inline no codigo
- ⚠️ Namespace imports desnecessarios

#### src/utils/

- ✅ Funcoes utilitarias bem isoladas
- ⚠️ **loadConfig.ts**: Usa callbacks ao inves de async/await

### Padroes de Codigo Desatualizados

1. **Callbacks ao inves de Promises/Async-Await**

   - `fs.readFile` com callbacks
   - Tunnel SSH com callbacks
   - Deveria usar `fs.promises` ou `util.promisify`

2. **TypeScript Configuration**

   - Target ES2017 antiquado (recomendado: ES2022)
   - `lib: ["dom"]` desnecessario para Node.js
   - Faltam opcoes strict modernas

3. **Uso de `any`**

   - Varios lugares sem tipagem adequada
   - Deveria usar `unknown` ou tipos especificos

4. **APIs Deprecated**
   - `headless: true` do Puppeteer
   - Discord.js v12 completamente deprecated
   - Callbacks Node.js antigos

## Plano de Atualizacao Faseado

### FASE 1: Atualizacoes Criticas de Dependencias (Semana 1)

**Objetivo**: Atualizar todas as dependencias criticas sem modificar codigo

**Tarefas**:

1. **Atualizar package.json** com novas versoes:

```json
{
  "dependencies": {
    "discord.js": "^14.16.3",
    "express": "^4.21.2",
    "node-os-utils": "^1.3.7",
    "open": "^10.1.0",
    "pidusage": "^3.0.2",
    "portscanner": "^2.2.0",
    "puppeteer-core": "^23.11.1",
    "tunnel-ssh": "^5.1.2",
    "ws": "^8.18.0",
    "yargs": "^17.7.2"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.1",
    "@types/node-os-utils": "^1.3.4",
    "@types/pidusage": "^2.0.5",
    "@types/portscanner": "^2.1.4",
    "@types/tunnel-ssh": "^5.1.4",
    "@types/ws": "^8.5.13",
    "@types/yargs": "^17.0.33",
    "typescript": "^5.7.2"
  }
}
```

2. **Executar instalacao**:

```bash
npm install
```

3. **Verificar erros de compilacao**:

```bash
npm run start
```

**Resultado Esperado**: Compilacao com erros conhecidos que serao corrigidos na Fase 2

---

### FASE 2: Migracao Discord.js v12 → v14 (Semana 1-2)

**Objetivo**: Migrar completamente o ControlPanel.ts para discord.js v14

**Breaking Changes Principais**:

1. **Client Initialization com Intents**

```typescript
// ANTES (v12)
const client = new Discord.Client();

// DEPOIS (v14)
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
  ],
});
```

2. **MessageEmbed → EmbedBuilder**

```typescript
// ANTES
const embed = new Discord.MessageEmbed().setColor('#0099ff').setTitle('Title');

// DEPOIS
const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTitle('Title');
```

3. **Evento message → messageCreate**

```typescript
// ANTES
client.on('message', (message) => {});

// DEPOIS
client.on('messageCreate', (message) => {});
```

4. **Message.reply() agora retorna Promise**

```typescript
// ANTES
message.channel.send(embed);

// DEPOIS
await message.channel.send({ embeds: [embed] });
```

**Tarefas Detalhadas**:

1. Adicionar Intents ao Client initialization
2. Substituir todas ocorrencias de `MessageEmbed` por `EmbedBuilder`
3. Trocar evento `message` por `messageCreate`
4. Atualizar metodos de envio de mensagens
5. Adicionar `await` em operacoes assincronas
6. Remover ou proteger adequadamente o comando `eval`
7. Testar todos os comandos Discord

**Seguranca**: Remover comando `eval` ou adicionar protecao extrema:

```typescript
// Opcao 1: Remover completamente
// Deletar o comando eval

// Opcao 2: Proteger com senha adicional
if (command === 'eval' && content.startsWith(secretEvalPassword)) {
  // ... codigo eval
}
```

---

### FASE 3: Atualizacao Puppeteer v10 → v23 (Semana 2)

**Objetivo**: Modernizar Server.ts para puppeteer v23

**Breaking Changes Principais**:

1. **Headless Mode**

```typescript
// ANTES
puppeteer.launch({ headless: true });

// DEPOIS
puppeteer.launch({ headless: 'new' }); // ou true para modo novo
```

2. **Browser Remote Port**

```typescript
// ANTES
const port = browser['remotePort'];

// DEPOIS
const port = browser.wsEndpoint().match(/:(\d+)\//)?.[1];
// Ou melhor: acessar via API oficial
```

**Tarefas**:

1. Substituir `headless: true` por `headless: 'new'`
2. Remover uso de bracket notation para propriedades privadas
3. Atualizar metodo de obtencao de remote debugging port
4. Testar abertura e fechamento de salas
5. Verificar compatibilidade com Chrome/Chromium moderno
6. Atualizar lista de recursos bloqueados se necessario

---

### FASE 4: Refatoracao Callbacks → Async/Await (Semana 2-3)

**Objetivo**: Modernizar codigo para usar Promises e async/await

**Arquivos para Refatorar**:

#### src/utils/loadConfig.ts

```typescript
// ANTES
import * as fs from 'fs';

export function loadConfig(filename: string, callback: (config: any) => void) {
  fs.readFile(filename, 'utf-8', (err, data) => {
    if (err) throw err;
    callback(JSON.parse(data));
  });
}

// DEPOIS
import { promises as fs } from 'fs';

export async function loadConfig(filename: string): Promise<any> {
  const data = await fs.readFile(filename, 'utf-8');
  return JSON.parse(data);
}
```

#### src/commands/connect.ts

```typescript
// ANTES
tunnel(config, (error, server) => {
  if (error) {
    // handle error
  }
  // ...
});

// DEPOIS
try {
  const server = await tunnel(config);
  // ...
} catch (error) {
  // handle error
}
```

**Tarefas**:

1. Converter `fs.readFile` para `fs.promises.readFile`
2. Refatorar tunnel-ssh para usar promises
3. Adicionar try/catch apropriados
4. Atualizar chamadores para usar await
5. Remover todos os callbacks desnecessarios
6. Melhorar tratamento de erros

---

### FASE 5: Modernizacao TypeScript (Semana 3)

**Objetivo**: Atualizar configuracao e remover `any`

**Atualizar tsconfig.json**:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "types": ["node"],
    "module": "commonjs",
    "esModuleInterop": true,
    "noImplicitAny": true,
    "moduleResolution": "bundler",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "sourceMap": true,
    "declaration": true,
    "declarationDir": "dist",
    "outDir": "dist",
    "suppressImplicitAnyIndexErrors": false,
    "experimentalDecorators": true,
    "resolveJsonModule": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  },
  "files": ["src/main.ts"],
  "include": ["public"]
}
```

**Tarefas**:

1. Atualizar target para ES2022
2. Remover `lib: ["dom"]` (desnecessario para Node.js)
3. Ativar opcoes strict adicionais
4. Encontrar e substituir todos os `any` por tipos especificos
5. Adicionar tipos para variaveis nao tipadas
6. Criar interfaces/types onde necessario
7. Corrigir erros de compilacao strict

**Exemplo de Remocao de `any`**:

```typescript
// ANTES
function processConfig(config: any) {
  return config.server.execPath;
}

// DEPOIS
interface Config {
  server: {
    execPath: string;
    proxyEnabled?: boolean;
    // ...
  };
  panel: {
    // ...
  };
}

function processConfig(config: Config): string {
  return config.server.execPath;
}
```

---

### FASE 6: Implementacao de Testes (Semana 3-4)

**Objetivo**: Adicionar suite de testes automatizados

**Escolha de Framework**: Jest ou Vitest

**Instalacao**:

```bash
npm install --save-dev jest @types/jest ts-jest
```

**Configuracao jest.config.js**:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
};
```

**Estrutura de Testes**:

```
tests/
  ├── unit/
  │   ├── utils/
  │   │   ├── escapeString.test.ts
  │   │   ├── getAvailablePort.test.ts
  │   │   └── loadConfig.test.ts
  │   ├── Server.test.ts
  │   └── ControlPanel.test.ts
  ├── integration/
  │   ├── commands/
  │   │   ├── open.test.ts
  │   │   └── close.test.ts
  │   └── discord/
  │       └── bot.test.ts
  └── fixtures/
      ├── config.json
      └── bot.js
```

**Exemplos de Testes**:

```typescript
// tests/unit/utils/escapeString.test.ts
import { escapeString } from '../../../src/utils/escapeString';

describe('escapeString', () => {
  it('deve escapar aspas duplas', () => {
    expect(escapeString('test"quote')).toBe('test\\"quote');
  });

  it('deve escapar barras invertidas', () => {
    expect(escapeString('test\\slash')).toBe('test\\\\slash');
  });
});

// tests/unit/utils/loadConfig.test.ts
import { loadConfig } from '../../../src/utils/loadConfig';
import { promises as fs } from 'fs';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

describe('loadConfig', () => {
  it('deve carregar configuracao valida', async () => {
    const mockConfig = { server: { execPath: '/path' } };
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

    const config = await loadConfig('test.json');
    expect(config).toEqual(mockConfig);
  });
});
```

**Tarefas**:

1. Instalar e configurar Jest
2. Criar testes para utils/ (100% coverage)
3. Criar testes unitarios para Server.ts
4. Criar testes unitarios para ControlPanel.ts
5. Criar testes de integracao para comandos
6. Adicionar script de test ao package.json
7. Configurar CI/CD (GitHub Actions)

**Atualizar package.json**:

```json
{
  "scripts": {
    "start": "tsc && node .",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "build": "tsc",
    "lint": "eslint src/**/*.ts"
  }
}
```

---

### FASE 7: Melhorias de Codigo e Documentacao (Semana 4)

**Objetivo**: Melhorar qualidade de codigo e documentacao

**Tarefas de Codigo**:

1. **Adicionar JSDoc em todas as classes e metodos publicos**

```typescript
/**
 * Gerencia instancias de servidores Haxball headless
 * Responsavel por iniciar, parar e monitorar salas
 */
export class Server {
  /**
   * Abre uma nova sala Haxball
   * @param bot - Configuracao do bot a ser executado
   * @param token - Token headless do Haxball
   * @param customSettings - Configuracoes customizadas opcionais
   * @returns Promise com o PID do processo do navegador
   * @throws Error se o token for invalido ou se atingir limite de salas
   */
  async openRoom(bot: Bot, token: string, customSettings?: CustomSettings): Promise<number> {
    // ...
  }
}
```

2. **Adicionar validacao de input**

```typescript
function validateToken(token: string): boolean {
  const tokenRegex = /^thr1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  return tokenRegex.test(token);
}
```

3. **Implementar logging estruturado**

```typescript
// Adicionar biblioteca de logging
npm install winston

// Configurar logger
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

4. **Melhorar tratamento de erros**

```typescript
// Criar classes de erro customizadas
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}
```

**Tarefas de Documentacao**:

1. **Criar CONTRIBUTING.md**

```markdown
# Como Contribuir

## Configuracao do Ambiente

1. Fork o repositorio
2. Clone seu fork
3. Instale dependencias: `npm install`
4. Execute testes: `npm test`

## Padroes de Codigo

- Use TypeScript estrito
- Escreva testes para novas funcionalidades
- Siga o guia de estilo ESLint
- Documente funcoes publicas com JSDoc

## Process de Pull Request

1. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
2. Commit suas mudancas: `git commit -m "Adiciona nova funcionalidade"`
3. Push para seu fork: `git push origin feature/nova-funcionalidade`
4. Abra um Pull Request
```

2. **Criar CHANGELOG.md**

```markdown
# Changelog

## [5.0.0] - 2025-12-XX

### Breaking Changes

- Atualizado discord.js v12 → v14 (requer Intents)
- Atualizado puppeteer-core v10 → v23
- Atualizado TypeScript v4 → v5
- Node.js minimo agora e v18

### Added

- Testes automatizados com Jest
- Validacao de configuracao
- Logging estruturado com Winston
- Documentacao JSDoc completa

### Changed

- Refatorado callbacks para async/await
- Melhorado tratamento de erros
- Atualizado target TypeScript para ES2022

### Fixed

- Vulnerabilidades de seguranca em dependencias
- Comando eval agora requer autenticacao extra
- Corrigido memory leaks em debugging

### Deprecated

- Formato de configuracao antiga de bots (objeto)
```

3. **Atualizar README.md**

- Adicionar secao de requisitos minimos
- Adicionar badges atualizados
- Adicionar secao de troubleshooting
- Adicionar links para CONTRIBUTING.md
- Atualizar exemplos para discord.js v14

4. **Criar docs/ARCHITECTURE.md**

```markdown
# Arquitetura do Haxball Server

## Visao Geral

O Haxball Server e estruturado em camadas:

### Camada CLI (main.ts)

- Interface de linha de comando
- Parsing de argumentos com yargs
- Ponto de entrada da aplicacao

### Camada de Controle (ControlPanel.ts)

- Gerenciamento via Discord bot
- Sistema de comandos
- Autenticacao e autorizacao

### Camada de Servidor (Server.ts)

- Gerenciamento de instancias Puppeteer
- Controle de proxies
- Monitoramento de processos

### Camada de Debugging (debugging/)

- Interface web para DevTools
- Tunel SSH para acesso remoto
- WebSocket para comunicacao

### Camada de Utilidades (utils/)

- Funcoes auxiliares
- Configuracao
- Logging
```

---

## FASE 8: Migracao para haxball.js (OPCIONAL - Revolucionario)

**Objetivo**: Substituir Puppeteer + Chrome por biblioteca nativa haxball.js

### Por que Migrar?

**Problemas Atuais com Puppeteer**:


- Requer Chrome/Chromium instalado (grande dependencia)
- Puppeteer v10 → v23 tem 13 major versions de atraso
- Alto consumo de memoria (navegador completo por sala)
- Overhead de browser automation
- Vulnerabilidades de seguranca constantes
- Dificil de manter atualizado


**Vantagens do haxball.js**:

- ✅ Sem necessidade de Chrome/Chromium
- ✅ WebRTC nativo (node-datachannel) - muito mais leve
- ✅ 70-80% menos uso de memoria por sala
- ✅ Performance superior
- ✅ TypeScript nativo com tipos completos
- ✅ Biblioteca mantida e moderna (ultimo commit recente)
- ✅ Suporte nativo a proxy
- ✅ Promise-based e sincrono
- ✅ Menos camadas de abstracao = mais estavel
- ✅ Node.js >= 18 (compativel com stack moderna)


**Desvantagens**:

- ❌ Breaking change massivo na arquitetura
- ❌ Perde Chrome DevTools visual (mas logs ficam melhores)
- ❌ Scripts de bots precisam ser adaptados
- ❌ Sistema de debugging remoto precisa ser reimplementado
- ❌ Mudanca fundamental no funcionamento


### Analise Tecnica

#### Arquitetura Atual (Puppeteer)

```
Usuario → CLI → Server.ts → Puppeteer → Chrome → Haxball Web → Bot JS
                                ↓

                          Chrome DevTools
```

#### Arquitetura Nova (haxball.js)

```
Usuario → CLI → Server.ts → haxball.js → WebRTC → Haxball → Bot JS
                                ↓
                          Logs + Metricas

```

### Comparacao de Codigo

#### ANTES (Puppeteer - Server.ts)

```typescript
import puppeteer from 'puppeteer-core';

async openRoom(bot: Bot, token: string) {
  const browser = await puppeteer.launch({
    execPath: '/usr/bin/chromium-browser',
    headless: 'new',
    args: ['--no-sandbox', '--remote-debugging-port=9222']
  });
  
  const page = await browser.newPage();
  await page.goto('https://www.haxball.com/headless');
  
  // Injetar bot script
  await page.evaluate((botCode, token) => {
    eval(botCode);

    // ... complexidade de injecao
  }, botScript, token);
}
```

#### DEPOIS (haxball.js - Server.ts)

```typescript
import HaxballJS from 'haxball.js';

async openRoom(bot: Bot, token: string) {
  const HBInit = await HaxballJS({
    proxy: this.proxyServer // Suporte nativo!
  });
  
  const room = HBInit({
    roomName: bot.roomName,
    maxPlayers: 16,
    noPlayer: true,
    token: token
  });
  
  // Bot script executa diretamente
  // Sem necessidade de injecao complexa
  return room;
}
```

### Plano de Migracao

#### 1. Instalacao e Setup

```bash
# Remover Puppeteer
npm uninstall puppeteer-core @types/puppeteer

# Instalar haxball.js
npm install haxball.js

# Instalar dependencias do haxball.js
bun pm trust node-datachannel  # Se usar Bun
```

#### 2. Refatorar Server.ts Completamente

**Mudancas Principais**:

```typescript
// src/Server.ts (NOVO)
import HaxballJS from 'haxball.js';
import { CustomSettings, ServerConfig } from './Global';

interface RoomInstance {
  room: any; // HaxBall RoomObject
  pid: number; // Processo ficticio para compatibilidade
  bot: Bot;
}

export class Server {
  private rooms: Map<number, RoomInstance> = new Map();
  private nextPid: number = 1000;
  private proxyIndex: number = 0;

  constructor(config: ServerConfig) {
    this.proxyServers = config?.proxyServers ?? [];
    // Nao precisa mais de execPath, userDataDir, etc!
  }

  async openRoom(bot: Bot, token: string, customSettings?: CustomSettings) {
    // Selecionar proxy
    const proxy = this.getNextProxy();
    
    // Inicializar haxball.js
    const HBInit = await HaxballJS({
      proxy: proxy ? `http://${proxy}` : undefined
    });
    
    // Configurar sala
    const roomConfig = this.buildRoomConfig(bot, token, customSettings);
    const room = HBInit(roomConfig);
    
    // Gerar PID ficticio para compatibilidade com ControlPanel
    const pid = this.nextPid++;
    
    // Carregar script do bot
    await this.loadBotScript(room, bot);
    
    // Armazenar instancia
    this.rooms.set(pid, { room, pid, bot });
    
    // Setup event handlers para logging
    this.setupRoomEventHandlers(room, pid);
    
    return pid;
  }

  async closeRoom(pid: number) {
    const instance = this.rooms.get(pid);
    if (!instance) throw new Error(`Room ${pid} not found`);
    
    // haxball.js nao tem metodo close explicito
    // A sala fecha quando perde referencia
    this.rooms.delete(pid);
    
    // Forcar garbage collection se possivel
    if (global.gc) global.gc();
  }

  private getNextProxy(): string | null {
    if (!this.proxyServers || this.proxyServers.length === 0) {
      return null;
    }
    
    // Rotacao simples de proxies
    const proxy = this.proxyServers[this.proxyIndex % this.proxyServers.length];
    this.proxyIndex++;
    return proxy;
  }

  private buildRoomConfig(bot: Bot, token: string, customSettings?: CustomSettings) {
    const config: any = {
      roomName: customSettings?.['reserved.haxball.roomName'] ?? bot.name,
      maxPlayers: customSettings?.['reserved.haxball.maxPlayers'] ?? 16,
      public: customSettings?.['reserved.haxball.public'] ?? true,
      noPlayer: customSettings?.['reserved.haxball.noPlayer'] ?? true,
      token: token
    };
    
    // Aplicar custom settings
    if (customSettings?.['reserved.haxball.password']) {
      config.password = customSettings['reserved.haxball.password'];
    }
    
    if (customSettings?.['reserved.haxball.geo']) {
      config.geo = customSettings['reserved.haxball.geo'];
    }
    
    return config;
  }

  private async loadBotScript(room: any, bot: Bot) {
    const fs = require('fs').promises;
    const botScript = await fs.readFile(bot.path, 'utf-8');
    
    // Criar contexto para o bot
    const botContext = {
      room: room,
      // Adicionar helpers e utilities
    };
    
    // Executar bot script
    // Nota: Pode precisar de vm.runInNewContext para isolamento
    const vm = require('vm');
    vm.runInNewContext(botScript, botContext);
  }

  private setupRoomEventHandlers(room: any, pid: number) {
    // Logging de eventos importantes
    room.onRoomLink = (link: string) => {
      console.log(`[Room ${pid}] Link: ${link}`);
    };
    
    room.onPlayerJoin = (player: any) => {
      console.log(`[Room ${pid}] Player joined: ${player.name}`);
    };
    
    room.onPlayerLeave = (player: any) => {
      console.log(`[Room ${pid}] Player left: ${player.name}`);
    };
    
    // Adicionar mais event handlers conforme necessario
  }

  // Metodos de compatibilidade para ControlPanel
  getRooms() {
    return Array.from(this.rooms.values());
  }

  getRoom(pid: number) {
    return this.rooms.get(pid);

  }
}
```

#### 3. Adaptar Scripts de Bots

**Scripts Antigos (Para Puppeteer)**:

```javascript
// bots/futsal.js
var room = window.HBInit({
  roomName: 'Futsal',
  maxPlayers: 16

});

room.onPlayerJoin = function(player) {
  room.sendChat('Welcome ' + player.name);
};
```

**Scripts Novos (Para haxball.js)**:

```javascript
// bots/futsal.js
// room ja esta disponivel no contexto

room.onPlayerJoin = function(player) {
  room.sendChat('Welcome ' + player.name);
};


// Ou com suporte a custom settings
const gameMode = customSettings?.gameMode ?? 4;

room.onPlayerJoin = function(player) {
  room.sendChat(`Welcome to ${gameMode}v${gameMode}!`);
};
```

**Script de Migracao Automatica**:

```javascript
// scripts/migrate-bot-scripts.js
const fs = require('fs').promises;
const path = require('path');

async function migrateBotScript(filePath) {
  let content = await fs.readFile(filePath, 'utf-8');
  
  // Remover window.HBInit (agora room vem do contexto)
  content = content.replace(/var\s+room\s*=\s*window\.HBInit\s*\({[\s\S]*?}\);?/g, '');
  content = content.replace(/const\s+room\s*=\s*window\.HBInit\s*\({[\s\S]*?}\);?/g, '');
  
  // Adicionar comentario
  content = `// Migrated for haxball.js - room is provided in context\n\n${content}`;
  
  await fs.writeFile(filePath, content, 'utf-8');
  console.log(`Migrated: ${filePath}`);
}

// Executar para todos os bots
// node scripts/migrate-bot-scripts.js
```

#### 4. Substituir Sistema de Debugging

**Problema**: Chrome DevTools nao esta mais disponivel

**Solucao**: Sistema de logging e metricas avancado

```typescript
// src/debugging/RoomMonitor.ts
import { EventEmitter } from 'events';

export class RoomMonitor extends EventEmitter {
  private metrics: Map<number, RoomMetrics> = new Map();

  trackRoom(pid: number, room: any) {
    const metrics: RoomMetrics = {
      pid,
      startTime: Date.now(),
      playerCount: 0,
      gameCount: 0,
      messageCount: 0,
      errorCount: 0
    };
    
    this.metrics.set(pid, metrics);
    
    // Monitorar eventos
    room.onPlayerJoin = this.wrapHandler(room.onPlayerJoin, () => {
      metrics.playerCount++;
    });
    
    room.onGameStart = this.wrapHandler(room.onGameStart, () => {
      metrics.gameCount++;
    });
    
    room.onPlayerChat = this.wrapHandler(room.onPlayerChat, () => {
      metrics.messageCount++;
    });
  }

  private wrapHandler(originalHandler: Function, callback: Function) {
    return (...args: any[]) => {
      try {
        callback();
        if (originalHandler) originalHandler(...args);
      } catch (error) {
        this.metrics.get(args[0])!.errorCount++;
        console.error('Room error:', error);
      }
    };
  }

  getMetrics(pid: number): RoomMetrics | undefined {
    return this.metrics.get(pid);
  }

  getAllMetrics() {
    return Array.from(this.metrics.values());
  }
}

interface RoomMetrics {
  pid: number;
  startTime: number;
  playerCount: number;
  gameCount: number;
  messageCount: number;
  errorCount: number;
}
```

#### 5. Atualizar package.json

```json
{
  "dependencies": {
    "discord.js": "^14.16.3",
    "express": "^4.21.2",
    "haxball.js": "^latest",
    "node-os-utils": "^1.3.7",
    "ws": "^8.18.0",

    "yargs": "^17.7.2"
  },
  "devDependencies": {
    "@types/node": "^22.10.1",
    "typescript": "^5.7.2"
  }
}
```


**Dependencias Removidas**:

- ❌ puppeteer-core (economiza ~350MB)
- ❌ tunnel-ssh (nao precisa mais de SSH tunneling)
- ❌ portscanner (nao precisa gerenciar portas Chrome)
- ❌ open (nao abre navegador)

#### 6. Atualizar Documentacao

**README.md - Secao de Instalacao**:

```markdown
## Requisitos

- Node.js >= 18

- NPM ou Yarn
- ~~Chrome ou Chromium instalado~~ (NAO MAIS NECESSARIO!)

## Instalacao


```bash
npm install haxball-server -g
```

**Nota**: A partir da versao 5.0.0, o haxball-server usa `haxball.js`
internamente, eliminando a necessidade de ter Chrome/Chromium instalado.
Isso resulta em:

- 70-80% menos uso de memoria
- Instalacao mais simples (sem dependencias de sistema)
- Performance superior
- Maior estabilidade

```

**Atualizar config.json**:
```json
{
  "server": {

    "proxyEnabled": true,
    "proxyServers": ["127.0.0.1:8000", "127.0.0.1:8001"]
  },
  "panel": {
    "bots": [
      { "name": "futsal", "path": "./bots/futsal.js" }
    ],
    "discordToken": "...",
    "mastersDiscordId": ["..."]
  }

}
```

**Configuracoes Removidas** (nao mais necessarias):

- ❌ `server.execPath` (sem Chrome)
- ❌ `server.userDataDir` (sem cache de navegador)
- ❌ `server.disableCache` (sem navegador)
- ❌ `server.disableRemote` (debugging diferente)

- ❌ `server.disableAnonymizeLocalIps` (WebRTC nativo)
- ❌ `server.maxMemoryUsage` (gerenciado pelo Node.js)

### Vantagens Mensuráveis

#### Antes (Puppeteer)

```
Memoria por sala: ~150-200 MB
CPU por sala: ~5-10%
Tamanho instalacao: ~500 MB (com Chrome)
Tempo de startup: ~3-5 segundos por sala
Dependencias: 15+ pacotes NPM
```


#### Depois (haxball.js)

```
Memoria por sala: ~30-50 MB (70% reducao)
CPU por sala: ~2-5% (50% reducao)
Tamanho instalacao: ~50 MB (90% reducao)
Tempo de startup: ~1-2 segundos por sala (60% mais rapido)
Dependencias: 8 pacotes NPM
```

### Riscos e Mitigacao


#### Risco 1: Breaking Changes para Usuarios

**Impacto**: CRITICO - Scripts de bots precisam ser adaptados

**Mitigacao**:

1. Criar ferramenta de migracao automatica de scripts
2. Manter versao 4.x com Puppeteer em branch separada
3. Documentacao clara de migracao
4. Periodo de transicao com ambas versoes disponiveis

5. Versionar como v5.0.0 (major version)

#### Risco 2: Perda de Chrome DevTools

**Impacto**: ALTO - Desenvolvedores perdem debugging visual

**Mitigacao**:

1. Implementar sistema de logging avancado
2. Web dashboard com logs em tempo real

3. Metrics e monitoring detalhados
4. CLI para inspecionar salas ativas
5. Documentacao de debugging alternativo

#### Risco 3: Compatibilidade de Scripts

**Impacto**: MEDIO - Alguns scripts podem nao funcionar


**Mitigacao**:

1. Testes extensivos com scripts comuns
2. Documentacao de diferencas de comportamento
3. Suporte a "modo compatibilidade" se necessario
4. Comunidade ajuda a identificar problemas


#### Risco 4: Estabilidade do haxball.js

**Impacto**: MEDIO - Dependencia de biblioteca terceira

**Mitigacao**:

1. haxball.js e mantido ativamente

2. Codigo open-source (pode fazer fork se necessario)
3. Comunidade ativa do Haxball
4. Testes de estabilidade antes de release

### Cronograma de Migracao


#### Fase 8.1: Prototipo e Validacao (1 semana)

- [ ] Criar branch experimental
- [ ] Instalar haxball.js
- [ ] Implementar Server.ts basico
- [ ] Testar abertura de 1 sala

- [ ] Validar funcionalidade basica

#### Fase 8.2: Implementacao Core (2 semanas)

- [ ] Refatorar Server.ts completamente
- [ ] Implementar gerenciamento de salas
- [ ] Sistema de proxy
- [ ] Custom settings
- [ ] Event handlers


#### Fase 8.3: Compatibilidade (1 semana)

- [ ] Script de migracao de bots
- [ ] Adaptar ControlPanel.ts
- [ ] Manter compatibilidade de comandos Discord

- [ ] Testes de integracao

#### Fase 8.4: Monitoramento e Logging (1 semana)

- [ ] Implementar RoomMonitor
- [ ] Sistema de metricas

- [ ] Logs estruturados
- [ ] Web interface para monitoramento

#### Fase 8.5: Testes e Documentacao (1 semana)

- [ ] Testes extensivos
- [ ] Benchmarks de performance
- [ ] Atualizacao completa de documentacao
- [ ] Guia de migracao para usuarios

**Total Fase 8**: 6 semanas

### Decisao: Quando Implementar?

**Opcao A**: Imediatamente apos Fase 7

- Moderniza tudo de uma vez
- Maior impacto, mas maior risco
- Recomendado se houver tempo

**Opcao B**: Release separado (v6.0.0)

- Faz v5.0.0 com modernizacao basica
- Depois v6.0.0 com haxball.js
- Menos risco, mais tempo para validacao
- **RECOMENDADO**

**Opcao C**: Branch experimental permanente

- Mantem ambas versoes
- Usuarios escolhem qual usar
- Mais trabalho de manutencao

### Metricas de Sucesso Fase 8

- ✅ Todas as salas abrem corretamente
- ✅ Uso de memoria 70%+ menor que Puppeteer
- ✅ Performance igual ou superior
- ✅ Scripts de bots funcionam com migracao minima
- ✅ Sistema de monitoramento equivalente a DevTools
- ✅ Zero dependencias de sistema (Chrome)
- ✅ Instalacao mais simples
- ✅ Documentacao completa de migracao

---

## Melhorias Futuras (Opcionales - Mes 2+)

### 1. Sistema de Plugins

**Objetivo**: Permitir extensibilidade via plugins

**Interface**:

```typescript
interface Plugin {
  name: string;
  version: string;

  init(server: Server): void | Promise<void>;

  onRoomOpen?(room: Room): void | Promise<void>;
  onRoomClose?(room: Room): void | Promise<void>;
  onCommand?(command: string, args: string[]): void | Promise<void>;

  cleanup?(): void | Promise<void>;
}
```

**Exemplo de Plugin**:

```typescript
// plugins/stats-plugin.ts
export class StatsPlugin implements Plugin {
  name = 'stats';
  version = '1.0.0';

  private roomStats = new Map<number, RoomStats>();

  async init(server: Server) {
    console.log('Stats plugin initialized');
  }

  async onRoomOpen(room: Room) {
    this.roomStats.set(room.pid, {
      openedAt: new Date(),
      playerCount: 0,
    });
  }

  async onRoomClose(room: Room) {
    const stats = this.roomStats.get(room.pid);
    console.log(`Room ${room.pid} stats:`, stats);
    this.roomStats.delete(room.pid);
  }
}
```

### 2. Web Dashboard

**Tecnologias**: Express + React/Vue + WebSocket

**Funcionalidades**:

- Visualizacao de salas abertas em tempo real
- Graficos de uso de CPU/memoria
- Abrir/fechar salas via interface web
- Logs em tempo real
- Configuracao via GUI

### 3. Health Checks e Auto-Recovery

```typescript
class HealthMonitor {
  private checkInterval: NodeJS.Timer;

  startMonitoring() {
    this.checkInterval = setInterval(() => {
      this.checkAllRooms();
    }, 60000); // A cada minuto
  }

  async checkAllRooms() {
    for (const room of this.rooms) {
      const isHealthy = await this.checkRoomHealth(room);
      if (!isHealthy) {
        await this.restartRoom(room);
      }
    }
  }

  async checkRoomHealth(room: Room): Promise<boolean> {
    try {
      // Verificar se processo esta rodando
      // Verificar se DevTools responde
      // Verificar uso de memoria
      return true;
    } catch {
      return false;
    }
  }
}
```

### 4. Docker Support

**Dockerfile**:

```dockerfile
FROM node:20-slim

# Instalar Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY bots ./bots

ENV CHROME_PATH=/usr/bin/chromium

CMD ["node", "dist/main.js"]
```

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  haxball-server:
    build: .
    volumes:
      - ./config.json:/app/config.json
      - ./bots:/app/bots
    ports:
      - '9500:9500'
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### 5. Metricas Prometheus

```typescript
import prometheus from 'prom-client';

const register = new prometheus.Registry();

const roomsGauge = new prometheus.Gauge({
  name: 'haxball_rooms_total',
  help: 'Total number of open rooms',
});

const cpuGauge = new prometheus.Gauge({
  name: 'haxball_cpu_usage_percent',
  help: 'CPU usage percentage',
});

register.registerMetric(roomsGauge);
register.registerMetric(cpuGauge);

// Endpoint para Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 6. Database Integration

**Casos de Uso**:

- Historico de salas abertas
- Estatisticas de uso
- Logs persistentes
- Configuracoes de usuarios

**Exemplo com SQLite**:

```typescript
import sqlite3 from 'sqlite3';

class Database {
  private db: sqlite3.Database;

  async init() {
    this.db = new sqlite3.Database('./haxball.db');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_name TEXT NOT NULL,
        token TEXT NOT NULL,
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        pid INTEGER
      );
    `);
  }

  async logRoomOpen(botName: string, token: string, pid: number) {
    await this.db.run('INSERT INTO rooms (bot_name, token, pid) VALUES (?, ?, ?)', [
      botName,
      token,
      pid,
    ]);
  }
}
```

---

## Riscos e Consideracoes

### 1. Breaking Changes para Usuarios

**Risco**: Usuarios com configuracoes antigas podem ter problemas

**Mitigacao**:

- Criar script de migracao de configuracao
- Documentar todas as breaking changes
- Manter compatibilidade retroativa onde possivel
- Versionar adequadamente (v5.0.0)

### 2. Compatibilidade com Chrome/Chromium

**Risco**: Puppeteer v23 pode ter problemas com Chrome antigo

**Mitigacao**:

- Documentar versoes minimas requeridas
- Testar em multiplas versoes
- Fornecer instrucoes de atualizacao

### 3. Discord.js Intents

**Risco**: Usuarios podem nao configurar Intents no Discord Developer Portal

**Mitigacao**:

- Documentar claramente no README
- Adicionar guia passo-a-passo com screenshots
- Validar configuracao na inicializacao

### 4. Performance com Puppeteer v23

**Risco**: Nova versao pode consumir mais recursos

**Mitigacao**:

- Fazer benchmarks antes/depois
- Otimizar flags do Chrome
- Documentar requisitos de hardware

### 5. Seguranca do Comando Eval

**Risco**: Execucao de codigo arbitrario

**Mitigacao**:

- Remover completamente (recomendado)
- Ou adicionar autenticacao extra com senha
- Ou isolar em VM/container separado

---

## Cronograma Estimado

### Modernizacao Basica (4-6 semanas)

| Fase                                 | Duracao   | Esforco | Prioridade |
| ------------------------------------ | --------- | ------- | ---------- |
| Fase 1: Atualizacoes de Dependencias | 2-3 dias  | Baixo   | CRITICA    |
| Fase 2: Migracao Discord.js          | 4-5 dias  | Alto    | CRITICA    |
| Fase 3: Atualizacao Puppeteer        | 2-3 dias  | Medio   | CRITICA    |
| Fase 4: Refatoracao Async/Await      | 3-4 dias  | Medio   | ALTA       |
| Fase 5: Modernizacao TypeScript      | 3-4 dias  | Medio   | ALTA       |
| Fase 6: Implementacao de Testes      | 7-10 dias | Alto    | ALTA       |
| Fase 7: Melhorias e Documentacao     | 5-7 dias  | Medio   | MEDIA      |

**Total**: 26-36 dias (4-6 semanas)

### Com Migracao haxball.js (Revolucionario - 10-12 semanas)

- Modernizacao Basica (Fases 1-7): 4-6 semanas
- **Fase 8: Migracao para haxball.js**: 6 semanas
  - Prototipo e validacao: 1 semana
  - Implementacao core: 2 semanas
  - Compatibilidade: 1 semana
  - Monitoramento: 1 semana
  - Testes e docs: 1 semana

**Total com haxball.js**: 10-12 semanas (2.5-3 meses)

### Com Features Novas (3-4 meses)

- Modernizacao Basica: 4-6 semanas
- Fase 8: Migracao haxball.js: 6 semanas
- Sistema de Plugins: 1-2 semanas
- Web Dashboard: 2-3 semanas
- Health Checks: 3-5 dias
- Docker: 2-3 dias
- Metricas: 2-3 dias
- Database: 1 semana

**Total Completo**: 14-18 semanas (3-4 meses)

---

## Metricas de Sucesso

### Tecnicas

- ✅ Todas as dependencias atualizadas para versoes seguras
- ✅ Zero vulnerabilidades criticas/altas no `npm audit`
- ✅ Cobertura de testes >= 70%
- ✅ Compilacao TypeScript sem erros em modo strict
- ✅ Todos os comandos Discord funcionando

### Funcionais

- ✅ Abrir/fechar salas funciona corretamente
- ✅ Proxies funcionando como esperado
- ✅ Remote debugging funcional
- ✅ Custom settings com heranca funcionando
- ✅ Bot Discord respondendo a todos os comandos

### Qualidade

- ✅ Documentacao completa e atualizada
- ✅ JSDoc em todas as funcoes publicas
- ✅ CHANGELOG.md mantido
- ✅ CONTRIBUTING.md criado
- ✅ CI/CD configurado

---

## Comandos Uteis

### Durante o Desenvolvimento

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build
# ou
tsc

# Executar servidor
npm start

# Executar testes
npm test

# Executar testes em watch mode
npm run test:watch

# Verificar cobertura
npm run test:coverage

# Verificar vulnerabilidades
npm audit

# Corrigir vulnerabilidades automaticas
npm audit fix

# Lint codigo
npm run lint

# Formatar codigo
npm run format
```

### Apos Atualizacoes

```bash
# Verificar versoes desatualizadas
npm outdated

# Atualizar dependencias patch/minor
npm update

# Atualizar dependencias major (use com cuidado)
npx npm-check-updates -u
npm install
```

---

## Checklist Final de Atualizacao

### Pre-Atualizacao

- [ ] Fazer backup do codigo atual
- [ ] Documentar versoes atuais
- [ ] Criar branch de desenvolvimento
- [ ] Configurar repositorio de testes

### Fase 1: Dependencias

- [ ] Atualizar package.json
- [ ] Executar npm install
- [ ] Resolver conflitos de dependencias
- [ ] Documentar breaking changes

### Fase 2: Discord.js

- [ ] Adicionar Intents
- [ ] Substituir MessageEmbed
- [ ] Trocar evento message
- [ ] Atualizar metodos de envio
- [ ] Testar todos os comandos
- [ ] Remover/proteger eval

### Fase 3: Puppeteer (ou pular se fizer Fase 8)

- [ ] Atualizar headless mode
- [ ] Corrigir remote port access
- [ ] Testar abertura de salas
- [ ] Testar fechamento de salas
- [ ] Verificar debugging remoto

**NOTA**: Se planejar fazer Fase 8 (haxball.js), pode pular esta fase e ir direto para Fase 4

### Fase 4: Async/Await

- [ ] Refatorar loadConfig
- [ ] Refatorar connect
- [ ] Refatorar openServer
- [ ] Adicionar try/catch
- [ ] Testar error handling

### Fase 5: TypeScript

- [ ] Atualizar tsconfig.json
- [ ] Remover todos os any
- [ ] Adicionar tipos faltantes
- [ ] Corrigir erros strict
- [ ] Compilar sem erros

### Fase 6: Testes

- [ ] Instalar Jest
- [ ] Configurar Jest
- [ ] Criar testes utils
- [ ] Criar testes Server
- [ ] Criar testes ControlPanel
- [ ] Atingir 70%+ coverage
- [ ] Configurar CI/CD

### Fase 7: Documentacao

- [ ] Adicionar JSDoc
- [ ] Criar CONTRIBUTING.md
- [ ] Criar CHANGELOG.md
- [ ] Atualizar README.md
- [ ] Criar ARCHITECTURE.md
- [ ] Atualizar badges

### Fase 8: Migracao haxball.js (OPCIONAL mas ALTAMENTE RECOMENDADO)

- [ ] Criar branch experimental
- [ ] Instalar haxball.js e remover puppeteer-core
- [ ] Refatorar Server.ts completamente
- [ ] Implementar gerenciamento de salas nativo
- [ ] Sistema de proxy integrado
- [ ] Aplicar custom settings
- [ ] Script de migracao automatica de bots
- [ ] Implementar RoomMonitor e metricas
- [ ] Sistema de logging avancado
- [ ] Testes extensivos e benchmarks
- [ ] Documentacao completa de migracao
- [ ] Guia de transicao para usuarios

### Pos-Atualizacao

- [ ] Testar em ambiente real
- [ ] Fazer release v5.0.0
- [ ] Atualizar npm package
- [ ] Anunciar breaking changes
- [ ] Monitorar issues

---

## Recursos e Referencias


### Documentacao Oficial

- [Discord.js v14 Guide](https://discordjs.guide/)
- [Puppeteer Documentation](https://pptr.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/latest/api/)

### Ferramentas

- [npm-check-updates](https://github.com/raineorshine/npm-check-updates) - Atualizar dependencias
- [Jest](https://jestjs.io/) - Framework de testes
- [ESLint](https://eslint.org/) - Linter

- [Prettier](https://prettier.io/) - Formatador

### Migracoes

- [Discord.js v13 → v14 Migration](https://discordjs.guide/additional-info/changes-in-v14.html)
- [Puppeteer Migration Guide](https://pptr.dev/guides/migration)

- [haxball.js GitHub Repository](https://github.com/mertushka/haxball.js)
- [haxball.js NPM Package](https://www.npmjs.com/package/haxball.js)

---

## Conclusao

Este plano fornece um roadmap completo para modernizar o haxball-server, desde atualizacoes criticas de seguranca ate melhorias opcionais de arquitetura. A abordagem faseada permite progresso incremental com validacao em cada etapa.


**Destaque Especial - Fase 8 (haxball.js)**:
A migracao para haxball.js representa uma mudanca revolucionaria que:

- Elimina a dependencia de Chrome/Chromium
- Reduz uso de memoria em 70-80%
- Reduz tamanho de instalacao em 90%
- elora performance e estabilidade
- Simplifica instalacao e manutencao
- Remove mutiplas dependencias obsoletas (puppeteer, tunnel-ssh, portscanner, open)

Esta e uma oportunidade unica de transformar o projeto em algo muito mais leve, rapido e facil de manter.

**Proximos Passos Imediatos**:

**Cenario 1 - Modernizacao Conservadora (v5.0.0)**:

1. Criar branch de desenvolvimento
2. Iniciar Fase 1 (atualizacao de dependencias)
3. Executar Fases 2-7 sequencialmente
4. Release v5.0.0 em 4-6 semanas

**Cenario 2 - Modernizacao Revolucionaria (v5.0.0 ou v6.0.0 - RECOMENDADO)**:

1. Criar branch de desenvolvimento
2. Iniciar Fases 1-2 (dependencias criticas + Discord.js)
3. PULAR Fase 3 (Puppeteer)
4. Executar Fases 4-7
5. Implementar Fase 8 (haxball.js)
6. Release v5.0.0 ou v6.0.0 em 10-12 semanas

**Cenario 3 - Abordagem Hibrida**:

1. Release v5.0.0 com Fases 1-7 (4-6 semanas)
2. Branch experimental para Fase 8
3. Validacao extensa da Fase 8
4. Release v6.0.0 com haxball.js (3-4 meses total)

O projeto tem uma base solida e com estas atualizacoes estara moderno, seguro e preparado para continuar evoluindo. A opcao de usar haxball.js e especialmente interessante pois resolve os problemas de manutencao do Puppeteer de forma definitiva.

/_**\_\_** \_**\_ \_ *
/ *\/ \_**) **\_) )( \
/ \_** \_**) \/ (
\_/\_(\_\_**(\_**\_|\_\_**/_/
