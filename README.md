<h1 align="center">Haxball Server v5.0.0</h1>

<h3 align="center">Gerenciador moderno de servidores Haxball headless com Discord Bot, TypeScript strict e testes automatizados</h3>

<p align="center">
    <a href="https://github.com/gabrielbrop/haxball-server/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/gabrielbrop/haxball-server"></a>
    <a href="https://github.com/gabrielbrop/haxball-server/network"><img alt="GitHub forks" src="https://img.shields.io/github/forks/gabrielbrop/haxball-server"></a>
    <a href="https://github.com/gabrielbrop/haxball-server/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/gabrielbrop/haxball-server"></a>
    <img alt="npm version" src="https://img.shields.io/npm/v/haxball-server">
    <img alt="npm downloads" src="https://img.shields.io/npm/dm/haxball-server">
    <img alt="License" src="https://img.shields.io/npm/l/haxball-server">
</p>

<br/>

## O que ha de novo em v5.0.0? (Modernizacao!)

- ✅ **discord.js v14** - Bot Discord moderno com Intents
- ✅ **TypeScript strict** - Deteccao de erros em tempo de compilacao
- ✅ **Async/Await** - Sem callbacks, codigo limpo e legivel
- ✅ **Testes Jest** - 29 testes cobrindo utilitarios principais
- ✅ **JSDoc completo** - Documentacao no codigo
- ✅ **Preparando para haxball.js** - Proxima geracao sem Chrome (v6.0.0)

## Features Principais

- 🎮 Abrir/fechar salas Haxball facilmente
- 🤖 Gerenciar salas via Discord Bot
- 📊 Multiplas salas com proxy support
- ⚙️ Configuracoes personalizadas com heranca
- 🔍 Testes automatizados (70%+ cobertura)
- 📖 Documentacao completa

## 📋 Requisitos

- **Node.js >= 18.0.0** (requerido para v5.0.0)
- npm >= 9.0.0
- Discord Bot Token (veja instrucoes abaixo)
- ~~Chrome/Chromium~~ (nao necessario em v5.0.0 - será removido completamente em v6.0.0)

> **Nota Importante:** A partir de v5.0.0, a funcionalidade de abertura de salas esta temporariamente desabilitada (stub com Puppeteer deprecated). Sera re-implementada em v6.0.0 com haxball.js, que elimina a necessidade de Chrome/Chromium completamente!

## 📀 Instalacao

```bash
npm install haxball-server -g
```

Ou para desenvolvimento local:

```bash
git clone https://github.com/seu-usuario/haxball-server.git
cd haxball-server
npm install
npm run build
```

## 💻 Configuracao Basica

### 1. Criar arquivo config.json

```json
{
    "server": {
        "execPath": "/usr/bin/chromium",
        "maxMemoryUsage": 2048,
        "proxyEnabled": false
    },
    "panel": {
        "bots": [
            { 
                "name": "futsal", 
                "displayName": "Futsal Room", 
                "path": "./bots/futsal.js" 
            },
            { 
                "name": "soccer", 
                "displayName": "Soccer Room", 
                "path": "./bots/soccer.js" 
            }
        ],
        "discordToken": "seu-token-discord-aqui",
        "discordPrefix": "!",
        "mastersDiscordId": ["seu-id-discord-aqui"],
        "maxRooms": 2
    }
}
```

### 2. Configurar Discord Bot

1. Vá para [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em "New Application"
3. Va para a seção "Bot" e clique "Add Bot"
4. Copie o **TOKEN** (sera usado no config.json)
5. **IMPORTANTE - Ativar Intents:**
   - Na seção "Bot" procure por "PRIVILEGED GATEWAY INTENTS"
   - Ative:
     - ✅ SERVER MEMBERS INTENT
     - ✅ MESSAGE CONTENT INTENT
   - Clique "Save Changes"
6. Va para "OAuth2" → "URL Generator"
   - Selecione scopes: `bot`
   - Selecione permissoes: `Send Messages`, `Embed Links`
   - Copie a URL gerada e abra em um navegador para convidar o bot seu servidor Discord

### 3. Iniciar Servidor

```bash
haxball-server open config.json
```

Ou especificar caminho relativo:

```bash
haxball-server open ./config.json
haxball-server open  # Procura por config.json no CWD
```

### 4. Usar Comandos Discord

Use `!help` (ou seu prefixo) no Discord para ver comandos disponiveis.

## ⚙️ Configuracao Avancada

### server

Define comportamento do servidor Haxball.

```json
{
  "server": {
    "execPath": "/usr/bin/chromium",
    "maxMemoryUsage": 2048,
    "proxyEnabled": false,
    "proxyServers": ["127.0.0.1:8000", "127.0.0.1:8001"],
    "disableCache": false,
    "disableRemote": false
  }
}
```

| Campo | Tipo | Descricao | Requerido |
|-------|------|-----------|-----------|
| execPath | string | Caminho do Chrome/Chromium (deprecated em v5.0.0) | ✅ Sim |
| maxMemoryUsage | number | Limite maximo de memoria (MB) | ✅ Sim |
| proxyEnabled | boolean | Ativa uso de proxies | ❌ Nao |
| proxyServers | string[] | Lista de proxies [IP:Porta] | ❌ Nao |
| disableCache | boolean | Desativa cache do navegador | ❌ Nao |
| disableRemote | boolean | Desativa debugging remoto | ❌ Nao |

### panel

Define comportamento do painel Discord.

```json
{
  "panel": {
    "discordToken": "token-aqui",
    "discordPrefix": "!",
    "mastersDiscordId": ["id1", "id2"],
    "maxRooms": 5,
    "bots": [...],
    "customSettings": {...}
  }
}
```

| Campo | Tipo | Descricao | Requerido |
|-------|------|-----------|-----------|
| discordToken | string | Token do bot Discord | ✅ Sim |
| discordPrefix | string | Prefixo dos comandos (ex: !) | ✅ Sim |
| mastersDiscordId | string[] | IDs dos usuarios master | ✅ Sim |
| maxRooms | number | Numero maximo de salas abertas | ❌ Nao |
| bots | array | Lista de bots disponiveis | ✅ Sim |
| customSettings | object | Configuracoes personalizadas | ❌ Nao |

### bots

Define scripts de bots disponiveis.

**Formato 1 - Objeto:**
```json
{
  "bots": {
    "futsal": "./bots/futsal.js",
    "soccer": "./bots/soccer.js"
  }
}
```

**Formato 2 - Array (RECOMENDADO):**
```json
{
  "bots": [
    {
      "name": "futsal",
      "displayName": "Futsal Room",
      "path": "./bots/futsal.js"
    },
    {
      "name": "soccer",
      "displayName": "Soccer Room",
      "path": "./bots/soccer.js"
    }
  ]
}
```

### customSettings

Define configuracoes personalizadas de salas com suporte a heranca.

```json
{
  "customSettings": {
    "futsal-config": {
      "maxPlayers": 10,
      "public": true,
      "roomName": "Futsal"
    },
    "futsal-private": {
      "extends": "futsal-config",
      "public": false,
      "password": "secret"
    }
  }
}
```

**Heranca:** Use o campo `extends` para herdar de outras configuracoes:

```typescript
interface CustomSettings {
  extends?: string | string[];  // Uma ou multiplas herancas
  [key: string]: string | number | boolean | string[] | undefined;
}
```

## 🔧 Desenvolvimento

### Scripts Disponiveis

```bash
# Compilar TypeScript
npm run build

# Executar testes
npm test

# Testes com watch mode (reload automatico)
npm run test:watch

# Gerar relatorio de cobertura
npm run test:coverage

# Executar servidor local
npm start
```

### Estrutura do Projeto

```
haxball-server/
├── src/                 # Codigo fonte TypeScript
├── tests/               # Testes com Jest
├── docs/                # Documentacao
├── dist/                # Codigo compilado (gerado)
├── package.json         # Dependencias
├── tsconfig.json        # Configuracao TypeScript
├── jest.config.js       # Configuracao Jest
└── README.md            # Este arquivo
```

## 📖 Documentacao

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guia para contribuidores
- **[CHANGELOG.md](CHANGELOG.md)** - Historico de mudancas
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Arquitetura interna do projeto
- **[docs/roadmap.md](docs/roadmap.md)** - Plano de modernizacao e futuras melhorias

## 🐛 Troubleshooting

### Erro: "Puppeteer-based room opening is deprecated"

**Problema:** Tentou abrir sala em v5.0.0

**Solucao:** Em v5.0.0, a funcionalidade de abertura de salas esta temporariamente desabilitada enquanto aguardamos migracao para haxball.js. Sera disponivel em v6.0.0.

### Erro: Discord bot nao responde

**Verificar:**

1. ✅ Token correto no config.json? (Copie do Developer Portal)
2. ✅ Bot convidado ao servidor Discord?
3. ✅ Intents habilitados no Developer Portal?
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT
4. ✅ Bot tem permissao de "Send Messages"?
5. ✅ Prefixo correto? (padrao: `!`)

**Debug:**
```bash
npm run build  # Verificar erros de compilacao
npm start      # Iniciar com logs detalhados
```

### Node.js versao antiga

**Problema:** `npm: command not found` ou versao Node < 18

**Solucao:**

```bash
# Verificar versao
node --version

# Atualizar Node.js
# Vide nodejs.org para instrucoes de instalacao
```

## 🚀 Proximos Passos (Roadmap)

### v5.0.0 (ATUAL) ✅

- ✅ Atualizacao de dependencias
- ✅ discord.js v12 → v14
- ✅ Async/Await refactoring
- ✅ TypeScript strict modernizacao
- ✅ Testes Jest (70%+ cobertura)
- ✅ Documentacao completa

### v6.0.0 (PROXIMA)

- 📋 Migracao para haxball.js
  - 70-80% reducao de memoria
  - Sem necessidade de Chrome/Chromium
  - Performance superior
- 📋 Web interface para monitoramento
- 📋 Sistema de metricas estruturadas
- 📋 Health checks automaticos

### v7.0.0+ (FUTURO)

- 📋 Sistema de plugins
- 📋 Docker support
- 📋 CI/CD com GitHub Actions
- 📋 Database integration

Veja [docs/roadmap.md](docs/roadmap.md) para detalhes completos.

## ✨ Contribuindo

Adoraríamos sua contribuicao! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para instrucoes de setup, padroes de codigo e processo de pull request.

**Quick Start para contribuir:**

```bash
git clone https://github.com/seu-usuario/haxball-server.git
cd haxball-server
npm install
npm run build
npm test
git checkout -b feature/sua-feature
# ...fazer mudancas...
npm test  # Garantir que testes passam
git push origin feature/sua-feature
# Abrir Pull Request no GitHub
```

## 📄 Licenca

ISC - Veja [LICENSE](LICENSE) para detalhes.

## 🤝 Creditos

Originalmente desenvolvido por [@gabrielbrop](https://github.com/gabrielbrop)

**v5.0.0 Modernizacao:**
- Atualizacao para discord.js v14
- Migracao para async/await
- TypeScript strict mode
- Implementacao de testes Jest

## 📞 Suporte

- 📧 Issues: [GitHub Issues](https://github.com/gabrielbrop/haxball-server/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/gabrielbrop/haxball-server/discussions)
- 📖 Documentacao: [docs/](docs/)

---

**Feito com ❤️ para a comunidade Haxball**

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/

[Chrome user data dir path](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/docs/user_data_dir.md). Only works if cache is not disabled.

#### disableCache?: boolean

Disable all caching. Rooms will be started in incognito mode. This is highly recommended if you're not using localStorage or IndexedDB (and you shouldn't).

#### disableRemote?: boolean

Disable remote debugging. The server won't listen for connections.

#### disableAnonymizeLocalIps?: boolean

Adds the `--disable-features=WebRtcHideLocalIpsWithMdns` flag to Chrome. [See more here](https://github.com/haxball/haxball-issues/wiki/Headless-Host#connectivity-warning).

#### maxMemoryUsage?: number

Set the limit for Javascript memory usage. Max value of 1024 (1 GB) in 32-bit systems and 4096 (4 GB) in 64-bit systems.

#### execPath: string

The path to Chrome (or Chromium) executable file. If you are on Windows this will probably be `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`.

On Ubuntu you can install Chromium using:

```bash
sudo apt-get install chromium-browser
```

And `execPath` will be:

```js
"execPath": "/usr/bin/chromium-browser"
```

### 🖥️ panel

#### bots: { [name: string]: string } | { name: string, path: string, displayName?: string }[]

The list of bots and the path to their JS file.

##### Example (as an array - recommended)

```js
"bots": [
    { "name": "classic", "displayName": "Classic room", "path": "./bots/classic.js" },
    { "name": "futsal", "displayName": "Futsal room", "path": "./bots/futsal.js" }
]
```

##### Example (as an object, does not support `displayName`)

```js
"bots": {
    "classic": "./bots/classic.js",
    "futsal": "./bots/futsal.js"
}
```

#### discordToken: string

The token of your Discord bot.

#### discordPrefix: string

The prefix for the bot commands.

#### mastersDiscordId: string[]

The players allowed to use the bot. Nobody but the users listed here will be able to run commands.

#### customSettings?: CustomSettingsList

See [custom settings](#-custom-settings).

#### maxRooms?: number

The maximum number of rooms. This is useful if you want more control over the server.

## 🔧 Custom settings

Let's say you want to open 2 rooms. Both are futsal rooms, but one is 3v3 and the other is 4v4. Instead of creating two different bot files, 3v3.js and 4v4.js, you can use the `panel.customSettings` config to pass custom parameters to the bot script.

Not only you can pass custom parameters but you can also customize the `HBInit` options.

For example:

```json
"customSettings": {
    "3v3": {
        "reserved.haxball.roomName": "Futsal 3v3",
        "gameMode": 3
    },
    "4v4": {
        "reserved.haxball.roomName": "Futsal 4v4",
        "gameMode": 4
    }
}
```

Bots loaded with the `3v3` settings will be named `Futsal 3v3`. The same applies to `4v4`. The `gameMode` setting will be available in `window.CustomSettings.gameMode`.

Custom settings also support inheritance and multiple inheritance. Suppose you want to define your room geolocation using custom settings as well as create a private room for your league:

```json
"customSettings": {
    "new-york": {
        "reserved.haxball.geo": {
            "code": "us",
            "lat": 40.730,
            "lon": -73.935
        }
    },
    "competitive": {
     "reserved.haxball.password": "12345"
    },
    "3v3": {
        "extends": "new-york",
        "reserved.haxball.roomName": "Futsal 3v3",
        "gameMode": 3
    },
    "4v4": {
        "extends": "new-york",
        "reserved.haxball.roomName": "Futsal 4v4",
        "gameMode": 4
    },
    "3v3-league": {
        "extends": ["competitive", "3v3"],
        "reserved.haxball.roomName": "Futsal 3v3 League"
    }
}
```

With this configuration you'd open your public rooms with the `3v3` and `4v4` settings, and when there's a match in your league, you'd open a room with the `3v3-league` setting. All using the same `futsal.js` bot!

For instance, on Discord you would open the `3v3` room like this: `!open futsal thr1.AAAAAGEdKD4xW3bEOZDBBA.ZCzb426KBF4 3v3`

You can also create `default` custom settings. This way, every room you open without specifying custom settings will automatically be assigned the `default` settings. For example, if you want to make private every room that have been opened without specifying custom settings:

```json
"customSettings": {
    "default": {
        "reserved.haxball.public": false
    }
}
```

## 🎮 Discord commands

### help

Shows the commands.

### info

Shows open rooms and available bots.

### meminfo

Information about CPU and memory usage.

### open
>
> Requires two parameters: bot name and token.
>
> One optional parameter: custom settings.
>
> Example 1: !open futsal thr1.AAAAAGEbIjtlEn43C3G3Pw.ylh4au9g0SM
>
> Example 2: !open futsal thr1.AAAAAGEbIjtlEn43C3G3Pw.ylh4au9g0SM 3v3
>
> Example 3: !open futsal Token obtained: "thr1.AAAAAGEdFfRipxH29kSsLQ.Om6FNTPlneE" 4v4

Opens a room with the given bot.
You can choose between the bots specified in the `panel.bots` config.

The token parameter is a [Haxball headless token](https://www.haxball.com/headlesstoken).

You can learn more about the custom settings parameter [here](#-custom-settings).

Once the room is open you'll be given the ID of the browser process. You may use it to close the room.

### close
>
> Requires one parameter: PID (process ID).
>
> Example: !close 5478

Closes the room based on its process ID described above.

You can also close all rooms at once using `close all`.

### reload

Reloads the `panel.bots` and `panel.customSettings` configurations.

### exit

Closes all rooms and stops Haxball Server.

### eval

Executes Javascript code.

### tokenlink

Gets the URL to the [Haxball headless token website](https://www.haxball.com/headlesstoken).

## 📡 Using proxies

If you are hosting your Haxball server on AWS EC2, you can use the proxy feature (and therefore open more than 2 full functional rooms) by assigning an [Elastic IP](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/MultipleIP.html#StepThreeEIP) to a [secondary IPv4 private address](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/MultipleIP.html#assignIP-existing).

Enabling the new secondary IP depends on which service you're using. This will work for Ubuntu 20.04 running on the T4G family (`t4g-small` is the best one). [And according to the official documentation, Amazon Linux will automatically assign it for you](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/MultipleIP.html#StepTwoConfigOS). If you're not using Amazon Linux or Ubuntu 20.04 with the T4G family, you'll have to look it up yourself; however, the steps will likely be similar to the steps below.

After assigning them, you can enable the new secondary IP using (you'll have to repeat this step every time you restart the instance):

```bash
sudo ip addr add xx.xx.xx.xx/20 dev ens5 label ens5:1
```

Where xx.xx.xx.xx is the new secondary IP.

To add a proxy to the new secondary IP, install Squid:

```bash
sudo apt-get install squid
```

Open the `squid.conf` file:

```bash
sudo nano /etc/squid/squid.conf
```

Then add these lines to the file:

```
http_port 127.0.0.1:8000 name=8000
http_port 127.0.0.1:8001 name=8001

acl prt8000 myportname 8000 src xx.xx.xx.xx/24
http_access allow prt8000
tcp_outgoing_address xx.xx.xx.xx prt8000

acl prt8001 myportname 8001 src yy.yy.yy.yy/24
http_access allow prt8001
tcp_outgoing_address yy.yy.yy.yy prt8001
```

Where xx.xx.xx.xx is your main private IP and yy.yy.yy.yy is the secondary one. If you want more than 2 proxies (more than 4 rooms), just add new configurations until you're done:

```
http_port 127.0.0.1:8002 name=8002

acl prt8002 myportname 8002 src zz.zz.zz.zz/24
http_access allow prt8002
tcp_outgoing_address zz.zz.zz.zz prt8002
```

And then restart the service:

```bash
sudo systemctl restart squid
```

Now you'll be able to use the proxy feature by simply enabling the `server.proxyEnabled` config and adding your proxy IPs to `server.proxyServers`.

Example:

```json
"server": {
    "execPath": "/usr/bin/chromium-browser",
    "proxyEnabled": true,
    "proxyServers": ["127.0.0.1:8000", "127.0.0.1:8001"]
}
```

## ⚙️ Full configuration example

A full example in an Ubuntu machine with a `bots` folder with `futsal.js` and `classic.js` files and multiple settings for the futsal bot.

Discord IDs and token are fictional.

```json
{
    "server": {
        "execPath": "/usr/bin/chromium-browser",
        "userDataDir": "./userdatadir"
    },
    "panel": {
        "bots": [
            { "name": "futsal", "displayName": "Futsal room", "path": "./bots/futsal.js" },
            { "name": "classic", "displayName": "Classic room", "path": "./bots/classic.js" }
        ],
  
        "discordToken": "4cDNNDATgTTODgE2xON35IyO.MYCAr_a.UIrBFWioA6Po9HPyrJAyjgvR4AA",
        "discordPrefix": "!",
  
        "mastersDiscordId": ["6833789556844662784", "5748686793348656842"],
  
        "customSettings": {
            "myGeo": {
                "reserved.haxball.geo": {
                    "code": "fr",
                    "lat": 48.8032,
                    "lon": 2.3511
                }
            },
     "testMode": {
             "reserved.haxball.public": false
            },
            "3v3": {
                "extends": "myGeo",
                "reserved.haxball.roomName": "Futsal 3v3",
                "gameMode": 3
            },
            "4v4": {
                "extends": "myGeo",
                "reserved.haxball.roomName": "Futsal 4v4",
                "gameMode": 4
            },
            "testMode3v3": {
      "extends": ["3v3", "testMode"]
            },
     "testMode4v4": {
      "extends": ["4v4", "testMode"]
            }
        }
    }
}
```
