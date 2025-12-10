# Guia de Configuracao Discord

Este guia explica como configurar a integracao do Discord com o haxball-server.

## 1. Criar uma Aplicacao no Discord Developer Portal

### Passo 1: Acessar Developer Portal

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em **"New Application"**
3. De um nome para sua aplicacao (ex: "Haxball Bot")
4. Clique em **"Create"**

### Passo 2: Copiar Token do Bot

1. No painel lateral esquerdo, clique em **"Bot"**
2. Clique em **"Add Bot"** (se nao tiver criado ainda)
3. Em **"TOKEN"**, clique em **"Copy"**
4. Salve este token em um lugar seguro

> **Aviso:** Nunca compartilhe seu token! Qualquer um com acesso pode controlar seu bot.

## 2. Configurar Permissoes e Intents

### Passo 1: Ativar Intents Necessarios

1. Na aba **"Bot"**, role ate **"GATEWAY INTENTS"**
2. Ative os seguintes intents:
   - ✅ **Message Content Intent** (obrigatorio para ler mensagens)
   - ✅ **Guild Messages** (para mensagens em servidores)
   - ✅ **Direct Messages** (para DMs)

### Passo 2: Configurar Permissoes

1. Na aba **"Bot"**, role ate **"SCOPES"** ou em **"OAuth2"** no painel esquerdo
2. Selecione as permissoes necessarias:
   - ✅ **Send Messages**
   - ✅ **Embed Links**
   - ✅ **Read Message History**
   - ✅ **Add Reactions**

## 3. Gerar URL de Convite

### Metodo 1: Usando OAuth2

1. Vá para **"OAuth2"** > **"URL Generator"** no painel esquerdo
2. Em **"SCOPES"**, selecione:
   - ✅ `bot`
3. Em **"PERMISSIONS"**, selecione:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Add Reactions
4. Copie a URL gerada
5. Abra em seu navegador e convide o bot para seu servidor

### Metodo 2: URL Manual

```
https://discord.com/api/oauth2/authorize?client_id=SEU_CLIENT_ID&permissions=2048&scope=bot
```

Substitua `SEU_CLIENT_ID` pelo ID da sua aplicacao (encontrado em **"General Information"**)

## 4. Obter IDs do Servidor e Canal

### Passo 1: Ativar Modo Desenvolvedor

1. Abra Discord
2. Vá para **User Settings** > **Advanced** > Ative **"Developer Mode"**

### Passo 2: Copiar IDs

1. **Guild ID (ID do Servidor):**

   - Clique com botao direito no servidor
   - Clique em **"Copy Server ID"**

2. **Channel ID (ID do Canal):**
   - Clique com botao direito no canal onde deseja as notificacoes
   - Clique em **"Copy Channel ID"**

## 5. Atualizar config.json

Abra seu `config.json` e atualize a secao Discord:

```json
{
  "discord": {
    "enabled": true,
    "token": "seu_token_aqui",
    "channelId": "seu_channel_id_aqui",
    "guildId": "seu_guild_id_aqui",
    "allowPlayerStats": true,
    "allowScoreBroadcast": true,
    "allowGoalNotifications": true
  }
}
```

Substitua:

- `seu_token_aqui` → Token copiado na etapa 1
- `seu_channel_id_aqui` → Channel ID copiado na etapa 4
- `seu_guild_id_aqui` → Guild ID copiado na etapa 4

## 6. Funcionalidades Discord Disponiveis

### Com `allowPlayerStats: true`

- Notificacoes quando jogadores entram/saem
- Exibicao de estatisticas de jogadores
- Lista de jogadores online

### Com `allowScoreBroadcast: true`

- Notificacoes de gols marcados
- Placar atualizado em tempo real
- Notificacao de fim de partida

### Com `allowGoalNotifications: true`

- Mensagens especiais quando gols sao marcados
- Detalhes de quem marcou e assist

## 7. Testar a Integracao

1. Inicie o servidor:

```bash
node dist/main.js open config.json
```

2. Crie uma sala e entre no jogo

3. Verifique as notificacoes no Discord:
   - Entrada/saida de jogadores
   - Gols marcados
   - Fim de partida

## 8. Solucao de Problemas

### Bot nao aparece online no Discord

- Verifique se o token esta correto
- Verifique se os Gateway Intents estao ativados
- Reinicie o bot

### Mensagens nao sao enviadas

- Verifique se o bot tem permissao de enviar mensagens no canal
- Verifique se `channelId` esta correto
- Verifique se `enabled: true` esta configurado

### Erro "Invalid Token"

- Copie o token novamente (pode estar incompleto)
- Nao compartilhe o token com ninguem
- Se comprometido, regenere o token no Developer Portal

### Erro "Missing Permissions"

- Verifique as permissoes do bot no servidor Discord
- Veja se o canal tem as permissoes corretas para o bot

## 9. Seguranca

- **Nunca** commit seu token no Git (adicione ao `.gitignore`)
- Use variaveis de ambiente em producao:

```json
{
  "discord": {
    "token": "${DISCORD_TOKEN}",
    "channelId": "${DISCORD_CHANNEL_ID}",
    "guildId": "${DISCORD_GUILD_ID}"
  }
}
```

E defina as variaveis:

```bash
$env:DISCORD_TOKEN = "seu_token"
$env:DISCORD_CHANNEL_ID = "seu_channel_id"
$env:DISCORD_GUILD_ID = "seu_guild_id"
```

## 10. Proximas Etapas

Apos configurar com sucesso:

- Customize as mensagens Discord editando o arquivo de templates
- Configure comandos adicionais no bot
- Implemente webhooks para seu website

Para mais ajuda, consulte a [documentacao do Discord.js](https://discord.js.org)
