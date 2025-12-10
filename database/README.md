# database

Schema e cliente Drizzle para SQLite.

## Arquivos

## Como usar

Instalar deps quando for ativar:

```
npm install drizzle-orm better-sqlite3
```

Criar cliente:

```js
import { initDb, getDb } from '../src/database/client';
const db = initDb('./haxball.sqlite');
```

```

Aplicar migrações usando CLI do Drizzle conforme necessidade.

## Como o core usa o DB
- `Server` recebe o objeto criado por `initDb()` e o passa para o `roomModule.init({ room, settings, db })`.
- `core/room-engine.mjs` adiciona o `db` ao contexto do room (`context.db = db`) e, quando presente, cria `room_session` e `matches` no `onGameStart` e grava `match_events` + stats em `onGameStop`.

## Testando na pratica
1. Inicie o servidor: `npm run build && node dist/main.js open config.json`.
2. Abra uma sala com `!open mini-soccer <token>` no Discord e jogue ate que `onGameStop` seja disparado.
3. Verifique `haxball.sqlite` com um visualizador (DBBrowser) ou linha de comando sqlite3: `SELECT * FROM match_events;` para confirmar gravacoes.
```
