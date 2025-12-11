# Guia de Integracao do Sistema de Autenticacao CIRS

## Inicio Rapido

### 1. Habilitar Autenticacao no ControlPanel

Edite `src/ControlPanel.ts` para adicionar suporte aos comandos de autenticacao:

```typescript
import { AuthCommands } from './auth/AuthCommands';

export class ControlPanel {
  private authCommands: AuthCommands;

  constructor(private server: Server, config: PanelConfig, private fileName?: string) {
    // ... codigo existente ...

    // Adicione ao final do construtor:
    this.authCommands = new AuthCommands();
    this.authCommands.startSessionCleanup(); // Limpa sessoes expiradas a cada 1h
  }

  private async command(msg: Discord.Message): Promise<void> {
    // ... codigo existente de parsing ...

    // ADICIONE ANTES DOS COMANDOS EXISTENTES:
    const handled = await this.authCommands.handleCommand(command, args, msg, channel);
    if (handled) return;

    // ... resto dos comandos (help, info, open, etc) ...
  }
}
```

### 2. Habilitar Autenticacao nas Salas

#### Opcao A: Integrar em Bot Existente

Edite seu script de bot (ex: `bots/futsal-example.js`):

```javascript
// No inicio do arquivo
const { RoomAuthHandler } = require('../src/auth/RoomAuthHandler');

// Dentro da funcao init ou setup
function init() {
  const room = HBInit({
    /* config */
  });

  // Criar handler de autenticacao
  const authHandler = new RoomAuthHandler();
  authHandler.registerHandlers(room);

  // Agora seus outros handlers podem verificar autenticacao:
  room.onPlayerChat = (player, message) => {
    // Verifica se jogador esta autenticado
    if (authHandler.isAuthenticated(player.id)) {
      const account = authHandler.getAccount(player.id);
      console.log(`Jogador autenticado: ${account.haxballNick}`);
    }

    // ... resto da logica ...
  };
}
```

#### Opcao B: Criar Novo Bot com Auth

```javascript
// bots/auth-bot.js
const { RoomAuthHandler } = require('../src/auth/RoomAuthHandler');

module.exports = {
  init: function (HBInit, customSettings) {
    const room = HBInit({
      roomName: customSettings.roomName || 'Sala com Auth',
      maxPlayers: customSettings.maxPlayers || 10,
      token: customSettings.token,
    });

    const authHandler = new RoomAuthHandler();
    authHandler.registerHandlers(room);

    room.onPlayerJoin = (player) => {
      room.sendAnnouncement(
        `Bem-vindo ${player.name}! Use /login <senha> para autenticar.`,
        player.id,
        0x00ff00,
        'normal',
        1
      );
    };

    room.onPlayerChat = (player, message) => {
      // Comandos personalizados apenas para autenticados
      if (message === '!stats-detalhadas') {
        if (!authHandler.isAuthenticated(player.id)) {
          room.sendAnnouncement(
            'Voce precisa estar autenticado para usar este comando.',
            player.id,
            0xff0000
          );
          return false;
        }

        const account = authHandler.getAccount(player.id);
        // ... mostrar stats detalhadas ...
        return false; // Nao mostra no chat
      }

      return true; // Permite outros handlers
    };

    return room;
  },
};
```

### 3. Habilitar API REST (Opcional)

Edite `src/main.ts` para iniciar a API:

```typescript
import { AuthAPI } from './auth/AuthAPI';

// No comando 'open' ou no startup principal:
async function startServer(config: any) {
  // ... codigo existente ...

  // Inicia API REST na porta 3001
  const authAPI = new AuthAPI(3001);
  authAPI.start();

  console.log('[AUTH] API REST disponivel em http://localhost:3001');
}
```

## Comandos Disponiveis

### Discord

- `!register <nick> <senha>` - Criar conta
- `!linkdiscord <nick> <senha>` - Vincular Discord
- `!profile [nick]` - Ver perfil
- `!ranking [nick]` - Ver ranking
- `!top [pontos|ranking]` - Top 10
- `!authhelp` - Ajuda

### Sala Haxball

- `/login <senha>` - Autenticar
- `/logout` - Desautenticar
- `/profile [nick]` - Ver perfil
- `/stats` - Ver suas stats

### API REST

- `GET /api/profile/:nick` - Perfil publico
- `GET /api/ranking/top?by=ranking&limit=10` - Top jogadores
- `GET /api/stats/:nick` - Stats do jogador
- `POST /api/auth/login` - Login (retorna token)
- `POST /api/auth/validate` - Validar token
- `POST /api/auth/logout` - Logout

## Exemplos de Uso Avancado

### Auto-Login via Discord

Quando jogador entra na sala, auto-autentica se Discord vinculado:

```javascript
const { getAuthDb } = require('../src/database/auth-client');
const db = getAuthDb();

room.onPlayerJoin = (player) => {
  // Busca conta por nick
  const account = db.getAccountByNick(player.name);

  if (account && account.discordId) {
    // Se tem Discord vinculado, auto-autentica
    authHandler.authenticatePlayer(player.id, account.id);
    room.sendAnnouncement(
      `Bem-vindo de volta, ${player.name}! (Auto-login via Discord)`,
      player.id,
      0x00ff00
    );
  }
};
```

### Balanceamento por Elo

```javascript
room.onPlayerJoin = (player) => {
  const account = authHandler.getAccount(player.id);

  if (account) {
    // Usa ranking para balancear times
    const elo = account.ranking;
    // ... logica de balanceamento ...
  }
};
```

### Sistema de Recompensas

```javascript
room.onTeamGoal = (team) => {
  const players = room.getPlayerList().filter((p) => p.team === team);

  players.forEach((player) => {
    if (authHandler.isAuthenticated(player.id)) {
      const accountId = authHandler.getAccountId(player.id);

      // Adiciona pontos por gol do time
      db.updatePoints(accountId, account.points + 10, 'Gol do time');
    }
  });
};
```

### Restricao por Ranking

```javascript
room.onPlayerJoin = (player) => {
  // Sala apenas para jogadores com ranking alto
  const account = db.getAccountByNick(player.name);

  if (!account || account.ranking < 1200) {
    room.kickPlayer(player.id, 'Ranking minimo: 1200', false);
  }
};
```

## Migracao de Dados Existentes

Se voce ja tem usuarios na tabela `users`, migre para `player_accounts`:

```sql
-- Script de migracao manual (executar no SQLite)
INSERT INTO player_accounts (discord_id, haxball_nick, password_hash, salt, points, ranking, coins)
SELECT
  discord_id,
  name as haxball_nick,
  'RESET_REQUIRED' as password_hash,
  '' as salt,
  0 as points,
  1000 as ranking,
  0 as coins
FROM users
WHERE discord_id NOT IN (
  SELECT discord_id
  FROM player_accounts
  WHERE discord_id IS NOT NULL
);
```

Usuarios migrados precisarao criar senha com `!register` ou `!linkdiscord`.

## Solucao de Problemas

### Erro: "DB not initialized"

Certifique-se de chamar `initAuthDb()` no startup:

```typescript
import { initAuthDb } from './database/auth-client';
initAuthDb('./haxball.sqlite');
```

### Token expira muito rapido

Ajuste configuracao do AuthService:

```typescript
const authService = new AuthService({
  tokenExpirationHours: 336, // 14 dias
});
```

### Muitas tentativas de login falhadas

Ajuste limites:

```typescript
const authService = new AuthService({
  maxLoginAttempts: 10,
  lockoutDurationMinutes: 30,
});
```

## Proximos Passos

- **Fase 10**: Sistema de balanceamento hibrido com Elo por posicao
- **Fase 11**: Stats avancadas (heatmap, passes, interceptacoes)
- **Fase 12**: Dashboard web para visualizacao

---

Para mais detalhes, consulte `docs/ACCOUNTS.md`.

// ** \_\_** \_**\_ \_ _
// / _\/ \_**) **\_) )( \
// \_** \_** ) \/ (
// \_/\_(\_\_**(\_**\_|\_\_**/
