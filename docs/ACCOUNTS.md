# Sistema de Contas e Autenticacao CHA

## Visao Geral

O Sistema de Contas CHA permite que jogadores criem contas unificadas que funcionam em todas as salas da CHA. Uma unica conta armazena:

- **Pontos**: Sistema de pontuacao geral
- **Ranking**: Elo baseado em desempenho
- **Moedas**: Moeda virtual para futuras funcionalidades
- **Estatisticas**: Gols, assistencias, defesas, e mais
- **Ratings por Posicao**: Elo separado para GK, DEF, MID, ATA

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                Interface do Usuario                 │
│  ┌────────────────┐         ┌──────────────────┐   │
│  │ Discord Bot    │         │ Sala Haxball     │   │
│  │ (AuthCommands) │         │ (RoomAuthHandler)│   │
│  └────────────────┘         └──────────────────┘   │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│              Camada de Servicos                     │
│  ┌────────────────┐         ┌──────────────────┐   │
│  │  AuthService   │         │    AuthAPI       │   │
│  │  (Logica Core) │         │   (REST API)     │   │
│  └────────────────┘         └──────────────────┘   │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│            Camada de Persistencia                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  auth-client.ts (Database Wrapper)           │  │
│  │  schema-auth.ts (Drizzle ORM Schema)         │  │
│  │  SQLite (haxball.sqlite)                     │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Fluxo de Registro

### Via Discord Bot

1. Usuario envia comando: `!register <nick> <senha>`
2. `AuthCommands` valida parametros
3. `AuthService.register()` e chamado:
   - Valida formato de nick e senha
   - Verifica se nick ja existe
   - Verifica se Discord ID ja esta vinculado
   - Gera salt aleatorio
   - Cria hash da senha usando PBKDF2
   - Salva no banco via `auth-client`
4. Resposta via embed Discord

### Vinculando Discord a Conta Existente

1. Usuario envia: `!linkdiscord <nick> <senha>`
2. Sistema autentica primeiro (login)
3. Se sucesso, vincula Discord ID a conta
4. Usuario pode agora usar `!profile` sem especificar nick

## Fluxo de Login

### Na Sala Haxball

1. Jogador entra na sala
2. Jogador envia: `/login <senha>`
3. `RoomAuthHandler` processa:
   - Usa `player.name` como nick
   - Chama `AuthService.login()`
   - Se sucesso, armazena mapping playerId -> accountId
   - Envia mensagem de boas-vindas com stats
4. Jogador autenticado pode usar comandos:
   - `/profile [nick]` - Ver perfil
   - `/stats` - Ver estatisticas proprias
   - `/logout` - Deslogar

### Via API REST

1. Cliente envia POST para `/api/auth/login`:

   ```json
   {
     "haxballNick": "MeuNick",
     "password": "minhaSenha"
   }
   ```

2. Resposta com token:

   ```json
   {
     "success": true,
     "token": "abc123...",
     "account": { "id": 1, "haxballNick": "MeuNick", ... }
   }
   ```

3. Token pode ser usado para validacao posterior

## Seguranca

### Hash de Senhas

- **Algoritmo**: PBKDF2 com SHA-512
- **Iteracoes**: 100.000
- **Salt**: 16 bytes aleatorios por conta
- **Tamanho do Hash**: 64 bytes (512 bits)

```typescript
// Exemplo simplificado
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
```

### Protecao contra Brute Force

- **Maximo de tentativas**: 5 falhas
- **Janela de tempo**: 15 minutos
- **Acao**: Bloqueia novas tentativas por 15 minutos

### Sessoes

- **Token**: 32 bytes aleatorios (hex)
- **Expiracao**: 7 dias (168 horas)
- **Armazenamento**: Cache em memoria + banco SQLite
- **Cleanup**: Automatico a cada 1 hora

## Schema do Banco de Dados

### player_accounts

```sql
CREATE TABLE player_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT UNIQUE,
  haxball_nick TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  points INTEGER DEFAULT 0 NOT NULL,
  ranking INTEGER DEFAULT 1000 NOT NULL,
  coins INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  last_login INTEGER,
  is_active INTEGER DEFAULT 1 NOT NULL
);
```

### player_sessions

```sql
CREATE TABLE player_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  login_time INTEGER DEFAULT (strftime('%s','now')),
  last_activity INTEGER DEFAULT (strftime('%s','now')),
  room_id INTEGER,
  is_active INTEGER DEFAULT 1 NOT NULL,
  FOREIGN KEY (account_id) REFERENCES player_accounts(id)
);
```

### login_attempts

```sql
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  haxball_nick TEXT NOT NULL,
  timestamp INTEGER DEFAULT (strftime('%s','now')),
  success INTEGER NOT NULL,
  ip_address TEXT
);
```

### points_history

```sql
CREATE TABLE points_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  points_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  timestamp INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (account_id) REFERENCES player_accounts(id)
);
```

### ranking_history

```sql
CREATE TABLE ranking_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  old_ranking INTEGER NOT NULL,
  new_ranking INTEGER NOT NULL,
  reason TEXT NOT NULL,
  timestamp INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (account_id) REFERENCES player_accounts(id)
);
```

### player_ratings (Fase 10)

```sql
CREATE TABLE player_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  overall REAL DEFAULT 1000,
  gk REAL DEFAULT 1000,
  def REAL DEFAULT 1000,
  mid REAL DEFAULT 1000,
  ata REAL DEFAULT 1000,
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (account_id) REFERENCES player_accounts(id)
);
```

## API REST

Base URL: `http://localhost:3001`

### Endpoints Publicos

#### GET /health

Health check do servidor.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-12-10T12:00:00.000Z"
}
```

#### GET /api/profile/:nick

Busca perfil publico de jogador.

**Response:**

```json
{
  "success": true,
  "profile": {
    "id": 1,
    "haxballNick": "TestPlayer",
    "points": 100,
    "ranking": 1200,
    "coins": 50,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-12-10T10:00:00.000Z"
  }
}
```

#### GET /api/ranking/top?by=ranking&limit=10

Lista top jogadores.

**Query Params:**

- `by`: "ranking" ou "pontos" (default: "ranking")
- `limit`: 1-100 (default: 10)

**Response:**

```json
{
  "success": true,
  "players": [
    {
      "haxballNick": "Player1",
      "points": 500,
      "ranking": 1500,
      "coins": 100
    }
    // ...
  ]
}
```

#### GET /api/stats/:nick

Busca estatisticas de jogador.

**Response:**

```json
{
  "success": true,
  "stats": {
    "haxballNick": "TestPlayer",
    "ratings": {
      "overall": 1200,
      "gk": 1100,
      "def": 1150,
      "mid": 1250,
      "ata": 1300
    },
    "general": {
      "goals": 50,
      "assists": 30,
      "saves": 20,
      "touches": 1000,
      "distance": 50000,
      "matchesPlayed": 25
    }
  }
}
```

### Endpoints Privados

#### POST /api/auth/login

Autentica jogador e retorna token.

**Request:**

```json
{
  "haxballNick": "TestPlayer",
  "password": "senha123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "token": "abc123...",
  "account": {
    "id": 1,
    "haxballNick": "TestPlayer",
    "points": 100,
    "ranking": 1200,
    "coins": 50
  }
}
```

#### POST /api/auth/validate

Valida token de sessao.

**Request:**

```json
{
  "token": "abc123..."
}
```

**Response:**

```json
{
  "success": true,
  "session": {
    "accountId": 1,
    "haxballNick": "TestPlayer",
    "loginTime": "2024-12-10T10:00:00.000Z"
  }
}
```

#### POST /api/auth/logout

Invalida token de sessao.

**Request:**

```json
{
  "token": "abc123..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Comandos Discord

Prefixo: `!` (configuravel)

### !register <nick> <senha>

Registra nova conta vinculada ao Discord.

**Exemplo:**

```
!register MeuNick senha123
```

**Resposta:** Embed com confirmacao e dados iniciais.

### !linkdiscord <nick> <senha>

Vincula Discord a conta existente.

**Exemplo:**

```
!linkdiscord MeuNick senha123
```

### !profile [nick]

Mostra perfil publico. Se nick nao especificado, mostra perfil proprio (se vinculado).

**Exemplo:**

```
!profile
!profile OutroJogador
```

### !ranking [nick]

Mostra posicao no ranking. Se nick nao especificado, mostra ranking proprio.

**Exemplo:**

```
!ranking
!ranking OutroJogador
```

### !top [pontos|ranking]

Lista top 10 jogadores.

**Exemplo:**

```
!top
!top pontos
!top ranking
```

### !authhelp

Mostra lista de comandos de autenticacao.

## Comandos na Sala Haxball

### /login <senha>

Autentica na sala usando nick atual e senha.

**Exemplo:**

```
/login senha123
```

**Resposta:** Mensagem de boas-vindas com pontos, ranking e moedas.

### /logout

Desautentica da sala.

### /profile [nick]

Mostra perfil publico. Se nick nao especificado, mostra perfil proprio (se autenticado).

### /stats

Mostra estatisticas proprias (requer autenticacao).

## Integracao com Bots de Sala

Para integrar o sistema de autenticacao em um bot Haxball:

```javascript
// No inicio do script do bot
const { RoomAuthHandler } = require('./auth/RoomAuthHandler');
const authHandler = new RoomAuthHandler();

// Registra handlers
authHandler.registerHandlers(room);

// Verifica se jogador esta autenticado
const isAuth = authHandler.isAuthenticated(player.id);

// Pega account ID
const accountId = authHandler.getAccountId(player.id);

// Pega conta completa
const account = authHandler.getAccount(player.id);
```

## Migracao de Usuarios Existentes

Para migrar usuarios existentes da tabela `users` para `player_accounts`:

```sql
-- Script de migracao (executar manualmente se necessario)
INSERT INTO player_accounts (discord_id, haxball_nick, password_hash, salt, points, ranking, coins)
SELECT
  discord_id,
  name as haxball_nick,
  'PENDENTE' as password_hash,  -- Usuario precisa resetar senha
  '' as salt,
  0 as points,
  1000 as ranking,
  0 as coins
FROM users
WHERE discord_id NOT IN (SELECT discord_id FROM player_accounts WHERE discord_id IS NOT NULL);
```

Usuarios migrados precisarao criar uma senha usando `!register` ou `!linkdiscord`.

## Configuracao

Para habilitar o sistema de autenticacao:

### 1. Inicializar Banco de Dados

```typescript
import { initAuthDb } from './database/auth-client';

// No startup do servidor
initAuthDb('./haxball.sqlite');
```

### 2. Adicionar Comandos ao ControlPanel

```typescript
import { AuthCommands } from './auth/AuthCommands';

// No construtor do ControlPanel
this.authCommands = new AuthCommands();
this.authCommands.startSessionCleanup();

// No metodo command(), antes de outros comandos
const handled = await this.authCommands.handleCommand(command, args, msg, channel);
if (handled) return;
```

### 3. Iniciar API REST (opcional)

```typescript
import { AuthAPI } from './auth/AuthAPI';

// No startup do servidor
const api = new AuthAPI(3001);
api.start();
```

### 4. Integrar RoomAuthHandler nos Bots

```typescript
// Em cada bot que quiser autenticacao
const authHandler = new RoomAuthHandler();
authHandler.registerHandlers(room);
```

## Testes

```bash
# Rodar todos os testes
npm test

# Rodar testes do AuthService
npm test -- AuthService.test.ts

# Rodar com coverage
npm run test:coverage
```

## Proximos Passos (Fase 10 e 11)

- [ ] Sistema de balanceamento hibrido baseado em Elo por posicao
- [ ] Coleta automatica de stats avancadas (toques, heatmap, passes)
- [ ] Algoritmo de Elo dinamico com decay temporal
- [ ] Integracao com machine learning para predicoes
- [ ] Dashboard web para visualizacao de stats

---

**Versao:** 5.1.0 (Fase 9 - Sistema de Contas)

// ** \_\_** \_**\_ \_ _
// / _\/ \_**) **\_) )( \
// \_** \_** ) \/ (
// \_/\_(\_\_**(\_**\_|\_\_**/
