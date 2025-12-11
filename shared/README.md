# shared

Configs e utilitarios compartilhados para scripts de sala.

## Conteudo

### Modulos ESM (padrao para novas salas)

- `config/messages.js`: textos padrao de eventos.
- `config/uniforms.js`: paleta e avatares simbolicos.
- `config/rules.js`: regras e limites padrao.
- `config/stats.js`: toggles de coleta de estatisticas.
- `config/balance.js`: funcoes de pontuacao e split de times.
- `config/constants.js`: enum de posicoes, times e eventos.
- `config/index.js`: reexports para import unico.

### Modulos CommonJS (legado - CIRS Stadium)

- `config/cirs-main.js`: Entry point da sala CIRS Stadium.
- `config/cirs-handlers.js`: Handlers de eventos (onPlayerJoin, onPlayerChat, etc.).
- `config/cirs-messages.js`: Funcoes announce, whisper, isAdminPresent.
- `config/cirs-rules.js`: Classe Game, posicoes, formacoes, impedimento.
- `config/maps.js`: Mapa custom CIRS Stadium (getRealSoccerMap).
- `config/variables.js`: Variaveis globais (cores, timeouts, configuracoes).
- `config/utils.js`: Utilitarios (pointDistance, sleep, ballWarning).

## Uso rapido (ESM)

```js
import { messages, rules, scorePlayer } from '../shared/config/index.js';
```

## Uso rapido (CommonJS - CIRS)

```js
const { Game } = require('../../shared/config/cirs-rules');
const { getRealSoccerMap } = require('../../shared/config/maps');
const { announce, whisper } = require('../../shared/config/cirs-messages');
```
