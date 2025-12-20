import express from 'express';
import { Server as HTTPServer } from 'http';
import * as os from 'os';
import { WebSocket, WebSocketServer } from 'ws';
import { LogEntry, logger, LogLevel } from '../utils/Logger';
import { RoomMonitor } from './RoomMonitor';

export interface WebMonitorConfig {
  port: number;
  host?: string;
}

export class WebMonitor {
  private app: express.Application;
  private server: HTTPServer;
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private logUnsubscribe: (() => void) | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(private roomMonitor: RoomMonitor, config: WebMonitorConfig) {
    this.app = express();
    this.server = require('http').createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupRoutes();
    this.setupWebSocket();
    this.startServer(config.port, config.host || 'localhost');
    this.startMetricsBroadcast();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    this.app.get('/', (_req, res) => {
      res.send(this.getHTML());
    });

    this.app.get('/api/logs', (req, res) => {
      const level = req.query.level as LogLevel;
      const component = req.query.component as string;
      const roomId = req.query.roomId ? parseInt(req.query.roomId as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const logs = logger.getLogs({ level, component, roomId, limit });
      res.json(logs);
    });

    this.app.get('/api/stats', (_req, res) => {
      const stats = logger.getStats();
      const roomMetrics = this.roomMonitor.getAllMetrics();
      const systemMetrics = this.getSystemMetrics();

      res.json({
        logging: stats,
        rooms: {
          total: roomMetrics.length,
          metrics: roomMetrics,
        },
        system: systemMetrics,
      });
    });

    this.app.get('/api/rooms', (_req, res) => {
      const roomMetrics = this.roomMonitor.getAllMetrics();
      res.json(roomMetrics);
    });

    this.app.get('/api/rooms/:pid', (req, res) => {
      const pid = parseInt(req.params.pid);
      const metric = this.roomMonitor.getMetrics(pid);

      if (!metric) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      res.json(metric);
    });

    this.app.post('/api/logs/export', async (_req, res) => {
      try {
        const filePath = `haxball-logs-${Date.now()}.json`;
        await logger.exportLogs(filePath);
        res.json({ success: true, file: filePath });
      } catch (error) {
        res.status(500).json({ error: String(error) });
      }
    });

    this.app.post('/api/logs/clear', (_req, res) => {
      logger.clearLogs();
      res.json({ success: true, message: 'Logs cleared' });
    });

    this.app.get('/api/log-level', (_req, res) => {
      res.json({ level: logger['logLevel'] || LogLevel.INFO });
    });

    this.app.post('/api/log-level', (req, res) => {
      const { level } = req.body;
      if (!Object.values(LogLevel).includes(level)) {
        res.status(400).json({ error: 'Invalid log level' });
        return;
      }
      logger.setLogLevel(level);
      res.json({ success: true, level });
    });

    // Room control endpoints
    this.app.post('/api/rooms/open', (req, res) => {
      const { bot, token } = req.body;
      if (!bot || !token) {
        res.status(400).json({ error: 'Bot and token are required' });
        return;
      }

      logger.info('WebMonitor', 'Room open request received', {
        bot,
        token: token.substring(0, 10) + '...',
      });

      // Simular resposta de sucesso - implementacao real integraria com ControlPanel/openServer
      res.json({
        success: true,
        message: 'Pedido de abertura enviado',
        bot,
        timestamp: new Date().toISOString(),
      });
    });

    this.app.post('/api/rooms/:pid/close', (req, res) => {
      const pid = parseInt(req.params.pid);
      const roomMetric = this.roomMonitor.getMetrics(pid);

      if (!roomMetric) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      logger.info('WebMonitor', 'Room close request received', { pid });

      // Simular resposta de sucesso - implementacao real chamaria closeRoom
      res.json({
        success: true,
        message: 'Pedido de fechamento enviado',
        pid,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      logger.debug('WebMonitor', 'Client connected', { clients: this.clients.size });

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleWebSocketMessage(message, ws);
        } catch (error) {
          logger.error('WebMonitor', 'Invalid WebSocket message', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.debug('WebMonitor', 'Client disconnected', { clients: this.clients.size });
      });

      ws.on('error', (error) => {
        logger.error('WebMonitor', 'WebSocket error', error);
      });
    });

    if (!this.logUnsubscribe) {
      this.logUnsubscribe = logger.subscribe((entry: LogEntry) => {
        this.broadcast({
          type: 'log',
          data: entry,
        });
      });
    }
  }

  private handleWebSocketMessage(message: any, ws: WebSocket): void {
    if (message.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
  }

  private broadcast(message: any): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  private getSystemMetrics(): any {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercent = (usedMemory / totalMemory) * 100;

    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsagePercent = 100 - ~~((100 * totalIdle) / totalTick);

    const processMemory = process.memoryUsage();
    const heapUsedPercent = (processMemory.heapUsed / processMemory.heapTotal) * 100;

    return {
      cpu: {
        percent: Math.max(0, Math.min(100, cpuUsagePercent)),
        cores: cpus.length,
      },
      memory: {
        total: Math.round(totalMemory / 1024 / 1024),
        used: Math.round(usedMemory / 1024 / 1024),
        free: Math.round(freeMemory / 1024 / 1024),
        percent: Math.max(0, Math.min(100, memoryPercent)),
      },
      heap: {
        total: Math.round(processMemory.heapTotal / 1024 / 1024),
        used: Math.round(processMemory.heapUsed / 1024 / 1024),
        percent: Math.max(0, Math.min(100, heapUsedPercent)),
      },
      uptime: process.uptime(),
    };
  }

  private startMetricsBroadcast(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(() => {
      const metrics = this.getSystemMetrics();
      this.broadcast({
        type: 'metrics',
        data: metrics,
      });
    }, 2000);
  }

  private startServer(port: number, host: string): void {
    this.server.listen(port, host, () => {
      logger.info('WebMonitor', `Web monitor started`, { url: `http://${host}:${port}` });
    });
  }

  private getHTML(): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Haxball Server Monitor</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    h1 {
      color: #667eea;
      font-size: 28px;
    }

    .status {
      display: flex;
      gap: 30px;
      align-items: center;
    }

    .status-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .status-value {
      font-size: 24px;
      font-weight: bold;
      color: #764ba2;
    }

    .status-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      margin-top: 5px;
    }

    .controls {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }

    button:hover {
      background: #764ba2;
    }

    button.danger {
      background: #e74c3c;
    }

    button.danger:hover {
      background: #c0392b;
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .panel {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .panel h2 {
      color: #667eea;
      margin-bottom: 15px;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    .logs-container {
      background: #f5f5f5;
      border-radius: 4px;
      padding: 12px;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      grid-column: 1 / -1;
    }

    .log-entry {
      padding: 8px;
      margin: 5px 0;
      border-left: 3px solid;
      background: white;
      border-radius: 2px;
    }

    .log-DEBUG {
      border-left-color: #3498db;
    }

    .log-INFO {
      border-left-color: #2ecc71;
    }

    .log-WARN {
      border-left-color: #f39c12;
    }

    .log-ERROR {
      border-left-color: #e74c3c;
    }

    .log-timestamp {
      color: #999;
      font-size: 11px;
    }

    .log-level {
      font-weight: bold;
      margin-right: 10px;
    }

    .log-DEBUG .log-level {
      color: #3498db;
    }

    .log-INFO .log-level {
      color: #2ecc71;
    }

    .log-WARN .log-level {
      color: #f39c12;
    }

    .log-ERROR .log-level {
      color: #e74c3c;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      border-radius: 4px;
      text-align: center;
    }

    .stat-value {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 12px;
      opacity: 0.8;
    }

    .rooms-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .room-card {
      background: #f9f9f9;
      border-left: 4px solid #667eea;
      padding: 12px;
      margin-bottom: 10px;
      border-radius: 4px;
    }

    .room-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .room-name {
      font-weight: bold;
      color: #333;
    }

    .room-pid {
      background: #667eea;
      color: white;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 12px;
    }

    .room-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 12px;
    }

    .room-stat {
      background: white;
      padding: 6px;
      border-radius: 3px;
      color: #666;
    }

    .room-close-btn {
      background: #e74c3c;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 16px;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
    }

    .room-close-btn:hover {
      background: #c0392b;
    }

    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #2ecc71;
      animation: pulse 2s infinite;
    }

    .status-indicator.disconnected {
      background: #e74c3c;
      animation: none;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .filter-controls {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .filter-group label {
      font-size: 12px;
      color: #666;
    }

    .filter-group select,
    .filter-group input {
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 12px;
    }

    .metrics-panel {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }

    .metric-gauge {
      background: white;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .gauge-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .gauge-container {
      position: relative;
      width: 100px;
      height: 100px;
      margin: 0 auto 10px;
      border-radius: 50%;
      background: conic-gradient(
        from 0deg,
        var(--gauge-color) 0deg,
        var(--gauge-color) calc(var(--gauge-percent) * 3.6deg),
        #f0f0f0 calc(var(--gauge-percent) * 3.6deg),
        #f0f0f0 360deg
      );
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gauge-inner {
      width: 90px;
      height: 90px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      color: var(--gauge-color);
    }

    .gauge-value {
      font-size: 14px;
      font-weight: bold;
      color: #333;
      margin-top: 10px;
    }

    .gauge-subtext {
      font-size: 11px;
      color: #999;
      margin-top: 5px;
    }

    .metrics-panel.green .gauge-container {
      --gauge-color: #2ecc71;
    }

    .metrics-panel.yellow .gauge-container {
      --gauge-color: #f39c12;
    }

    .metrics-panel.red .gauge-container {
      --gauge-color: #e74c3c;
    }

    @media (max-width: 1024px) {
      .layout {
        grid-template-columns: 1fr;
      }

      .logs-container {
        grid-column: 1;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>Haxball Server Monitor</h1>
      </div>
      <div class="controls">
        <div class="connection-status">
          <div class="status-indicator" id="connectionStatus"></div>
          <span id="connectionText">Conectando...</span>
        </div>
        <button onclick="exportLogs()">Exportar Logs</button>
        <button class="danger" onclick="clearLogs()">Limpar Logs</button>
      </div>
    </header>

    <div class="layout">
      <div class="panel">
        <h2>Salas Ativas</h2>
        <div id="roomsContainer" class="rooms-list">
          <p style="color: #999; text-align: center;">Carregando...</p>
        </div>
      </div>

      <div class="panel">
        <h2>Estatisticas</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value" id="totalLogs">0</div>
            <div class="stat-label">Total de Logs</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="totalRooms">0</div>
            <div class="stat-label">Salas Abertas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="errorCount">0</div>
            <div class="stat-label">Erros</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="totalPlayers">0</div>
            <div class="stat-label">Jogadores Ativos</div>
          </div>
        </div>

        <h2 style="margin-top: 20px;">Metricas do Sistema</h2>
        <div class="metrics-panel" id="metricsPanel">
          <div class="metric-gauge">
            <div class="gauge-label">CPU</div>
            <div class="gauge-container green" id="cpuGauge">
              <div class="gauge-inner">
                <span id="cpuPercent">0%</span>
              </div>
            </div>
            <div class="gauge-value" id="cpuCores">0 cores</div>
            <div class="gauge-subtext">Uso do Sistema</div>
          </div>

          <div class="metric-gauge">
            <div class="gauge-label">RAM</div>
            <div class="gauge-container green" id="memoryGauge">
              <div class="gauge-inner">
                <span id="memoryPercent">0%</span>
              </div>
            </div>
            <div class="gauge-value" id="memoryUsage">0 MB / 0 MB</div>
            <div class="gauge-subtext">Memoria do Sistema</div>
          </div>

          <div class="metric-gauge">
            <div class="gauge-label">HEAP</div>
            <div class="gauge-container green" id="heapGauge">
              <div class="gauge-inner">
                <span id="heapPercent">0%</span>
              </div>
            </div>
            <div class="gauge-value" id="heapUsage">0 MB / 0 MB</div>
            <div class="gauge-subtext">Memoria Node.js</div>
          </div>
        </div>
      </div>

      <div class="panel logs-container" id="logsContainer" style="grid-column: 1 / -1;">
        <div class="filter-controls">
          <div class="filter-group">
            <label>Nivel:</label>
            <select id="levelFilter" onchange="applyFilters()">
              <option value="">Todos</option>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Componente:</label>
            <input type="text" id="componentFilter" placeholder="ex: Server" onchange="applyFilters()">
          </div>
          <button onclick="applyFilters()">Filtrar</button>
          <button onclick="loadAllLogs()">Recarregar</button>
        </div>
        <div id="logsList"></div>
      </div>
    </div>
  </div>

  <script>
    let ws = null;
    let allLogs = [];

    function connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);

      ws.onopen = () => {
        updateConnectionStatus(true);
        console.log('Conectado ao servidor');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'log') {
            allLogs.unshift(message.data);
            if (allLogs.length > 1000) allLogs.pop();
            addLogEntry(message.data);
            updateStats();
          } else if (message.type === 'metrics') {
            updateMetricsDisplay(message.data);
          }
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      };

      ws.onclose = () => {
        updateConnectionStatus(false);
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        updateConnectionStatus(false);
      };
    }

    function updateConnectionStatus(connected) {
      const indicator = document.getElementById('connectionStatus');
      const text = document.getElementById('connectionText');
      if (connected) {
        indicator.classList.remove('disconnected');
        text.textContent = 'Conectado';
      } else {
        indicator.classList.add('disconnected');
        text.textContent = 'Desconectado';
      }
    }

    function addLogEntry(log) {
      const logsList = document.getElementById('logsList');
      const entry = document.createElement('div');
      entry.className = \`log-entry log-\${log.level}\`;
      
      const timestamp = new Date(log.timestamp).toLocaleTimeString('pt-BR');
      let content = \`
        <div class="log-timestamp">\${timestamp}</div>
        <span class="log-level">\${log.level.padEnd(5)}</span>
        <span>[\${log.component}]</span>
        <span>\${log.message}\</span>
      \`;

      if (log.roomId !== undefined) {
        content = \`
          <div class="log-timestamp">\${timestamp}</div>
          <span class="log-level">\${log.level.padEnd(5)}</span>
          <span>[Room \${log.roomId}]</span>
          <span>[\${log.component}]</span>
          <span>\${log.message}\</span>
        \`;
      }

      if (log.data) {
        content += \` <span style="color: #666; font-size: 11px;">| \${JSON.stringify(log.data)}</span>\`;
      }

      entry.innerHTML = content;
      
      const existingLogs = logsList.children;
      if (existingLogs.length > 100) {
        logsList.removeChild(logsList.lastChild);
      }
      
      if (logsList.firstChild) {
        logsList.insertBefore(entry, logsList.firstChild);
      } else {
        logsList.appendChild(entry);
      }
    }

    function loadAllLogs() {
      fetch('/api/logs?limit=100')
        .then(r => r.json())
        .then(logs => {
          allLogs = logs.reverse();
          const logsList = document.getElementById('logsList');
          logsList.innerHTML = '';
          logs.forEach(log => addLogEntry(log));
          updateStats();
        })
        .catch(error => console.error('Erro ao carregar logs:', error));
    }

    function applyFilters() {
      const level = document.getElementById('levelFilter').value;
      const component = document.getElementById('componentFilter').value;

      let filtered = allLogs;
      if (level) {
        filtered = filtered.filter(log => log.level === level);
      }
      if (component) {
        filtered = filtered.filter(log => log.component.includes(component));
      }

      const logsList = document.getElementById('logsList');
      logsList.innerHTML = '';
      filtered.forEach(log => addLogEntry(log));
    }

    function updateStats() {
      fetch('/api/stats')
        .then(r => r.json())
        .then(stats => {
          document.getElementById('totalLogs').textContent = stats.logging.totalLogs;
          document.getElementById('totalRooms').textContent = stats.rooms.total;
          document.getElementById('errorCount').textContent = stats.logging.byLevel['ERROR'] || 0;
          
          let totalPlayers = 0;
          stats.rooms.metrics.forEach(metric => {
            totalPlayers += metric.playerCount || 0;
          });
          document.getElementById('totalPlayers').textContent = totalPlayers;

          if (stats.system) {
            updateMetricsDisplay(stats.system);
          }

          updateRoomsList(stats.rooms.metrics);
        })
        .catch(error => console.error('Erro ao carregar stats:', error));
    }

    function updateMetricsDisplay(metrics) {
      const getGaugeClass = (percent) => {
        if (percent < 50) return 'green';
        if (percent < 75) return 'yellow';
        return 'red';
      };

      // CPU
      const cpuPercent = Math.round(metrics.cpu.percent);
      document.getElementById('cpuPercent').textContent = cpuPercent + '%';
      document.getElementById('cpuCores').textContent = metrics.cpu.cores + ' cores';
      document.getElementById('cpuGauge').className = 'gauge-container ' + getGaugeClass(cpuPercent);
      document.getElementById('cpuGauge').style.setProperty('--gauge-percent', cpuPercent);

      // Memory
      const memPercent = Math.round(metrics.memory.percent);
      document.getElementById('memoryPercent').textContent = memPercent + '%';
      document.getElementById('memoryUsage').textContent = metrics.memory.used + ' MB / ' + metrics.memory.total + ' MB';
      document.getElementById('memoryGauge').className = 'gauge-container ' + getGaugeClass(memPercent);
      document.getElementById('memoryGauge').style.setProperty('--gauge-percent', memPercent);

      // Heap
      const heapPercent = Math.round(metrics.heap.percent);
      document.getElementById('heapPercent').textContent = heapPercent + '%';
      document.getElementById('heapUsage').textContent = metrics.heap.used + ' MB / ' + metrics.heap.total + ' MB';
      document.getElementById('heapGauge').className = 'gauge-container ' + getGaugeClass(heapPercent);
      document.getElementById('heapGauge').style.setProperty('--gauge-percent', heapPercent);
    }

    function updateRoomsList(rooms) {
      const container = document.getElementById('roomsContainer');
      
      if (rooms.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center;">Nenhuma sala aberta</p>';
        return;
      }

      container.innerHTML = rooms.map(room => \`
        <div class="room-card">
          <div class="room-header">
            <div>
              <span class="room-name">Room \${room.pid}</span>
              <div style="font-size: 11px; color: #999; margin-top: 2px;">Aberta a \${formatUptime(room.uptime || 0)}</div>
            </div>
            <button class="room-close-btn" onclick="closeRoom(\${room.pid})" title="Fechar sala">✕</button>
          </div>
          <div class="room-stats">
            <div class="room-stat">👤 \${room.playerCount || 0}</div>
            <div class="room-stat">⚽ \${room.gameCount || 0}</div>
            <div class="room-stat">💬 \${room.messageCount || 0}</div>
            <div class="room-stat">❌ \${room.errorCount || 0}</div>
          </div>
        </div>
      \`).join('');
    }

    function formatUptime(milliseconds) {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return days + 'd ' + (hours % 24) + 'h';
      if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm';
      if (minutes > 0) return minutes + 'm ' + (seconds % 60) + 's';
      return seconds + 's';
    }

    function closeRoom(pid) {
      if (confirm('Fechar sala ' + pid + '?')) {
        fetch(\`/api/rooms/\${pid}/close\`, { method: 'POST' })
          .then(r => r.json())
          .then(result => {
            if (result.success) {
              showNotification('Sala ' + pid + ' fechada com sucesso', 'success');
              setTimeout(updateStats, 1000);
            } else {
              showNotification('Erro ao fechar sala: ' + result.error, 'error');
            }
          })
          .catch(error => {
            console.error('Erro ao fechar sala:', error);
            showNotification('Erro ao fechar sala', 'error');
          });
      }
    }

    function showNotification(message, type) {
      const notification = document.createElement('div');
      notification.style.cssText = \`
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        background: \${type === 'success' ? '#2ecc71' : '#e74c3c'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
      \`;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }

    function exportLogs() {
      fetch('/api/logs/export', { method: 'POST' })
        .then(r => r.json())
        .then(result => {
          showNotification('Logs exportados para: ' + result.file, 'success');
        })
        .catch(error => {
          console.error('Erro ao exportar logs:', error);
          showNotification('Erro ao exportar logs', 'error');
        });
    }

    function clearLogs() {
      if (confirm('Tem certeza que deseja limpar todos os logs?')) {
        fetch('/api/logs/clear', { method: 'POST' })
          .then(r => r.json())
          .then(() => {
            allLogs = [];
            document.getElementById('logsList').innerHTML = '';
            updateStats();
            showNotification('Logs limpos com sucesso', 'success');
          })
          .catch(error => {
            console.error('Erro ao limpar logs:', error);
            showNotification('Erro ao limpar logs', 'error');
          });
      }
    }

    connectWebSocket();
    loadAllLogs();
    setInterval(updateStats, 5000);
  </script>
</body>
</html>
    `;
  }

  public close(): void {
    if (this.logUnsubscribe) {
      this.logUnsubscribe();
      this.logUnsubscribe = null;
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.wss.close();
    this.server.close();
  }
}

// SCS - Sistema de Controle de Servidores Haxball
