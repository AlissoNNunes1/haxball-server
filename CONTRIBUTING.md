# Como Contribuir para o Haxball Server

Muito obrigado por querer contribuir para o haxball-server! Este documento fornece diretrizes e instruções para contribuir ao projeto.

## Configuracao do Ambiente

### Pre-requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Um editor de codigo (recomendado: VS Code)

### Instalacao e Setup

1. **Fork o repositorio**

   Clique no botao "Fork" no GitHub para criar sua copia pessoal

2. **Clone seu fork**

   ```bash
   git clone https://github.com/seu-usuario/haxball-server.git
   cd haxball-server
   ```

3. **Instale as dependencias**

   ```bash
   npm install
   ```

4. **Configure remotes (opcional mas recomendado)**

   ```bash
   git remote add upstream https://github.com/gabrielbrop/haxball-server.git
   git fetch upstream
   ```

5. **Compile o projeto**

   ```bash
   npm run build
   ```

6. **Execute os testes**

   ```bash
   npm test
   ```

Se tudo correr bem, seu ambiente esta pronto para contribuir!

## Padroes de Codigo

### TypeScript

- **Sempre use tipos explicitos** - Evite `any`, use `unknown` com type guards quando necessario
- **Siga o estilo existente** - Use 4 espacos para indentacao
- **Imports organizados** - Agrupar por: modulos nativos, modulos externos, modulos locais
- **Nomes descritivos** - Use nomes claros para variaveis, funcoes e classes

### Exemplo de Bom Codigo

```typescript
import * as Discord from 'discord.js';
import { promises as fs } from 'fs';

import { CustomSettings } from '../Global';
import { log } from '../utils/log';

/**
 * Carrega configuracoes do arquivo JSON
 * @param {string} filePath - Caminho do arquivo
 * @returns {Promise<CustomSettings>} Configuracoes carregadas
 */
async function loadCustomSettings(filePath: string): Promise<CustomSettings> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    log('ERROR', `Falha ao carregar configuracoes: ${error}`);
    throw error;
  }
}
```

### JavaScript / Comentarios

- **Todos os comentarios em portugues brasileiro** (sem acentos em codigo)
- **Sem emotes** em nenhuma parte do codigo
- **JSDoc para funcoes e classes publicas** com parametros, retornos e exemplos

## Processo de Pull Request

### 1. Crie uma Branch

```bash
# Atualize seu fork
git fetch upstream
git checkout -b upstream/main

# Crie uma branch com nome descritivo
git checkout -b feature/nova-funcionalidade
# ou
git checkout -b fix/corrige-bug-xyz
# ou
git checkout -b docs/melhora-readme
```

**Formato de nome recomendado:**

- `feature/` para novas funcionalidades
- `fix/` para correcoes de bugs
- `docs/` para atualizacoes de documentacao
- `refactor/` para refatoracoes
- `test/` para adicionar ou melhorar testes

### 2. Faça suas Alteracoes

```bash
# Edite os arquivos necessarios
# Compile regularmente para verificar erros
npm run build

# Rode os testes
npm test

# Cheque a cobertura (target: 70%+)
npm run test:coverage
```

### 3. Commit suas Mudancas

**Mensagens de commit significativas:**

```bash
# BOM
git commit -m "feat: Adiciona suporte a custom settings na sala"

# BOM
git commit -m "fix: Corrige erro de type em ControlPanel.ts"

# BOM
git commit -m "docs: Atualiza README com instrucoes de instalacao"

# EVITAR
git commit -m "fixed stuff"
git commit -m "Update files"
```

**Prefixos recomendados:**

- `feat:` - Nova funcionalidade
- `fix:` - Correcao de bug
- `docs:` - Alteracao em documentacao
- `test:` - Adicionar ou melhorar testes
- `refactor:` - Refatoracao sem mudanca funcional
- `perf:` - Melhorias de performance
- `chore:` - Mudancas em build, dependencias, etc.

### 4. Push para seu Fork

```bash
git push origin feature/nova-funcionalidade
```

### 5. Abra um Pull Request

1. Vá para o repositorio original no GitHub
2. Clique em "New Pull Request"
3. Selecione sua branch como compare
4. Preencha o titulo e descricao com clareza
5. Clique em "Create Pull Request"

**Template de Descricao PR:**

```markdown
## Descricao

Breve descricao do que muda neste PR

## Tipo de Mudanca

- [ ] Nova funcionalidade
- [ ] Correcao de bug
- [ ] Breaking change
- [ ] Atualizacao de documentacao

## Mudancas Principais

- Ponto 1
- Ponto 2
- Ponto 3

## Testing (se aplicavel)

Descreva como testar as mudancas

## Checklist

- [ ] Meu codigo segue o estilo do projeto
- [ ] Atualizei a documentacao
- [ ] Adicionei/atualizei testes
- [ ] Testes passam: `npm test`
- [ ] Compilacao sem erros: `npm run build`
```

## Desenvolvimento e Testes

### Scripts Disponiveis

```bash
# Compilar TypeScript
npm run build

# Executar testes uma vez
npm test

# Executar testes em modo watch
npm run test:watch

# Gerar relatorio de cobertura
npm run test:coverage

# Iniciar servidor (debug mode)
npm start
```

### Adicionar Novos Testes

Testes devem estar em `tests/unit/` seguindo a estrutura:

```
tests/
├── unit/
│   ├── utils/
│   │   └── meuArquivo.test.ts
│   ├── Classe.test.ts
│   └── ...
└── fixtures/
    └── dados-teste.json
```

**Exemplo de teste:**

```typescript
import { escapeString } from '../../../src/utils/escapeString';

describe('escapeString', () => {
  it('deve escapar aspas duplas', () => {
    expect(escapeString('teste "citacao"')).toBe('teste \\"citacao\\"');
  });

  it('deve retornar valor se nao for string', () => {
    expect(escapeString(123)).toBe(123);
  });
});
```

**Cobertura de testes:**

- Funcoes utilitarias: 100% de cobertura
- Classes principais: >= 70% de cobertura
- Logica complexa: 100% de cobertura

## Reportar Bugs

Se encontrar um bug, abra uma issue com:

1. **Descricao clara** do problema
2. **Passos para reproduzir**
3. **Comportamento esperado** vs **comportamento atual**
4. **Seu ambiente** (Node.js version, SO, etc)
5. **Logs ou erro messages** relevantes

## Sugestoes de Funcionalidades

Ideias de melhorias sao bem-vindas! Abra uma issue descrevendo:

1. **Problema que resolve**
2. **Solucao proposta**
3. **Exemplos de uso**
4. **Pros e contras**

## Regras de Conducao

- Seja respeitoso e construtivo
- Aceite criticas com calma
- Nao spam ou auto-promocao
- Reporte comportamento abusivo

## Arquitetura do Projeto

Para melhor entender o projeto, veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

Estrutura basica:

```
src/
├── main.ts              # Ponto de entrada CLI
├── Server.ts            # Gerenciador de salas (stub para haxball.js)
├── ControlPanel.ts      # Painel Discord
├── Global.ts            # Tipos e constantes
├── commands/            # Comandos CLI
├── debugging/           # Interface de debugging remoto
└── utils/               # Funcoes utilitarias
```

## Roadmap

Veja [docs/roadmap.md](docs/roadmap.md) para o plano de modernizacao v5.0.0 e futuras melhorias.

**Fases Ativas:**

- ✅ Fase 1-6: Modernizacao basica (completa)
- 🔄 Fase 7: Documentacao e qualidade de codigo (em progresso)
- 📋 Fase 8: Migracao haxball.js (planejada)

## Dicas de Desenvolvimento

### Debug com console

```typescript
import { log } from './utils/log';

log('DEBUG', 'Variavel: ' + JSON.stringify(meuObjeto));
```

### Type Checking

```bash
# Verificar tipos sem gerar output
tsc --noEmit
```

### Formatar codigo

```bash
# Se tiver Prettier instalado
npx prettier --write src/
```

### Merge com Upstream

```bash
# Atualizar branch local
git fetch upstream
git rebase upstream/main

# Resolver conflitos se necessario
# Depois push forcado (cuidado!)
git push -f origin sua-branch
```

## Perguntas?

- Abra uma **Discussion** para duvidas
- Abra uma **Issue** para relatos de bugs
- Veja a **Documentation** em docs/

Obrigado por contribuir!

// ** \_\_** \_**\_ \_ _
// / _\/ \_**) **\_) )( \
// / \_** \_** ) \/ (
// \_/\_(\_\_**(\_**\_|\_\_**/
