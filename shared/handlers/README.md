# Handlers Globais - Guia de Uso

**Data de Criacao:** 15/12/2025  
**Status:** ✅ Fase 1 Completa - Handlers Implementados  
**Versao:** 1.0.0

---

## 📋 Visao Geral

Este diretorio contem **handlers globais reutilizaveis** para todas as salas Haxball do projeto CIRS. Os handlers centralizam funcionalidades comuns, eliminando duplicacao de codigo e garantindo experiencia consistente entre todas as salas.

### Beneficios

- ✅ **Codigo Centralizado:** Correcao de bug em 1 lugar = todas as salas atualizadas
- ✅ **Reutilizacao Maxima:** Reduz 70%+ de codigo duplicado
- ✅ **Experiencia Consistente:** Mesmas mensagens e comportamentos em todas as salas
- ✅ **Facil Manutencao:** Adicionar funcionalidade uma vez, disponivel para todas as salas

---

## 📁 Estrutura

```
shared/handlers/
├── chatHandlers.cjs       # Team chat, PM e chat global
├── goalHandlers.cjs       # Eventos de gol, assistencia e gol contra
├── matchHandlers.cjs      # Inicio, fim e controle de partidas
└── playerHandlers.cjs     # Gerenciamento de jogadores e tags visuais
```

---

## 🚀 Como Usar

### 1. Chat Handlers (`chatHandlers.cjs`)

#### Importar

```javascript
const {
  handleTeamChat,
  handlePrivateMessage,
  processChatMessage,
} = require('../../shared/handlers/chatHandlers.cjs');
```

#### Team Chat (t mensagem)

```javascript
room.onPlayerChat = function (player, message) {
  // Processa team chat automaticamente
  if (handleTeamChat(room, player, message)) return false;

  // Resto do codigo...
};
```

**Exemplo de uso pelo jogador:**

```
t vamos atacar!          → Envia "vamos atacar!" para todos do time
t defendam bem           → Mensagem privada para o time
```

**Output:**

```
[Team] [VIP] Lukra: vamos atacar!    (para todos do time vermelho)
[Spec] Jogador: esperando            (para espectadores)
```

#### Mensagem Privada (@@ jogador mensagem)

```javascript
room.onPlayerChat = function (player, message) {
  // Processa PM automaticamente
  if (handlePrivateMessage(room, player, message)) return false;

  // Resto do codigo...
};
```

**Exemplo de uso pelo jogador:**

```
@@Lukra oi mano          → Envia PM para "Lukra"
@@Lukra_Fifa beleza?     → Envia PM para "Lukra Fifa" (underscore vira espaco)
```

**Output:**

```
[PM > [S1] Lukra] [VIP] Bagre: oi mano    (para remetente)
[PM] [VIP] Bagre: oi mano                 (para destinatario)
```

#### Usar Tudo de Uma Vez

```javascript
room.onPlayerChat = function (player, message) {
  // Processa team chat, PM e chat global automaticamente
  if (processChatMessage(room, player, message)) return false;

  // Comandos especificos da sala aqui
};
```

---

### 2. Goal Handlers (`goalHandlers.cjs`)

#### Importar

```javascript
const {
  handleGoal,
  calculateGoalInfo,
  announceGoal,
} = require('../../shared/handlers/goalHandlers.cjs');
```

#### Uso Basico

```javascript
room.onTeamGoal = function (team) {
  // Processa gol automaticamente (detecta scorer, assister, gol contra)
  handleGoal(room, team, gameState);
};
```

**Output automatico:**

```
⚽ GOLAÇO DO TIME VERMELHO!
Gol de: [VIP] Lukra
Assistência de: [S1] Bagre
Vermelho 1 - 0 Azul
Marcado aos 3:45
```

#### Uso Avancado com Callback

```javascript
room.onTeamGoal = function (team) {
  handleGoal(room, team, gameState, {
    onGoal: (room, goalInfo) => {
      // Salvar stats
      // Comemorar avatar
      // Logica customizada aqui
      console.log(`Gol marcado por ${goalInfo.scorer.name}`);
    },
  });
};
```

#### Mensagens Customizadas

```javascript
const customMessages = {
  goal: {
    red: '🔥 GOLAÇO ABSURDO DO VERMELHO! 🔥',
    blue: '💙 QUE GOL DO AZUL! 💙',
  },
  ownGoal: {
    red: '🤦 Pô mano, gol contra?!',
    blue: '😅 Quem marcou foi o goleiro...',
  },
};

room.onTeamGoal = function (team) {
  handleGoal(room, team, gameState, { customMessages });
};
```

---

### 3. Match Handlers (`matchHandlers.cjs`)

#### Importar

```javascript
const {
  handleMatchStart,
  handleMatchEnd,
  handleExtraTime,
  handlePause,
  handleUnpause,
} = require('../../shared/handlers/matchHandlers.cjs');
```

#### Inicio de Partida

```javascript
room.onGameStart = function (byPlayer) {
  handleMatchStart(room, gameState);

  // Logica especifica da sala aqui
};
```

**Output:**

```
═══════════════════════════════════
🎮 PARTIDA INICIADA!
Jogo limpo e respeito sempre!
═══════════════════════════════════
```

#### Fim de Partida

```javascript
room.onGameStop = async function (byPlayer) {
  await handleMatchEnd(room, gameState, {
    onEnd: async (room, gameState, scores) => {
      // Salvar stats
      // Balancear times
      // Logica customizada aqui
    },
  });
};
```

**Output:**

```
=================================
🏆 TIME VERMELHO VENCEU!
Placar final: 3 - 1
=================================
```

#### Acrescimos

```javascript
// No onGameTick ou quando necessario
if (shouldAnnounceExtraTime) {
  handleExtraTime(room, gameState, gameTime);
}
```

**Output:**

```
⏱️ Acréscimos: 3 segundos
```

---

### 4. Player Handlers (`playerHandlers.cjs`)

#### Importar

```javascript
const {
  formatPlayerName,
  findPlayerByName,
  normalizePlayerName,
  handlePlayerJoin,
  handlePlayerLeave,
} = require('../../shared/handlers/playerHandlers.cjs');
```

#### Sistema de Tags Visuais

```javascript
const { setPlayerTag, clearPlayerTag } = require('../../shared/config/utils.cjs');
const { formatPlayerName } = require('../../shared/handlers/playerHandlers.cjs');

// Define tag para jogador
setPlayerTag(room, player.id, 'VIP');

// Usa nome formatado com tag em mensagens
const displayName = formatPlayerName(room, player);
console.log(displayName); // Output: "[VIP] Lukra"

// Remove tag
clearPlayerTag(room, player.id);
```

#### Buscar Jogador com Suporte a Underscores

```javascript
// Busca "Lukra Fifa" usando "Lukra_Fifa"
const player = findPlayerByName(room, 'Lukra_Fifa');

if (player) {
  console.log(`Encontrado: ${player.name}`); // "Lukra Fifa"
}
```

#### Normalizar Nome

```javascript
// Converte underscores em espacos
const normalized = normalizePlayerName('Lukra_Fifa_Pro');
console.log(normalized); // "Lukra Fifa Pro"
```

---

## 🔧 Integracao com commands.cjs

O arquivo `shared/config/commands.cjs` ja esta integrado com os chat handlers. Voce nao precisa fazer nada adicional para usar team chat e PM globalmente:

```javascript
// Em qualquer sala, basta importar processCommand
const { processCommand } = require('../../shared/config/commands.cjs');

room.onPlayerChat = function (player, message) {
  // Processa TUDO: team chat, PM e comandos globais
  if (processCommand(room, player, message)) return false;

  // Comandos especificos da sala aqui
};
```

---

## 📝 Estado do Jogo (gameState)

Os handlers esperam que `gameState` tenha a seguinte estrutura:

```javascript
let gameState = {
  // Estado basico
  started: false,
  paused: false,
  time: 0,

  // Placar
  redScore: 0,
  blueScore: 0,

  // Ultimo chutador (para gol e assistencia)
  lastKickerId: undefined,
  lastKickerName: undefined,
  lastKickerTeam: undefined,

  // Penultimo chutador (para assistencia)
  secondLastKickerId: undefined,
  secondLastKickerName: undefined,
  secondLastKickerTeam: undefined,

  // Acrescimos (extra time)
  extraTime: false,
  extraTimeCount: 0,
  extraTimeEnd: undefined,
  extraTimeAnnounced: false,

  // Bola
  ballRadius: undefined,
};
```

### Atualizar Chutadores (onPlayerBallKick)

```javascript
room.onPlayerBallKick = function (player) {
  // Atualiza penultimo chutador
  gameState.secondLastKickerId = gameState.lastKickerId;
  gameState.secondLastKickerName = gameState.lastKickerName;
  gameState.secondLastKickerTeam = gameState.lastKickerTeam;

  // Atualiza ultimo chutador
  gameState.lastKickerId = player.id;
  gameState.lastKickerName = player.name;
  gameState.lastKickerTeam = player.team;
};
```

---

## 🎯 Exemplo Completo (Nova Sala)

```javascript
// bots/minha_nova_sala/handlers.cjs

const { processCommand } = require('../../shared/config/commands.cjs');
const { handleGoal } = require('../../shared/handlers/goalHandlers.cjs');
const { handleMatchStart, handleMatchEnd } = require('../../shared/handlers/matchHandlers.cjs');

const room = globalThis.room;

let gameState = {
  started: false,
  redScore: 0,
  blueScore: 0,
  lastKickerId: undefined,
  lastKickerName: undefined,
  lastKickerTeam: undefined,
  secondLastKickerId: undefined,
  secondLastKickerName: undefined,
  secondLastKickerTeam: undefined,
};

// Chat (team chat e PM inclusos automaticamente)
room.onPlayerChat = function (player, message) {
  if (processCommand(room, player, message)) return false;

  // Comandos especificos da sala aqui
};

// Gol
room.onTeamGoal = function (team) {
  handleGoal(room, team, gameState);
};

// Inicio
room.onGameStart = function () {
  handleMatchStart(room, gameState);
};

// Fim
room.onGameStop = async function () {
  await handleMatchEnd(room, gameState);
};

// Atualizar chutadores
room.onPlayerBallKick = function (player) {
  gameState.secondLastKickerId = gameState.lastKickerId;
  gameState.secondLastKickerName = gameState.lastKickerName;
  gameState.secondLastKickerTeam = gameState.lastKickerTeam;

  gameState.lastKickerId = player.id;
  gameState.lastKickerName = player.name;
  gameState.lastKickerTeam = player.team;
};
```

**Total:** ~50 linhas vs. 500+ linhas antes! 🎉

---

## 🧪 Testes

Os handlers tem testes unitarios em `tests/unit/handlers/`:

- `playerHandlers.test.js` - Testa tags visuais, normalizacao e busca
- `chatHandlers.test.js` - Testa team chat e PM
- `goalHandlers.test.js` - Testa calculo de gol e anuncios

**NOTA:** Testes estao em JavaScript mas Jest esta configurado para TypeScript. Para rodar os testes, sera necessario ajustar `jest.config.js` ou converter testes para `.ts`.

---

## 📚 Documentacao Relacionada

- 📄 **Plano Completo:** [docs/REFACTORING_PLAN.md](../../docs/REFACTORING_PLAN.md)
- 📄 **Resumo Executivo:** [docs/REFACTORING_SUMMARY.md](../../docs/REFACTORING_SUMMARY.md)
- 📄 **Analise de Tags:** [docs/TAG_LOGIC_ANALYSIS.md](../../docs/TAG_LOGIC_ANALYSIS.md)
- 📄 **Roadmap:** [docs/roadmap.md](../../docs/roadmap.md)

---

## 🔄 Proximos Passos

### Fase 2: Utilitarios de Comemoracao (Pendente)

- [ ] Criar `shared/utils/celebrationUtils.cjs`
- [ ] Migrar funcao `avatarCelebration`
- [ ] Consolidar funcao `ballWarning`

### Fase 3: Migracao de Salas (Pendente)

- [ ] Atualizar `bots/cirs-stadium/handlers.cjs` para usar handlers globais
- [ ] Atualizar `bots/todos_jogam/handlers.cjs` para usar handlers globais
- [ ] Deprecar `cirsbase.js`

### Fase 4: Finalizacao (Pendente)

- [ ] Converter testes para TypeScript ou ajustar Jest config
- [ ] Criar template de nova sala usando handlers
- [ ] Atualizar `docs/ARCHITECTURE.md`

---

**Status Final:** ✅ Fase 1 Completa (4 handlers implementados + testes)  
**Impacto:** 70%+ reducao de codigo duplicado esperada apos migracao completa

<!--
   __  ____ ____ _  _
  / _\/ ___) ___) )( \
 /    \___ \___ ) \/ (
 \_/\_(____(____|____/
-->
