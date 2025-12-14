# Sistema de Estatisticas - Fase 11

## Panorama Geral

Sistema completo de coleta, calculo e armazenamento de estatisticas de jogadores e partidas no Haxball Server. Integrado com sistemas de autenticacao (Fase 9) e balanceamento Elo (Fase 10).

## Arquitetura

### Componentes Principais

1. **StatsCollector**: Coleta em tempo real durante partidas
2. **StatsCalculator**: Calculos de metricas derivadas
3. **StatsService**: Persistencia e integracao com banco
4. **StatsCacheService**: Cache em memoria para performance
5. **StatsCommands**: Comandos Discord
6. **StatsAPI**: Endpoints REST

### Fluxo de Dados

```
Partida Ativa
    |
    v
StatsCollector (tempo real)
    |
    | finalize()
    v
StatsService.processCompleteMatch()
    |
    +-> Salva basicStats
    +-> Salva advancedStats
    +-> Salva positions
    +-> Gera e salva heatmap
    +-> Salva eventos
    +-> Atualiza agregados
    |
    v
StatsCacheService (invalidacao)
    |
    v
Disponivel via Commands/API
```

## Tabelas do Banco

### advanced_stats

```sql
CREATE TABLE advanced_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  own_goals INTEGER DEFAULT 0,
  touches INTEGER DEFAULT 0,
  passes INTEGER DEFAULT 0,
  passes_completed INTEGER DEFAULT 0,
  interceptions INTEGER DEFAULT 0,
  tackles INTEGER DEFAULT 0,
  possession_time REAL DEFAULT 0,
  distance_covered REAL DEFAULT 0,
  top_speed REAL DEFAULT 0,
  average_speed REAL DEFAULT 0,
  shots_on_goal INTEGER DEFAULT 0,
  shots_off_goal INTEGER DEFAULT 0,
  times_dispossessed INTEGER DEFAULT 0,
  time_in_game REAL DEFAULT 0,
  team TEXT DEFAULT 'spectator',
  won INTEGER DEFAULT 0
);
```

### player_positions

```sql
CREATE TABLE player_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### heatmap_data

```sql
CREATE TABLE heatmap_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  grid_size INTEGER NOT NULL,
  density_map TEXT NOT NULL, -- JSON
  min_x REAL NOT NULL,
  max_x REAL NOT NULL,
  min_y REAL NOT NULL,
  max_y REAL NOT NULL
);
```

### player_stats_aggregate

```sql
CREATE TABLE player_stats_aggregate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER UNIQUE NOT NULL,
  total_matches INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_draws INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0,
  total_goals INTEGER DEFAULT 0,
  total_assists INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_own_goals INTEGER DEFAULT 0,
  avg_goals_per_match REAL DEFAULT 0,
  avg_assists_per_match REAL DEFAULT 0,
  avg_saves_per_match REAL DEFAULT 0,
  total_passes INTEGER,
  pass_accuracy REAL,
  total_interceptions INTEGER,
  total_distance_covered REAL,
  avg_speed REAL,
  first_match_date DATETIME,
  last_match_date DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Metricas Coletadas

### Basicas (BasicMatchStats)

- **goals**: Gols marcados
- **assists**: Assistencias
- **saves**: Defesas
- **ownGoals**: Gols contra
- **touches**: Toques na bola
- **timeInGame**: Tempo em jogo (segundos)
- **team**: Time ('red' | 'blue' | 'spectator')
- **won**: Vitoria (boolean)

### Avancadas (AdvancedMatchStats)

Inclui todas as basicas mais:

- **passes / passesCompleted**: Passes totais e completos
- **interceptions**: Interceptacoes
- **tackles**: Desarmes
- **possessionTime**: Tempo com posse de bola (segundos)
- **distanceCovered**: Distancia percorrida (unidades Haxball)
- **topSpeed / averageSpeed**: Velocidades maxima e media
- **shotsOnGoal / shotsOffGoal**: Chutes dentro/fora do gol
- **timesDispossessed**: Vezes que perdeu a bola

### Agregadas (PlayerStatsAggregate)

- **totalMatches / totalWins / totalLosses / totalDraws**
- **winRate**: Taxa de vitoria (0-1)
- **totalGoals / totalAssists / totalSaves / totalOwnGoals**
- **avgGoalsPerMatch / avgAssistsPerMatch / avgSavesPerMatch**
- **totalPasses / passAccuracy**: Passes totais e precisao (0-1)
- **totalInterceptions / totalDistanceCovered / avgSpeed**
- **firstMatchDate / lastMatchDate / updatedAt**

## Uso do StatsCollector

### Inicializacao

```typescript
import { StatsCollector } from './stats/StatsCollector';

const collector = new StatsCollector(matchId, {
  enableBasicStats: true,
  enableAdvancedStats: true,
  enablePositionTracking: true,
  positionSamplingRate: 10, // 10Hz
});
```

### Durante a Partida

```typescript
// Inicializa jogadores
collector.initializePlayer(accountId, 'red');

// Registra eventos
collector.recordGoal(accountId);
collector.recordAssist(accountId);
collector.recordSave(accountId);
collector.recordPass(accountId, completed);
collector.recordShot(accountId, onGoal);
collector.recordInterception(accountId);

// Rastreia posicao
collector.recordPosition(accountId, x, y);

// Atualiza metricas
collector.updateTimeInGame(accountId, seconds);
collector.updateSpeed(accountId, speed);
```

### Finalizacao

```typescript
const dataset = collector.finalize();
// dataset.basicStats: BasicMatchStats[]
// dataset.advancedStats: AdvancedMatchStats[]
// dataset.events: MatchEvent[]
// dataset.positions: Map<accountId, Position2D[]>
```

## Uso do StatsService

### Salvar Stats Completas

```typescript
import { StatsService } from './stats/StatsService';
import { StatsCalculator } from './stats/StatsCalculator';

const calculator = new StatsCalculator();
const service = new StatsService(database, calculator, balanceService);

// Apos finalizar coleta
const dataset = collector.finalize();

await service.processCompleteMatch(
  dataset.basicStats,
  dataset.advancedStats,
  dataset.positions,
  dataset.events
);
```

### Consultar Stats

```typescript
// Agregado de jogador
const aggregate = await service.getPlayerAggregate(accountId);

// Historico de partidas
const matches = await service.getAdvancedStats({
  accountIds: [accountId],
  limit: 10,
});

// Heatmap de partida especifica
const heatmap = await service.getHeatmap(matchId, accountId);

// Top jogadores por metrica
const topScorers = await service.getTopPlayers('totalGoals', 10);
```

### Filtros Avancados

```typescript
const results = await service.getAdvancedStats({
  accountIds: [100, 101],
  matchIds: [1, 2, 3],
  team: 'red',
  won: true,
  minGoals: 2,
  minAssists: 1,
  limit: 50,
  offset: 0,
});
```

## Calculos Derivados

### Performance Rating (0-10)

```typescript
const rating = calculator.calculatePerformanceRating(advancedStats);
```

Formula ponderada:

- Gols: +0.5 cada
- Assistencias: +0.3 cada
- Defesas: +0.2 cada
- Precisao de passe: +1.0 (0-1)
- Interceptacoes: +0.15 cada
- Chutes no gol: +0.1 cada
- Gols contra: -1.0 cada
- Perdas de bola: -0.05 cada

### Heatmap

```typescript
const heatmap = calculator.calculateHeatmap(
  accountId,
  matchId,
  positions,
  20 // gridSize
);
```

Gera matriz `gridSize x gridSize` com densidade normalizada (0-1).

### Tendencia de Performance

```typescript
const ratings = [5.2, 5.8, 6.1, 6.5, 7.0];
const trend = calculator.calculatePerformanceTrend(ratings);
// 'improving' | 'stable' | 'declining'
```

Usa regressao linear. Slope > 0.1: improving, < -0.1: declining.

### Comparacao entre Jogadores

```typescript
const comparison = calculator.comparePlayer(aggregate1, aggregate2);
```

Retorna objeto com diferencas:

```typescript
{
  winRate: number;
  avgGoals: number;
  avgAssists: number;
  avgSaves: number;
  passAccuracy?: number;
}
```

## Comandos Discord

### !stats `<player>`

Mostra estatisticas gerais de jogador:

```
Estatisticas: Player Name
Partidas: 50
Vitorias: 30 (60.0%)
Derrotas: 20
Gols: 75
Assistencias: 40
Defesas: 15
Media de Gols: 1.50
Media de Assistencias: 0.80
Media de Defesas: 0.30
Precisao de Passe: 82.5%
Velocidade Media: 15.2
Distancia Total: 125.50 km
```

### !mystats

Mostra proprias stats (requer conta linkada via !register).

### !compare `<player1>` `<player2>`

Compara dois jogadores:

```
Comparacao: Player1 vs Player2
Partidas: 50 vs 45 (+5)
Taxa de Vitoria: 60.0% vs 55.5% (+4.5%)
Gols Totais: 75 vs 60 (+15)
Assistencias Totais: 40 vs 50 (-10)
Media de Gols: 1.50 vs 1.33 (+0.17)
```

### !top `<metric>` `[limit]`

Top jogadores por metrica (max 25):

- `goals`: Total de gols
- `assists`: Total de assistencias
- `saves`: Total de defesas
- `winrate`: Taxa de vitoria
- `matches`: Numero de partidas

Exemplo:

```
Top Artilheiros
1. Player1: 150 gols (2.5/partida)
2. Player2: 120 gols (2.0/partida)
3. Player3: 100 gols (1.8/partida)
```

### !recent `<player>` `[limit]`

Ultimas partidas de jogador (max 10):

```
Ultimas partidas: Player Name
Match #45 [V] Time V
Gols: 3 | Assists: 1 | Defesas: 0
Passes: 18/20 | Distancia: 5.20km

Match #44 [D] Time A
Gols: 0 | Assists: 2 | Defesas: 5
Passes: 15/18 | Distancia: 4.80km
```

## API REST

### GET `/stats/player/:accountId`

Retorna agregado completo do jogador.

**Response:**

```json
{
  "accountId": 100,
  "totalMatches": 50,
  "totalWins": 30,
  "winRate": 0.6,
  "totalGoals": 75,
  "avgGoalsPerMatch": 1.5,
  ...
}
```

### GET `/stats/player/:accountId/matches?limit=10&offset=0`

Historico de partidas paginado.

**Response:**

```json
{
  "matches": [...],
  "total": 50
}
```

### GET `/stats/player/:accountId/heatmap/:matchId`

Heatmap de partida especifica.

**Response:**

```json
{
  "accountId": 100,
  "matchId": 1,
  "gridSize": 20,
  "densityMap": [[0.1, 0.3, ...], ...],
  "minX": -100,
  "maxX": 100,
  "minY": -50,
  "maxY": 50
}
```

### GET `/stats/match/:matchId`

Stats de todos jogadores em partida.

**Response:**

```json
{
  "matchId": 1,
  "players": [...]
}
```

### GET `/stats/top/:metric?limit=10`

Top jogadores por metrica.

**Metricas validas:**

- `totalGoals`
- `totalAssists`
- `totalSaves`
- `winRate`
- `totalMatches`
- `passAccuracy`
- `avgSpeed`

**Response:**

```json
{
  "metric": "totalGoals",
  "limit": 10,
  "players": [...]
}
```

### POST `/stats/compare`

Compara dois jogadores.

**Body:**

```json
{
  "accountId1": 100,
  "accountId2": 101
}
```

**Response:**

```json
{
  "player1": {...},
  "player2": {...},
  "difference": {
    "winRate": 0.05,
    "avgGoals": 0.2,
    ...
  }
}
```

### GET `/stats/search`

Busca com filtros avancados.

**Query Parameters:**

- `accountIds`: CSV de IDs (ex: `1,2,3`)
- `matchIds`: CSV de match IDs
- `minGoals`: Minimo de gols
- `minAssists`: Minimo de assistencias
- `team`: `red` | `blue` | `spectator`
- `won`: `true` | `false`
- `limit`: Limite de resultados (default 50)
- `offset`: Offset para paginacao (default 0)

### GET `/stats/player/:accountId/trend?lastMatches=20`

Tendencia de performance.

**Response:**

```json
{
  "accountId": 100,
  "lastMatches": 20,
  "trend": "improving",
  "recentAverage": 6.5,
  "ratings": [5.2, 5.5, 6.0, 6.3, 6.8, ...],
  "aggregate": {...}
}
```

## Cache

### Estrategia

- **TTL padrao**: 5 minutos
- **Agregados**: Armazenados por `accountId`
- **Heatmaps**: Armazenados por `matchId:accountId`
- **Limpeza automatica**: A cada 1 minuto

### Invalidacao

```typescript
// Invalida agregado especifico
cache.invalidateAggregate(accountId);

// Invalida heatmap especifico
cache.invalidateHeatmap(matchId, accountId);

// Invalida todos os dados de jogador
cache.invalidatePlayer(accountId);

// Invalida todos os dados de partida
cache.invalidateMatch(matchId);

// Limpa todo o cache
cache.clear();
```

### Estatisticas

```typescript
const stats = cache.getStats();
// { aggregates: 150, heatmaps: 300, totalEntries: 450 }
```

## Integracao com Sistema de Balanceamento (Fase 10)

### Performance Tracking

O StatsService pode ser integrado ao BalanceService para alimentar o PerformanceTracker:

```typescript
const balanceService = new BalanceService(database);
const statsService = new StatsService(database, calculator, balanceService);

// Apos partida, stats sao usadas para atualizar Elo
await statsService.updateRatingAfterMatch(advancedStats);
```

### Fluxo Integrado

1. Partida finaliza -> StatsCollector.finalize()
2. StatsService.processCompleteMatch() salva stats
3. StatsService calcula performance rating
4. BalanceService.recordMatchResult() atualiza Elo
5. PerformanceTracker.updatePerformance() ajusta K-factor

## Integracao com Sistema de Auth (Fase 9)

### Linkagem de Contas

StatsCommands usa AuthService para resolver nomes de jogadores:

```typescript
const account = await authService.getAccountByName(playerName);
const aggregate = await statsService.getPlayerAggregate(account.id);
```

### Comandos Autenticados

`!mystats` requer conta linkada via Discord:

```typescript
const account = await authService.getAccountByDiscordId(discordId);
if (!account) {
  await message.reply('Voce ainda nao possui uma conta. Use !register');
  return;
}
```

## Exemplos de Uso Completo

### Bot de Futsal com Stats

```typescript
// Inicializa sistemas
const authService = new AuthService(db);
const balanceService = new BalanceService(db);
const calculator = new StatsCalculator();
const statsService = new StatsService(db, calculator, balanceService);
const cache = new StatsCacheService();

// Durante partida
const collector = new StatsCollector(matchId, {
  enableAdvancedStats: true,
  enablePositionTracking: true,
  positionSamplingRate: 10,
});

room.onPlayerJoin = (player) => {
  const account = authService.getAccountByName(player.name);
  if (account) {
    collector.initializePlayer(account.id, getPlayerTeam(player));
  }
};

room.onPlayerBallKick = (player) => {
  const account = getAccount(player);
  collector.recordTouch(account.id);
  collector.recordPosition(account.id, player.position.x, player.position.y);
};

room.onTeamGoal = (team) => {
  const scorer = getLastToucher();
  const assister = getPenultimateToucher();

  collector.recordGoal(scorer.accountId);
  if (assister) {
    collector.recordAssist(assister.accountId);
  }
};

room.onGameStop = async () => {
  const dataset = collector.finalize();

  await statsService.processCompleteMatch(
    dataset.basicStats,
    dataset.advancedStats,
    dataset.positions,
    dataset.events
  );

  // Invalida cache
  for (const stat of dataset.basicStats) {
    cache.invalidatePlayer(stat.accountId);
  }
};
```

### Dashboard Web com API

```typescript
import express from 'express';
import { StatsAPI } from './stats/StatsAPI';

const app = express();
const statsAPI = new StatsAPI(statsService, calculator, authService);

app.use('/api/stats', statsAPI.getRouter());

app.listen(3000, () => {
  console.log('Stats API rodando em http://localhost:3000');
});
```

Endpoints disponiveis:

- `GET /api/stats/player/100`
- `GET /api/stats/player/100/matches?limit=10`
- `GET /api/stats/player/100/heatmap/1`
- `GET /api/stats/top/totalGoals?limit=10`
- `POST /api/stats/compare` (body: `{accountId1, accountId2}`)

## Performance e Escalabilidade

### Otimizacoes Implementadas

1. **Cache em memoria** (TTL 5min)
2. **Agregados pre-calculados** (atualizados apos partida)
3. **Heatmaps pre-renderizados** (salvos no banco)
4. **Insercao em batch** (positions, events)
5. **Indices no banco** (accountId, matchId)

### Metricas Esperadas

- **Coleta**: ~1ms por evento
- **Finalizacao**: ~50ms (100 eventos, 1000 posicoes)
- **Query agregado (cache hit)**: <1ms
- **Query agregado (cache miss)**: 10-50ms
- **Geracao heatmap**: 20-100ms (dependendo de gridSize e posicoes)
- **Top 10**: 50-200ms

### Limitacoes

- **Posicoes**: ~10Hz (100ms sampling) para performance
- **Heatmaps**: gridSize max 50 (2500 celulas) recomendado
- **Cache**: TTL 5min (trade-off freshness vs hits)
- **Batch inserts**: Max 1000 rows por vez

## Changelog

### v5.2.0 - Fase 11

- Sistema completo de estatisticas
- Coleta em tempo real (StatsCollector)
- Calculos avancados (StatsCalculator)
- Persistencia integrada (StatsService)
- Cache em memoria (StatsCacheService)
- Comandos Discord (StatsCommands)
- API REST (StatsAPI)
- Integracao com Fase 9 (Auth) e Fase 10 (Balance)
- 4 novas tabelas no banco
- Heatmaps com densidade normalizada
- Performance rating 0-10
- Tendencia de performance (regressao linear)
- Comparacao entre jogadores

## Proximas Melhorias

- [ ] Testes unitarios (StatsCollector, StatsCalculator, Cache)
- [ ] Testes de integracao (end-to-end stats flow)
- [ ] Dashboard web com graficos (Chart.js, heatmap canvas)
- [ ] Webhooks para eventos de stats (Discord, Slack)
- [ ] Export de stats (CSV, JSON)
- [ ] Backups incrementais de stats
- [ ] Machine learning para prever vitoria (requer dataset grande)

// ** \_\_** \_**\_ \_ _
// / _\/ \_**) **\_) )( \
// \_** \_** ) \/ (
// \_/\_(\_\_**(\_**\_|\_\_**/
