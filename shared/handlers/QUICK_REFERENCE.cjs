#!/usr/bin/env node

/**
 * QUICK REFERENCE - Chat Handler Centralizado
 *
 * Para migrar uma sala rapidamente, copie este template e customize:
 */

// ═════════════════════════════════════════════════════════════════════════
// TEMPLATE MÍNIMO (copiar e colar em handlers.cjs da sala)
// ═════════════════════════════════════════════════════════════════════════

const {
  handlePlayerChat,
  createSwapCommand,
  setAuthHandler,
} = require('../../shared/handlers/chatHandlers.cjs');
const { processCommand } = require('../../shared/config/commands.cjs');

// Setup (uma vez no init)
setAuthHandler(authHandler);

// Definir handler
room.onPlayerChat = (player, message) => {
  return handlePlayerChat(room, player, message, {
    processGlobalCommand: (room, player, message) => processCommand(room, player, message),
    customCommands: { ...createSwapCommand() },
    tag: '[STADIUM]',
  });
};

// FIM DO TEMPLATE
// Compilar: npm run build
// Testar: npm test

// ═════════════════════════════════════════════════════════════════════════
// CHEAT SHEET - Casos Comuns
// ═════════════════════════════════════════════════════════════════════════

/*

┌─ CASO 1: Básico ─────────────────────────────────────────────────────┐
│                                                                        │
│  room.onPlayerChat = (player, message) => {                           │
│    return handlePlayerChat(room, player, message, {                   │
│      processGlobalCommand: (room, player, message) =>                 │
│        processCommand(room, player, message),                         │
│      customCommands: { ...createSwapCommand() },                      │
│      tag: '[STADIUM]'                                                 │
│    });                                                                │
│  };                                                                   │
│                                                                        │
│  ✓ Processa comandos globais                                         │
│  ✓ !swap funciona                                                    │
│  ✓ Formata: [STADIUM] Nome: msg                                      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌─ CASO 2: Adicionar Comandos ─────────────────────────────────────────┐
│                                                                        │
│  const customCommands = {                                             │
│    ...createSwapCommand(),                                            │
│    hello: (room, player, args) => {                                   │
│      room.sendChat('Ola ' + player.name);                             │
│    },                                                                 │
│    info: (room, player, args) => {                                    │
│      room.sendChat('Saiba mais em: discord.gg/cha');                 │
│    }                                                                  │
│  };                                                                   │
│                                                                        │
│  room.onPlayerChat = (player, message) => {                           │
│    return handlePlayerChat(room, player, message, {                   │
│      processGlobalCommand: (room, player, message) =>                 │
│        processCommand(room, player, message),                         │
│      customCommands: customCommands,                                  │
│      tag: '[FUTSAL]'                                                  │
│    });                                                                │
│  };                                                                   │
│                                                                        │
│  ✓ !hello → Ola Lukra                                                │
│  ✓ !info → Saiba mais em: discord.gg/cha                            │
│  ✓ !swap → Troca times                                               │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌─ CASO 3: Bloquear Chat (Sala Mutada) ────────────────────────────────┐
│                                                                        │
│  room.onPlayerChat = (player, message) => {                           │
│    return handlePlayerChat(room, player, message, {                   │
│      processGlobalCommand: (room, player, message) =>                 │
│        processCommand(room, player, message),                         │
│      customCommands: { ...createSwapCommand() },                      │
│      tag: '[STADIUM]',                                                │
│      shouldBlockChat: (room, player, message) => {                    │
│        // Admin sempre pode falar                                    │
│        if (player.admin) return false;                               │
│        // Bloqueia chat normal se sala mutada                        │
│        if (roomMuted && !message.startsWith('!')) return false;      │
│        // Permite por padrao                                         │
│        return true;                                                  │
│      }                                                                │
│    });                                                                │
│  };                                                                   │
│                                                                        │
│  ✓ Admin pode falar mesmo com sala mutada                            │
│  ✓ Outros users bloqueados                                           │
│  ✓ Comandos (!) ainda funcionam                                      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌─ CASO 4: Formatação Custom (Emojis) ─────────────────────────────────┐
│                                                                        │
│  room.onPlayerChat = (player, message) => {                           │
│    return handlePlayerChat(room, player, message, {                   │
│      processGlobalCommand: (room, player, message) =>                 │
│        processCommand(room, player, message),                         │
│      customCommands: { ...createSwapCommand() },                      │
│      formatMessage: (room, player, message) => {                      │
│        // Emoji por time                                             │
│        const emoji = player.team === 1 ? '🔴' :                       │
│                      player.team === 2 ? '🔵' : '👁️';                 │
│        // Badge se admin                                             │
│        const badge = player.admin ? ' 👑' : '';                       │
│        const name = (player.name || 'Unnamed') + badge;              │
│        // Retornar formatado                                         │
│        return `${emoji} ${name}: ${message}`;                        │
│      }                                                                │
│    });                                                                │
│  };                                                                   │
│                                                                        │
│  ✓ 🔴 Lukra 👑: oi        (admin do time vermelho)                   │
│  ✓ 🔵 Bagre: beleza?      (jogador do time azul)                     │
│  ✓ 👁️ Espectador: aguardando  (espectador)                            │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌─ CASO 5: Múltiplas Validações ──────────────────────────────────────┐
│                                                                        │
│  room.onPlayerChat = (player, message) => {                           │
│    return handlePlayerChat(room, player, message, {                   │
│      processGlobalCommand: (room, player, message) =>                 │
│        processCommand(room, player, message),                         │
│      customCommands: { ...createSwapCommand() },                      │
│      tag: '[RS]',                                                     │
│      shouldBlockChat: (room, player, message) => {                    │
│        // Admin sempre permite                                       │
│        if (player.admin) return false;                               │
│                                                                        │
│        // Bloqueia se sala mutada                                    │
│        if (roomMuted && !message.startsWith('!')) return false;      │
│                                                                        │
│        // Bloqueia chat normal em choosePositionMode                 │
│        if (choosePositionMode && !message.startsWith('!')) {         │
│          const positions = ['G', 'LD', 'LE', 'Z', 'MD', 'AE', 'AD']; │
│          const isPos = positions.includes(message.toUpperCase());    │
│          if (!isPos) return false;                                   │
│        }                                                              │
│                                                                        │
│        // Permite por padrao                                         │
│        return true;                                                  │
│      }                                                                │
│    });                                                                │
│  };                                                                   │
│                                                                        │
│  ✓ Múltiplas validações em um lugar                                  │
│  ✓ Lógica clara e fácil de manter                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


┌─ CASO 6: Reutilizar Conjuntos de Comandos ──────────────────────────┐
│                                                                        │
│  // Em chatHandlers.cjs                                              │
│  function createAdminCommands() {                                    │
│    return {                                                          │
│      mute: (room, player, args) => {                                 │
│        room.sendChat('Sala mutada');                                 │
│      },                                                              │
│      unmute: (room, player, args) => {                               │
│        room.sendChat('Sala desmutada');                              │
│      }                                                               │
│    };                                                                │
│  }                                                                   │
│                                                                        │
│  // Em handlers.cjs da sala                                          │
│  const customCommands = {                                            │
│    ...createSwapCommand(),                                           │
│    ...createAdminCommands(),                                         │
│    hello: (room, player, args) => {...}                              │
│  };                                                                  │
│                                                                        │
│  room.onPlayerChat = (player, message) => {                           │
│    return handlePlayerChat(room, player, message, {                   │
│      processGlobalCommand: (room, player, message) =>                 │
│        processCommand(room, player, message),                         │
│      customCommands: customCommands,                                  │
│      tag: '[CHAMPIONSHIP]'                                            │
│    });                                                                │
│  };                                                                   │
│                                                                        │
│  ✓ Reutiliza createSwapCommand                                       │
│  ✓ Reutiliza createAdminCommands                                     │
│  ✓ Fácil adicionar novos conjuntos                                   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


*/

// ═════════════════════════════════════════════════════════════════════════
// MÉTODOS DISPONÍVEIS
// ═════════════════════════════════════════════════════════════════════════

/*

handlePlayerChat(room, player, message, options)
├─ Processa chat com comandos e formatação
├─ Retorna: boolean (false bloqueia original, true permite)
└─ Usa callbacks customizáveis para lógica da sala

createSwapCommand()
├─ Retorna map com comando 'swap'
├─ Exigência: player.admin = true
└─ Troca todos os times (1 ↔ 2)

setAuthHandler(handler)
├─ Define handler global para formatação com badges
├─ Chamado uma vez no setup
└─ Usado por formatPlayerName() internamente

*/

// ═════════════════════════════════════════════════════════════════════════
// OPÇÕES DE CALLBACK
// ═════════════════════════════════════════════════════════════════════════

/*

processGlobalCommand: (room, player, message) => boolean
├─ Processa comandos globais (commands.cjs - autenticação, etc)
├─ Se retorna true, bloqueia processamento posterior
└─ Usar: (room, player, message) => processCommand(room, player, message)

customCommands: object
├─ Map de comandos { 'cmd': callback }
├─ Callback: (room, player, args) => void
└─ room.sendChat() para responder

tag: string
├─ Prefixo para formatar mensagens
└─ Ex: '[STADIUM]' → [STADIUM] Nome: msg

shouldBlockChat: (room, player, message) => boolean
├─ Valida se chat deve ser bloqueado
├─ Retorna false para bloquear
├─ Retorna true para permitir
└─ Ex: !admin && muted → false

formatMessage: (room, player, message) => string
├─ Custom formatter para mensagem
├─ Retorna string formatada
└─ Se não definir, usa tag + name + msg

*/

// ═════════════════════════════════════════════════════════════════════════
// FLUXO SIMPLIFICADO
// ═════════════════════════════════════════════════════════════════════════

/*

onPlayerChat("Lukra", "!swap")
    ↓
    1. Valida entrada
    2. Checa shouldBlockChat()
    3. Processa global commands
    4. Extrai comando (!)
    5. Busca em customCommands
    6. Executa callback
    ↓
    return false (bloqueia original)

onPlayerChat("Lukra", "oi")
    ↓
    1. Valida entrada
    2. Checa shouldBlockChat()
    3. Processa global commands
    4. Detecta chat normal (sem !)
    5. Formata: [TAG] Nome: msg
    6. room.sendChat(formatted)
    ↓
    return false (bloqueia original)

*/

// ═════════════════════════════════════════════════════════════════════════
// TESTES RECOMENDADOS
// ═════════════════════════════════════════════════════════════════════════

/*

[ ] Chat normal funciona
    → "oi galera" → "[STADIUM] Lukra: oi galera"

[ ] Comando local funciona
    → "!swap" → Times trocam

[ ] Comando global funciona
    → "!help" → Lista de comandos

[ ] Formatação custom funciona
    → "oi" → "🔴 Lukra 👑: oi"

[ ] Bloqueio funciona
    → Sala mutada: mensagem bloqueada
    → Admin: mensagem permitida

[ ] Comandos desconhecidos
    → "!xyz" → Deixa passar (nao bloqueia)

*/

// ═════════════════════════════════════════════════════════════════════════
// COMPILAR E TESTAR
// ═════════════════════════════════════════════════════════════════════════

/*

npm run build     # Compilar TypeScript
npm test          # Rodar testes
npm test -- --watch  # Watch mode

*/

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
