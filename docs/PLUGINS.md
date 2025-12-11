# Sistema de Plugins - Fase 12

## Panorama Geral

Sistema modular de plugins que permite extensibilidade do Haxball Server sem modificar o codigo base. Plugins podem reagir a eventos, registrar comandos customizados, armazenar dados persistentes e se comunicar via event bus global.

## Arquitetura

### Componentes

1. **PluginManager**: Gerenciador central que carrega, inicializa e gerencia ciclo de vida
2. **Plugin Interface**: Contrato padrao que todos os plugins devem implementar
3. **PluginContext**: API fornecida ao plugin durante inicializacao
4. **GlobalEventBus**: Sistema de eventos centralizado para comunicacao entre modulos
5. **PluginStorage**: Storage isolado e persistente por plugin

### Fluxo de Carregamento

```
Startup
  |
  v
PluginManager.loadAll()
  |
  +-> Le package.json
  +-> Valida dependencias
  +-> Require() do modulo
  +-> Cria PluginContext
  +-> plugin.init(context)
  +-> Registra hooks
  |
  v
Plugin Ativo
```

## Interface do Plugin

### Propriedades Obrigatorias

```typescript
export default class MyPlugin implements Plugin {
  name = 'my-plugin'; // Nome unico
  version = '1.0.0'; // Versao semantica
  description = 'Descricao'; // Opcional
  author = 'Seu Nome'; // Opcional
  dependencies = []; // Plugins necessarios

  async init(context: PluginContext): Promise<void> {
    // Inicializacao do plugin
  }
}
```

### Lifecycle Hooks Opcionais

Todos os hooks sao opcionais. Implemente apenas os necessarios.

#### onRoomOpen

Chamado quando sala e aberta.

```typescript
async onRoomOpen(room: RoomInfo): Promise<void> {
  console.log(`Sala ${room.botName} aberta`);
}
```

#### onRoomClose

Chamado quando sala e fechada.

```typescript
async onRoomClose(room: RoomInfo): Promise<void> {
  console.log(`Sala ${room.botName} fechada`);
}
```

#### onPlayerJoin

Chamado quando jogador entra na sala.

```typescript
async onPlayerJoin(player: PlayerInfo, room: RoomInfo): Promise<void> {
  console.log(`${player.name} entrou na sala ${room.botName}`);
}
```

#### onPlayerLeave

Chamado quando jogador sai da sala.

```typescript
async onPlayerLeave(player: PlayerInfo, room: RoomInfo): Promise<void> {
  console.log(`${player.name} saiu da sala ${room.botName}`);
}
```

#### onTeamGoal

Chamado quando gol e marcado.

```typescript
async onTeamGoal(team: number, room: RoomInfo): Promise<void> {
  console.log(`Time ${team} marcou gol na sala ${room.botName}`);
}
```

#### onCommand

Chamado para comandos Discord (via PluginManager).

```typescript
async onCommand(command: string, args: string[], context: CommandContext): Promise<void> {
  if (command === 'meucomando') {
    await context.reply('Resposta do comando');
  }
}
```

#### onSystemStart / onSystemStop

Chamados quando sistema inicia/para.

```typescript
async onSystemStart(): Promise<void> {
  console.log('Sistema iniciando');
}

async onSystemStop(): Promise<void> {
  console.log('Sistema parando');
}
```

#### cleanup

Chamado antes de descarregar plugin.

```typescript
async cleanup(): Promise<void> {
  // Libera recursos, fecha conexoes, etc
}
```

## PluginContext API

### context.logger

Logger isolado para o plugin.

```typescript
context.logger.info('Mensagem informativa');
context.logger.warn('Aviso');
context.logger.error('Erro');
context.logger.debug('Debug');
```

Logs aparecem com prefixo `[nome-plugin]`.

### context.storage

Storage persistente isolado (arquivo JSON).

```typescript
// Salvar
await context.storage.set('chave', { dados: 'valor' });

// Recuperar
const dados = await context.storage.get<MeuTipo>('chave');

// Deletar
await context.storage.delete('chave');

// Listar chaves
const chaves = await context.storage.keys();

// Limpar tudo
await context.storage.clear();
```

Storage e salvo em `data/plugins/<nome-plugin>/storage.json`.

### context.registerCommand

Registra comando Discord customizado.

```typescript
context.registerCommand('stats', async (args, ctx) => {
  await ctx.reply('Minhas stats customizadas!');
});
```

Usuario pode usar `!stats` no Discord.

### context.scheduleTask

Agenda tarefa periodica.

```typescript
// Executa a cada 60 segundos
const task = context.scheduleTask(60000, async () => {
  console.log('Tarefa periodica');
});

// Cancelar
task.cancel();
```

### context.events

Event bus global (EventEmitter).

```typescript
// Escutar eventos
context.events.on('room:open', (room) => {
  console.log('Sala aberta:', room);
});

// Emitir eventos customizados
context.events.emit('meu-plugin:evento', { dados: 'valor' });
```

### context.server

Acesso ao servidor principal (Server instance).

```typescript
// Exemplo: Acessar salas abertas
const rooms = context.server.getRooms(); // Implementacao depende de Server
```

### context.config

Configuracao do plugin (package.json).

```typescript
console.log(context.config.name);
console.log(context.config.version);
```

## Criando um Plugin

### 1. Estrutura de Diretorio

```
plugins/
  meu-plugin/
    package.json
    index.ts
    README.md (opcional)
```

### 2. package.json

```json
{
  "name": "meu-plugin",
  "version": "1.0.0",
  "description": "Descricao do plugin",
  "main": "index.ts",
  "author": "Seu Nome",
  "pluginDependencies": []
}
```

### 3. index.ts

```typescript
import { Plugin, PluginContext } from '../../src/plugins/types';

export default class MeuPlugin implements Plugin {
  name = 'meu-plugin';
  version = '1.0.0';
  description = 'Plugin de exemplo';

  private context!: PluginContext;

  async init(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info('Plugin inicializado');

    // Registra comando
    context.registerCommand('teste', this.handleTeste.bind(this));

    // Escuta eventos
    context.events.on('room:open', this.onRoomOpenEvent.bind(this));
  }

  private async handleTeste(args: string[], ctx: any): Promise<void> {
    await ctx.reply('Comando !teste executado!');
  }

  private onRoomOpenEvent(room: any): void {
    this.context.logger.info(`Sala ${room.botName} aberta!`);
  }

  async cleanup(): Promise<void> {
    this.context.logger.info('Plugin descarregado');
  }
}
```

### 4. Build

```bash
npm run build
```

### 5. Carregar Plugin

Plugins sao carregados automaticamente de `./plugins/` no startup.

Ou via codigo:

```typescript
const pluginManager = new PluginManager(server);
await pluginManager.loadPlugin('./plugins/meu-plugin');
```

## Exemplo Completo: Plugin de Stats

Ver `plugins/stats-example/` para exemplo funcional.

**Funcionalidades:**

- Rastreia stats de salas abertas
- Comando `!roomstats` mostra estatisticas
- Armazena total historico de salas
- Tarefa periodica que loga stats

## Gerenciamento de Plugins

### Listar Plugins

```typescript
const plugins = pluginManager.listPlugins();
console.log(plugins);
```

### Descarregar Plugin

```typescript
await pluginManager.unloadPlugin('meu-plugin');
```

### Recarregar Plugin

```typescript
await pluginManager.reloadPlugin('meu-plugin');
```

Util para desenvolvimento.

### Descarregar Todos

```typescript
await pluginManager.unloadAll();
```

## GlobalEventBus

Sistema de eventos centralizado para comunicacao entre modulos.

### Eventos do Sistema

```typescript
import { GlobalEventBus } from './events/GlobalEventBus';

const bus = GlobalEventBus.getInstance();

// Sala aberta
bus.on('room:open', (room) => { ... });

// Sala fechada
bus.on('room:close', (room) => { ... });

// Jogador entrou
bus.on('player:join', (player, room) => { ... });

// Jogador saiu
bus.on('player:leave', (player, room) => { ... });

// Gol marcado
bus.on('team:goal', (team, room) => { ... });

// Comando Discord
bus.on('command', (cmd, args, ctx) => { ... });

// Sistema iniciando/parando
bus.on('system:start', () => { ... });
bus.on('system:stop', () => { ... });

// Metrica do sistema
bus.on('system:metric', (metric) => { ... });

// Erro do sistema
bus.on('system:error', (error, context) => { ... });
```

### Eventos de Subsistemas

```typescript
// Autenticacao
bus.on('auth:event', (event) => {
  if (event.type === 'register') { ... }
  if (event.type === 'login') { ... }
});

// Balanceamento
bus.on('balance:event', (event) => {
  if (event.type === 'teams:balanced') { ... }
  if (event.type === 'rating:updated') { ... }
});

// Estatisticas
bus.on('stats:event', (event) => {
  if (event.type === 'match:completed') { ... }
  if (event.type === 'stats:updated') { ... }
});
```

### Emitindo Eventos

Plugins podem emitir eventos customizados:

```typescript
context.events.emit('meu-plugin:custom', { dados: 'valor' });
```

Outros plugins/modulos podem escutar:

```typescript
bus.on('meu-plugin:custom', (dados) => {
  console.log(dados);
});
```

## Dependencias entre Plugins

Plugin pode depender de outro plugin.

### Declarar Dependencia

```typescript
export default class MeuPlugin implements Plugin {
  name = 'meu-plugin';
  version = '1.0.0';
  dependencies = ['outro-plugin']; // Obrigatorio

  async init(context: PluginContext): Promise<void> {
    // outro-plugin ja foi inicializado
    const outroPlugin = context.server.pluginManager.getPlugin('outro-plugin');
    // Usar API do outro plugin
  }
}
```

PluginManager garante ordem de carregamento.

## Boas Praticas

### 1. Tratamento de Erro

Sempre use try/catch em hooks:

```typescript
async onPlayerJoin(player: PlayerInfo, room: RoomInfo): Promise<void> {
  try {
    // Logica do plugin
  } catch (error: any) {
    this.context.logger.error(`Erro no onPlayerJoin: ${error.message}`);
  }
}
```

### 2. Cleanup de Recursos

Sempre implemente `cleanup()` se plugin abre conexoes, timers, etc:

```typescript
async cleanup(): Promise<void> {
  if (this.connection) {
    await this.connection.close();
  }

  if (this.timer) {
    clearInterval(this.timer);
  }
}
```

### 3. Storage Eficiente

Evite salvar dados muito frequentemente. Use cache em memoria:

```typescript
private cache: Map<string, any> = new Map();

async getData(key: string): Promise<any> {
  // Tenta cache primeiro
  if (this.cache.has(key)) {
    return this.cache.get(key);
  }

  // Se nao, carrega do storage
  const data = await this.context.storage.get(key);
  this.cache.set(key, data);
  return data;
}

async saveData(key: string, value: any): Promise<void> {
  this.cache.set(key, value);
  await this.context.storage.set(key, value);
}
```

### 4. Logging Apropriado

Use niveis corretos:

- `debug`: Detalhes internos (verbose)
- `info`: Informacoes gerais
- `warn`: Situacoes potencialmente problematicas
- `error`: Erros que impedem funcionamento

### 5. Validacao de Dados

Valide dados externos:

```typescript
async onCommand(cmd: string, args: string[], ctx: any): Promise<void> {
  if (args.length < 1) {
    await ctx.reply('Uso: !comando <argumento>');
    return;
  }

  const value = parseInt(args[0], 10);
  if (isNaN(value)) {
    await ctx.reply('Argumento deve ser numero');
    return;
  }

  // Logica...
}
```

## Casos de Uso

### 1. Plugin de Notificacoes

Envia notificacoes para webhook quando eventos ocorrem:

```typescript
async onTeamGoal(team: number, room: RoomInfo): Promise<void> {
  await fetch('https://webhook.site/xyz', {
    method: 'POST',
    body: JSON.stringify({
      type: 'goal',
      team,
      room: room.botName,
    }),
  });
}
```

### 2. Plugin de Backup

Faz backup periodico de dados:

```typescript
async init(context: PluginContext): Promise<void> {
  context.scheduleTask(3600000, async () => { // 1 hora
    await this.fazerBackup();
  });
}

private async fazerBackup(): Promise<void> {
  const stats = await this.coletarStats();
  await fs.writeFile(`backup-${Date.now()}.json`, JSON.stringify(stats));
  this.context.logger.info('Backup criado');
}
```

### 3. Plugin de Metricas

Coleta e exporta metricas para Prometheus:

```typescript
async init(context: PluginContext): Promise<void> {
  const express = require('express');
  const app = express();

  app.get('/metrics', (req, res) => {
    const metricas = this.coletarMetricas();
    res.send(this.formatarPrometheus(metricas));
  });

  app.listen(9090);
}
```

### 4. Plugin de Moderacao

Auto-kick jogadores com ping alto:

```typescript
async onPlayerJoin(player: PlayerInfo, room: RoomInfo): Promise<void> {
  // Aguarda 10s
  await new Promise(resolve => setTimeout(resolve, 10000));

  const ping = await this.getPing(player.id, room.pid);

  if (ping > 200) {
    await this.kickPlayer(player.id, room.pid, 'Ping muito alto');
    this.context.logger.info(`Kickado ${player.name} (ping ${ping}ms)`);
  }
}
```

## Integracao com Sistemas Existentes

### Auth (Fase 9)

```typescript
import { AuthService } from '../../src/auth/AuthService';

async init(context: PluginContext): Promise<void> {
  const authService = new AuthService(db);

  context.events.on('auth:event', async (event) => {
    if (event.type === 'register') {
      const account = await authService.getAccountById(event.accountId!);
      this.context.logger.info(`Nova conta: ${account.name}`);
    }
  });
}
```

### Balance (Fase 10)

```typescript
context.events.on('balance:event', (event) => {
  if (event.type === 'teams:balanced') {
    this.context.logger.info(`Times balanceados: ${event.accountIds}`);
  }
});
```

### Stats (Fase 11)

```typescript
context.events.on('stats:event', (event) => {
  if (event.type === 'match:completed') {
    this.context.logger.info(`Partida ${event.matchId} finalizada`);
  }
});
```

## Debugging de Plugins

### Log Verbose

```bash
NODE_ENV=development npm start
```

Ativa logs `debug`.

### Hot Reload

```typescript
// Via CLI ou Discord
await pluginManager.reloadPlugin('meu-plugin');
```

### Inspecao

```typescript
const plugin = pluginManager.getPlugin('meu-plugin');
console.log(plugin);

const context = pluginManager.contexts.get('meu-plugin');
console.log(context);
```

## Limitacoes e Consideracoes

### Seguranca

- Plugins tem acesso total ao sistema
- Apenas carregue plugins confiaveis
- Considere sandbox para plugins de terceiros (futuro)

### Performance

- Hooks sincronos bloqueiam sistema
- Use `async/await` para operacoes demoradas
- Evite loops infinitos em tarefas agendadas

### Compatibilidade

- Plugins sao especificos para versao do servidor
- Breaking changes podem quebrar plugins
- Mantenha versionamento semantico

## Roadmap de Plugins

### Fase 12.1 (Atual)

- ✅ Arquitetura basica
- ✅ Lifecycle hooks
- ✅ PluginContext API
- ✅ GlobalEventBus
- ✅ Storage persistente
- ✅ Comandos customizados

### Fase 12.2 (Futuro)

- [ ] Plugin marketplace
- [ ] Hot reload automatico
- [ ] Sandbox de seguranca
- [ ] Plugin dependencies via npm
- [ ] CLI para gerenciar plugins
- [ ] Web UI para plugins

### Fase 12.3 (Futuro)

- [ ] Plugin SDK com tipos
- [ ] Templates de plugins
- [ ] Testing framework para plugins
- [ ] Metricas de performance por plugin
- [ ] Rate limiting por plugin

## Exemplos Adicionais

Ver diretorio `plugins/`:

- `stats-example`: Stats basicas de salas
- (Mais exemplos em desenvolvimento)

## Suporte

Para duvidas sobre desenvolvimento de plugins:

1. Consulte esta documentacao
2. Veja exemplos em `plugins/`
3. Leia codigo-fonte em `src/plugins/`
4. Abra issue no repositorio

// ** \_\_** \_**\_ \_ _
// / _\/ \_**) **\_) )( \
// \_** \_** ) \/ (
// \_/\_(\_\_**(\_**\_|\_\_**/
