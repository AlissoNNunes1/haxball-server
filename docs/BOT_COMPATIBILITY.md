# Compatibilidade de Scripts de Bot - haxball.js v5.0.0+

## Visao Geral

Este documento descreve como adaptar scripts de bot escritos para a arquitetura Puppeteer (v4.x) para a nova arquitetura haxball.js nativa (v5.0.0+).

## Mudancas Principais na Arquitetura

### Antes (Puppeteer - v4.x)

```javascript
// Bot script era injetado em uma pagina HTML que chamava window.HBInit
var room = window.HBInit({
  roomName: 'Minha Sala',
  maxPlayers: 16,
  token: 'thr1.xxxxx'  // Token injetado aqui
});

room.onPlayerJoin = function(player) {
  // ... bot logic
};
```

**Problemas:**
- Depende de injecao de codigo em pagina HTML
- window.HBInit nao e mais disponivel
- Token e injetado via JavaScript
- Necessita Chrome/Chromium

### Depois (haxball.js - v5.0.0+)

```javascript
// room e fornecida automaticamente no contexto
// Token e configuracao sao passados pelo Server.ts

room.onPlayerJoin = function(player) {
  // ... bot logic
};
```

**Vantagens:**
- Execucao direta sem dependencia de browser
- Contexto limpo com apenas o necessario
- Token gerenciado pelo servidor
- Sem necessidade de Chrome

## Guia de Migracao

### 1. Remover window.HBInit

**ANTES:**
```javascript
var room = window.HBInit({
  roomName: 'Futsal',
  maxPlayers: 16,
  public: true,
  noPlayer: true,
  token: 'thr1.xxxxx'
});
```

**DEPOIS:**
```javascript
// room e fornecida automaticamente
// Configuracao e feita em Server.ts ou via customSettings
```

**Como Configurar:**

No `ControlPanel.ts` ao abrir uma sala:
```typescript
// room ja e configurada com os parametros corretos
// O bot script recebe room ja pronta
```

### 2. Acessar Custom Settings

Se seu bot precisa de configuracoes personalizadas:

**ANTES:**
```javascript
var gameMode = window.customSettings?.gameMode ?? 4;
```

**DEPOIS:**
```javascript
// customSettings e injetada no contexto
var gameMode = customSettings?.gameMode ?? 4;

// Ou se preferir:
var gameMode = (typeof customSettings !== 'undefined' && customSettings.gameMode)
  ? customSettings.gameMode
  : 4;
```

### 3. Logging e Debug

**ANTES:**
```javascript
// Chrome DevTools
console.log('Debug info');
// Visualizar em DevTools do Chrome
```

**DEPOIS:**
```javascript
// Logging estruturado
console.log('Debug info');
// Capturado pelo sistema de logging do Server
// Visivel em:
// - stdout do servidor
// - Relatorios do RoomMonitor
// - Comando !metrics do Discord
```

### 4. localStorage nao Funciona

**PROBLEMA:**
```javascript
// NAOAVA FUNCIONAR
var data = localStorage.getItem('myKey');
localStorage.setItem('myKey', 'myValue');
```

**SOLUCAO 1: Usar Variaveis Globais**
```javascript
// Declarar fora dos handlers
let botData = {
  playerStats: {},
  gameConfig: {}
};

// Usar em handlers
botData.playerStats[player.id] = { goals: 0 };
```

**SOLUCAO 2: Inicializar no Contexto Global**
```javascript
// Server.ts pode injetar dados iniciais via customSettings
var playerStats = customSettings?.playerStats || {};
var gameConfig = customSettings?.gameConfig || {};
```

### 5. Comunicacao com Servidor

Se seu bot precisa se comunicar com o servidor:

**ANTES:**
```javascript
// Via fetch para endpoint externo
fetch('http://localhost:3000/api/goal', {
  method: 'POST',
  body: JSON.stringify({ player: player.id, goal: true })
});
```

**DEPOIS:**
```javascript
// Mesmo metodo ainda funciona
// Mas recomenda-se usar event handlers para logging

// O Server.ts intercepta eventos e pode:
// - Logar em banco de dados
// - Enviar webhook
// - Atualizar metricas
```

## Padroes Comuns de Migracao

### Padroes 1: Bot Simples (Sem Estado)

**ANTES:**
```javascript
var room = window.HBInit({ roomName: 'Simple' });

room.onPlayerJoin = function(player) {
  room.sendChat('Bem-vindo ' + player.name);
};

room.onGoal = function(player) {
  room.sendChat('Goool!');
};
```

**DEPOIS:**
```javascript
// Nenhuma mudanca necessaria!
room.onPlayerJoin = function(player) {
  room.sendChat('Bem-vindo ' + player.name);
};

room.onGoal = function(player) {
  room.sendChat('Goool!');
};
```

### Padroes 2: Bot com Estado Local

**ANTES:**
```javascript
var room = window.HBInit({ roomName: 'Stateful' });

var gameState = { redScore: 0, blueScore: 0 };

room.onGoal = function(player) {
  if (player.team === 1) gameState.redScore++;
  if (player.team === 2) gameState.blueScore++;
};
```

**DEPOIS:**
```javascript
// Praticamente identico, apenas remova window.HBInit
var gameState = { redScore: 0, blueScore: 0 };

room.onGoal = function(player) {
  if (player.team === 1) gameState.redScore++;
  if (player.team === 2) gameState.blueScore++;
};
```

### Padroes 3: Bot com Configuracao

**ANTES:**
```javascript
var room = window.HBInit({ roomName: 'Configured' });

var maxScore = window.customSettings?.maxScore ?? 5;
var gameMode = window.customSettings?.gameMode ?? '4v4';

room.sendChat(`Modo: ${gameMode}, Limite: ${maxScore}`);
```

**DEPOIS:**
```javascript
// Praticamente identico
var maxScore = customSettings?.maxScore ?? 5;
var gameMode = customSettings?.gameMode ?? '4v4';

room.sendChat(`Modo: ${gameMode}, Limite: ${maxScore}`);
```

## Event Handlers Disponiveis

Todos os event handlers padrao do haxball funcionam:

```javascript
// Entrada/saida de jogador
room.onPlayerJoin = function(player) { };
room.onPlayerLeave = function(player) { };

// Gol
room.onGoal = function(player) { };

// Chat
room.onPlayerChat = function(player, message) { return true; };

// Jogo
room.onGameStart = function() { };
room.onGameStop = function() { };
room.onGamePause = function() { };
room.onGameUnpause = function() { };

// Bola
room.onBallKick = function(player) { };

// Time
room.onTeamGoal = function(team) { };

// Tick do jogo
room.onGameTick = function() { };

// Link da sala atualizado
room.onRoomLink = function(link) { };

// Erro
room.onRoomError = function(error) { };
```

## Ferramentas de Migracao

### Script Automatico

Uma ferramenta foi criada para automatizar partes da migracao:

```bash
# Migrar um arquivo
node scripts/migrate-bot-scripts.js bots/meu-bot.js

# Migrar diretorio inteiro
node scripts/migrate-bot-scripts.js bots/

# Mostrar detalhes
node scripts/migrate-bot-scripts.js bots/ --verbose

# Mostrar guia completo
node scripts/migrate-bot-scripts.js bots/ --guide
```

**O que o script faz automaticamente:**
- Remove `var room = window.HBInit(...)`
- Remove `const room = window.HBInit(...)`
- Remove `let room = window.HBInit(...)`
- Adiciona cabecalho de migracao
- Avisa sobre patterns que precisam revisao manual

**O que REQUER revisao manual:**
- Referencias a `window.*`
- Uso de `localStorage` / `sessionStorage`
- Scripts complexos com efeitos colaterais

## Testando Scripts Migrados

### 1. Verificacao Basica

```bash
# Compilar o projeto
npm run build

# Executar testes
npm test
```

### 2. Teste Manual

1. Abrir servidor localmente
2. Conectar bot via Discord: `!open <bot> <token>`
3. Verificar em `!metrics` se bot esta funcional
4. Testar funcionalidades principais do bot

### 3. Script de Teste Automatico (Futuro)

```bash
npm run test:bot bots/futsal-example.js
```

(Será implementado em releases futuras)

## Compatibilidade com Versoes Antigas

Se ainda precisar suportar scripts para v4.x (Puppeteer):

### Opcao 1: Manter Ambas Versoes

- Branch `main`: v4.x com Puppeteer
- Branch `modernization-v5`: v5.x com haxball.js

### Opcao 2: Compatibilidade Retroativa

```typescript
// Em Server.ts - Opcao de compatibilidade
if (scriptConfig.version === 'v4') {
  // Modo compatibilidade Puppeteer
  return runPuppeteerScript(script);
} else {
  // Modo haxball.js nativo
  return runHaxballScript(script);
}
```

## Exemplos de Scripts Migrados

Veja `bots/futsal-example.js` para um exemplo completo de:
- Gerenciamento de times
- Sistema de pontuacao
- Comandos de chat
- Event handlers completos

## Troubleshooting

### Erro: "room is not defined"

**Causa:** Room nao foi injetada no contexto

**Solucao:** Verifique que o script esta sendo executado pelo Server.ts

### Erro: "customSettings is not defined"

**Causa:** Script tenta acessar customSettings mas nao foi fornecida

**Solucao:** Adicione verificacao de seguranca:
```javascript
var setting = (typeof customSettings !== 'undefined')
  ? customSettings.myKey
  : defaultValue;
```

### Room nao funciona

**Causa:** Possivelmente script foi escrito para Puppeteer

**Solucao:** Execute o script de migracao automatica:
```bash
node scripts/migrate-bot-scripts.js bots/seu-bot.js --verbose
```

### Performance lenta

**Causa:** Bot ou room com muitos event listeners

**Solucao:** Remova listeners desnecessarios ou otimize handlers

## Checklist de Migracao

- [ ] Remover `window.HBInit` e atribuicoes de room
- [ ] Remover referencias a `window.*`
- [ ] Substituir `window.customSettings` por `customSettings`
- [ ] Remover `localStorage` / `sessionStorage` (substituir por variaveis)
- [ ] Verificar todos os event handlers
- [ ] Testar script em ambiente local
- [ ] Validar `npm run build` (0 erros)
- [ ] Validar `npm test` (29+ testes passando)
- [ ] Testar bot em sala real
- [ ] Documentar qualquer mudanca customizada

## Proximas Melhorias

- [ ] Validador de scripts (verificar compatibilidade)
- [ ] Sandbox para execucao segura de scripts
- [ ] Hot-reload de scripts sem reiniciar sala
- [ ] Profiler de performance de bots
- [ ] Web UI para testar scripts

## Referencias

- [haxball.js Documentacao](https://github.com/mertushka/haxball.js)
- [Changelog v5.0.0](../CHANGELOG.md)
- [Guia de Arquitetura](../docs/ARCHITECTURE.md)

---

**Versao:** 1.0  
**Ultima Atualizacao:** 2024-12-09  
**Status:** Producao

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
