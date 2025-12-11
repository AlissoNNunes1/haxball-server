# Sistema de Autenticacao CIRS - Resumo

## O que e?

Sistema unificado de contas para jogadores Haxball que permite:

- Registro via Discord
- Login direto na sala Haxball
- Conta unica com pontos, ranking e moedas
- API REST para consultas
- Stats e balanceamento por Elo

## Como usar?

### 1. Jogador: Criar Conta

**Via Discord:**
```
!register MeuNick minhaSenha123
```

**Resposta:** Conta criada com pontos iniciais (0), ranking (1000) e Discord vinculado.

### 2. Jogador: Entrar na Sala

1. Entrar na sala Haxball com o nick registrado
2. Usar comando: `/login minhaSenha123`
3. Pronto! Agora voce esta autenticado

### 3. Jogador: Ver Stats

**Na sala:**
```
/profile          -> Ver seu perfil
/profile OutroNick -> Ver perfil de outro jogador
/stats            -> Ver suas estatisticas
```

**No Discord:**
```
!profile          -> Ver seu perfil
!ranking          -> Ver seu ranking
!top              -> Ver top 10 jogadores
```

## Arquitetura Simplificada

```
Discord Bot           Sala Haxball        API REST
    |                     |                   |
    +--------> AuthService <---------+--------+
                   |
              auth-client
                   |
            SQLite Database
```

## Arquivos Principais

| Arquivo | Proposito |
|---------|-----------|
| `src/auth/AuthService.ts` | Logica de autenticacao |
| `src/auth/AuthCommands.ts` | Comandos Discord |
| `src/auth/RoomAuthHandler.ts` | Autenticacao na sala |
| `src/auth/AuthAPI.ts` | API REST |
| `src/database/auth-client.ts` | Acesso ao banco |
| `docs/ACCOUNTS.md` | Documentacao completa |
| `docs/AUTH_INTEGRATION.md` | Guia de integracao |

## Integracao Rapida

### No ControlPanel (Discord)

```typescript
import { AuthCommands } from './auth/AuthCommands';

// No construtor:
this.authCommands = new AuthCommands();
this.authCommands.startSessionCleanup();

// No metodo command():
const handled = await this.authCommands.handleCommand(command, args, msg, channel);
if (handled) return;
```

### No Bot da Sala

```javascript
const { RoomAuthHandler } = require('../src/auth/RoomAuthHandler');

const authHandler = new RoomAuthHandler();
authHandler.registerHandlers(room);

// Verificar autenticacao:
if (authHandler.isAuthenticated(player.id)) {
  const account = authHandler.getAccount(player.id);
  console.log(`Autenticado: ${account.haxballNick}`);
}
```

## Seguranca

- **Hash de senhas:** PBKDF2 com SHA-512 (100.000 iteracoes)
- **Protecao brute force:** 5 tentativas em 15 minutos
- **Sessoes:** Tokens com expiracao de 7 dias
- **Dados sensiveis:** Nunca expoe senha ou salt

## Proximos Passos

- [x] Fase 9: Sistema de Contas ✅
- [ ] Fase 10: Balanceamento Hibrido por Elo
- [ ] Fase 11: Stats Avancadas (heatmap, passes)
- [ ] Fase 12: Dashboard Web

## Links Uteis

- **Documentacao Completa:** `docs/ACCOUNTS.md`
- **Guia de Integracao:** `docs/AUTH_INTEGRATION.md`
- **Exemplo de Bot:** `bots/auth-bot-example.js`
- **Config Exemplo:** `config.example-auth.json`

## Suporte

Para duvidas ou problemas:

1. Consulte `docs/ACCOUNTS.md` para detalhes tecnicos
2. Veja `docs/AUTH_INTEGRATION.md` para exemplos de uso
3. Teste com `bots/auth-bot-example.js`

---

**Versao:** 5.1.0 (Fase 9 Completa)

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
