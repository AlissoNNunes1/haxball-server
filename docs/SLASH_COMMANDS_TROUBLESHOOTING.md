# Troubleshooting - Slash Commands nao aparecem

## Problema Identificado

Os slash commands nao estavam aparecendo no Discord por **2 razoes principais**:

### 1. Registro Global vs Guild (CRITICO)

**Problema:** O codigo estava registrando os comandos **globalmente** (sem `guildId`), o que pode demorar **ate 1 hora** para propagar.

**Solucao:** Adicionar `guildId` no `config.json` para registro **instantaneo** no servidor especifico.

### 2. Falta do Guild ID na Configuracao

**Problema:** Campo `guildId` nao estava no config.json

**Solucao:** Adicionar o ID do servidor Discord na configuracao

## Como Obter o Guild ID

### Passo 1: Ativar Developer Mode

1. Abra Discord
2. Va em **User Settings** (engrenagem ao lado do seu nome)
3. Va em **Advanced** (Avancado)
4. Ative **Developer Mode** (Modo Desenvolvedor)

### Passo 2: Copiar Guild ID

1. Clique com botao **direito** no **icone do servidor** (lado esquerdo)
2. Clique em **"Copy Server ID"** (Copiar ID do Servidor)
3. Cole no config.json no campo `guildId`

## Configuracao Correta

Adicione o `guildId` no seu `config.json`:

```json
{
  "panel": {
    "discordToken": "seu_token_aqui",
    "discordPrefix": "!",
    "guildId": "1234567890123456789",
    "adminChannelId": "1111111111111111111",
    "generalChannelId": "2222222222222222222",
    "mastersDiscordId": ["330511050841653249"],
    "bots": [...]
  }
}
```

## Diferenca entre Registro Guild vs Global

### Guild Registration (RECOMENDADO para desenvolvimento)

```typescript
guildId: '1234567890123456789'; // ID do seu servidor
```

**Vantagens:**

- ✅ **Instantaneo** - Comandos aparecem imediatamente
- ✅ Perfeito para testes e desenvolvimento
- ✅ Pode registrar ate 100 comandos por servidor

**Desvantagens:**

- ❌ Comandos apenas no servidor especifico
- ❌ Precisa registrar em cada servidor onde o bot estiver

### Global Registration

```typescript
guildId: undefined; // ou omitir o campo
```

**Vantagens:**

- ✅ Comandos em TODOS os servidores onde o bot esta
- ✅ Pode registrar ate 200 comandos globalmente

**Desvantagens:**

- ❌ **Demora ate 1 hora** para propagar
- ❌ Lento para testes

## Logs do Sistema

### Registro Guild (Rapido)

```
[DISCORD] Logged in as CIRS Haxball Bot#0987!
[DISCORD] Registrando comandos no servidor 1234567890123456789 (rapido)
[DISCORD] Iniciando registro de 15 slash commands...
[DISCORD] Slash commands registrados no servidor 1234567890123456789!
```

### Registro Global (Lento)

```
[DISCORD] Logged in as CIRS Haxball Bot#0987!
[DISCORD] Registrando comandos globalmente (pode levar ate 1 hora)
[DISCORD] Iniciando registro de 15 slash commands...
[DISCORD] Slash commands registrados globalmente!
```

## Verificacao

### 1. Reinicie o Bot

Depois de adicionar o `guildId`:

```bash
npm run build
npm start -- open config.json
```

### 2. Verifique os Logs

Procure por esta linha:

```
[DISCORD] Registrando comandos no servidor 1234567890123456789 (rapido)
[DISCORD] Slash commands registrados no servidor 1234567890123456789!
```

### 3. Teste no Discord

1. Digite `/` em qualquer canal
2. Os comandos devem aparecer **imediatamente** com o icone do bot
3. Teste no canal correto:
   - Canal Admin → `/help`, `/open`, `/close`
   - Canal Geral → `/register`, `/profile`, `/top`

### 4. Se Comandos nao Aparecem

**Verifique:**

1. ✅ Bot tem permissao `Use Slash Commands` no servidor?
2. ✅ Guild ID esta correto? (clique direito no servidor → Copy Server ID)
3. ✅ Bot foi convidado com scope `applications.commands`?

**URL de Convite Correto:**

```
https://discord.com/api/oauth2/authorize?client_id=SEU_CLIENT_ID&permissions=2048&scope=bot+applications.commands
```

Substitua `SEU_CLIENT_ID` pelo ID da aplicacao (Developer Portal → General Information).

## Comandos Registrados

Total: **15 comandos**

### Admin (8 comandos)

- `/help` - Lista comandos
- `/info` - Informacoes das salas
- `/meminfo` - Uso de memoria
- `/metrics` - Metricas do servidor
- `/open` - Abrir sala
- `/close` - Fechar sala
- `/reload` - Recarregar config
- `/exit` - Desligar servidor
- `/tokenlink` - Link token Haxball

### Autenticacao (7 comandos)

- `/register` - Criar conta
- `/linkdiscord` - Vincular Discord
- `/profile` - Ver perfil
- `/ranking` - Ver ranking
- `/top` - Top jogadores
- `/authhelp` - Ajuda auth

## Deprecation Warnings (nao impedem funcionamento)

### Warning sobre `ephemeral`

```
Warning: Supplying "ephemeral" for interaction response options is deprecated.
Utilize flags instead.
```

**O que significa:** Discord recomenda usar `flags: MessageFlags.Ephemeral` ao inves de `ephemeral: true`

**Status:** Nao impede o funcionamento, e apenas um aviso de depreciacao

**Sera corrigido em:** Proxima atualizacao

## Resumo da Correcao

### Antes (ERRADO)

```json
{
  "panel": {
    "discordToken": "...",
    "adminChannelId": "...",
    "generalChannelId": "..."
  }
}
```

**Resultado:** Registro global, 1 hora de espera ❌

### Depois (CORRETO)

```json
{
  "panel": {
    "discordToken": "...",
    "guildId": "1234567890123456789",
    "adminChannelId": "...",
    "generalChannelId": "..."
  }
}
```

**Resultado:** Registro instantaneo, comandos aparecem imediatamente ✅

## Suporte Adicional

Se os comandos ainda nao aparecem apos seguir todos os passos:

1. Delete todos os comandos antigos:

   ```bash
   # No Discord Developer Portal:
   # Aplicacao → General Information → Reset Bot Token
   # (Nao faca isso a menos que seja necessario)
   ```

2. Recrie o convite do bot com scope correto
3. Remova e readicione o bot no servidor
4. Aguarde 5 minutos e teste novamente

---

---

/ \_\/ **_) _**) )( \
/ \_** \_** ) \/ (
\_/\_(\_**\_(\_\_**|\_\_\_\_/
