# Utilitarios - Celebration Utils

**Data de Criacao:** 15/12/2025  
**Status:** ✅ Fase 2 Completa - Utilitarios de Comemoracao Implementados  
**Versao:** 1.0.0

---

## 📋 Visao Geral

Este modulo fornece **utilidades para comemoracao e efeitos visuais** nas salas Haxball do projeto CIRS. As funcoes permitem criar animacoes de avatar piscante e avisos visuais na bola, melhorando a experiencia do jogador com feedback visual imediato para eventos importantes.

### Beneficios

- ✅ **Efeitos Visuais Profissionais:** Comemoracao de gols, assistencias e avisos
- ✅ **Configuravel:** Personalize duracao, intervalo e cores
- ✅ **Sem Conflitos:** Sistema de warningCount evita sobreposicao de avisos
- ✅ **Facil de Usar:** Funcoes high-level para casos comuns (gol, assistencia, impedimento)

---

## 🎯 Funcoes Principais

### 1. Avatar Celebration

Cria efeito de avatar piscante para comemoracao de eventos.

```javascript
const { avatarCelebration } = require('../../shared/utils/celebrationUtils.cjs');

// Uso basico
avatarCelebration(room, player.id, '⚽');

// Com configuracao customizada
avatarCelebration(room, player.id, '🔥', {
  duration: 5000, // 5 segundos
  interval: 200, // 200ms entre piscadas
});
```

### 2. Ball Warning

Cria efeito de bola piscante para avisos e alertas.

```javascript
const { ballWarning } = require('../../shared/utils/celebrationUtils.cjs');

// Uso basico
ballWarning(room, gameState, '0xff0000', gameState.warningCount);

// Com cor customizada
ballWarning(room, gameState, '0xff0000', gameState.warningCount, {
  warningColor: '0xffff00', // Amarelo
  duration: 2000, // 2 segundos
});
```

### 3. Goal Celebration (High-Level)

Conveniencia para comemoracao de gols.

```javascript
const { goalCelebration } = require('../../shared/utils/celebrationUtils.cjs');

room.onTeamGoal = function (team) {
  const scorer = room.getPlayerList().find((p) => p.id === lastKickerId);
  if (scorer) {
    goalCelebration(room, scorer.id); // Avatar padrao: ⚽
  }
};
```

### 4. Assist Celebration (High-Level)

Conveniencia para comemoracao de assistencias.

```javascript
const { assistCelebration } = require('../../shared/utils/celebrationUtils.cjs');

if (assister) {
  assistCelebration(room, assister.id); // Avatar padrao: 👟
}
```

### 5. Offside Warning (High-Level)

Aviso visual para impedimento com cor laranja.

```javascript
const { offsideWarning } = require('../../shared/utils/celebrationUtils.cjs');

function checkOffside() {
  if (isOffside) {
    offsideWarning(room, gameState, '0xffffff'); // Cor laranja automatica
  }
}
```

### 6. Foul Warning (High-Level)

Aviso visual para faltas com cor vermelha.

```javascript
const { foulWarning } = require('../../shared/utils/celebrationUtils.cjs');

room.onPlayerBallKick = function (player) {
  if (isFoul(player)) {
    foulWarning(room, gameState, '0xffffff'); // Cor vermelha automatica
  }
};
```

---

## 📚 API Completa

### avatarCelebration(room, playerId, avatar, options)

Cria animacao de avatar piscante.

**Parametros:**

- `room` (object): Instancia da sala Haxball
- `playerId` (number): ID do jogador
- `avatar` (string): Avatar a ser exibido (emoji ou string)
- `options` (object, opcional):
  - `duration` (number): Duracao total em ms (padrao: 3250)
  - `interval` (number): Intervalo entre piscadas em ms (padrao: 250)

**Retorno:** void

**Exemplo:**

```javascript
avatarCelebration(room, 5, '🎉', { duration: 4000, interval: 300 });
```

---

### ballWarning(room, gameState, origColour, warningCount, options)

Cria animacao de bola piscante para avisos.

**Parametros:**

- `room` (object): Instancia da sala Haxball
- `gameState` (object): Estado do jogo com propriedade `warningCount`
- `origColour` (string): Cor original da bola (formato: '0xRRGGBB')
- `warningCount` (number): Contador de avisos atual
- `options` (object, opcional):
  - `warningColor` (string): Cor do aviso (padrao: '0xffffff')
  - `duration` (number): Duracao total em ms (padrao: 1400)
  - `interval` (number): Intervalo entre piscadas em ms (padrao: 200)

**Retorno:** void

**Exemplo:**

```javascript
ballWarning(room, gameState, '0x0000ff', 5, {
  warningColor: '0xffff00',
  duration: 2000,
});
```

---

### goalCelebration(room, playerId, avatar)

Conveniencia para comemoracao de gol (duracao: 3s).

**Parametros:**

- `room` (object): Instancia da sala Haxball
- `playerId` (number): ID do jogador
- `avatar` (string, opcional): Avatar customizado (padrao: '⚽')

**Retorno:** void

---

### assistCelebration(room, playerId, avatar)

Conveniencia para comemoracao de assistencia (duracao: 2s).

**Parametros:**

- `room` (object): Instancia da sala Haxball
- `playerId` (number): ID do jogador
- `avatar` (string, opcional): Avatar customizado (padrao: '👟')

**Retorno:** void

---

### offsideWarning(room, gameState, ballColor)

Aviso de impedimento com cor laranja (duracao: 1s).

**Parametros:**

- `room` (object): Instancia da sala Haxball
- `gameState` (object): Estado do jogo
- `ballColor` (string): Cor original da bola

**Retorno:** void

**Efeito Colateral:** Incrementa `gameState.warningCount`

---

### foulWarning(room, gameState, ballColor)

Aviso de falta com cor vermelha (duracao: 1.2s).

**Parametros:**

- `room` (object): Instancia da sala Haxball
- `gameState` (object): Estado do jogo
- `ballColor` (string): Cor original da bola

**Retorno:** void

**Efeito Colateral:** Incrementa `gameState.warningCount`

---

### sleep(time)

Utilidade para criar delays assincronos.

**Parametros:**

- `time` (number): Tempo em milissegundos

**Retorno:** Promise<void>

**Exemplo:**

```javascript
sleep(1000).then(() => {
  console.log('Executado apos 1 segundo');
});
```

---

## 🎨 Emojis Recomendados

### Para Avatares

- ⚽ - Gol padrao
- 🔥 - Gol espetacular
- 👟 - Assistencia padrao
- 🎯 - Assistencia precisa
- 🎉 - Comemoracao geral
- ⭐ - Destaque da partida
- 👑 - Melhor jogador
- 💪 - Defesa importante

### Para Cores de Bola

```javascript
// Cores comuns
const COLORS = {
  WHITE: '0xffffff',
  RED: '0xff0000',
  BLUE: '0x0000ff',
  GREEN: '0x00ff00',
  YELLOW: '0xffff00',
  ORANGE: '0xffaa00',
  PURPLE: '0xff00ff',
  CYAN: '0x00ffff',
};
```

---

## 🔧 Integracao com Goal Handlers

```javascript
const { handleGoal } = require('../../shared/handlers/goalHandlers.cjs');
const { goalCelebration, assistCelebration } = require('../../shared/utils/celebrationUtils.cjs');

room.onTeamGoal = function (team) {
  handleGoal(room, team, gameState, {
    onGoal: (room, goalInfo) => {
      // Comemoracao para scorer
      if (goalInfo.scorer && !goalInfo.isOwnGoal) {
        goalCelebration(room, goalInfo.scorer.id);
      }

      // Comemoracao para assister
      if (goalInfo.assister) {
        assistCelebration(room, goalInfo.assister.id);
      }
    },
  });
};
```

---

## ⚠️ Consideracoes Importantes

### Sistema de Warning Count

O `warningCount` previne conflitos entre multiplos avisos simultaneos:

```javascript
// CORRETO: Incrementa warningCount antes de cada aviso
gameState.warningCount = (gameState.warningCount || 0) + 1;
ballWarning(room, gameState, ballColor, gameState.warningCount);

// INCORRETO: Reutilizar mesmo warningCount
ballWarning(room, gameState, ballColor, 1); // Pode conflitar com outros avisos
```

### Multiplas Celebracoes Simultaneas

As funcoes suportam multiplas celebracoes ao mesmo tempo:

```javascript
// OK: Celebrar scorer e assister simultaneamente
goalCelebration(room, scorer.id);
assistCelebration(room, assister.id);

// OK: Multiplos jogadores podem ter avatares piscando
players.forEach((p) => {
  avatarCelebration(room, p.id, '⭐');
});
```

### Performance

- Cada piscada cria um `setTimeout` - evite duracoes muito longas
- Recomendado: max 5 segundos de duracao
- Intervalo minimo recomendado: 100ms

---

## 🧪 Testes

O modulo tem cobertura completa de testes em `tests/unit/utils/celebrationUtils.test.js`:

```bash
npm test -- tests/unit/utils/celebrationUtils.test.js
```

**Cobertura:** 27 testes, 100% de aprovacao

---

## 📝 Changelog

### v1.0.0 (15/12/2025)

- ✅ Criacao inicial do modulo
- ✅ Funcoes `avatarCelebration` e `ballWarning` migradas
- ✅ Adicao de funcoes high-level (goal, assist, offside, foul)
- ✅ Suporte a configuracao customizada
- ✅ Testes unitarios completos
- ✅ Documentacao completa

---

## 🚀 Proximos Passos

### Fase 3: Atualizar Salas Existentes

- [ ] Atualizar `bots/cirs-stadium/handlers.cjs`
  - Remover funcao `avatarCelebration` duplicada
  - Importar de `celebrationUtils.cjs`
- [ ] Atualizar `bots/todos_jogam/handlers.cjs`
  - Importar celebracoes se necessario

### Melhorias Futuras

- [ ] Adicionar mais tipos de comemoracao (hat-trick, clean sheet, etc)
- [ ] Suporte a sequencias de avatares customizadas
- [ ] Efeitos sonoros (se API Haxball suportar)
- [ ] Celebracoes de time (multiplos jogadores simultaneos)

---

**Status:** ✅ Fase 2 Completa (Utilitarios de Comemoracao)  
**Proximo:** Fase 3 - Atualizar salas existentes para usar handlers globais

<!--
   __  ____ ____ _  _
  / _\/ ___) ___) )( \
 /    \___ \___ ) \/ (
 \_/\_(____(____|____/
-->
