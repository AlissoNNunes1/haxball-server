---
applyTo: '**'
---
Forneca contexto do projeto e diretrizes de codificacao que a IA deve seguir ao gerar codigo, responder perguntas ou revisar alteracoes.

# Instrucoes para Copilot no Haxball Server

- **Panorama**: Projeto Node/TypeScript (strict) para abrir salas Haxball headless usando `haxball.js` (sem Chrome) e gerenciar via Discord Bot; CLI exposta em `src/main.ts` com comando `open`.
- **Arquitetura**: `openServer.ts` carrega config (`utils/loadConfig.ts`), instancia `Server` (haxball.js), inicia monitores (`RoomMonitor`/`WebMonitor`) e cria `ControlPanel` (Discord). Consulte e mantenha sempre atualizados os documentos em `docs/ARCHITECTURE.md` e `docs/roadmap.md`.
- **Server (haxball.js)**: `src/Server.ts` abre sala com `HBInit` lazy, gera PID ficticio e aplica handlers basicos de log. Scripts de bot rodam isolados via `vm.runInNewContext` com timeout 5s e contexto fornecido (`room`, `HBInit` stub que devolve a sala, `customSettings`, timers `setTimeout/setInterval/*`, `Date`, `Promise`, `global/window/self`). Evite depender de outros globais.
- **Bots**: `ControlPanel` carrega bots de `config.panel.bots`; `Bot.run` chama `Server.open` com `tokens` (usa primeiro token). Scripts de bot devem operar sobre `room` fornecida; se chamarem `HBInit`, recebem a mesma sala. Mapear dependencias externas manualmente (contexto e sandbox sao limitados).
- **Discord**: Prefixo vem de `config.panel.discordPrefix`; `mastersDiscordId` controla acesso. Comandos principais: `open <bot> <token> [setting]`, `close <pid|all>`, `info`, `meminfo`, `metrics`, `reload`, `exit`, `tokenlink`. Respostas usam embeds simples e logs via `utils/log` e `utils/Logger`.
- **Custom settings**: `ControlPanel.loadCustomSettings` resolve heranca (`extends` aceita string ou array) mesclando objetos e removendo `extends`; existe fallback para `default`. Campos reservados usados pelo server: `reserved.haxball.*` (maxPlayers, public, noPlayer, password, geo).
- **Monitores**: `RoomMonitor` acompanha salas abertas e emite relatorios periodicos (5 min). `WebMonitor` (porta padrao 3000) cria dashboard simples a partir do `RoomMonitor`.
- **Build/Test**: `npm run build` (tsc) gera `dist/`; `npm start` roda tsc + node dist/main.js; `npm test`/`npm run test:watch`/`npm run test:coverage` para Jest. Atualize apenas `src/` e rode `npm run build` para alinhar `dist/`.
- **Execucao local**: `node dist/main.js open config.json` (ou via binarios `haxball-server|haxballserver`). Config exige `server` e `panel` (bots, token, prefixo, mastersDiscordId). Tokens sao obrigatorios e nao ha suporte real a proxy alem de lista de `proxyServers` (informativo).
- **Erros comuns**: Falta de globais no VM quebra bots—garanta uso apenas de APIs expostas. `HBInit` e timers ja estao stubbados; qualquer falta adicional deve ser adicionada ao contexto. Timeout de 5s pode matar scripts bloqueantes.
- **Convencoes**: Comentarios em codigo devem estar em pt-BR sem acentos; siga assinaturas ASCII ja usadas. Evite editar `dist/` manualmente (gerado). Priorize modularizacao e mantenca do estilo async/await.
- **Arquivos-chave**: `src/Server.ts` (runtime haxball.js + VM), `src/ControlPanel.ts` (Discord), `src/commands/openServer.ts` (bootstrap), `src/utils/*` (log, loadConfig, ports), `tests/*` (unit + integration baseline), `docs/haxball_documentation/*` (referencia API Haxball headless).
- **Como contribuir**: Use Node >=18, rode `npm run build` e `npm test` antes de PR. Mantenha nomenclatura consistente (PID ficticio inicia em 1000; logs via `log`/`Logger`).

## Diretrizes adicionais para Copilot

- Sempre consulte, atualize e organize os documentos na pasta `docs` ao implementar ou sugerir qualquer mudanca relevante. Priorize a manutencao e melhoria continua da documentacao existente, evitando criar arquivos desnecessarios.
- Sempre sugira melhorias gerais de arquitetura, performance, modularizacao, seguranca, acessibilidade, responsividade e boas praticas de codificacao ao revisar ou gerar codigo.
- Ao identificar pontos de melhoria, registre sugestoes de aprimoramento nos arquivos de roadmap ou arquitetura em `docs`, mantendo o historico organizado.
- Siga sempre os principios mobile-first, responsividade e acessibilidade quando aplicavel.
- Comentarios em codigo devem ser exclusivamente em portugues brasileiro, sem acentos ou caracteres especiais, e nunca usar emotes.
- Priorize a edicao de arquivos existentes ao inves de criar novos, principalmente arquivos `.md`.
- Remova scripts de testes de uso unico apos utilizacao.
- Verifique se existe um venv antes de executar comandos python.
- Use estrutura modularizada e descentralizada.
- Evite criar documentacao para pequenas mudancas; priorize atualizar docs ja existentes.
- Sempre adicione ao final de cada codigo a assinatura ASCII padrao, conforme a linguagem do arquivo:

  __  ____ ____ _  _ 
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/

<!--
  __  ____ ____ _  _
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/
-->
