# Guia de Handlers Globais

Data: 15/12/2025  
Versao: 1.0.0

## Introducao

Este guia documenta o uso dos **handlers globais** implementados no Haxball Server. Os handlers globais centralizam funcionalidades comuns usadas em todas as salas, eliminando duplicacao de codigo e garantindo experiencia consistente para os jogadores.

## Arquitetura de Handlers

### Estrutura de Diretorios

```
shared/
├── handlers/              # Handlers globais reutilizaveis
│   ├── playerHandlers.cjs # Gerenciamento de jogadores
│   ├── chatHandlers.cjs   # Sistema de chat (team, PM)
│   ├── goalHandlers.cjs   # Eventos de gol e assistencia
│   ├── matchHandlers.cjs  # Inicio, fim e controle de partida
│   └── README.md          # Documentacao dos handlers
└── utils/
    ├── celebrationUtils.cjs # Utilidades de celebracao
    └── README.md            # Documentacao das utilities
```

### Principios de Design

1. **Reusabilidade**: Handlers podem ser usados em qualquer sala
2. **Customizacao**: Suporte para callbacks e mensagens personalizadas
3. **Padronizacao**: Experiencia consistente entre salas
4. **Modularidade**: Cada handler tem responsabilidade unica

---

## Handlers Disponiveis

### 1. Player Handlers

Gerencia eventos e informacoes de jogadores.

**Localizacao**: `shared/handlers/playerHandlers.cjs`

#### Funcoes:

- `normalizePlayerName(inputName)` - Normaliza nomes para comparacao
- `findPlayerByName(room, playerName)` - Busca jogador por nome
- `formatPlayerName(room, player)` - Formata nome com tag visual

#### Exemplo de Uso:

```javascript
const { findPlayerByName, formatPlayerName } = require('../../shared/handlers/playerHandlers.cjs');

// Buscar jogador por nome (suporta underscores)
const player = findPlayerByName(room, 'Lukra_Fifa'); // Encontra "Lukra Fifa"

// Formatar nome com tag visual
if (player) {
  const displayName = formatPlayerName(room, player);
  // Se player tem tag "VIP": "[VIP] Lukra Fifa"
}
```

---

### 2. Chat Handlers

Sistema completo de chat com suporte a team chat e mensagens privadas.

**Localizacao**: `shared/handlers/chatHandlers.cjs`

#### Funcoes:

- `handleTeamChat(room, player, message)` - Processa chat de time (prefixo `t`)
- `handlePrivateMessage(room, player, message)` - Processa mensagens privadas (prefixo `@@`)
- `processChatMessage(room, player, message)` - Processa qualquer mensagem

#### Exemplo de Uso:

```javascript
const { processChatMessage } = require('../../shared/handlers/chatHandlers.cjs');

function onPlayerChat(player, message) {
  // Processa team chat e PM automaticamente
  const handled = processChatMessage(room, player, message);
  if (handled) return false; // Impede processamento adicional

  // Logica customizada de chat da sala
  // ...

  return true;
}
```

#### Comandos de Chat:

| Comando                | Descricao                                      | Exemplo                |
| ---------------------- | ---------------------------------------------- | ---------------------- |
| `t <mensagem>`         | Envia mensagem apenas para o time              | `t Passa a bola!`      |
| `@@ <nome> <mensagem>` | Envia mensagem privada para jogador especifico | `@@ Lukra Boa jogada!` |
| `@@ <nome_com_espaco>` | Usa underscore para nomes com espaco           | `@@ Lukra_Fifa Oi!`    |

---

### 3. Goal Handlers

Gerencia eventos de gol com deteccao automatica de assistencias e gols contra.

**Localizacao**: `shared/handlers/goalHandlers.cjs`

#### Funcoes:

- `handleGoal(room, team, gameState, customMessages, callbacks)` - Processa gol completo
- `calculateGoalInfo(gameState, team)` - Calcula informacoes do gol
- `announceGoal(room, goalInfo, customMessages)` - Anuncia gol na sala

#### Exemplo de Uso Basico:

```javascript
const { handleGoal } = require('../../shared/handlers/goalHandlers.cjs');

function onTeamGoal(team) {
  handleGoal(room, team, gameState);
}
```

#### Exemplo com Mensagens Customizadas:

```javascript
const customMessages = {
  goal: '⚽⚽⚽ GOOOOOLAÇO!!!',
  ownGoal: 'Gol contra mano, serio?',
  assist: 'Assistencia perfeita de: {player}',
};

handleGoal(room, team, gameState, customMessages);
```

#### Exemplo com Celebracoes:

```javascript
const { goalCelebration, assistCelebration } = require('../../shared/utils/celebrationUtils.cjs');

const callbacks = {
  onScorerCelebration: (room, scorer) => {
    goalCelebration(room, scorer.team, { duration: 500 });
  },
  onAssisterCelebration: (room, assister) => {
    assistCelebration(room, assister, { duration: 300 });
  },
};

handleGoal(room, team, gameState, {}, callbacks);
```

---

### 4. Match Handlers

Gerencia eventos de inicio, fim e controle de partida.

**Localizacao**: `shared/handlers/matchHandlers.cjs`

#### Funcoes:

- `handleMatchStart(room, byTeam)` - Processa inicio de partida
- `handleMatchEnd(room, gameState, byTeam)` - Processa fim de partida
- `handleExtraTime(room, minutes)` - Processa acrescimos

#### Exemplo de Uso:

```javascript
const { handleMatchStart, handleMatchEnd } = require('../../shared/handlers/matchHandlers.cjs');

function onGameStart(byPlayer) {
  handleMatchStart(room, byPlayer ? byPlayer.team : null);

  // Logica customizada (ex: stats)
  statsCollector = new StatsCollector(authHandler);
}

function onTeamVictory(scores) {
  handleMatchEnd(
    room,
    gameState,
    scores.time === scores.timeLimit ? null : gameState.lastTouchTeam
  );

  // Salvar estatisticas
  statsCollector.save();
}
```

---

## Celebration Utils

Utilidades para animacoes visuais e celebracoes.

**Localizacao**: `shared/utils/celebrationUtils.cjs`

### Funcoes Disponiveis:

| Funcao                            | Descricao                      | Parametros              |
| --------------------------------- | ------------------------------ | ----------------------- |
| `avatarCelebration(room, player)` | Anima avatar piscando          | `{ duration, avatars }` |
| `goalCelebration(room, team)`     | Celebra gol do time            | `{ duration }`          |
| `assistCelebration(room, player)` | Celebra assistencia do jogador | `{ duration, avatars }` |
| `ballWarning(room, message)`      | Aviso visual na bola           | `{ color, duration }`   |
| `offsideWarning(room, team)`      | Aviso de impedimento           | `{ duration }`          |
| `foulWarning(room, player)`       | Aviso de falta                 | `{ reason, duration }`  |
| `sleep(ms)`                       | Espera assincrona              | Tempo em milissegundos  |

### Exemplo Completo:

```javascript
const {
  goalCelebration,
  assistCelebration,
  avatarCelebration,
} = require('../../shared/utils/celebrationUtils.cjs');

async function celebrateGoal(scorer, assister) {
  // Celebracao do scorer
  await avatarCelebration(room, scorer, {
    duration: 500,
    avatars: ['⚽', '🔥'],
  });

  // Celebracao do time
  await goalCelebration(room, scorer.team, {
    duration: 300,
  });

  // Celebracao do assister (se existir)
  if (assister) {
    await assistCelebration(room, assister, {
      duration: 200,
    });
  }
}
```

---

## Integracao Completa

### Criando Nova Sala com Handlers Globais

```javascript
// bots/minha_sala/handlers.cjs

// Importar handlers globais
const { handleTeamChat, handlePrivateMessage } = require('../../shared/handlers/chatHandlers.cjs');
const { handleGoal } = require('../../shared/handlers/goalHandlers.cjs');
const { handleMatchStart, handleMatchEnd } = require('../../shared/handlers/matchHandlers.cjs');
const { goalCelebration, assistCelebration } = require('../../shared/utils/celebrationUtils.cjs');

// Estado do jogo
let gameState = {
  lastTouchTeam: 0,
  lastPlayersTouched: [],
};

module.exports = function (room) {
  // ========== CHAT ==========
  room.onPlayerChat = function (player, message) {
    // Processar team chat e PM
    const handled = processChatMessage(room, player, message);
    if (handled) return false;

    // Logica customizada de chat
    // ...

    return true;
  };

  // ========== GOL ==========
  room.onTeamGoal = function (team) {
    // Mensagens personalizadas (opcional)
    const customMessages = {
      ownGoal: 'Opa! Gol contra!',
    };

    // Callbacks de celebracao (opcional)
    const callbacks = {
      onScorerCelebration: (room, scorer) => {
        goalCelebration(room, scorer.team);
      },
      onAssisterCelebration: (room, assister) => {
        assistCelebration(room, assister);
      },
    };

    // Processar gol
    handleGoal(room, team, gameState, customMessages, callbacks);
  };

  // ========== PARTIDA ==========
  room.onGameStart = function (byPlayer) {
    handleMatchStart(room, byPlayer ? byPlayer.team : null);

    // Reset estado do jogo
    gameState = {
      lastTouchTeam: 0,
      lastPlayersTouched: [],
    };
  };

  room.onGameStop = function (byPlayer) {
    handleMatchEnd(room, gameState, byPlayer ? byPlayer.team : null);
  };

  // ========== TRACKING ==========
  room.onPlayerBallKick = function (player) {
    gameState.lastTouchTeam = player.team;
    gameState.lastPlayersTouched.unshift({
      player: player,
      time: Math.floor(room.getScores().time),
    });

    // Manter apenas ultimos 3 toques
    if (gameState.lastPlayersTouched.length > 3) {
      gameState.lastPlayersTouched.pop();
    }
  };
};
```

---

## Sistema de Comandos

Os handlers de chat ja estao integrados com `shared/config/commands.cjs`.

### Comandos Globais Disponiveis:

| Comando           | Descricao                       | Tipo  |
| ----------------- | ------------------------------- | ----- |
| `t <mensagem>`    | Chat de time                    | Chat  |
| `@@ <nome> <msg>` | Mensagem privada                | Chat  |
| `!help`           | Lista todos os comandos         | Geral |
| `!discord`        | Link do Discord                 | Geral |
| `!afk`            | Marcar como AFK                 | Geral |
| `!bb`             | Ir para espectadores            | Geral |
| `!login <senha>`  | Autenticar                      | Auth  |
| `!logout`         | Desconectar conta               | Auth  |
| `!profile`        | Ver perfil proprio ou de alguem | Auth  |
| `!stats`          | Ver estatisticas                | Auth  |
| `!ranking`        | Ver ranking                     | Auth  |

### Processamento de Comandos:

```javascript
const { processCommand } = require('../../shared/config/commands.cjs');

room.onPlayerChat = function (player, message) {
  // Processa comandos globais (chat + auth + gerais)
  const handled = processCommand(room, player, message);
  if (handled) return false;

  // Comandos especificos da sala
  if (message.startsWith('!time')) {
    // Logica customizada
    return false;
  }

  return true;
};
```

---

## Melhores Praticas

### 1. Sempre Importar Apenas o Necessario

```javascript
// ❌ Ruim - importa tudo
const handlers = require('../../shared/handlers/goalHandlers.cjs');

// ✅ Bom - importa apenas o necessario
const { handleGoal } = require('../../shared/handlers/goalHandlers.cjs');
```

### 2. Customizar Apenas Quando Necessario

```javascript
// Use mensagens padrao quando possivel
handleGoal(room, team, gameState);

// Customize apenas se necessario
const customMessages = {
  ownGoal: 'Mensagem unica desta sala',
};
handleGoal(room, team, gameState, customMessages);
```

### 3. Manter Estado do Jogo Atualizado

```javascript
// Sempre atualizar gameState em onPlayerBallKick
room.onPlayerBallKick = function (player) {
  gameState.lastTouchTeam = player.team;
  gameState.lastPlayersTouched.unshift({
    player: player,
    time: Math.floor(room.getScores().time),
  });
};
```

### 4. Usar Callbacks para Logica Customizada

```javascript
// Callbacks permitem adicionar logica sem modificar handlers
const callbacks = {
  onScorerCelebration: (room, scorer) => {
    // Logica customizada
    statsCollector.trackGoal(scorer);
    goalCelebration(room, scorer.team);
  },
};

handleGoal(room, team, gameState, {}, callbacks);
```

---

## Testes

Todos os handlers possuem testes unitarios e de integracao.

### Executar Testes:

```bash
# Todos os testes
npm test

# Apenas handlers
npm test -- tests/unit/handlers

# Apenas utilities
npm test -- tests/unit/utils

# Testes de integracao
npm test -- tests/integration
```

### Cobertura:

- **Handlers**: 39 testes unitarios
- **Utilities**: 27 testes unitarios
- **Integracao**: 2 suites de testes (goal flow + chat flow)
- **Total**: 260+ testes passando

---

## Migração de Salas Existentes

### Passo 1: Identificar Código Duplicado

Procure por:

- Logica de chat de time e PM
- Anuncios de gol e assistencia
- Mensagens de inicio/fim de partida
- Funcoes de celebracao (avatarCelebration, etc)

### Passo 2: Importar Handlers

```javascript
const { handleGoal } = require('../../shared/handlers/goalHandlers.cjs');
const { handleMatchStart } = require('../../shared/handlers/matchHandlers.cjs');
const { processChatMessage } = require('../../shared/handlers/chatHandlers.cjs');
```

### Passo 3: Substituir Código

Substitua blocos de codigo duplicado por chamadas aos handlers:

```javascript
// ❌ Antes: ~60 linhas de codigo duplicado
function onTeamGoal(team) {
  const scores = room.getScores();
  const scorer = gameState.lastPlayersTouched[0];
  // ... 60 linhas de logica ...
}

// ✅ Depois: ~5 linhas usando handler
function onTeamGoal(team) {
  handleGoal(room, team, gameState, customMessages, callbacks);
}
```

### Passo 4: Testar

- Abra a sala localmente
- Teste gols normais, gols contra, assistencias
- Teste chat de time e mensagens privadas
- Verifique celebracoes visuais

---

## Suporte e Contribuicao

### Reportar Problemas:

- Abrir issue no repositorio
- Descrever comportamento esperado vs atual
- Incluir logs e configuracao da sala

### Contribuir:

1. Fork o repositorio
2. Crie branch para feature: `git checkout -b feature/novo-handler`
3. Implemente com testes
4. Submit pull request

---

## Roadmap

### Proximas Features (Fase 5+):

- [ ] Handler de formacoes (offside, posicoes)
- [ ] Handler de regras (faltas, penaltis)
- [ ] Handler de balanceamento de times
- [ ] Sistema de plugins para handlers
- [ ] Documentacao interativa

---

**Fim do Guia de Handlers Globais**

Ultima atualizacao: 15/12/2025  
Versao: 1.0.0

<!--
   __  ____ ____ _  _
  / _\/ ___) ___) )( \
 /    \___ \___ ) \/ (
 \_/\_(____(____|____/
-->
