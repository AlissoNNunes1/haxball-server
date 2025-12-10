# rooms

Modulos de salas isoladas em ESM. Cada sala exposta via `createRoomModule` para ser carregada pelo core.

## Padrao do modulo

- Exportar `createRoomModule(sharedOverrides?)` retornando `{ name, init }`.
- `init({ room, settings })` deve montar contexto via `buildRoomContext` e aplicar handlers com `applyHooks`.
- Hooks disponiveis: `onPlayerJoin`, `onPlayerLeave`, `onTeamGoal`, `onTeamVictory`, `onGameTick`, `onGameStart`, `onGameStop`, `onPlayerBallKick`.
- Hooks disponiveis: `onPlayerJoin`, `onPlayerLeave`, `onTeamGoal`, `onTeamVictory`, `onGameTick`, `onGameStart`, `onGameStop`, `onPlayerBallKick`.
- DB: `init({ room, settings, db })` inclui `db` quando `openServer` inicializa o DB. Use `context.db.ensureUserByName`, `context.db.insertMatchEvent`, `context.db.incrementStatCount` para persistencia.
- Sempre encerrar arquivo com assinatura ASCII exigida pelo projeto.

## Estrutura sugerida

- `templates/base-room.mjs`: esqueleto generico para novas salas.
- `examples/mini-soccer.mjs`: exemplo simples conectando mensagens e balanceamento.

## Criar nova sala

1. Copie `templates/base-room.mjs` para `rooms/<nome>.mjs`.
2. Ajuste mensagens e regras usando `shared/config`.
3. Declare handlers e registre com `applyHooks`.
4. Caso precise stats, use `attachStatsPipeline` e envie dados para DB quando houver client.
