# Guia de Deploy no Google Cloud

Este guia mostra como hospedar o haxball-server no Google Cloud usando uma VM Compute Engine. Foca em simplicidade (VM + systemd) e mantém o SQLite local.

## Requisitos

- Projeto GCP com faturamento ativo.
- gcloud CLI instalado e autenticado (`gcloud auth login`).
- Domínio (opcional) para apontar para o IP estático.
- Tokens/segredos: Discord bot token, Haxball token, configs de sala (config.json).
- Node.js 20+ e npm (serão instalados na VM).

## Componentes e portas

- haxball-server (Node/TypeScript) rodando via `node dist/main.js open config.json` ou `npm start`.
- WebMonitor: porta 3000 (restrinja por firewall a IPs de admin).
- Sem banco externo: SQLite local em disco (haxball.sqlite).

## Passo a passo

### 1) Criar VM

```bash
# Ajuste zona, nome e tipo conforme necessidade
PROJECT_ID="seu-projeto"
ZONE="us-central1-a"
VM_NAME="haxball-vm"
MACHINE_TYPE="e2-standard-2" # 2 vCPU / 8 GB RAM
IMAGE="debian-12-bookworm"
DISK_SIZE=50

gcloud config set project "$PROJECT_ID"
gcloud compute instances create "$VM_NAME" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family="$IMAGE" \
  --image-project=debian-cloud \
  --boot-disk-size="$DISK_SIZE" \
  --boot-disk-type=pd-balanced \
  --tags=haxball-server,webmonitor

gcloud compute addresses create "$VM_NAME-ip" --region="${ZONE%-*}"
```

### 2) Regras de firewall

```bash
# HTTP/HTTPS (opcional, se usar proxy)
gcloud compute firewall-rules create allow-http-https \
  --allow=tcp:80,tcp:443 \
  --target-tags=haxball-server

# WebMonitor (restringir a IPs de admin)
ADMIN_IP="1.2.3.4/32"
gcloud compute firewall-rules create allow-webmonitor-3000 \
  --allow=tcp:3000 \
  --source-ranges="$ADMIN_IP" \
  --target-tags=webmonitor
```

### 3) Conectar via SSH e instalar dependências

```bash
# SSH
gcloud compute ssh "$VM_NAME" --zone="$ZONE"

# Atualizar sistema e instalar Node 20 LTS + ferramentas
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl git build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
```

### 4) Obter o código

#### 4.1) Repositório público
```bash
cd /opt
sudo git clone https://github.com/AlissoNNunes1/haxball-server.git
sudo chown -R $USER:$USER haxball-server
cd haxball-server
npm ci
npm run build
```

#### 4.2) Repositório privado

**Opção A: SSH Key (recomendado)**
```bash
# Gerar chave SSH na VM (sem senha para automação)
ssh-keygen -t ed25519 -C "haxball-vm@gcp" -f ~/.ssh/id_haxball -N ""

# Exibir chave pública para adicionar no GitHub/GitLab como Deploy Key
cat ~/.ssh/id_haxball.pub
# Copie a saída e adicione em:
# GitHub: Settings > Deploy keys > Add deploy key
# GitLab: Settings > Repository > Deploy Keys

# Configurar SSH para usar a chave
cat >> ~/.ssh/config <<EOF
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_haxball
  StrictHostKeyChecking no
EOF

chmod 600 ~/.ssh/config

# Clonar repositório privado
cd /opt
sudo git clone git@github.com:AlissoNNunes1/haxball-server.git
sudo chown -R $USER:$USER haxball-server
cd haxball-server
npm ci
npm run build
```

**Opção B: Personal Access Token (PAT)**
```bash
# Criar PAT no GitHub/GitLab com permissão 'repo' ou 'read_repository'
# GitHub: Settings > Developer settings > Personal access tokens > Generate new token
# GitLab: Settings > Access Tokens

# Clonar usando PAT na URL (substitua USERNAME e TOKEN)
cd /opt
sudo git clone https://USERNAME:TOKEN@github.com/AlissoNNunes1/haxball-server.git
sudo chown -R $USER:$USER haxball-server
cd haxball-server

# Remover token da URL para segurança
git remote set-url origin git@github.com:AlissoNNunes1/haxball-server.git

npm ci
npm run build
```

**Opção C: Secret Manager + Deploy Key (produção)**
```bash
# Armazenar chave SSH privada no Secret Manager
gcloud secrets create haxball-deploy-key --data-file="$HOME/.ssh/id_haxball"

# Recuperar em scripts de deploy
gcloud secrets versions access latest --secret="haxball-deploy-key" > ~/.ssh/id_haxball
chmod 600 ~/.ssh/id_haxball
```

### 5) Configurar credenciais e config.json

- Copie seu `config.json` (server/panel/bots/tokens). Exemplo rápido:

```bash
cat > config.json <<'EOF'
{
  "server": {
    "token": "SEU_HAXBALL_TOKEN",
    "roomName": "CIRS Sala",
    "geo": { "code": "br", "lat": -23.5, "lon": -46.6 }
  },
  "panel": {
    "discordToken": "SEU_DISCORD_BOT_TOKEN",
    "discordPrefix": "!",
    "mastersDiscordId": ["1234567890"],
    "bots": ["todos_jogam"]
  }
}
EOF
```

- Proteja o arquivo: `chmod 600 config.json`.

### 6) Executar manualmente (teste)

```bash
npm start -- open config.json
```

Verifique logs; finalize com Ctrl+C.

### 7) Configurar serviço systemd

```bash
sudo tee /etc/systemd/system/haxball.service > /dev/null <<'EOF'
[Unit]
Description=Haxball Server
After=network.target

[Service]
WorkingDirectory=/opt/haxball-server
ExecStart=/usr/bin/npm start -- open /opt/haxball-server/config.json
Restart=always
RestartSec=5
Environment=NODE_ENV=production
# Opcional: definir PATH se npm estiver em /usr/bin

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now haxball.service
sudo systemctl status haxball.service
```

### 8) Logs e monitoramento

- `journalctl -u haxball.service -n 200 -f`
- `du -sh haxball.sqlite` para acompanhar tamanho do DB.
- Use Cloud Monitoring se quiser enviar métricas (Stackdriver).

### 9) Atualizações

**Repositório público:**
```bash
cd /opt/haxball-server
git pull
npm ci
npm run build
sudo systemctl restart haxball.service
```

**Repositório privado (SSH):**
```bash
cd /opt/haxball-server
# Git já está configurado com SSH key
git pull
npm ci
npm run build
sudo systemctl restart haxball.service
```

**Automação de atualizações (opcional):**
```bash
# Script de atualização
sudo tee /opt/haxball-server/update.sh > /dev/null <<'EOF'
#!/bin/bash
cd /opt/haxball-server
git pull
npm ci
npm run build
systemctl restart haxball.service
EOF

sudo chmod +x /opt/haxball-server/update.sh

# Cron para atualizar diariamente às 4h (exemplo)
# (crontab -l 2>/dev/null; echo "0 4 * * * /opt/haxball-server/update.sh >> /var/log/haxball-update.log 2>&1") | crontab -
```

### 10) Backup

- Fazer snapshot do disco ou copiar `haxball.sqlite` + `config.json` para Cloud Storage.
- Automatize com cron/gsutil se precisar.

## Segurança e produção

- Restrinja porta 3000 a IPs de administração.
- Use HTTPS com um proxy (NGINX/Cloud HTTP LB) se expor painel web.
- Mantenha tokens fora do repositório (use Secret Manager ou `.env` carregado via systemd EnvironmentFile).
- **Repositório privado**: Use Deploy Keys (apenas leitura) ao invés de chaves SSH pessoais; evite PAT em URLs visíveis.
- Armazene credenciais sensíveis (chaves SSH, tokens) no Secret Manager do GCP ao invés de arquivos locais.
- Atualize o sistema regularmente (`unattended-upgrades` ou cron de `apt-get`).
- Configure backup automático do SQLite para Cloud Storage (veja seção de Backup).

## Solução de problemas

- Serviço não sobe: `systemctl status haxball.service` e revisar `journalctl`.
- Porta não acessível: confirmar regras de firewall e se WebMonitor está ativo.
- Tokens inválidos: revisar `config.json` e permissões do bot no Discord.

//   __  ____ ____ __
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
