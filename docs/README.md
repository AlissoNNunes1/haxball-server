# Documentacao Haxball Server

Indice completo da documentacao do projeto.

## Documentos Principais

### [ARCHITECTURE.md](./ARCHITECTURE.md)
Arquitetura geral do sistema, diagramas de componentes e fluxos principais.

**Topicos:**
- Visao geral da arquitetura
- Componentes principais (Server, ControlPanel, Monitors)
- Fluxo de abertura de sala
- Sistema de comandos Discord
- Integracao com haxball.js

### [roadmap.md](./roadmap.md)
Planejamento de fases de desenvolvimento e progresso.

**Fases Completadas:**
- Fase 9: Sistema de Autenticacao
- Fase 10: Sistema de Balanceamento Elo
- Fase 11: Sistema de Estatisticas
- Fase 12: Sistema de Plugins (em progresso)

**Proximas Fases:**
- Fase 13+: Web Dashboard, ML Balance, Achievements

### [BOT_COMPATIBILITY.md](./BOT_COMPATIBILITY.md)
Guia de compatibilidade de scripts de bot com VM sandbox.

**Topicos:**
- Limitacoes do sandbox VM
- APIs disponiveis para bots
- Problemas comuns e solucoes
- Boas praticas para scripts

## Documentacao de Sistemas

### [STATS.md](./STATS.md)
Sistema completo de estatisticas (Fase 11).

**Topicos:**
- Arquitetura de coleta e calculo
- API REST de consulta
- Comandos Discord
- Integracao com Auth e Balance
- Cache e performance
- Tipos de stats (basicas e avancadas)
- Heatmaps e posicionamento

### [PLUGINS.md](./PLUGINS.md)
Sistema modular de plugins (Fase 12).

**Topicos:**
- Arquitetura de plugins
- Plugin Interface e lifecycle hooks
- PluginContext API (logger, storage, commands, events)
- GlobalEventBus
- Criacao de plugins
- Exemplos completos
- Boas praticas

## Documentacao Haxball

Documentacao oficial da API Haxball Headless.

### [headless.md](./haxball_documentation/headless.md)
API principal do Haxball Headless.

**Topicos:**
- HBInit e configuracao de sala
- Objetos Room, Player, Disc
- Eventos (onPlayerJoin, onPlayerLeave, onTeamGoal, etc)
- Metodos de controle (kickPlayer, setPlayerTeam, etc)
- Fisica e customizacao

### [haxball_stadium.md](./haxball_documentation/haxball_stadium.md)
Formato de mapas (.hbs) do Haxball.

**Topicos:**
- Estrutura JSON de mapas
- Vertices, segmentos, discos
- Propriedades fisicas
- Traits e customizacao

### [collisions.md](./haxball_documentation/collisions.md)
Sistema de colisao do Haxball.

**Topicos:**
- Fisica de colisoes
- Grupos de colisao (collision masks)
- Interacoes entre objetos

### [chat_commands.md](./haxball_documentation/chat_commands.md)
Comandos nativos de chat do Haxball.

### [replays.md](./haxball_documentation/replays.md)
Sistema de gravacao e replay.

## Guias Rapidos

### Iniciar Servidor

```bash
# Build
npm run build

# Rodar
node dist/main.js open config.json
```

### Criar Plugin

1. Criar diretorio `plugins/meu-plugin/`
2. Criar `package.json` com manifest
3. Criar `index.ts` implementando `Plugin`
4. Build e reiniciar servidor

Ver [PLUGINS.md](./PLUGINS.md) para detalhes.

### Consultar Stats

**Discord:**
```
!stats @jogador
!mystats
!top goals
!compare @jogador1 @jogador2
```

**API REST:**
```bash
curl http://localhost:3000/api/stats/player/123
curl http://localhost:3000/api/stats/leaderboard?metric=goals
```

Ver [STATS.md](./STATS.md) para referencia completa.

### Comandos Discord

```
!open <bot> <token> [setting]  # Abre sala
!close <pid|all>               # Fecha sala
!info                          # Status de salas
!meminfo                       # Uso de memoria
!metrics                       # Metricas do sistema
!reload                        # Recarrega configuracao
!exit                          # Desliga servidor
!tokenlink                     # Link para obter token
```

## Estrutura de Diretorios

```
src/
  main.ts                     # CLI entry point
  Server.ts                   # Haxball server core
  ControlPanel.ts             # Discord bot
  
  commands/
    openServer.ts             # Comando open
    connect.ts                # Comando connect
  
  auth/                       # Fase 9: Autenticacao
    types.ts
    AuthService.ts
    AuthCommands.ts
  
  balance/                    # Fase 10: Balanceamento
    types.ts
    EloBalanceService.ts
    BalanceCommands.ts
  
  stats/                      # Fase 11: Estatisticas
    types.ts
    StatsCollector.ts
    StatsCalculator.ts
    StatsService.ts
    StatsCacheService.ts
    StatsCommands.ts
    StatsAPI.ts
  
  plugins/                    # Fase 12: Plugins
    types.ts
    PluginManager.ts
  
  events/                     # Fase 12: Event Bus
    GlobalEventBus.ts
  
  database/
    schema.ts
    schema-stats.ts
  
  debugging/
    RoomMonitor.ts
    WebMonitor.ts
    DebuggingServer.ts
  
  utils/
    log.ts
    Logger.ts
    loadConfig.ts
    getAvailablePort.ts

tests/
  unit/                       # Testes unitarios
  integration/                # Testes de integracao
  benchmarks/                 # Benchmarks de performance

plugins/                      # Plugins externos
  stats-example/              # Plugin de exemplo

docs/                         # Documentacao
  ARCHITECTURE.md
  roadmap.md
  STATS.md
  PLUGINS.md
  BOT_COMPATIBILITY.md
  haxball_documentation/
```

## Fluxos Principais

### Abertura de Sala

```
Usuario -> !open <bot> <token>
  |
  v
ControlPanel.openServer()
  |
  +-> loadConfig()
  +-> Server.open(botScript, tokens)
  +-> RoomMonitor.registerRoom()
  +-> PluginManager.triggerHook('onRoomOpen')
  |
  v
Sala Aberta
```

### Coleta de Stats

```
Evento na Sala (goal, join, leave)
  |
  v
StatsCollector.recordEvent()
  |
  v
StatsService.saveMatch()
  |
  +-> Database Insert
  +-> StatsCacheService.invalidate()
  +-> GlobalEventBus.emit('stats:event')
  |
  v
Stats Persistidas
```

### Execucao de Plugin

```
PluginManager.loadAll()
  |
  +-> Le package.json
  +-> Valida dependencias
  +-> Cria PluginContext
  +-> plugin.init(context)
  |
  v
Plugin Ativo
  |
  v
Evento Dispara -> triggerHook()
  |
  v
Plugin Hook Executado
```

## Integracao entre Sistemas

### Auth + Balance

Balance usa Auth para recuperar contas de jogadores e calcular Elo.

```typescript
const account = await authService.getAccountById(player.accountId);
const rating = await balanceService.getRating(account.id);
```

### Balance + Stats

Stats atualiza Elo apos partidas.

```typescript
await statsService.saveMatch(match);
await balanceService.updateRatings(match.players);
```

### Plugins + Todos os Sistemas

Plugins podem reagir a eventos via GlobalEventBus:

```typescript
context.events.on('auth:event', ...);
context.events.on('balance:event', ...);
context.events.on('stats:event', ...);
```

## Configuracao

Ver `config.json` exemplo:

```json
{
  "server": {
    "haxballJsPath": "./node_modules/haxball.js/headless.js",
    "debugMode": false
  },
  "panel": {
    "discordToken": "BOT_TOKEN",
    "discordPrefix": "!",
    "mastersDiscordId": ["USER_ID"],
    "bots": {
      "futsal": "./bots/futsal-example.js"
    },
    "customSettings": {
      "default": {
        "reserved": {
          "haxball": {
            "maxPlayers": 12,
            "public": false
          }
        }
      }
    }
  }
}
```

## Desenvolvimento

### Build

```bash
npm run build
```

### Test

```bash
npm test                # Roda todos os testes
npm run test:watch      # Watch mode
npm run test:coverage   # Com cobertura
```

### Lint

```bash
npm run lint
```

### Hot Reload (Plugins)

```bash
# Via Discord
!reload
```

Ou via codigo:

```typescript
await pluginManager.reloadPlugin('meu-plugin');
```

## Troubleshooting

### Sala nao abre

1. Verifique token valido
2. Verifique haxball.js instalado
3. Verifique porta disponivel
4. Verifique logs em `utils/log`

### Bot script quebra

1. Verifique globals disponiveis no VM
2. Verifique timeout (5s padrao)
3. Consulte [BOT_COMPATIBILITY.md](./BOT_COMPATIBILITY.md)

### Plugin nao carrega

1. Verifique `package.json` valido
2. Verifique dependencias instaladas
3. Verifique implementacao de `Plugin` interface
4. Verifique logs `[plugin-name]`

### Stats nao aparecem

1. Verifique database inicializado
2. Verifique cache valido
3. Verifique integracao AuthService
4. Verifique logs StatsService

## Referencias Externas

- [Haxball Headless API](https://github.com/haxball/haxball-issues/wiki/Headless-Host)
- [Discord.js v14](https://discord.js.org/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Drizzle ORM](https://orm.drizzle.team/)

## Contribuindo

Ver [CONTRIBUTING.md](../CONTRIBUTING.md) para guidelines.

## Licenca

Consulte [LICENSE](../LICENSE).

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
