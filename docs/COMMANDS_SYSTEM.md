# Sistema de Comandos Globais

Sistema centralizado de comandos para todas as salas Haxball, incluindo autenticacao CIRS.

## Arquivos

- `shared/config/commands.cjs` - Comandos globais (autenticacao + gerais)
- `shared/config/cirs-handlers.cjs` - Handlers especificos da sala CIRS
- `src/auth/RoomAuthHandler.ts` - Logica de autenticacao backend

## Como Usar em um Bot

### Metodo 1: Importar commands.cjs (Recomendado)

```javascript
const { processCommand } = require('../shared/config/commands.cjs');

room.onPlayerChat = function (player, message) {
  // Processa comandos globais primeiro
  const handled = processCommand(room, player, message);
  if (handled) return false;

  // Seus comandos customizados aqui
  if (message === '!custom') {
    room.sendAnnouncement('Comando custom!');
    return false;
  }

  // Mensagens normais de chat
  return true;
};
```

### Metodo 2: Usar cirs-handlers.cjs completo

```javascript
// Importa handlers completos (ja inclui commands.cjs)
require('../shared/config/cirs-handlers.cjs');
```

## Comandos Disponiveis

### Comandos de Autenticacao (/)

- `/login <senha>` - Fazer login na conta CIRS
- `/logout` - Desconectar da conta
- `/profile [nick]` - Ver perfil de jogador
- `/stats` - Ver suas estatisticas (precisa estar logado)
- `/ranking [nick]` - Ver posicao no ranking
- `/top` - Ver top 10 jogadores
- `/help` ou `/ajuda` - Lista de comandos de autenticacao

### Comandos Gerais (!)

- `!help` ou `!ajuda` - Lista de comandos gerais
- `!afk` - Ir para espectadores (AFK)
- `!bb` ou `!gk` - Voltar para o gol

### Comandos Especiais

- `t [mensagem]` - Chat do time
- `@@[nick] [mensagem]` - Mensagem privada

## Fluxo de Autenticacao

1. **Jogador entra na sala**

   - Sistema verifica se nick esta cadastrado no banco de dados
   - Se cadastrado: solicita login
   - Se nao cadastrado: sugere registro no Discord

2. **Jogador digita `/login senha123`**

   - `commands.cjs` processa o comando
   - Chama `RoomAuthHandler.login()`
   - Verifica senha no banco de dados
   - Se correto: autentica jogador e mostra stats
   - Se incorreto: mostra mensagem de erro

3. **Jogador autenticado**

   - Tag `[Elo]` adicionada ao nome (futuro)
   - Pode usar `/stats` para ver estatisticas
   - Pode usar `/profile` para ver perfil publico
   - Sistema rastreia jogador autenticado

4. **Jogador sai da sala**
   - Autenticacao removida automaticamente
   - Precisa fazer login novamente ao retornar

## Estrutura do Sistema

```
commands.cjs
├── processCommand(room, player, message)
│   ├── processAuthCommand() - Comandos com /
│   │   ├── /login -> handleLogin()
│   │   ├── /logout -> handleLogout()
│   │   ├── /profile -> handleProfile()
│   │   ├── /stats -> handleStats()
│   │   ├── /ranking -> handleRanking()
│   │   ├── /top -> handleTop()
│   │   └── /help -> handleAuthHelp()
│   │
│   └── processGeneralCommand() - Comandos com !
│       ├── !help -> handleGeneralHelp()
│       ├── !afk -> handleAFK()
│       └── !bb -> handleBackToGoal()
│
RoomAuthHandler (TypeScript)
├── login(room, player, password)
├── logout(room, player)
├── getProfile(nick)
├── getPlayerStats(playerId)
├── getRanking(nick)
├── getTop10()
├── isAuthenticated(playerId)
└── getAccount(playerId)
```

## Adicionar Novos Comandos

### Comando de Autenticacao (/)

Edite `shared/config/commands.cjs`:

```javascript
function processAuthCommand(room, player, message) {
  const cmd = message.split(' ')[0].toLowerCase();

  // Adicione aqui
  if (cmd === '/meucomando') {
    handleMeuComando(room, player, message);
    return true;
  }

  // ...resto do codigo
}

function handleMeuComando(room, player, message) {
  room.sendAnnouncement('Meu comando executado!', player.id);
}
```

### Comando Geral (!)

Edite `shared/config/commands.cjs`:

```javascript
function processGeneralCommand(room, player, message) {
  const args = message.substring(1).trim().split(/\s+/);
  const cmd = args[0].toLowerCase();

  // Adicione aqui
  if (cmd === 'meucomando') {
    handleMeuComandoGeral(room, player, args);
    return true;
  }

  // ...resto do codigo
}
```

## Banco de Dados

O sistema usa SQLite com as seguintes tabelas:

- `accounts` - Contas de jogadores
- `discord_links` - Vinculo Discord <-> Haxball
- `match_history` - Historico de partidas
- `player_stats` - Estatisticas de jogadores

Acesso via `getAuthDb()` em `src/database/auth-client.ts`

## Troubleshooting

### Comandos nao funcionam

1. Verifique se `commands.cjs` esta sendo importado
2. Verifique logs do console: `[COMMANDS] Sistema de autenticacao carregado`
3. Compile TypeScript: `npm run build`
4. Verifique se `dist/auth/RoomAuthHandler.js` existe

### Erro "Cannot find module RoomAuthHandler"

Execute: `npm run build`

O arquivo precisa ser compilado de TypeScript para JavaScript.

### Login sempre falha

1. Verifique se conta existe no banco de dados (use Discord `/profile`)
2. Verifique senha esta correta
3. Verifique logs: `[COMMANDS] Erro ao fazer login:`

## Exemplos de Uso

### Bot Simples com Autenticacao

```javascript
const { processCommand } = require('../shared/config/commands.cjs');

room.onPlayerChat = function (player, message) {
  // Comandos globais
  if (processCommand(room, player, message)) return false;

  // Comandos customizados
  if (message === '!meubot') {
    room.sendAnnouncement('Ola do meu bot!');
    return false;
  }
};
```

### Bot CIRS Stadium Completo

Ja configurado em `bots/cirs-stadium.js`:

```javascript
// Import handlers completos (inclui commands.cjs)
require('../shared/config/cirs-handlers.cjs');
```

O `cirs-handlers.cjs` ja importa e usa `commands.cjs` automaticamente.

## Proximas Melhorias

- [ ] Tag `[Elo]` no nome do jogador autenticado
- [ ] Comando `/leaderboard` com paginacao
- [ ] Comando `/changepw` para mudar senha na sala
- [ ] Auto-login via Discord (se vinculado)
- [ ] Sistema de achievements
- [ ] Historico de partidas `/matches`
- [ ] Estatisticas por posicao `/positionstats`

// ** \_\_** \_**\_ \_ _
// / _\/ \_**) **\_) )( \
// \_** \_** ) \/ (
// \_/\_(\_\_**(\_**\_|\_\_**/
