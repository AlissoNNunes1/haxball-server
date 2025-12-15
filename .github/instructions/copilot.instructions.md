---
applyTo: '**'
---

Forneca contexto do projeto e diretrizes de codificacao que a IA deve seguir ao gerar codigo, responder perguntas ou revisar alteracoes.

# Instrucoes para Copilot no Haxball Server

- **Panorama**: Projeto Node/TypeScript (strict) para abrir salas Haxball headless usando `haxball.js` (sem Chrome) e gerenciar via Discord Bot; CLI exposta em `src/main.ts` com comando `open`.
- **Arquitetura**: `openServer.ts` carrega config (`utils/loadConfig.ts`), instancia `Server` (haxball.js), inicia monitores (`RoomMonitor`/`WebMonitor`) e cria `ControlPanel` (Discord). Consulte e mantenha sempre atualizados os documentos em `docs/ARCHITECTURE.md`, `docs/roadmap.md` e `docs/HANDLERS_GUIDE.md`.
- **Server (haxball.js)**: `src/Server.ts` abre sala com `HBInit` lazy, gera PID ficticio e aplica handlers basicos de log. Scripts de bot rodam isolados via `vm.runInNewContext` com timeout 5s e contexto fornecido (`room`, `HBInit` stub que devolve a sala, `customSettings`, timers `setTimeout/setInterval/*`, `Date`, `Promise`, `global/window/self`). Evite depender de outros globais.
- **Bots**: `ControlPanel` carrega bots de `config.panel.bots`; `Bot.run` chama `Server.open` com `tokens` (usa primeiro token). Scripts de bot devem operar sobre `room` fornecida; se chamarem `HBInit`, recebem a mesma sala. Mapear dependencias externas manualmente (contexto e sandbox sao limitados).
- **Handlers Globais**: Sistema centralizado em `shared/handlers/` fornece funcionalidades reutilizaveis para todas as salas (playerHandlers, chatHandlers, goalHandlers, matchHandlers). Utilities em `shared/utils/` incluem celebrationUtils para animacoes. Todas as salas devem usar handlers globais ao inves de duplicar codigo. Consulte `docs/HANDLERS_GUIDE.md` para uso completo.
- **Discord**: Prefixo vem de `config.panel.discordPrefix`; `mastersDiscordId` controla acesso. Comandos principais: `open <bot> <token> [setting]`, `close <pid|all>`, `info`, `meminfo`, `metrics`, `reload`, `exit`, `tokenlink`. Respostas usam embeds simples e logs via `utils/log` e `utils/Logger`.
- **Sistema de Comandos**: `shared/config/commands.cjs` processa comandos globais (chat, auth, gerais). Comandos de chat: `t <mensagem>` (team chat), `@@ <nome> <mensagem>` (PM). Comandos gerais: `!help`, `!discord`, `!afk`, `!bb`. Comandos de auth: `!login`, `!logout`, `!profile`, `!stats`, `!ranking`. Handlers de chat ja integrados via `processChatMessage`.
- **Custom settings**: `ControlPanel.loadCustomSettings` resolve heranca (`extends` aceita string ou array) mesclando objetos e removendo `extends`; existe fallback para `default`. Campos reservados usados pelo server: `reserved.haxball.*` (maxPlayers, public, noPlayer, password, geo).
- **Monitores**: `RoomMonitor` acompanha salas abertas e emite relatorios periodicos (5 min). `WebMonitor` (porta padrao 3000) cria dashboard simples a partir do `RoomMonitor`.
- **Build/Test**: `npm run build` (tsc) gera `dist/`; `npm start` roda tsc + node dist/main.js; `npm test`/`npm run test:watch`/`npm run test:coverage` para Jest. Atualize apenas `src/` e rode `npm run build` para alinhar `dist/`. Suite de testes: 260+ testes (unitarios + integracao).
- **Execucao local**: `node dist/main.js open config.json` (ou via binarios `haxball-server|haxballserver`). Config exige `server` e `panel` (bots, token, prefixo, mastersDiscordId). Tokens sao obrigatorios e nao ha suporte real a proxy alem de lista de `proxyServers` (informativo).
- **Erros comuns**: Falta de globais no VM quebra bots—garanta uso apenas de APIs expostas. `HBInit` e timers ja estao stubbados; qualquer falta adicional deve ser adicionada ao contexto. Timeout de 5s pode matar scripts bloqueantes.
- **Convencoes**: Comentarios em codigo devem estar em pt-BR sem acentos; siga assinaturas ASCII ja usadas. Evite editar `dist/` manualmente (gerado). Priorize modularizacao e mantenca do estilo async/await. Sempre use handlers globais ao inves de duplicar codigo.
- **Arquivos-chave**: `src/Server.ts` (runtime haxball.js + VM), `src/ControlPanel.ts` (Discord), `src/commands/openServer.ts` (bootstrap), `src/utils/*` (log, loadConfig, ports), `shared/handlers/*` (handlers globais), `shared/utils/*` (utilities), `tests/*` (unit + integration), `docs/haxball_documentation/*` (referencia API Haxball headless), `docs/HANDLERS_GUIDE.md` (guia de handlers).
- **Como contribuir**: Use Node >=18, rode `npm run build` e `npm test` antes de PR. Mantenha nomenclatura consistente (PID ficticio inicia em 1000; logs via `log`/`Logger`). Ao criar novas salas, sempre use handlers globais de `shared/handlers/` e utilities de `shared/utils/`.

## Estrutura de Diretorios

- **bots/**: Salas Haxball, cada bot e uma sala diferente com configuracoes, regras e scripts proprios. Seguem padrao base comum definido em shared/. Exemplos: `cirs-stadium/`, `todos_jogam/`.
- **shared/**: Codigo compartilhado entre todas as salas. Contem handlers globais, utilities, configuracoes, comandos, mapas e mensagens padrao.
  - **shared/handlers/**: Handlers globais reutilizaveis (playerHandlers, chatHandlers, goalHandlers, matchHandlers). Documentacao em `shared/handlers/README.md`.
  - **shared/utils/**: Utilidades compartilhadas (celebrationUtils para animacoes). Documentacao em `shared/utils/README.md`.
  - **shared/config/**: Configuracoes globais (commands.cjs, maps.cjs, messages.cjs, utils.cjs, variables.cjs).
  - **shared/maps/**: Mapas personalizados compartilhados entre salas.
- **src/**: Codigo TypeScript do servidor principal (Server, ControlPanel, auth, database, commands, utils, debugging).
  - **src/auth/**: Sistema de autenticacao (AuthService, RoomAuthHandler, AuthAPI).
  - **src/database/**: Schemas Drizzle e clientes SQLite (schema.ts, auth-client.ts).
  - **src/balance/**: Logica de balanceamento de jogadores (algoritmos, Elo, posicoes).
  - **src/stats/**: Coleta e analise de estatisticas dos jogadores.
  - **src/commands/**: Comandos CLI (openServer, connect).
  - **src/debugging/**: Ferramentas de debugging (RoomMonitor, WebMonitor).
  - **src/utils/**: Utilidades gerais (log, Logger, loadConfig, ports).
- **tests/**: Testes unitarios e de integracao (Jest). Subdiretorios: unit/, integration/, benchmarks/.
- **docs/**: Documentacao completa do projeto (ARCHITECTURE.md, roadmap.md, HANDLERS_GUIDE.md, REFACTORING_PLAN.md, ACCOUNTS.md, BOT_COMPATIBILITY.md, haxball_documentation/).
- **dist/**: Codigo JavaScript compilado (gerado via tsc, nao editar manualmente)

## Diretrizes adicionais para Copilot

- Sempre consulte, atualize e organize os documentos na pasta `docs` ao implementar ou sugerir qualquer mudanca relevante. Priorize a manutencao e melhoria continua da documentacao existente, evitando criar arquivos desnecessarios.
- **ATENCAO: Sempre sugira melhorias gerais de arquitetura, performance, modularizacao, seguranca, acessibilidade, responsividade e boas praticas de codificacao ao revisar ou gerar codigo.**
- Ao identificar pontos de melhoria, registre sugestoes de aprimoramento nos arquivos de roadmap ou arquitetura em `docs`, mantendo o historico organizado.
- Siga sempre os principios mobile-first, responsividade e acessibilidade quando aplicavel.
- Comentarios em codigo devem ser exclusivamente em portugues brasileiro, sem acentos ou caracteres especiais, e nunca usar emotes.
- Priorize a edicao de arquivos existentes ao inves de criar novos, principalmente arquivos `.md`.
- Remova scripts de testes de uso unico apos utilizacao.
- Verifique se existe um venv antes de executar comandos python.
- Use estrutura modularizada e descentralizada.
- Evite criar documentacao para pequenas mudancas; priorize atualizar docs ja existentes.
- Sempre adicione ao final de cada codigo a assinatura ASCII padrao, conforme a linguagem do arquivo:
- comandos haxball prefixo é "!" comandos discord é slash-command

## Comunidade e Salas Haxball

Todas as salas feitas aqui é da Comunidae de Haxball CIRS (Confederacao Internacional de Real Soccer). Essa comunidade é focada no estilo Real Soccer que simula partidas de futebol realistas com regras, posições e estatísticas,mecanicas como powershot,curva,impedimento,barreira,penalti.A comunidade vai oferecer campeonatos regulares, ligas e eventos especiais para jogadores de todos os niveis.Bem como times fixos,draft,ranqueamento,filas competitivas e amistosas.

Todas as salas devem seguir um mesmo padrão/base de configuração,visual,regras,anuncios,mensagens,lidar com afks e etc.Ou seja,ter uma experiencia consistente independente da sala que o jogador entre. (shared\config)
Todos as salas são integradas com os sistemas de balanceamento,cadastro,estatísticas e ranqueamento da comunidade CIRS.(src\balance e src\stats,database,authentication,discord-bot)

A comunidade vai ter salas fixas 24 horas como:

CIRS Todos Jogam Futsal: Sala aberta 24 horas gerenciadas automaticamente em que todos que entram jogam independente de ranking,cadastro e etc.O mapa ,mecanicas e fisicas são mais simples do que real soccer para permitir partidas mais divertidas.O mapa deve se adapatar ao numero de jogadores,com times automaticos e troca de lados a cada gol,mas tambem deve ser balanceado em questão do ranking dos jogadores.Tudo deve ser automatica,adaptavel,dinamico e simples para que qualquer pessoa possa jogar a qualquer hora sem complicações.

CIRS Todos Jogam Real Soccer: Sala aberta 24 horas gerenciadas automaticamente em que todos que entram jogam independente de ranking,cadastro e etc.Mesmo conceito da sala de futsal,mas com o estilo real soccer completo com todas as mecanicas,fisicas e regras.O mapa deve se adapta ao numero de jogadores,com times automaticos e troca de lados a cada gol,mas tambem deve ser balanceado em questão do ranking dos jogadores.Tudo deve ser automatica,adaptavel,dinamico e simples para que qualquer pessoa possa jogar a qualquer hora sem complicações.Baseado no bots\cirs-stadium.js

Cirs Futsal 5X5,6x6,7x7(uma para cada): Salas abertas 24 horas focadas em partidas de futsal com times fixos de 5,6 ou 7 jogadores por lado. Essas salas são ideais para jogadores que querem praticar e competir em equipes menores,com mais dinamismo e agilidade. O sistema de balanceamento deve garantir que os times sejam equilibrados com base no ranking dos jogadores, proporcionando partidas justas e competitivas,Mas tambem deve garantir que todos tenham a oportunidade de jogar .De ver usado os mapas de futsal presentes em shared\maps

CIRS Real Soccer 5x5,6x6,7x7(uma para cada podendo ir até 11x11): Salas abertas 24 horas focadas em partidas de real soccer com times fixos de 5,6 ou 7 jogadores por lado. Essas salas sao ideais para jogadores que querem praticar e competir em equipes menores,com todas as mecanicas e regras do real soccer adaptadas para times reduzidos .O sistema de balanceamento deve garantir que os times sejam equilibrados com base no ranking dos jogadores, proporcionando partidas justas e competitivas.Mas tambem deve garantir que todos tenham a oportunidade de jogar .De ver usado os mapas de real soccer presentes em shared\maps

A comunidade tambem vai ter salas temporarias para campeonatos,ligas e eventos especiais como:

CIRS Real Soccer - _Campeonato_ - _Time1 x Time2_ (Nomes adaptaveis que devem ser digitados no comando que abre a sala): Sala temporaria que sera aberta apenas durante os campeonatos e ligas oficiais da comunidade. A opção campeonato define o mapa e script da sala.A opções de time define os uniformes e lado de cada time.

Cada sala sera configurada especificamente para o campeonato em questao,com regras,tempos,mapas e etc adaptados ao formato do evento.O sistema de balanceamento deve ser desativado nessas salas,ja que os times serao pre-definidos pelos organizadores do campeonato. As salas de campeonato devem ser abertas e fechadas manualmente pelos administradores via comandos do Discord, garantindo controle total sobre o andamento do evento.

<!--
  __  ____ ____ _  _
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/
-->
