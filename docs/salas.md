# Documentação das Salas

## CIRS Stadium

### Descrição

Sala dedicada ao Real Soccer, com mecânicas avançadas de impedimento, formações, posições e comandos administrativos.

### Estrutura de Arquivos

- `bots/cirs-stadium.js`: Entry point que carrega o bot CIRS Stadium.
- `shared/config/cirs-main.js`: Arquivo principal que inicializa a sala e importa módulos.
- `shared/config/cirs-handlers.js`: Handlers de eventos da sala (onPlayerJoin, onPlayerChat, etc.).
- `shared/config/maps.js`: Definição do mapa custom CIRS Stadium (getRealSoccerMap).
- `shared/config/variables.js`: Variáveis globais como configurações de sala, cores, etc.
- `shared/config/cirs-messages.js`: Funções para anúncios e whispers (announce, whisper, isAdminPresent).
- `shared/config/cirs-rules.js`: Classe Game, posições, formações e lógica de regras.
- `shared/config/utils.js`: Utilitários como pointDistance, sleep, ballWarning.

### Funcionalidades

- **Mapa Custom**: CIRS Stadium com física realista e elementos visuais.
- **Posições e Formações**: Sistema de posições (GK, ZD, ZE, etc.) e formações (f231, f321, f2211).
- **Impedimento**: Detecção automática de impedimento com penalidades.
- **Comandos de Chat**: !admin, !clearbans, !court, !formacao, etc.
- **Administração**: Super admins, mutar sala, controle de cores do mapa.
- **Árbitro Automático**: Lógica completa de real soccer referee com throw-ins, corners, goal kicks.
- **Power Shots**: Sistema de chutes poderosos com cores especiais da bola.
- **Celebrações**: Avatares animados para jogadores que fazem gol.

### Funções Auxiliares (em handlers.js)

- `realSoccerRef()`: Controla o árbitro automático, gerencia tempo extra e última jogada.
- `blockThrowIn()`: Bloqueia jogadores durante throw-ins para evitar interferência.
- `blockGoalKick()`: Bloqueia jogadores durante goal kicks.
- `removeBlock()`: Remove bloqueios quando a jogada volta ao normal.
- `extraTime()`: Calcula e anuncia tempo extra baseado em interrupções.
- `updateGameStatus()`: Atualiza status do jogo (tempo, raio da bola).
- `handleBallTouch()`: Processa toques na bola, verifica impedimento e power shots.
- `secondsToMinutes()`: Converte segundos para formato MM:SS.
- `avatarCelebration()`: Anima avatares dos jogadores após gol.
- `anuncio()`: Anúncio automático do Discord a cada 7 minutos.

### Como Usar

1. Execute o bot via `node dist/main.js open config.json`.
2. No Discord, use `!open cirs-stadium <token>` para abrir a sala.
3. Jogadores podem escolher posições digitando o nome da posição (ex: GK, ZD).
4. Admins podem usar comandos como `!formacao red f231` para mudar formações.
5. O árbitro automático gerencia throw-ins, corners e goal kicks automaticamente.

### Configuração

- Edite `shared/config/variables.js` para alterar configurações globais.
- Adicione novas formações em `shared/config/cirs-rules.js`.
- Modifique handlers em `shared/config/cirs-handlers.js` para personalizar comportamento.

### Reutilização

Os módulos em `shared/config/` podem ser reutilizados para outras salas. Arquivos com prefixo `cirs-` contêm lógica específica da sala CIRS Stadium, enquanto `maps.js`, `variables.js` e `utils.js` são genéricos.

# ** \_\_** \__\_\_ _ \_

# / \_\/ **_) _**) )( \

# / \_** \_** ) \/ (

# \_/\_(\_**\_(\_\_**|\_\_\_\_/
