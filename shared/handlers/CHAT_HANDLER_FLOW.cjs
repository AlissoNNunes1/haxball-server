/**
 * FLUXO DE PROCESSAMENTO DE CHAT - handlePlayerChat
 *
 * Visual representation de como as mensagens sao processadas
 */

/*
┌──────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE CHAT                                   │
├──────────────────────────────────────────────────────────────────────────┤

                        room.onPlayerChat(player, message)
                                    │
                                    ▼
                    handlePlayerChat(room, player, message, options)
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼ Input Validation         ▼ Extract Options          ▼ Normalize
    Null/Empty?             processGlobalCommand        Trim whitespace
    Return false            customCommands                Is empty?
                            tag, shouldBlockChat          Return false
                            formatMessage

                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │ shouldBlockChat(room, player)│
                    └─────────────────────────────┘
                            │
                   ┌────────┴────────┐
                   │ (TRUE)          │ (FALSE)
                   ▼                 ▼
            Return FALSE        Continue...
        (Bloqueia se preciso,
         ex: sala mutada)
        
                                    │
                                    ▼
                    ┌─────────────────────────────────────┐
                    │ processGlobalCommand(room, player)  │
                    │ (autenticacao, stats, etc)          │
                    └─────────────────────────────────────┘
                            │
                   ┌────────┴────────┐
                   │ PROCESSADO      │ NÃO PROCESSADO
                   ▼                 ▼
            Return FALSE        Continue...
        (Bloqueia msg original)
        
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │ Verifica se e COMANDO (!)    │
                    └──────────────────────────────┘
                            │
                   ┌────────┴────────┐
                   │ SIM (!)         │ NÃO
                   ▼                 ▼
            Extrai cmd/args      Chat Normal
            "!swap abc" =>          │
            cmd="swap"              │
            args=["abc"]            │
                │                   │
                ▼                   │
    ┌──────────────────────────┐   │
    │ Busca em customCommands  │   │
    │ customCommands["swap"]   │   │
    └──────────────────────────┘   │
            │                       │
      ┌─────┴─────┐                │
      │ ENCONTROU  │ NÃO           │
      ▼            ▼               │
    Executa   Return FALSE         │
    callback  (nao bloqueia)       │
      │                            │
      ▼                            │
    Return FALSE                   │
    (bloqueia msg)                 │
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
            ┌──────────────────┐      ┌──────────────────────────┐
            │ formatMessage    │      │ Use default formatting   │
            │ customizado?     │      │ [TAG] Nome: mensagem     │
            └──────────────────┘      └──────────────────────────┘
                    │                             │
          ┌─────────┴─────────┐                   │
          │ SIM               │ NÃO               │
          ▼                   ▼                   │
    Executar custom    displayName =               │
    formatter          formatPlayerName()          │
          │                   │                   │
          │          formatMessage = tag +         │
          │          displayName + ": " +          │
          │          message                       │
          │                   │                   │
          └────────┬──────────┴───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ ENVIAR MENSAGEM FORMATADA        │
        │ room.sendChat(formatted)         │
        │ console.log(formatted)           │
        └──────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────┐
        │ Return FALSE                     │
        │ (bloqueia mensagem original)     │
        │ (enviamos formatada)             │
        └──────────────────────────────────┘


EXEMPLOS DE FLUXO

═══════════════════════════════════════════════════════════════════════════

EXEMPLO 1: Chat Normal
───────────────────────────────────────────────────────────────────────────

Entrada: "oi galera"

onPlayerChat("Lukra", "oi galera")
    ↓
handlePlayerChat(room, "Lukra", "oi galera", options)
    ↓
shouldBlockChat() → true (permitir)
    ↓
processGlobalCommand() → false (nao e comando global)
    ↓
!message.startsWith("!") → nao e comando
    ↓
formatMessage() || default → "[STADIUM] Lukra: oi galera"
    ↓
room.sendChat("[STADIUM] Lukra: oi galera")
console.log("[Chat] [STADIUM] Lukra: oi galera")
    ↓
return false (bloqueia msg original)


═══════════════════════════════════════════════════════════════════════════

EXEMPLO 2: Comando Local
───────────────────────────────────────────────────────────────────────────

Entrada: "!swap"

onPlayerChat("Lukra", "!swap")
    ↓
handlePlayerChat(room, "Lukra", "!swap", options)
    ↓
shouldBlockChat() → true (permitir)
    ↓
processGlobalCommand() → false (nao e comando global)
    ↓
message.startsWith("!") → true (e comando!)
    ↓
cmd = "swap"
args = []
    ↓
customCommands["swap"] → encontrou!
    ↓
customCommands["swap"](room, "Lukra", [])
    → if (!admin) room.sendChat("Comando apenas de Admin")
    → else room.setPlayerTeam(...) + announce("Times trocados")
    ↓
return false (bloqueia msg original)


═══════════════════════════════════════════════════════════════════════════

EXEMPLO 3: Comando Nao Reconhecido
───────────────────────────────────────────────────────────────────────────

Entrada: "!xyz123"

onPlayerChat("Lukra", "!xyz123")
    ↓
handlePlayerChat(room, "Lukra", "!xyz123", options)
    ↓
shouldBlockChat() → true (permitir)
    ↓
processGlobalCommand() → false (nao e comando global)
    ↓
message.startsWith("!") → true (e comando!)
    ↓
cmd = "xyz123"
args = []
    ↓
customCommands["xyz123"] → NAO ENCONTROU
    ↓
return false (nao bloqueia - deixa comando passar)


═══════════════════════════════════════════════════════════════════════════

EXEMPLO 4: Sala Mutada
───────────────────────────────────────────────────────────────────────────

Entrada: "oi" (sala mutada, player nao e admin)

onPlayerChat("Bagre", "oi")
    ↓
handlePlayerChat(room, "Bagre", "oi", options)
    ↓
shouldBlockChat() → false (bloqueia - sala mutada e nao e admin)
    ↓
return false (bloqueia mensagem)


═══════════════════════════════════════════════════════════════════════════

EXEMPLO 5: Comando Global
───────────────────────────────────────────────────────────────────────────

Entrada: "!login senha123"

onPlayerChat("Lukra", "!login senha123")
    ↓
handlePlayerChat(room, "Lukra", "!login senha123", options)
    ↓
shouldBlockChat() → true (permitir)
    ↓
processGlobalCommand(room, "Lukra", "!login senha123")
    → processCommand() executa logica de autenticacao
    → retorna true (processado)
    ↓
return false (bloqueia msg original)
    → msg nao aparece no chat (segurança - evita exposição de senha)


OPCOES DE CONFIGURACAO
═══════════════════════════════════════════════════════════════════════════

handlePlayerChat(room, player, message, options = {})

options = {
  // Callback para processar comandos globais
  processGlobalCommand: (room, player, message) => {
    return processCommand(room, player, message);
  },
  
  // Map de comandos customizados da sala
  customCommands: {
    'swap': (room, player, args) => { ... },
    'hello': (room, player, args) => { ... }
  },
  
  // Prefixo para formatar mensagens
  tag: '[STADIUM]',
  
  // Validar se chat deve ser bloqueado
  shouldBlockChat: (room, player, message) => {
    // Bloquear se sala mutada e nao admin
    if (roomMuted && !player.admin) return false;
    // Bloquear se escolhendo posicao e nao e posicao
    if (choosePositionMode && !message.startsWith('!')) {
      const isPosition = ['G', 'LD', 'LE', 'Z', 'MD', 'AE', 'AD']
        .includes(message.toUpperCase());
      if (!isPosition) return false;
    }
    return true; // Permitir por padrao
  },
  
  // Custom formatter para mensagem
  formatMessage: (room, player, message) => {
    const emoji = player.team === 1 ? '🔴' : '🔵';
    const badge = player.admin ? ' 👑' : '';
    const name = (player.name || 'Unnamed') + badge;
    return `${emoji} ${name}: ${message}`;
  }
}


TIPOS DE RETORNO
═════════════════════════════════════════════════════════════════════════

return false → Bloqueia mensagem original
              → Use quando já enviou formatada

return true  → Permite mensagem original
              → Use quando nao interferiu no chat


*/

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
