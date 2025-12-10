
---

```
agora com o Haxball server atualizado e funcionando 
Preciso que você construa uma estrutura modular, escalável e documentada para o sistema de salas .

A base do projeto já possui:
- um utilitário que cria e gerencia múltiplas salas Haxball;
- comandos que podem ser acionados via Discord Bot ou CLI;
- camadas existentes: control panel/orchestration, business layer (server + salas), utilities, types.

O que eu preciso agora é que você organize e padronize **TODOS OS SCRIPTS DAS SALAS**, **CONFIGURAÇÕES COMPARTILHADAS**, **BANCO DE DADOS**, **BALANCEAMENTO**, **ESTATÍSTICAS**, **ESTRUTURA DE CÓDIGO**, e crie **documentação completa** explicando tudo.

## OBJETIVOS PRINCIPAIS DO MONOREPO

1. Criar uma estrutura escalável onde múltiplas salas compartilham:
   - mensagens padrão;
   - uniformes padrão;
   - regras padrão;
   - constantes;
   - utilidades de formatação, stats, logs etc.

2. Criar um diretório `/rooms` contendo scripts de salas.
   Cada sala deve ter seu próprio módulo e deve ser possível criar novas salas modularmente.

3. Criar um módulo `/shared/config` contendo submódulos:
   - messages.js
   - uniforms.js
   - rules.js
   - stats.js
   - balance.js
   - constants.js
   Esse módulo será importado por todas as salas quando necessário.

4. Criar banco de dados SQLite com ORM Drizzle.
   Criar tabelas para:
   - users
   - matches
   - stats
   - player_ratings (Elo geral e Elo por posição)
   - room_sessions
   - match_events (gols, passes, defesas, toques etc.)
   - logs técnicos, se necessário

5. Criar um sistema de balanceamento híbrido:
   - Usa Elo geral
   - Usa Elo por posição (GK/DEF/MID/ATA)
   - Usa performance recente
   - Deve ser expansível para modelos muito mais complexos no futuro

6. Criar a base de estatísticas:
   - Começar com estatísticas simples (gols, assists, defesas, posicionamento)
   - Mas deixar preparado para estatísticas avançadas, incluindo tudo que o Haxball permitir (toques, heatmap, distância percorrida, etc.)

7. Criar documentação completa explicando:
   - estrutura de pastas;
   - responsabilidades de cada módulo;
   - como criar novas salas;
   - como funciona o módulo de configs compartilhados;
   - como integrar stats + DB + bot;
   - como funciona o balanceamento híbrido.

8. Criar um padrão de script de sala.
   O formato deve ser modular, expansível, e permitir:
   - hooks (onPlayerJoin, onPlayerLeave, onTeamGoal, onTick etc.)
   - acesso ao config global
   - injeção de configurações específicas por sala
   - acesso aos utilitários compartilhados
   - registro de estatísticas e eventos

   O Copilot deve propor **qual é o formato ideal** com base nas necessidades do projeto.

9. Estrutura do monorepo deve seguir o formato:

```

/core
/rooms
/shared
/database
/apps/discord-bot

```

10. Todo código deve ser escrito em Node.js (ESM) com JavaScript, não TypeScript.

11. O Copilot deve:
   - Criar os arquivos necessários
   - Criar boilerplates padrão
   - Criar documentação (README.md detalhados)
   - Criar diagramas
   - Criar explicações internas via comentários
   - Criar interfaces em JSDoc
   - Criar exemplos
   - Criar helpers e utilitários

## SUA MISSÃO AGORA

Com base em tudo acima:

🔹 Crie **a arquitetura completa**  
🔹 Crie **todos os arquivos iniciais**  
🔹 Crie **a documentação detalhada**  
🔹 Crie **os boilerplates dos módulos**  
🔹 Crie **o padrão de script de sala**  
🔹 Crie **o módulo compartilhado /shared/config**  
🔹 Crie **o sistema básico de stats**  
🔹 Crie **o sistema básico de balanceamento híbrido**  
🔹 Crie **os modelos Drizzle + SQLite**  
🔹 Crie **exemplos de como uma sala usa esses recursos**

Faça tudo de forma extremamente organizada, modular e escalável.

Documente cada diretório, cada arquivo e cada fluxo.

Você deve atuar como um arquiteto experiente e produzir uma base sólida que possa crescer por anos.

Comece gerando:
- Estrutura de pastas;
- READMEs;
- Descrição técnica;
- Arquivos iniciais vazios com comentários explicativos;
- Sugestões de como evoluir futuramente.

```
