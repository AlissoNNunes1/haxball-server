# Logica de Tag de Jogador - Analise e Correcao

**Data:** 15/12/2025  
**Arquivo analisado:** `cirsbase.js`  
**Status:** ✅ Logica identificada, ⏳ Correcao pendente

---

## 🔍 Analise da Logica Existente

### 1. Sistema de Mensagem Privada (PM) com Tag

**Localizacao:** `cirsbase.js` linha 1038

```javascript
// Logica de PM com suporte a nomes com espacos/underscores
if (message.startsWith('@@')) {
  message = message.substr(2).trim();
  if (message.indexOf(' ') !== -1) {
    let args = message.match(/^(\S+)\s(.*)/).slice(1);

    if (args.length > 1) {
      var pmMsg = args[1];
      var players = room.getPlayerList();
      var pmSent = false;
      players.forEach(function (pmPlayer) {
        // LOGICA DE TAG IDENTIFICADA:
        // Compara nome direto OU nome com underscores substituidos por espacos
        if (pmPlayer.name === args[0] || pmPlayer.name === args[0].replace(/_/g, ' ')) {
          whisper(
            '[PM > ' + pmPlayer.name + '] ' + player.name + ': ' + pmMsg,
            player.id,
            0xffa220,
            'normal',
            1
          );
          whisper('[PM] ' + player.name + ': ' + pmMsg, pmPlayer.id, 0xffa220, 'normal', 1);
          pmSent = true;
        }
      });
      if (pmSent == false) {
        whisper("Impossível encontrar usuário '" + args[0] + "'", player.id, 0xffa220, 'normal', 1);
      }
      return false;
    }
  }
}
```

---

## 💡 Interpretacao da Logica

### Como Funciona

1. **Usuario digita PM:**

   ```
   @@Lukra_Fifa mensagem aqui
   ```

2. **Sistema processa:**

   - Extrai nome do destinatario: `Lukra_Fifa`
   - Extrai mensagem: `mensagem aqui`
   - Busca jogador com nome `Lukra_Fifa` OU `Lukra Fifa` (underscores viram espacos)

3. **Razao da logica:**
   - No Haxball, jogadores podem ter espacos nos nomes
   - Ao digitar PM, e dificil incluir espacos no nome do destinatario
   - **Solucao:** Usuario digita `_` no lugar de espaco
   - Sistema converte `_` → ` ` (espaco) automaticamente

### Exemplos Praticos

| Nome Real do Jogador | Como Digitar PM   | Resultado                                           |
| -------------------- | ----------------- | --------------------------------------------------- |
| "Lukra"              | `@@Lukra oi`      | ✅ Funciona                                         |
| "Lukra Fifa"         | `@@Lukra_Fifa oi` | ✅ Funciona (underscore → espaço)                   |
| "Lukra Fifa"         | `@@Lukra Fifa oi` | ❌ Nao funciona (espaco no comando confunde parser) |
| "Bagre 123"          | `@@Bagre_123 oi`  | ✅ Funciona                                         |

---

## 🐛 Problemas Identificados

### 1. Sistema de Tag Visual Nao Implementado

**Problema:**

- `shared/config/utils.cjs` tem funcoes `setPlayerTag()`, `getPlayerTag()`, `clearPlayerTag()`
- Mas essas funcoes **NAO sao usadas em lugar nenhum** para exibir tag visualmente
- Tags ficam apenas na memoria, nao aparecem no chat

**Exemplo do problema:**

```javascript
// Em alguma sala
setPlayerTag(room, player.id, 'S1'); // Define tag "S1" para jogador

// No chat, jogador aparece como:
('Lukra: mensagem');

// DEVERIA aparecer como:
('[S1] Lukra: mensagem');
```

### 2. Logica de Underscore NAO esta Centralizada

**Problema:**

- Logica de `replace(/_/g, ' ')` so existe no PM de `cirsbase.js`
- NAO existe em outras funcoes de chat
- NAO esta em `shared/config/`

**Impacto:**

- Team chat NAO suporta underscores
- Outros comandos NAO suportam underscores
- Inconsistencia na experiencia do jogador

---

## ✅ Solucao Proposta

### 1. Centralizar Logica de Nome no `shared/handlers/playerHandlers.cjs`

```javascript
// shared/handlers/playerHandlers.cjs

/**
 * Normaliza nome do jogador para comparacao
 * Converte underscores em espacos para facilitar digitacao
 * @param {string} inputName - Nome digitado pelo usuario
 * @returns {string} Nome normalizado
 */
function normalizePlayerName(inputName) {
  return inputName.replace(/_/g, ' ');
}

/**
 * Encontra jogador por nome (com suporte a underscores)
 * @param {object} room - Instancia da sala
 * @param {string} playerName - Nome do jogador (pode conter _)
 * @returns {object|null} Jogador encontrado ou null
 */
function findPlayerByName(room, playerName) {
  const normalizedName = normalizePlayerName(playerName);
  const players = room.getPlayerList();

  return players.find((p) => p.name === playerName || p.name === normalizedName) || null;
}

/**
 * Formata nome do jogador com tag visual (se existir)
 * @param {object} room - Instancia da sala
 * @param {object} player - Jogador
 * @returns {string} Nome formatado com tag
 */
function formatPlayerName(room, player) {
  const tag = getPlayerTag(room, player.id);
  if (tag) {
    return `[${tag}] ${player.name}`;
  }
  return player.name;
}

module.exports = {
  normalizePlayerName,
  findPlayerByName,
  formatPlayerName,
  // ... outras funcoes
};
```

### 2. Atualizar `chatHandlers.cjs` para Usar Nome Formatado

```javascript
// shared/handlers/chatHandlers.cjs

const { findPlayerByName, formatPlayerName } = require('./playerHandlers.cjs');

/**
 * Processa mensagem privada (PM)
 * @param {object} room - Instancia da sala
 * @param {object} player - Jogador que enviou mensagem
 * @param {string} message - Mensagem completa
 * @returns {boolean} true se foi PM, false caso contrario
 */
function handlePrivateMessage(room, player, message) {
  if (!message.startsWith('@@')) return false;

  message = message.substr(2).trim();

  if (message.indexOf(' ') === -1) {
    whisper(room, 'Uso: @@<nome_jogador> <mensagem>', player.id, 0xff0000, 'normal', 1);
    return true;
  }

  let args = message.match(/^(\S+)\s(.*)/).slice(1);

  if (args.length < 2) {
    whisper(room, 'Uso: @@<nome_jogador> <mensagem>', player.id, 0xff0000, 'normal', 1);
    return true;
  }

  const targetName = args[0];
  const pmMsg = args[1];

  // USA NOVA FUNCAO CENTRALIZADA
  const targetPlayer = findPlayerByName(room, targetName);

  if (!targetPlayer) {
    whisper(room, `Impossivel encontrar usuario '${targetName}'`, player.id, 0xffa220, 'normal', 1);
    return true;
  }

  // USA FORMATACAO COM TAG VISUAL
  const senderName = formatPlayerName(room, player);
  const targetDisplayName = formatPlayerName(room, targetPlayer);

  whisper(
    room,
    `[PM > ${targetDisplayName}] ${senderName}: ${pmMsg}`,
    player.id,
    0xffa220,
    'normal',
    1
  );
  whisper(room, `[PM] ${senderName}: ${pmMsg}`, targetPlayer.id, 0xffa220, 'normal', 1);

  return true;
}

/**
 * Processa chat de time
 * @param {object} room - Instancia da sala
 * @param {object} player - Jogador que enviou mensagem
 * @param {string} message - Mensagem completa
 * @returns {boolean} true se foi team chat, false caso contrario
 */
function handleTeamChat(room, player, message) {
  if (!message.startsWith('t ')) return false;

  const teamMsg = message.substring(2).trim();

  if (player.team === 0) {
    // Espectadores
    const specs = room.getPlayerList().filter((p) => p.team === 0);
    const senderName = formatPlayerName(room, player);

    specs.forEach((spec) => {
      announce(room, `[Spec] ${senderName}: ${teamMsg}`, spec.id, 0xdee7fa, 'normal', 1);
    });
    return true;
  }

  // Time vermelho ou azul
  const teammates = room.getPlayerList().filter((p) => p.team === player.team);
  const senderName = formatPlayerName(room, player);
  const teamColor = player.team === 1 ? 0xed6a5a : 0x5995ed;

  teammates.forEach((teammate) => {
    announce(room, `[Team] ${senderName}: ${teamMsg}`, teammate.id, teamColor, 'normal', 1);
  });

  return true;
}

module.exports = {
  handlePrivateMessage,
  handleTeamChat,
  // ... outras funcoes
};
```

### 3. Atualizar `goalHandlers.cjs` para Usar Nome Formatado

```javascript
// shared/handlers/goalHandlers.cjs

const { formatPlayerName } = require('./playerHandlers.cjs');

function announceGoal(room, goalInfo) {
  const scorer = goalInfo.scorer;
  const assister = goalInfo.assister;

  // USA FORMATACAO COM TAG VISUAL
  const scorerName = formatPlayerName(room, scorer);
  const assisterName = assister ? formatPlayerName(room, assister) : null;

  let message = `⚽ ${goalInfo.isOwnGoal ? 'GOL CONTRA!' : 'GOLAÇO!'}\n`;
  message += `Gol de: ${scorerName}`;

  if (assisterName) {
    message += ` (Assistência de: ${assisterName})`;
  }

  message += `\nVermelho ${goalInfo.redScore} - ${goalInfo.blueScore} Azul`;
  message += `\nMarcado aos ${goalInfo.goalTime}`;

  announce(room, message, null, goalInfo.isOwnGoal ? 0xff6600 : 0x00ff00, 'bold', 1);
}
```

---

## 🎯 Resultado Final

### Antes (Problemático)

```
❌ Logica de underscore so em PM
❌ Tag visual nao funciona
❌ Nomes aparecem simples: "Lukra: gol!"
❌ Codigo duplicado em cirsbase.js
```

### Depois (Correto)

```
✅ Logica de underscore centralizada e reutilizavel
✅ Tag visual funcionando em todo o chat
✅ Nomes formatados: "[S1] Lukra: gol!"
✅ Codigo centralizado em shared/handlers/
✅ Team chat, PM e anuncios todos usam tags visuais
```

---

## 📝 Checklist de Implementacao

### Fase 1: Funcoes Base

- [ ] Criar `normalizePlayerName()` em `playerHandlers.cjs`
- [ ] Criar `findPlayerByName()` em `playerHandlers.cjs`
- [ ] Criar `formatPlayerName()` em `playerHandlers.cjs`
- [ ] Escrever testes unitarios

### Fase 2: Integracao com Chat

- [ ] Atualizar `handlePrivateMessage()` em `chatHandlers.cjs`
- [ ] Atualizar `handleTeamChat()` em `chatHandlers.cjs`
- [ ] Escrever testes unitarios

### Fase 3: Integracao com Eventos

- [ ] Atualizar `announceGoal()` em `goalHandlers.cjs`
- [ ] Atualizar outros anuncios para usar `formatPlayerName()`
- [ ] Escrever testes unitarios

### Fase 4: Validacao

- [ ] Testar PM com nomes simples
- [ ] Testar PM com nomes com espaco (usando underscore)
- [ ] Testar tags visuais em team chat
- [ ] Testar tags visuais em anuncios de gol
- [ ] Documentar comportamento

---

## 📚 Exemplos de Uso Final

### Exemplo 1: PM com Tag Visual

```
Jogador "[VIP] Lukra Fifa" quer enviar PM para "[S1] Bagre 123"

Comando digitado:
@@Bagre_123 oi mano

Resultado:
Para o remetente:
[PM > [S1] Bagre 123] [VIP] Lukra Fifa: oi mano

Para o destinatario:
[PM] [VIP] Lukra Fifa: oi mano
```

### Exemplo 2: Team Chat com Tag Visual

```
Jogador "[CAP] Lukra" envia mensagem de time

Comando digitado:
t vamos ganhar!

Resultado (para todos do time):
[Team] [CAP] Lukra: vamos ganhar!
```

### Exemplo 3: Anuncio de Gol com Tag Visual

```
Jogador "[S1] Lukra" marca gol
Jogador "[VIP] Bagre" deu assistencia

Resultado:
⚽ GOLAÇO!
Gol de: [S1] Lukra (Assistência de: [VIP] Bagre)
Vermelho 1 - 0 Azul
Marcado aos 3:45
```

---

## 🔗 Integracao com Sistema de Tags

### Como Definir Tag para Jogador

```javascript
// No onPlayerJoin ou em comando admin
const { setPlayerTag } = require('../../shared/config/utils.cjs');

// Define tag "VIP" para jogador
setPlayerTag(room, player.id, 'VIP');

// A partir daqui, o jogador aparece como "[VIP] Nome" em TODOS os chats e anuncios
```

### Como Remover Tag

```javascript
const { clearPlayerTag } = require('../../shared/config/utils.cjs');

// Remove tag do jogador
clearPlayerTag(room, player.id);

// Jogador volta a aparecer com nome simples
```

---

**Pronto para implementar!** 🚀  
Comece criando as funcoes em `shared/handlers/playerHandlers.cjs`

<!--
   __  ____ ____ _  _
  / _\/ ___) ___) )( \
 /    \___ \___ ) \/ (
 \_/\_(____(____|____/
-->
