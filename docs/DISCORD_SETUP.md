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

## 4. Obter IDs do Servidor e Canais

### Passo 1: Ativar Modo Desenvolvedor

1. Abra Discord
2. Vá para **User Settings** > **Advanced** > Ative **"Developer Mode"**

### Passo 2: Copiar IDs

1. **Guild ID (ID do Servidor):**

   - Clique com botao direito no **icone do servidor** (barra lateral esquerda)
   - Clique em **"Copy Server ID"**
   - **IMPORTANTE:** Este ID e necessario para registro rapido de Slash Commands!

2. **Admin Channel ID (ID do Canal Admin):**

   - Clique com botao direito no canal exclusivo para comandos admin
   - Clique em **"Copy Channel ID"**
   - Este canal sera usado apenas por usuarios master para comandos administrativos

3. **General Channel ID (ID do Canal Geral):**
   - Clique com botao direito no canal publico para comandos gerais
   - Clique em **"Copy Channel ID"**
   - Este canal sera usado por todos os usuarios para comandos de autenticacao e consultas

## 5. Atualizar config.json

Abra seu `config.json` e configure o painel Discord com os canais separados:

```json
{
  "server": {
    "execPath": "path/to/haxball.js",
    "maxMemoryUsage": 2048
  },
  "panel": {
    "discordToken": "seu_token_aqui",
    "discordPrefix": "!",
    "mastersDiscordId": ["seu_discord_id_aqui"],
    "adminChannelId": "id_do_canal_admin",
    "generalChannelId": "id_do_canal_geral",
    "bots": {
      "futsal": "./bots/futsal-example.js"
    },
    "maxRooms": 5,
    "webMonitor": {
      "port": 3000,
      "host": "localhost"
    }
  }
}
```

### Configuracao dos Canais

- **adminChannelId** (opcional): Canal exclusivo para comandos administrativos

  - Apenas usuarios em `mastersDiscordId` podem usar
  - Comandos: `/help`, `/open`, `/close`, `/reload`, `/info`, `/meminfo`, `/metrics`, `/exit`
  - Se nao configurado, comandos admin funcionam em qualquer canal

- **generalChannelId** (opcional): Canal publico para comandos gerais
  - Todos os usuarios podem usar
  - Comandos: `/register`, `/linkdiscord`, `/profile`, `/ranking`, `/top`, `/authhelp`
  - Se nao configurado, comandos funcionam em qualquer canal

### Exemplo Completo

```json
{
  "server": {
    "execPath": "./haxball.js",
    "maxMemoryUsage": 4096,
    "proxyEnabled": false
  },
  "panel": {
    "discordToken": "MTIzNDU2Nzg5MDEyMzQ1Njc4.ABcdef.XYZ123",
    "discordPrefix": "!",
    "guildId": "1234567890123456789",
    "mastersDiscordId": ["123456789012345678", "987654321098765432"],
    "adminChannelId": "111111111111111111",
    "generalChannelId": "222222222222222222",
    "bots": [
      {
        "name": "futsal",
        "path": "./bots/futsal-example.js",
        "displayName": "Futsal Bot"
      },
      {
        "name": "x3",
        "path": "./bots/x3-bot.js",
        "displayName": "X3 Bot"
      }
    ],
    "customSettings": {
      "default": {
        "reserved.haxball.maxPlayers": 16,
        "reserved.haxball.public": true,
        "reserved.haxball.geo": {
          "code": "br",
          "lat": -23.5505,
          "lon": -46.6333
        }
      }
    },
    "maxRooms": 10,
    "webMonitor": {
      "port": 3000,
      "host": "0.0.0.0"
    }
  }
}
```

### Configuracao dos Canais

- **guildId** (RECOMENDADO): ID do servidor Discord

  - **CRITICO**: Sem este campo, comandos sao registrados globalmente e podem levar **ate 1 hora** para aparecer
  - **COM guildId**: Comandos aparecem **instantaneamente** no servidor
  - Como obter: Clique direito no icone do servidor → Copy Server ID

- **adminChannelId** (opcional): Canal exclusivo para comandos administrativos

  - Apenas usuarios em `mastersDiscordId` podem usar
  - Comandos: `/help`, `/open`, `/close`, `/reload`, `/info`, `/meminfo`, `/metrics`, `/exit`
  - Se nao configurado, comandos admin funcionam em qualquer canal

- **generalChannelId** (opcional): Canal publico para comandos gerais
  - Todos os usuarios podem usar
  - Comandos: `/register`, `/linkdiscord`, `/profile`, `/ranking`, `/top`, `/authhelp`
  - Se nao configurado, comandos funcionam em qualquer canal

## 6. Comportamento dos Canais

### Canal Admin (adminChannelId)

Quando configurado, todos os comandos administrativos **DEVEM** ser executados neste canal:

- ✅ `/help` - Lista comandos admin
- ✅ `/open <bot> <token>` - Abre sala
- ✅ `/close <pid>` - Fecha sala
- ✅ `/reload` - Recarrega config
- ✅ `/info` - Informacoes das salas
- ✅ `/meminfo` - Uso de memoria
- ✅ `/metrics` - Metricas do servidor
- ✅ `/exit` - Desliga servidor
- ✅ `/tokenlink` - Link token Haxball

**Restricoes:**

- Apenas usuarios em `mastersDiscordId` tem acesso
- Se tentar usar em outro canal, bot responde com mensagem ephemeral

### Canal Geral (generalChannelId)

Quando configurado, todos os comandos de autenticacao **DEVEM** ser executados neste canal:

- ✅ `/register <nick> <senha>` - Criar conta
- ✅ `/linkdiscord <nick> <senha>` - Vincular Discord
- ✅ `/profile [nick]` - Ver perfil
- ✅ `/ranking [nick]` - Ver ranking
- ✅ `/top [criterio]` - Top jogadores
- ✅ `/authhelp` - Ajuda autenticacao

**Restricoes:**

- Todos os usuarios podem usar
- Se tentar usar em outro canal, bot responde com mensagem ephemeral

### Modo Flexivel (Sem Canais Configurados)

Se `adminChannelId` e `generalChannelId` **NAO** forem configurados:

- Comandos admin funcionam em **qualquer canal** (apenas para masters)
- Comandos de autenticacao funcionam em **qualquer canal** (para todos)

## 7. Funcionalidades Discord Disponiveis

### Slash Commands (Seguro e Moderno)

Todos os comandos usam Slash Commands (`/comando`) com:

- Autocompletar opcoes
- Validacao automatica de parametros
- Respostas ephemeral para dados sensiveis (senhas nunca aparecem publicamente)
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
