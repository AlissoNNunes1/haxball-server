# core

Nucleo para padronizar execucao de scripts de sala em ESM.

## Objetivos

- Entregar hooks padrao (join, leave, goal, tick) e aplicar handlers declarativos.
- Fornecer contexto compartilhado (configs, balance, stats) sem acoplar ao bot.
- Permitir encaixar salas novas sem alterar Server/ControlPanel legados.

## Principais arquivos

- `room-engine.mjs`: cria contexto, aplica hooks e liga coletores de stats.

## Como usar

```js
import { buildRoomContext, applyHooks, attachStatsPipeline } from './core/room-engine.mjs';
import { messages, rules } from '../shared/config/index.js';

const context = buildRoomContext({ room, sharedConfig: { messages, rules }, settings });
applyHooks(room, handlers, context);
attachStatsPipeline(room, context);
```
