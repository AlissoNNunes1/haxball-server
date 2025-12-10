# Monorepo Haxball Server - Plano de modernizacao

## Visao geral

- Estrutura pensada para multiplas salas compartilhando configs, utilitarios e dados.
- Todo codigo novo em JavaScript ESM (.mjs ou .js com type module local) e comentarios em pt-BR sem acentos.
- Cada sala e um modulo isolado em `rooms/`, orquestrado pelo nucleo em `core/` e configurado via `shared/`.
- Base de dados SQLite via Drizzle em `database/`; integracao com bots Discord fica em `apps/discord-bot/`.

## Layout proposto

```
/core               # motor comun de salas, hooks, pipelines
/rooms              # modulos de salas (templates e exemplos)
/shared             # configs e utilitarios compartilhados (type: module local)
/database           # schema Drizzle, cliente SQLite
/apps/discord-bot   # integracao Discord com salas novas
```

## Fluxo alto nivel

1. CLI/Discord chama `core` para abrir sala.
2. `core` carrega config compartilhada de `shared/config`, instancia contexto e aplica hooks padrao.
3. Script de sala em `rooms/*` registra handlers (onPlayerJoin, onTeamGoal, onTick etc.).
4. Eventos alimentam coletor de stats e balanceamento definido em `shared/config/stats|balance`.
5. Persistencia opcional via Drizzle em `database/`.

## Convencoes chave

- ESM: imports com `import ... from` e exports nomeados.
- Comentarios sempre em pt-BR sem acentos; assinatura ASCII ao fim de cada arquivo de codigo.
- Nomes: posicoes `GK/DEF/MID/ATA`; ratings Elo geral + por posicao; hooks `onPlayerJoin|Leave|TeamGoal|GameTick` etc.
- Arquivos de config em `shared/config/*.js` centralizam mensagens, regras, uniformes, constantes, stats e balance.

## Caminho de evolucao

- Adicionar CI para migracoes Drizzle e seeds.
- Inicializar DB: `initDb()` eh chamado por `openServer` automaticamente quando `database` estiver configurado.
- Integrar collectors de stats com logs do RoomMonitor existente.
- Criar adaptadores para reutilizar `src/Server.ts` e `ControlPanel` legados chamando novas salas ESM.
- Inicializar DB: `npm run build` e o servidor chamara `initDb()` opcionalmente ao iniciar via `openServer`.
- Observacao: scripts legados em VM recebem so um subconjunto seguro de funcoes DB (`ensureUserByName`, `insertMatchEvent`, `incrementStatCount`, `logEvent`), enquanto modulos ESM recebem o cliente completo.
- Expandir balanceamento para usar modelos (ML) e historico de matchs.

## Como trabalhar

- Instalar deps futuras: `npm install drizzle-orm better-sqlite3 zod` (quando for ativar DB) sem quebrar TS atual.
- Manter `dist/` gerado pelo TS separado das novas pastas ESM; nao alterar `package.json` global sem analisar impacto.
- Para rodar scripts ESM isolados, use extensao `.mjs` ou `package.json` local com `type: "module"`.
