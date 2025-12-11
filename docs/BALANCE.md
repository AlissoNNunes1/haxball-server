# Sistema de Balanceamento Elo Hibrido - Fase 10

## Visao Geral

Sistema Elo hibrido para Haxball com ratings por posicao, algoritmos de balanceamento avancados e integracao com sistema de autenticacao.

**Status**: Implementado ✅  
**Versao**: 1.0.0  
**Depende de**: Fase 9 (Sistema de Autenticacao)

---

## Arquitetura

### Componentes Principais

```
src/balance/
├── types.ts                  # Tipos e interfaces
├── EloCalculator.ts          # Calculo de rating Elo
├── PositionRating.ts         # Gerenciamento de posicoes
├── PerformanceTracker.ts     # Rastreamento de forma
├── BalanceAlgorithm.ts       # Algoritmos de balanceamento
├── BalanceService.ts         # Integracao com banco
├── BalanceCommands.ts        # Comandos Discord
└── BalanceAPI.ts             # REST API
```

### Fluxo de Dados

```
Partida -> PerformanceData -> EloCalculator -> Nova Rating
                                    ↓
                            BalanceService (persist)
                                    ↓
                            Database (player_ratings)
```

---

## Sistema Elo

### Formula Base

```
Nova Rating = Rating Atual + K × (Score Real - Score Esperado)
```

Onde:

- **K**: Fator dinamico baseado em experiencia
- **Score Real**: 1 (vitoria) ou 0 (derrota)
- **Score Esperado**: Probabilidade de vitoria

### Probabilidade de Vitoria

```
P(A vence B) = 1 / (1 + 10^((RatingB - RatingA) / 400))
```

**Exemplos**:

- Ratings iguais (1000 vs 1000): 50% de chance
- Diferenca de 200 pontos (1200 vs 1000): 76% de chance
- Diferenca de 400 pontos (1400 vs 1000): 91% de chance

### K-Factor Dinamico

```typescript
// Fase Provisional (primeiros 20 jogos)
K = 64 - (64 - 32) × (jogos / 20)

// Fase Veterana (apos 20 jogos)
K = 32 × (1 - min(jogos / 100, 0.5))
```

**Comportamento**:

- Jogadores novos: K = 64 (aprendizado rapido)
- Apos 20 jogos: K = 32 (estabilidade)
- Veteranos (100+ jogos): K = 16 (rating confiavel)

### Performance Individual

```
Ajuste = (Performance - 0.5) × 0.3
```

**Pesos por Posicao**:

| Metrica      | GK  | DEF | MID | ATA |
| ------------ | --- | --- | --- | --- |
| Gols         | 10% | 15% | 25% | 50% |
| Assistencias | 10% | 20% | 35% | 30% |
| Clean Sheet  | 60% | 45% | 15% | 5%  |
| Posse        | 20% | 20% | 25% | 15% |

### Decay Temporal

Jogadores inativos perdem rating gradualmente:

```
Rating Decayed = Rating × 0.995^(dias - 30)
```

**Configuracao**:

- Periodo de graca: 30 dias
- Taxa de decay: 0.5% por dia apos periodo
- Rating minimo: 100 (protegido)

---

## Ratings por Posicao

Cada jogador possui 5 ratings:

- **Overall**: Media das 4 posicoes
- **GK** (Goleiro): Especializacao em defesa
- **DEF** (Defensor): Especializacao em marcacao
- **MID** (Meio-campo): Equilibrio e criacao
- **ATA** (Atacante): Especializacao em finalizacao

### Rating Efetivo

```
Rating Efetivo = Rating Base × Fator Especializacao × Fator Forma × Fator Off-Position
```

**Fator de Especializacao**:

```
Fator = 1 + min(0.5, (Rating Posicao / Media Outras - 1) × 0.5)
```

Range: 1.0 (versatil) a 1.5 (especialista)

**Fator Off-Position**:

```
Penalty = max(0.8, Rating Atribuido / Rating Melhor Posicao)
```

Penalty maximo: 20% se fora da melhor posicao

---

## Algoritmos de Balanceamento

### Estrategia Greedy (Padrao)

**Complexidade**: O(n log n)  
**Uso**: Times pequenos/medios (ate 10 jogadores)

```
1. Ordena jogadores por rating (maior -> menor)
2. Para cada jogador:
   - Calcula rating de ambos os times
   - Adiciona ao time com menor rating
3. Atribui posicoes por especializacao
```

**Vantagens**:

- Rapido (milissegundos)
- Resultados consistentes
- Simples de entender

### Estrategia Genetica

**Complexidade**: O(n × populacao × geracoes)  
**Uso**: Times grandes (10+ jogadores), maxima justica

```
Configuracao:
- Populacao: 100 individuos
- Geracoes: 50 iteracoes
- Taxa de mutacao: 10%

Fitness = Diferenca Rating + Penalty Posicoes × 50
```

**Processo**:

1. Gera populacao aleatoria
2. Avalia fitness de cada configuracao
3. Seleciona melhores (50%)
4. Crossover + mutacao -> nova geracao
5. Repete ate convergencia

**Vantagens**:

- Otimizacao global
- Considera distribuicao de posicoes
- Fairness score alto (90+)

---

## Forma Recente

### Analise de Performance

**Janela**: Ultimos 10 jogos  
**Metricas**:

- **Average Score**: Score medio normalizado (0-1)
- **Trend**: Tendencia (improving / stable / declining)
- **Consistency**: Inverso do desvio padrao
- **Momentum**: Combinacao de forma + tendencia + streak

### Ajuste por Forma

```
Fator Forma = 1.0 + ajustes
```

**Ajustes**:

- Score alto (>0.7): +5%
- Score baixo (<0.3): -5%
- Tendencia positiva: +3%
- Tendencia negativa: -3%
- Alta consistencia: +2%

**Range**: 0.9 a 1.1 (max ±10%)

### Deteccao de Streak

**Win Streak**: 3+ vitorias consecutivas  
**Performance Streak**: 4+ jogos com score >0.7

Bonus de momentum: +5% por jogo (max 30%)

---

## Integracao com Banco de Dados

### Tabelas Utilizadas

#### player_ratings

```sql
CREATE TABLE player_ratings (
  id INTEGER PRIMARY KEY,
  account_id INTEGER REFERENCES player_accounts(id),
  overall REAL DEFAULT 1000,
  gk REAL DEFAULT 1000,
  def REAL DEFAULT 1000,
  mid REAL DEFAULT 1000,
  ata REAL DEFAULT 1000,
  updated_at TIMESTAMP
);
```

#### stats

```sql
CREATE TABLE stats (
  id INTEGER PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id),
  account_id INTEGER REFERENCES player_accounts(id),
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  touches INTEGER DEFAULT 0
);
```

### Operacoes

```typescript
// Buscar rating
const rating = await balanceService.getPlayerRating(accountId);

// Atualizar apos partida
const eloChange = await balanceService.recordMatchResult(accountId, matchResult, performance);

// Aplicar decay
const decayed = await balanceService.applyDecayToInactivePlayers(30);

// Top jogadores
const top = await balanceService.getTopPlayersByPosition(Position.MID, 10);
```

---

## Comandos Discord

### balance

Balanceia jogadores em dois times.

```
!balance <nick1> <nick2> ... [greedy|genetic]
```

**Exemplo**:

```
!balance Player1 Player2 Player3 Player4 genetic
```

**Resposta**:

```
Time 1 (Rating: 1150)
Player1 - GK (1200)
Player3 - DEF (1100)

Time 2 (Rating: 1140)
Player2 - MID (1180)
Player4 - ATA (1100)

Diferenca: 10
Justica: 95/100
```

### rating

Mostra rating do jogador.

```
!rating <nick> [posicao]
```

**Exemplo**:

```
!rating Player1 mid
```

### topelo

Ranking dos melhores jogadores.

```
!topelo [posicao] [limite]
```

**Exemplo**:

```
!topelo ata 10
```

### stats

Estatisticas globais do sistema.

```
!stats
```

### decay

Aplica decay em inativos (admin only).

```
!decay [dias]
```

---

## REST API

### Endpoints

#### GET /api/balance/health

Health check da API.

**Response**:

```json
{
  "status": "ok",
  "service": "balance-api",
  "timestamp": "2025-01-22T12:00:00Z"
}
```

#### GET /api/balance/rating/:accountId

Retorna rating completo do jogador.

**Response**:

```json
{
  "accountId": 1,
  "rating": {
    "overall": 1200,
    "gk": 1150,
    "def": 1180,
    "mid": 1250,
    "ata": 1200,
    "lastUpdated": "2025-01-22T12:00:00Z"
  }
}
```

#### GET /api/balance/top/:position?limit=10

Top jogadores por posicao.

**Response**:

```json
{
  "position": "MID",
  "limit": 10,
  "players": [
    {
      "accountId": 5,
      "nick": "ProPlayer",
      "rating": 1800,
      "gamesPlayed": 150
    }
  ]
}
```

#### POST /api/balance/teams

Balanceia times.

**Request**:

```json
{
  "accountIds": [1, 2, 3, 4],
  "strategy": "greedy"
}
```

**Response**:

```json
{
  "team1": {
    "players": [...],
    "averageRating": 1150
  },
  "team2": {
    "players": [...],
    "averageRating": 1145
  },
  "ratingDifference": 5,
  "fairnessScore": 98,
  "strategy": "greedy"
}
```

#### GET /api/balance/stats

Estatisticas globais.

**Response**:

```json
{
  "totalPlayers": 250,
  "averageRating": 1100,
  "medianRating": 1050,
  "topRating": 2200,
  "bottomRating": 450
}
```

---

## Exemplos de Uso

### Inicializacao

```typescript
import Database from 'better-sqlite3';
import { EloCalculator } from './balance/EloCalculator';
import { PositionRating } from './balance/PositionRating';
import { PerformanceTracker } from './balance/PerformanceTracker';
import { BalanceAlgorithm } from './balance/BalanceAlgorithm';
import { BalanceService } from './balance/BalanceService';

// Instancia componentes
const db = new Database('haxball.db');
const eloCalc = new EloCalculator();
const posRating = new PositionRating(eloCalc);
const perfTracker = new PerformanceTracker();
const balanceAlgo = new BalanceAlgorithm(posRating, perfTracker);
const balanceService = new BalanceService(db, eloCalc, posRating, perfTracker);
```

### Registrar Resultado de Partida

```typescript
import { Position, MatchResult, PerformanceData } from './balance/types';

// Dados da partida
const matchResult: MatchResult = {
  matchId: 123,
  teamRating: 1100,
  opponentRating: 1050,
  won: true,
  position: Position.MID,
  personalPerformance: 0.75,
};

const performance: PerformanceData = {
  matchId: 123,
  goals: 2,
  assists: 1,
  saves: 0,
  won: true,
  cleanSheet: false,
  possession: 55,
  performanceScore: 0.75,
  matchDate: new Date(),
};

// Atualiza rating
const eloChange = await balanceService.recordMatchResult(accountId, matchResult, performance);

console.log(`Rating ${eloChange.position}: ${eloChange.oldRating} -> ${eloChange.newRating}`);
```

### Balancear Times

```typescript
// Busca jogadores
const playerIds = [1, 2, 3, 4, 5, 6, 7, 8];
const players = await balanceService.getPlayersForBalance(playerIds);

// Balanceia
const result = balanceAlgo.balanceTeams(players);

console.log(`Time 1: ${result.team1.averageRating}`);
console.log(`Time 2: ${result.team2.averageRating}`);
console.log(`Diferenca: ${result.ratingDifference}`);
console.log(`Justica: ${result.fairnessScore}/100`);
```

### Analisar Forma Recente

```typescript
const performances = await balanceService.getRecentPerformances(accountId, 10);
const recentForm = perfTracker.analyzeRecentForm(performances, Position.MID);

console.log(`Score medio: ${recentForm.averageScore}`);
console.log(`Tendencia: ${recentForm.trend}`);
console.log(`Consistencia: ${recentForm.consistency}`);

const momentum = perfTracker.calculateMomentum(recentForm, performances, Position.MID);
console.log(`Momentum: ${momentum > 0 ? 'Positivo' : 'Negativo'} (${momentum})`);
```

---

## Configuracao

### EloConfig

```typescript
{
  baseKFactor: 32,          // K-factor base
  maxKFactor: 64,           // K maximo (novatos)
  minKFactor: 16,           // K minimo (veteranos)
  provisionalGames: 20,     // Jogos provisionais
  performanceWeight: 0.3,   // Peso de performance individual
  decayDays: 30,            // Dias ate inicio do decay
  decayRate: 0.995,         // Taxa diaria de decay
  minRating: 100,           // Rating minimo
  maxRating: 3000,          // Rating maximo
  initialRating: 1000       // Rating inicial
}
```

### BalanceConfig

```typescript
{
  strategy: 'greedy',                   // Estrategia de balanceamento
  maxRatingDifference: 100,             // Diferenca maxima aceitavel
  preferPositionSpecialists: true,      // Prioriza especialistas
  considerRecentForm: true,             // Considera forma recente
  formWeight: 0.1,                      // Peso da forma (10%)
  positionPreferenceWeight: 0.2         // Peso de preferencia (20%)
}
```

---

## Testes

### Executar Testes

```bash
# Todos os testes
npm test

# Testes especificos
npm test -- EloCalculator
npm test -- BalanceAlgorithm

# Coverage
npm run test:coverage
```

### Cobertura

```
EloCalculator.test.ts
- calculateWinProbability: 4 testes
- calculateKFactor: 4 testes
- calculateNewRating: 6 testes
- updateRatings: 2 testes
- applyDecay: 4 testes
- createInitialRating: 2 testes
- calculateTeamRating: 2 testes

BalanceAlgorithm.test.ts
- balanceTeams: 6 testes
- estrategia greedy: 1 teste
- estrategia genetica: 1 teste
- rebalanceWithSwap: 3 testes
- atribuicao de posicoes: 1 teste
- consideracao de forma: 1 teste
- qualidade: 2 testes

Total: 33 testes unitarios
```

---

## Metricas e Benchmarks

### Performance

**Balanceamento Greedy** (4 jogadores):

- Tempo medio: 2-5ms
- Memoria: <1MB

**Balanceamento Genetico** (8 jogadores):

- Tempo medio: 50-100ms
- Memoria: 2-5MB

### Qualidade

**Fairness Score Medio**:

- Greedy: 85-92/100
- Genetico: 92-98/100

**Diferenca de Rating**:

- Greedy: 20-80 pontos
- Genetico: 5-30 pontos

---

## Roadmap

### Fase 10.1 - Melhorias

- [ ] Suporte a times desbalanceados (3v4, 2v3)
- [ ] Multiplos sistemas de rating (competitivo/casual)
- [ ] Predicao de resultado de partida
- [ ] Graficos de evolucao de rating

### Fase 10.2 - Otimizacoes

- [ ] Cache de ratings frequentes
- [ ] Balanceamento pre-calculado
- [ ] Algoritmo heurístico hibrido
- [ ] Paralelizacao do algoritmo genetico

### Fase 10.3 - Analytics

- [ ] Dashboard de estatisticas
- [ ] Analise de meta (posicoes mais fortes)
- [ ] Deteccao de smurfs
- [ ] Sistema de badges/conquistas

---

## Troubleshooting

### Rating nao atualiza

**Causa**: Falta de link entre match_id e stats  
**Solucao**: Garantir que stats.match_id existe antes de recordMatchResult

### Balanceamento injusto

**Causa**: Dados de performance insuficientes  
**Solucao**: Aumentar RECENT_GAMES_WINDOW ou desabilitar considerRecentForm

### Decay muito agressivo

**Causa**: decayRate muito baixo  
**Solucao**: Ajustar decayRate para 0.998 ou aumentar decayDays

### Algoritmo genetico lento

**Causa**: POPULATION_SIZE ou GENERATIONS altos  
**Solucao**: Reduzir para 50/30 ou usar estrategia greedy

---

## Referencias

- [Elo Rating System - Wikipedia](https://en.wikipedia.org/wiki/Elo_rating_system)
- [Genetic Algorithms - MIT](https://web.mit.edu/16.070/www/lecture/lecture_notes6.pdf)
- [TrueSkill Rating System - Microsoft Research](https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/)

---

**Desenvolvido por**: ASSH  
**Licenca**: MIT  
**Versao**: 1.0.0  
**Data**: Janeiro 2025

<!--
  __  ____ ____ _  _
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/
-->
