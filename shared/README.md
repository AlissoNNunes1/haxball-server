# shared

Configs e utilitarios compartilhados para scripts de sala.

## Estrutura

```
shared/
├── config/                      # Arquivos COMUNS a todas as salas
│   ├── commands.cjs             # Sistema de comandos globais (!help, !login, !afk)
│   ├── maps.cjs                 # Funcoes de mapas (getFutsalMap, getRealSoccerMap)
│   ├── utils.cjs                # Utilitarios (sleep, pointDistance, ballWarning)
│   ├── variables.cjs            # Variaveis globais (cores, timeouts, configs)
│   └── index.js                 # Exports ESM (futuro)
└── maps/                        # Mapas .hbs (futsal_3x3_4x4, futsal_5x5_6x6, etc)
```

**IMPORTANTE**: Codigo especifico de cada sala fica em `bots/<nome-da-sala>/`

## Uso (CommonJS)

```js
// Comandos globais
const { processCommand } = require('../shared/config/commands.cjs');

// Mapas
const { getFutsalMap, getRealSoccerMap } = require('../shared/config/maps.cjs');

// Utilitarios
const { sleep, pointDistance } = require('../shared/config/utils.cjs');

// Variaveis
const { roomName, maxPlayers, token } = require('../shared/config/variables.cjs');
```

## Arquivos em bots/

Cada sala tem sua propria pasta:

```
bots/
├── cirs-stadium/                # CIRS Stadium (Real Soccer)
│   ├── handlers.cjs             # Handlers de eventos
│   ├── rules.cjs                # Regras, formacoes, impedimento
│   ├── messages.cjs             # announce, whisper especificos
│   └── main.cjs                 # Logica principal
├── cirs-stadium.js              # Entry point CIRS
├── todos_jogam/                 # Todos Jogam (Futsal)
│   └── handlers.cjs             # Handlers simplificados
└── todos_jogam.js               # Entry point Todos Jogam
```

<!--
  __  ____ ____ _  _
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/
-->
