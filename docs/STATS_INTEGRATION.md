# Sistema de Estatisticas - Integracao

## Visao Geral

O sistema de estatisticas do Haxball Server foi completamente integrado para capturar, processar e armazenar dados de partidas automaticamente. Todas as estatisticas sao salvas no banco de dados SQLite e podem ser consultadas via comandos ou API.

## Arquitetura

### Componentes Principais

1. **StatsCollector** (`src/stats/StatsCollector.ts`)

   - Coleta eventos durante a partida em tempo real
   - Rastreia toques, gols, assists, posicoes e outras metricas
   - Gera estatisticas basicas e avancadas ao final da partida

2. **StatsService** (`src/stats/StatsService.ts`)

   - Gerencia persistencia no banco de dados
   - Fornece metodos para salvar e consultar estatisticas
   - Integra com AuthService e BalanceService

3. **StatsCalculator** (`src/stats/StatsCalculator.ts`)

   - Calcula agregacoes e metricas derivadas
   - Gera heatmaps e tendencias
   - Compara performance entre jogadores

4. **RoomAuthHandler** (`src/auth/RoomAuthHandler.ts`)
   - Gerencia autenticacao de jogadores na sala
   - Mapeia playerId -> accountId para vincular stats
   - Fornece metodos para verificar autenticacao

## Fluxo de Captura

### 1. Inicio da Partida (onGameStart)

```javascript
room.onGameStart = function (byPlayer) {
  // Cria novo StatsCollector com ID unico
  gameState.matchId = Date.now();
  statsCollector = new StatsCollector(gameState.matchId, true); // true = stats avancadas

  // Registra jogadores autenticados
  const players = room.getPlayerList().filter((p) => p.team !== 0);
  for (const player of players) {
    if (authHandler.isAuthenticated(player.id)) {
      const account = authHandler.getAuthenticatedPlayer(player.id);
      const team = player.team === 1 ? 'red' : 'blue';
      statsCollector.registerPlayer(account.id, player.name, team);
    }
  }
};
```

### 2. Durante a Partida

#### Rastreamento de Toques (onPlayerBallKick)

```javascript
room.onPlayerBallKick = function (player) {
  gameState.lastBallTouch = {
    playerId: player.id,
    team: player.team,
    time: Date.now(),
  };

  if (authHandler.isAuthenticated(player.id)) {
    const account = authHandler.getAuthenticatedPlayer(player.id);
    statsCollector.trackTouch(account.id, Date.now());
  }
};
```

#### Rastreamento de Gols (onTeamGoal)

```javascript
room.onTeamGoal = function (team) {
  if (gameState.lastBallTouch && gameState.lastBallTouch.team === team) {
    const scorerId = gameState.lastBallTouch.playerId;
    if (authHandler.isAuthenticated(scorerId)) {
      const account = authHandler.getAuthenticatedPlayer(scorerId);
      statsCollector.trackGoal(account.id, Date.now(), false);
    }
  }
};
```

### 3. Final da Partida (onTeamVictory)

```javascript
room.onTeamVictory = function(scores) {
  const winningTeam = scores.red > scores.blue ? 'red' : 'blue';

  // Finaliza coleta
  statsCollector.endMatch(winningTeam);

  // Obtem estatisticas
  const summary = statsCollector.getSummary();

  // Salva no banco
  for (const basicStats of summary.basicStats) {
    await statsService.saveBasicStats(basicStats);
  }

  for (const advStats of summary.advancedStats) {
    await statsService.saveAdvancedStats(advStats);
  }

  // Limpa collector
  statsCollector = null;
};
```

## Tipos de Estatisticas

### Estatisticas Basicas (BasicMatchStats)

Capturadas em todas as partidas:

- **accountId**: ID da conta do jogador
- **matchId**: ID unico da partida
- **goals**: Gols marcados
- **assists**: Assistencias
- **saves**: Defesas
- **ownGoals**: Gols contra
- **touches**: Toques na bola
- **timeInGame**: Tempo jogado (segundos)
- **team**: Time ('red' | 'blue' | 'spectator')
- **won**: Resultado (vitoria = true)

### Estatisticas Avancadas (AdvancedMatchStats)

Incluem tudo das basicas, mais:

- **passes**: Total de passes
- **passesCompleted**: Passes completados
- **interceptions**: Interceptacoes
- **tackles**: Desarmes
- **possessionTime**: Tempo de posse (ms)
- **distanceCovered**: Distancia percorrida
- **topSpeed**: Velocidade maxima
- **averageSpeed**: Velocidade media
- **shotsOnGoal**: Chutes no gol
- **shotsOffGoal**: Chutes fora
- **timesDispossessed**: Vezes desarmado

## Banco de Dados

### Tabelas Utilizadas

#### `stats` (Estatisticas Basicas)

```sql
CREATE TABLE stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matchId INTEGER NOT NULL,
  accountId INTEGER NOT NULL,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  touches INTEGER DEFAULT 0,
  distance REAL DEFAULT 0
);
```

#### `advanced_stats` (Estatisticas Avancadas)

```sql
CREATE TABLE advanced_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matchId INTEGER NOT NULL,
  accountId INTEGER NOT NULL,
  -- ... todos os campos de AdvancedMatchStats
);
```

#### `player_positions` (Rastreamento de Posicao)

```sql
CREATE TABLE player_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matchId INTEGER NOT NULL,
  accountId INTEGER NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  timestamp INTEGER NOT NULL
);
```

#### `heatmap_data` (Dados de Heatmap)

```sql
CREATE TABLE heatmap_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matchId INTEGER NOT NULL,
  accountId INTEGER NOT NULL,
  gridSize INTEGER NOT NULL,
  densityMap TEXT NOT NULL, -- JSON
  minX REAL, maxX REAL, minY REAL, maxY REAL
);
```

## Integracao em Novos Bots

Para adicionar captura de estatisticas em uma nova sala:

### 1. Importar Modulos

```javascript
const { authHandler } = require('../../shared/config/commands.cjs');

let StatsCollector, StatsService, StatsCalculator;
let statsCollector, statsService;

try {
  const { StatsCollector: SC } = require('../../dist/stats/StatsCollector');
  const { StatsService: SS } = require('../../dist/stats/StatsService');
  const { StatsCalculator: SCalc } = require('../../dist/stats/StatsCalculator');

  StatsCollector = SC;
  StatsService = SS;
  StatsCalculator = SCalc;

  const authDb = require('../../dist/database/auth-client').getAuthDb();
  const calculator = new StatsCalculator();
  statsService = new StatsService(authDb, calculator);

  console.log('[STATS] Sistema de estatisticas carregado');
} catch (error) {
  console.error('[STATS] Erro ao carregar stats:', error.message);
}
```

### 2. Inicializar no onGameStart

```javascript
room.onGameStart = function (byPlayer) {
  if (StatsCollector) {
    const matchId = Date.now();
    statsCollector = new StatsCollector(matchId, true);

    // Registrar jogadores
    const players = room.getPlayerList().filter((p) => p.team !== 0);
    for (const player of players) {
      if (authHandler?.isAuthenticated(player.id)) {
        const account = authHandler.getAuthenticatedPlayer(player.id);
        if (account?.id) {
          const team = player.team === 1 ? 'red' : 'blue';
          statsCollector.registerPlayer(account.id, player.name, team);
        }
      }
    }
  }
};
```

### 3. Rastrear Eventos

```javascript
// Toques
room.onPlayerBallKick = function (player) {
  if (statsCollector && authHandler?.isAuthenticated(player.id)) {
    const account = authHandler.getAuthenticatedPlayer(player.id);
    if (account?.id) {
      statsCollector.trackTouch(account.id, Date.now());
    }
  }
};

// Gols
room.onTeamGoal = function (team) {
  if (statsCollector && gameState.lastBallTouch?.team === team) {
    const playerId = gameState.lastBallTouch.playerId;
    if (authHandler?.isAuthenticated(playerId)) {
      const account = authHandler.getAuthenticatedPlayer(playerId);
      if (account?.id) {
        statsCollector.trackGoal(account.id, Date.now(), false);
      }
    }
  }
};
```

### 4. Salvar no Final

```javascript
room.onTeamVictory = function (scores) {
  if (statsCollector && statsService) {
    const winningTeam = scores.red > scores.blue ? 'red' : 'blue';
    statsCollector.endMatch(winningTeam);

    const summary = statsCollector.getSummary();

    // Salvar stats
    for (const stats of summary.basicStats) {
      statsService.saveBasicStats(stats).catch(console.error);
    }

    if (summary.advancedStats) {
      for (const stats of summary.advancedStats) {
        statsService.saveAdvancedStats(stats).catch(console.error);
      }
    }

    statsCollector = null;
  }
};
```

## Consulta de Estatisticas

### Via Comandos no Jogo

Jogadores podem usar:

- `!stats` - Ver suas proprias estatisticas
- `!profile [nick]` - Ver perfil de outro jogador
- `!ranking [nick]` - Ver posicao no ranking
- `!top` - Ver top 10 jogadores

### Via API (StatsService)

```typescript
// Buscar stats basicas
const stats = await statsService.getBasicStats({
  accountId: 123,
  limit: 10,
});

// Buscar stats avancadas
const advStats = await statsService.getAdvancedStats({
  accountId: 123,
  matchId: 456,
});

// Calcular agregacao
const aggregate = await statsService.getAggregateStats({
  accountId: 123,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});

// Gerar heatmap
const heatmap = await statsService.getHeatmap(123, 456);
```

## Troubleshooting

### Stats nao estao sendo salvas

1. **Verificar autenticacao**: Jogador precisa estar logado com `!login <senha>`
2. **Verificar logs**: Console deve mostrar `[STATS] Jogador X registrado no time Y`
3. **Verificar banco**: `SELECT * FROM stats ORDER BY id DESC LIMIT 10;`

### Gols nao sendo rastreados

1. Verificar se `gameState.lastBallTouch` esta sendo atualizado no `onPlayerBallKick`
2. Verificar se jogador que tocou na bola esta autenticado
3. Verificar se time do ultimo toque coincide com time que marcou

### Erros ao compilar

```bash
npm run build
```

Se houver erros de tipo, verificar se:

- `StatsCollector` esta importado corretamente
- Metodo `getAuthenticatedPlayer` existe no `RoomAuthHandler`
- Banco de dados tem as tabelas necessarias

## Performance

### Recomendacoes

- **Stats Avancadas**: Ativar apenas em salas competitivas (impacto minimo mas existe)
- **Posicoes**: Coletar a cada 1 segundo (nao a cada frame)
- **Batch Inserts**: StatsService ja usa inserts em lote para eficiencia
- **Cache**: StatsCalculator cacheia resultados por 5 minutos

### Metricas Tipicas

- **Overhead por partida**: ~5-10ms de processamento total
- **Espaco no banco**: ~1-2 KB por jogador por partida (basico), ~5-10 KB (avancado)
- **Memoria**: ~100 KB por partida ativa sendo rastreada

## Proximos Passos

- [ ] Implementar rastreamento de assists (segundo ultimo toque)
- [ ] Adicionar deteccao de defesas (bola indo para gol interceptada)
- [ ] Criar dashboard web de estatisticas em tempo real
- [ ] Implementar sistema de conquistas baseado em stats
- [ ] Exportar stats para formato CSV/JSON via comando

---

**Ultima atualizacao**: Dezembro 2024  
**Mantenedor**: CIRS Community

<!--
   __  ____ ____ _  _
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/
-->
