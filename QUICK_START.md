<!-- Guia rapido para usar haxball-server sem npm install -->

# Quick Start - Usar sem `npm install`

Se voce ja tem o projeto compilado (pasta `dist/` presente), pode usar direto sem instalar dependencias!

## Opcao 1: Usar o Executavel Ja Compilado

### 1. Criar config.json

Na raiz do projeto, crie um arquivo `config.json`:

```json
{
  "server": {
    "proxyEnabled": false,
    "proxyServers": []
  },
  "panel": {
    "bots": [
      {
        "name": "futsal",
        "displayName": "Futsal Room",
        "path": "./bots/futsal.js"
      }
    ],
    "discordToken": "seu-token-discord-aqui",
    "discordPrefix": "!",
    "mastersDiscordId": ["seu-id-discord-aqui"]
  }
}
```

### 2. Executar Direto com Node.js

```bash
node dist/main.js open config.json
```

Ou se tiver npm disponivel:

```bash
haxball-server open config.json
```

### 3. Pronto!

O servidor vai iniciar e o bot Discord ficara ativo. Use os comandos no Discord:

```
!open futsal thr1.AAAAAGEdKD4xW3bEOZDBBA.ZCzb426KBF4
!close <pid>
!help
```

---

## Opcao 2: Compilar Localmente (Se Modificou o Codigo)

Se fez mudancas no codigo TypeScript em `src/`, precisa recompilar:

### Requere:

- **Node.js >= 18.0.0** (apenas isso, sem npm install!)
- **TypeScript instalado globalmente** (opcional)

### Passo 1: Limpar dist/ Antigo

```bash
rm -r dist  # Linux/Mac
rmdir /s /q dist  # Windows
```

### Passo 2: Compilar TypeScript

Se tem TypeScript global:

```bash
tsc
```

Se nao tem TypeScript global, pode usar o binario do node_modules:

```bash
npx tsc  # Requer npm ter sido executado uma vez
```

Ou compilar manualmente usando `tsc` via npx:

```bash
node -e "require('typescript').createProgram(['src/main.ts'], {target: 5, module: 1, declaration: true, outDir: 'dist', strict: true})"
```

### Passo 3: Executar Compilado

```bash
node dist/main.js open config.json
```

---

## Opcao 3: Usar Docker (Melhor Solucao)

Se quer evitar instalar dependencias completamente, use Docker:

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm ci --only=production

EXPOSE 9500

CMD ["node", "dist/main.js", "open", "config.json"]
```

### Build e Run

```bash
docker build -t haxball-server .
docker run -v $(pwd)/config.json:/app/config.json haxball-server
```

---

## Requisitos Minimos

| Componente      | Requerido             | Alternativa           |
| --------------- | --------------------- | --------------------- |
| Node.js >= 18   | ✅ Sim                | -                     |
| npm             | ❌ Nao                | npx (vem com Node.js) |
| Chrome/Chromium | ❌ Nao                | -                     |
| Git             | ❌ Nao                | Download ZIP          |
| TypeScript      | ❌ Nao (ja compilado) | npx tsc               |

---

## Troubleshooting

### Erro: "dist/main.js not found"

**Solucao:** O projeto nao foi compilado. Faca:

```bash
# Se tiver tsc global
tsc

# Ou se nao tiver, use npx (requer npm uma vez)
npx tsc
```

### Erro: "Cannot find module 'discord.js'"

**Problema:** Dependencias nao foram instaladas

**Solucao:**

```bash
# Opacao 1: Instalar dependencias (precisa npm)
npm install

# Opcao 2: Usar Docker
docker build -t haxball-server .
docker run haxball-server
```

### Bot Discord Nao Responde

**Verificar:**

1. Token correto em `config.json`?
2. Bot convidado ao servidor Discord?
3. Intents habilitados?
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT
4. Node.js >= 18?

```bash
node --version  # Deve ser v18.0.0 ou maior
```

---

## Comparacao de Metodos

| Metodo                  | Velocidade   | Facilidade  | Requerimentos | Ideal Para      |
| ----------------------- | ------------ | ----------- | ------------- | --------------- |
| **Usar compilado**      | Muito rapido | Muito facil | Node.js       | Producao        |
| **Compilar localmente** | Rapido       | Facil       | Node.js + tsc | Desenvolvimento |
| **npm install**         | Lento        | Facil       | Node.js + npm | Testes          |
| **Docker**              | Medio        | Facil       | Docker        | Qualquer lugar  |

---

## Exemplos Praticos

### Exemplo 1: Apenas Usar (Sem Modificacoes)

```bash
# 1. Clonar projeto
git clone https://github.com/AlissoNNunes1/haxball-server.git
cd haxball-server

# 2. Criar config.json (veja acima)

# 3. Executar
node dist/main.js open config.json

# Pronto! Nenhum npm install necessario
```

### Exemplo 2: Fazer Mudancas e Recompilar

```bash
# 1. Editar codigo em src/
# (exemplo: src/ControlPanel.ts)

# 2. Recompilar
tsc  # ou npx tsc

# 3. Executar
node dist/main.js open config.json
```

### Exemplo 3: Usar com Docker (Sem npm Localmente)

```bash
# 1. Clonar projeto
git clone https://github.com/AlissoNNunes1/haxball-server.git
cd haxball-server

# 2. Criar config.json

# 3. Build imagem Docker
docker build -t haxball .

# 4. Run container
docker run -v $(pwd)/config.json:/app/config.json haxball

# Tudo dentro do container, nada no seu computador
```

---

## Dicas Avancadas

### Usar Script Bash para Automatizar

**start.sh** (Linux/Mac)

```bash
#!/bin/bash

# Verificar se config.json existe
if [ ! -f "config.json" ]; then
    echo "Erro: config.json nao encontrado"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "Erro: Node.js nao instalado"
    exit 1
fi

# Compilar se necessario
if [ ! -d "dist" ]; then
    echo "Compilando..."
    npx tsc
fi

# Executar
echo "Iniciando haxball-server..."
node dist/main.js open config.json
```

**start.bat** (Windows)

```batch
@echo off

REM Verificar se config.json existe
if not exist "config.json" (
    echo Erro: config.json nao encontrado
    exit /b 1
)

REM Compilar se necessario
if not exist "dist" (
    echo Compilando...
    npx tsc
)

REM Executar
echo Iniciando haxball-server...
node dist/main.js open config.json
```

### Usar com PM2 (Producao)

```bash
# Instalar PM2 globalmente (uma unica vez)
npm install -g pm2

# Iniciar com PM2
pm2 start "node dist/main.js open config.json" --name "haxball-server"

# Monitorar
pm2 monit

# Parar
pm2 stop haxball-server

# Reiniciar
pm2 restart haxball-server

# Logs
pm2 logs haxball-server
```

---

## Performance

Tempo medio de startup:

- **Com npm install**: ~2-3 segundos (primeira vez, depois rapido)
- **Sem npm install** (compilado): ~500ms
- **Com Docker**: ~1 segundo

Se precisa de startup muito rapido, use o metodo "Usar compilado".

---

## Conclusao

✅ **Pode usar totalmente sem `npm install`!**

- Use a pasta `dist/` ja compilada
- Ou recompile com `tsc` quando necessario
- Node.js >= 18 e o unico requisito

**Recomendacao:**

- **Producao**: Use Docker ou binario compilado
- **Desenvolvimento**: `npm install` uma vez, depois trabalhe normal
- **Teste rapido**: `node dist/main.js open config.json`

---

/ \_\/ **_) _**) )( \
/ \_** \_** ) \/ (
\_/\_(\_**\_(\_\_**|\_\_\_\_/
