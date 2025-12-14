# Migracao para Slash Commands

## Visao Geral

Este documento descreve a migracao completa dos comandos Discord de prefixo (`!comando`) para Slash Commands (`/comando`) implementada para resolver problemas criticos de seguranca, especialmente a exposicao publica de senhas nos comandos de autenticacao.

## Motivacao

### Problema Critico

- Comandos como `!register <nick> <senha>` expunham senhas publicamente no chat Discord
- Qualquer usuario no canal podia ver as credenciais de outros usuarios
- Violacao grave de seguranca que comprometia todas as contas criadas via Discord

### Solucao

- Slash Commands com respostas `ephemeral: true`
- Apenas o usuario que executou o comando ve a resposta
- Senhas nunca aparecem no historico publico do canal

## Arquitetura

### Arquivos Criados/Modificados

#### 1. `src/commands/registerSlashCommands.ts` (NOVO)

Registra todos os slash commands com a API do Discord:

- Comandos Admin: `/help`, `/info`, `/meminfo`, `/metrics`, `/open`, `/close`, `/reload`, `/exit`, `/tokenlink`
- Comandos Auth: `/register`, `/linkdiscord`, `/profile`, `/ranking`, `/top`, `/authhelp`

```typescript
// Exemplo de definicao de comando com opcoes
new SlashCommandBuilder()
  .setName('register')
  .setDescription('Criar conta de autenticacao')
  .addStringOption((opt) => opt.setName('nick').setDescription('Nick Haxball').setRequired(true))
  .addStringOption((opt) =>
    opt.setName('senha').setDescription('Senha da conta').setRequired(true)
  );
```

#### 2. `src/auth/AuthCommands.ts` (REESCRITO)

Implementa handlers para todos os comandos de autenticacao:

- `handleInteraction()`: Router principal para slash commands
- `handleRegisterSlash()`: Criacao de conta (ephemeral)
- `handleLinkDiscordSlash()`: Vinculacao Discord (ephemeral)
- `handleProfileSlash()`: Visualizar perfil (publico)
- `handleRankingSlash()`: Alias para profile
- `handleTopSlash()`: Leaderboard (publico)
- `handleAuthHelpSlash()`: Ajuda auth (publico)

**Seguranca:**

```typescript
await interaction.reply({
  content: 'Senha sensivel aqui',
  ephemeral: true, // APENAS o usuario ve
});
```

#### 3. `src/ControlPanel.ts` (ATUALIZADO)

Integra os slash commands ao bot Discord:

**Event Handlers:**

```typescript
// Registra comandos ao iniciar
this.client.on('ready', async () => {
  if (this.client.user) {
    await registerSlashCommands(this.token, this.client.user.id);
  }
});

// Processa interacoes
this.client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await this.handleSlashCommand(interaction);
});
```

**Comando Open:**

```typescript
private async handleOpenSlash(interaction) {
  const botName = interaction.options.getString('bot', true);
  const token = interaction.options.getString('token', true);
  const setting = interaction.options.getString('setting') || 'default';

  await interaction.deferReply(); // Long-running operation

  const bot = this.bots.find(b => b.name === botName);
  const script = await bot.read();
  const browser = await bot.run(this.server, script, [token], settings);

  await interaction.editReply({ embeds: [successEmbed] });
}
```

## Tipos de Comandos

### Comandos Ephemeral (Privados)

Respostas visiveis apenas para o usuario que executou:

- `/register` - Cria conta (senha oculta)
- `/linkdiscord` - Vincula Discord (senha oculta)
- Mensagens de erro admin (sem permissao)

### Comandos Publicos

Respostas visiveis para todos no canal:

- `/help`, `/info`, `/meminfo`, `/metrics`
- `/profile`, `/ranking`, `/top`, `/authhelp`
- `/open`, `/close`, `/reload`, `/exit`, `/tokenlink`

## Registro de Comandos

### Guild vs Global

```typescript
// Guild (rapido, ~1s, apenas servidor especifico)
await registerSlashCommands(token, clientId, guildId);

// Global (lento, ate 1h, todos os servidores)
await registerSlashCommands(token, clientId);
```

**Recomendacao:** Use `guildId` durante desenvolvimento para testes rapidos.

## Backward Compatibility

### Comandos Antigos Deprecated

Os comandos com prefixo (`!`) ainda funcionam mas exibem avisos:

```
Help - CIRS Haxball Server
Comandos disponiveis do servidor

⚠️ AVISO: Comandos com prefixo (!) estao DEPRECATED.
Use Slash Commands (/) para maior seguranca.

**Comandos de Autenticacao** ⚠️ DEPRECATED - USE /authhelp
⚠️ IMPORTANTE: !register e !linkdiscord expoe senhas publicamente!
USE /register e /linkdiscord (respostas privadas)
```

### Plano de Depreciacao

1. **Fase Atual:** Ambos funcionam, avisos exibidos
2. **Proxima Fase:** Comandos antigos desabilitados, redirecionam para slash
3. **Fase Final:** Remover handlers de comandos antigos completamente

## Testes

### Checklist de Verificacao

#### Comandos Auth

- [ ] `/register <nick> <senha>` - Resposta ephemeral, senha nao aparece no chat
- [ ] `/linkdiscord <nick> <senha>` - Resposta ephemeral, senha nao aparece no chat
- [ ] `/profile [nick]` - Exibe perfil publicamente
- [ ] `/ranking [nick]` - Alias de profile
- [ ] `/top [criterio]` - Leaderboard por ranking/pontos
- [ ] `/authhelp` - Ajuda publica

#### Comandos Admin (Master Check)

- [ ] `/help` - Lista comandos
- [ ] `/info` - Salas abertas
- [ ] `/meminfo` - Uso de memoria
- [ ] `/metrics` - Metricas das salas
- [ ] `/open <bot> <token> [setting]` - Abre sala
- [ ] `/close <pid|all>` - Fecha sala(s)
- [ ] `/reload` - Recarrega config
- [ ] `/exit` - Desliga servidor
- [ ] `/tokenlink` - Link para token Haxball

#### Seguranca

- [ ] Usuarios nao-master recebem mensagem ephemeral ao tentar comandos admin
- [ ] Senhas nunca aparecem em mensagens publicas
- [ ] Historico do chat nao contem credenciais

### Como Testar

1. **Registrar Comandos:**
   ```bash
   npm run build
   npm start -- open config.json
   ```
2. **No Discord:**
   - Digite `/` para ver lista de comandos
   - Comandos com icone de cadeado sao da aplicacao
3. **Testar Ephemeral:**
   - Execute `/register teste senha123`
   - Verifique que APENAS voce ve a resposta
   - Outros usuarios nao veem nada

## Troubleshooting

### Comandos Nao Aparecem

- **Causa:** Registro falhou ou ainda esta propagando
- **Solucao:**
  - Verifique logs do bot ao iniciar
  - Use `guildId` para registro rapido em desenvolvimento
  - Aguarde ate 1h para registro global

### Erro "Unknown Interaction"

- **Causa:** Bot reiniciado mas comando foi executado antes
- **Solucao:** Execute o comando novamente

### Opcoes Nao Aparecem

- **Causa:** SlashCommandBuilder mal configurado
- **Solucao:**
  - Verifique `src/commands/registerSlashCommands.ts`
  - Confirme que opcoes tem `.setRequired(true/false)`

### Permissoes

- **Causa:** Bot sem permissao `applications.commands`
- **Solucao:** Reinvite bot com scope `bot` + `applications.commands`

## Performance

### Latencia

- Slash Commands: ~200-500ms (API Discord)
- Comandos Prefixo: ~100-300ms (mensagem texto)

**Trade-off:** Pequeno aumento de latencia em troca de seguranca significativa.

### Rate Limits

- Slash Commands: Mesmo limite de API (50 requests/s)
- Registro: 200 comandos globais, 100 por guild

## Proximos Passos

1. **Desabilitar comandos antigos completamente**

   - Remover handlers de `!register` e `!linkdiscord`
   - Exibir apenas mensagem redirecionando para slash commands

2. **Adicionar comandos in-game**

   - Implementar slash commands que interagem com salas abertas
   - Ex: `/kick <pid> <player>`, `/announce <pid> <msg>`

3. **Melhorar UX**

   - Adicionar autocomplete para opcoes (lista de bots, PIDs)
   - Implementar subcommands (ex: `/room open`, `/room close`)

4. **Logs e Auditoria**
   - Registrar todas as execucoes de comandos sensíveis
   - Criar dashboard de uso de comandos

## Referencias

- [Discord.js Guide - Slash Commands](https://discordjs.guide/interactions/slash-commands.html)
- [Discord API - Interactions](https://discord.com/developers/docs/interactions/application-commands)
- [Ephemeral Messages](https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-response-object-messages)

## Changelog

### 2025-01-XX - v6.1.0

- ✅ Implementados todos os slash commands
- ✅ Respostas ephemeral para senhas
- ✅ Registro automatico ao iniciar bot
- ✅ Handlers admin com master check
- ✅ Deprecacao de comandos antigos
- ✅ Documentacao completa

---

---

/ \_\/ **_) _**) )( \
/ \_** \_** ) \/ (
\_/\_(\_**\_(\_\_**|\_\_\_\_/
