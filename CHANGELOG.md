# Changelog

Todas as mudancas notaveis neste projeto sao documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2025-12-09

### Breaking Changes

#### Dependencias Atualizadas (CRITICAS)

- **discord.js**: v12.5.3 → v14.16.3

  - Requer configuracao de Intents no Discord Developer Portal
  - `MessageEmbed` substituido por `EmbedBuilder`
  - Evento `message` substituido por `messageCreate`
  - Veja [Guia de Migracao Discord.js](https://discordjs.guide/additional-info/changes-in-v14.html)

- **puppeteer-core**: v10.1.0 → Deprecado para v23.11.1 (Stub only)

  - Funcionalidade de abertura de salas desabilitada
  - Sera reescrita completamente em v6.0.0 com haxball.js
  - `headless: true` deprecado em favor de `headless: 'new'`

- **typescript**: v4.3.5 → v5.7.2

  - Target compilacao alterado de ES2017 para ES2022
  - Modo strict ativado com sete opcoes adicionais
  - Compatibilidade minima com Node.js v18+

- **@types/node**: v15.14.2 → v22.10.1
  - Tipos agora compativel com Node.js v18+

#### Remocoes e Deprecacoes

- ⚠️ Comando `connect` removido (SSH tunnel deprecado)
- ⚠️ Classe `Server.ts` agora e um stub (aguarda migracao haxball.js)
- ⚠️ Funcionalidade de abertura de salas desabilitada temporariamente
- ⚠️ Funcionalidade de debugging remoto desabilitada temporariamente
- ⚠️ Comando `eval` foi removido por razoes de seguranca

#### Configuracao TypeScript Strict

Ativadas as seguintes opcoes de tipo strict:

- `strictNullChecks`: true
- `strictFunctionTypes`: true
- `strictBindCallApply`: true
- `strictPropertyInitialization`: true
- `noImplicitThis`: true
- `alwaysStrict`: true
- `strict`: true

### Added

#### Modernizacao Codigo

- **Async/Await**: Refatoracao completa de callbacks para async/await

  - `fs.readFile` → `fs.promises.readFile`
  - Promise-based error handling com try/catch
  - Melhor legibilidade e manutencao

- **Type Safety**: Eliminacao completa de `any` type

  - Substituido por `unknown` com proper type guards
  - Todas as variaveis agora possuem tipos explicitos
  - Reducao significativa de bugs em tempo de compilacao

- **Logging Estruturado**: Funcao `log()` com timestamp
  - Prefixos customizaveis
  - Truncagem automatica de mensagens longas
  - Formato: `[HH:MM:SS] [PREFIX] mensagem`

#### Suite de Testes

- **Jest v29.7.0** com ts-jest v29.4.6 configurado
- **4 arquivos de teste** cobrindo utilitarios principais
- **29 testes** com 100% de cobertura em utils/
- **70% coverage threshold** em modo relatorio
- Scripts de teste:
  - `npm test` - Executar testes uma vez
  - `npm run test:watch` - Modo watch com reload automatico
  - `npm run test:coverage` - Gerar relatorio de cobertura

#### Documentacao

- **JSDoc completo** em todas as funcoes e classes publicas

  - Parametros documentados
  - Tipos explicitos
  - Exemplos de uso
  - Anotacoes @deprecated onde aplicavel

- **CONTRIBUTING.md**: Guia completo para contribuidores

  - Setup de ambiente
  - Padroes de codigo
  - Processo de pull request
  - Dicas de desenvolvimento

- **CHANGELOG.md**: Este arquivo

  - Rastreamento de mudancas por versao
  - Breaking changes claramente marcados
  - Migration guides quando necessario

- **docs/ARCHITECTURE.md**: Explicacao da arquitetura do projeto
  - Camadas do projeto
  - Fluxos principais
  - Decisoes de design
  - Roadmap futuro

#### Configuracoes Modernizadas

- **package.json** atualizado com versoes seguras

  - Removidas dependencias obsoletas (portscanner, open, tunnel-ssh, pidusage)
  - Adicionadas dependencias modernas (jest, ts-jest, @types/\*)
  - Todos os scripts de build/test configurados

- **tsconfig.json** otimizado
  - Target: ES2022
  - Strict mode habilitado
  - Source maps ativados
  - Declaration files gerados

### Changed

- **main.ts**: Adicionado JSDoc no ponto de entrada
- **Global.ts**: Interfaces documentadas com JSDoc
- **ControlPanel.ts**: Melhorado com JSDoc na classe e metodos
- **Server.ts**: Completamente documentado (deprecado)
- **utils/**: Todas as funcoes utilitarias com JSDoc completo
- **commands/openServer.ts**: Adicionado JSDoc extensivo

### Fixed

- ✅ Vulnerabilidades de seguranca corrigidas via atualizacao de dependencias
- ✅ Type errors em TypeScript strict mode resolvidos
- ✅ Error handling melhorado em loadConfig()
- ✅ Cast de tipo `unknown` para string em ControlPanel.logError()
- ✅ Tipagem de WebSocket em DebuggingInterface.ts

### Removed

- ❌ Comando `connect` (SSH tunnel functionality)
- ❌ Dependencias obsoletas: portscanner, open, tunnel-ssh, pidusage
- ❌ Comando `eval` por razoes de seguranca
- ❌ Codigo Puppeteer v10 (agora um stub)
- ❌ Suporte a Node.js < 18

### Deprecated

- ⚠️ **Server.ts**: Sera completamente reescrita em v6.0.0 com haxball.js
- ⚠️ **getAvailablePort()**: Sera implementado na migracao haxball.js
- ⚠️ **Puppeteer integration**: Todas as funcionalidades desabilitadas

### Security

- 🔒 Remocao do comando `eval` que permitia execucao de codigo arbitrario
- 🔒 Atualizacao de discord.js resolve vulnerabilidades conhecidas
- 🔒 Atualizacao de express resolve multiplas vulnerabilidades de seguranca
- 🔒 Todas as dependencias auditadas com `npm audit`

### Technical Details

#### Migracao Discord.js v12 → v14

**Antes (v12):**

```typescript
const embed = new Discord.MessageEmbed().setColor('#0099ff');

client.on('message', (msg) => {
  msg.channel.send(embed);
});
```

**Depois (v14):**

```typescript
const embed = new Discord.EmbedBuilder().setColor('#0099ff');

client.on('messageCreate', (msg) => {
  await msg.channel.send({ embeds: [embed] });
});
```

#### Callbacks → Async/Await

**Antes:**

```typescript
fs.readFile(path, 'utf-8', (err, data) => {
  if (err) throw err;
  callback(JSON.parse(data));
});
```

**Depois:**

```typescript
const data = await fs.readFile(path, 'utf-8');
return JSON.parse(data);
```

#### Type Safety com `unknown`

**Antes:**

```typescript
function process(config: any) {
  return config.server.path;
}
```

**Depois:**

```typescript
function validate(obj: unknown): obj is Config {
  return obj && typeof obj === 'object' && 'server' in obj;
}

function process(config: unknown): string {
  if (!validate(config)) throw new Error('Invalid config');
  return config.server.path;
}
```

### Migration Guide

#### Para usuarios existentes com v4.x

1. **Atualize globalmente:**

   ```bash
   npm install -g haxball-server@latest
   ```

2. **Verifique sua config.json:**

   - As chaves `server` e `panel` devem estar presentes
   - Remova campos deprecados (ssh, tunnel, etc)

3. **Discord Bot Setup:**

   - Vá para [Discord Developer Portal](https://discord.com/developers/applications)
   - Selecione seu bot
   - Vá para "Bot" → "TOKEN" (copie o token)
   - Vá para "OAuth2" → "Scopes" e selecione: `bot`
   - Vá para "Bot Permissions" e selecione: `Send Messages`, `Embed Links`, `Read Message History`
   - Copie a URL de convite gerada
   - **Intents (IMPORTANTE):**
     - Vá para "Bot" section
     - Habilite os seguintes intents:
       - SERVER MEMBERS INTENT (para listas de membros)
       - MESSAGE CONTENT INTENT (para ler conteudo de mensagens)
     - Save changes

4. **Compatibilidade:**
   - Versao minima de Node.js agora e 18.x
   - Teste sua instalacao: `haxball-server open config.json`

### Maintenance Notes

- Branch de desenvolvimento: `modernization-v5`
- Commit inicial v5.0.0: Fase 1-7 implementadas
- Proximas etapas: Fase 8 (haxball.js) planejada para v6.0.0

### Known Issues

- ⚠️ Server.ts não funcional (stub only) - Resolvido em v6.0.0
- ⚠️ Debugging remoto desabilitado - Sera re-implementado em v6.0.0 com web interface
- ⚠️ Abertura de salas desabilitada - Migracao para haxball.js em progresso

### Future Work (Fase 8 - v6.0.0)

- 📋 Completa migracao para haxball.js
- 📋 Restauracao de funcionalidade de abertura de salas
- 📋 Sistema de monitoramento via web interface
- 📋 Metricas e logs estruturados
- 📋 Health checks automaticos
- 📋 Sistema de plugins

---

## [4.x] - Anterior

Versoes anteriores nao sao mantidas. Veja o repositorio principal para historico completo.

// ** \_\_** \_**\_ \_ _
// / _\/ \_**) **\_) )( \
// / \_** \_** ) \/ (
// \_/\_(\_\_**(\_**\_|\_\_**/
