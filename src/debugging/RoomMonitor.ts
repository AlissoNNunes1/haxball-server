/**
 * Sistema de monitoramento de salas Haxball
 * Substitui Chrome DevTools com metricas estruturadas e logging avancado
 * @module RoomMonitor
 */

import { EventEmitter } from 'events';
import { log } from '../utils/log';

/**
 * Metricas de uma sala Haxball
 * @interface RoomMetrics
 * @property {number} pid - ID da sala
 * @property {number} startTime - Timestamp de abertura
 * @property {number} playerCount - Numero atual de jogadores
 * @property {number} playerJoinCount - Total de jogadores que entraram
 * @property {number} playerLeaveCount - Total de jogadores que sairam
 * @property {number} gameCount - Numero de jogos iniciados
 * @property {number} messageCount - Total de mensagens de chat
 * @property {number} errorCount - Total de erros capturados
 * @property {number} uptime - Tempo de funcionamento em ms
 * @property {string} botName - Nome do bot gerenciador
 */
export interface RoomMetrics {
  pid: number;
  startTime: number;
  playerCount: number;
  playerJoinCount: number;
  playerLeaveCount: number;
  gameCount: number;
  messageCount: number;
  errorCount: number;
  uptime: number;
  botName: string;
}

/**
 * Monitor de salas com metricas e logging
 * Fornece alternativa a Chrome DevTools com foco em metricas estruturadas
 * @class RoomMonitor
 * @extends EventEmitter
 */
export class RoomMonitor extends EventEmitter {
  private metrics: Map<number, RoomMetrics> = new Map();
  private reportInterval: NodeJS.Timeout | null = null;

  /**
   * Inicializa o monitor
   */
  constructor() {
    super();
    log('MONITOR', 'Sistema de monitoramento de salas inicializado');
  }

  /**
   * Inicia rastreamento de uma sala
   * Registra metricas e monitora eventos importantes
   * @param {number} pid - ID da sala
   * @param {any} room - Objeto de sala do haxball.js
   * @param {string} [botName] - Nome do bot gerenciador
   * @example
   * monitor.trackRoom(1000, roomObject, 'futsal-bot');
   */
  trackRoom(pid: number, room: any, botName: string = 'Unknown'): void {
    const metrics: RoomMetrics = {
      pid,
      startTime: Date.now(),
      playerCount: 0,
      playerJoinCount: 0,
      playerLeaveCount: 0,
      gameCount: 0,
      messageCount: 0,
      errorCount: 0,
      uptime: 0,
      botName,
    };

    this.metrics.set(pid, metrics);

    // Monitorar entrada de jogador
    if (room.onPlayerJoin) {
      const originalHandler = room.onPlayerJoin;
      room.onPlayerJoin = (player: any) => {
        metrics.playerCount++;
        metrics.playerJoinCount++;
        this.emit('playerJoin', { pid, player, metrics });

        if (typeof originalHandler === 'function') {
          try {
            originalHandler.call(room, player);
          } catch (error) {
            metrics.errorCount++;
            log('MONITOR', `Erro em onPlayerJoin (sala ${pid}): ${error}`);
          }
        }
      };
    }

    // Monitorar saida de jogador
    if (room.onPlayerLeave) {
      const originalHandler = room.onPlayerLeave;
      room.onPlayerLeave = (player: any) => {
        metrics.playerCount = Math.max(0, metrics.playerCount - 1);
        metrics.playerLeaveCount++;
        this.emit('playerLeave', { pid, player, metrics });

        if (typeof originalHandler === 'function') {
          try {
            originalHandler.call(room, player);
          } catch (error) {
            metrics.errorCount++;
            log('MONITOR', `Erro em onPlayerLeave (sala ${pid}): ${error}`);
          }
        }
      };
    }

    // Monitorar inicio de jogo
    if (room.onGameStart) {
      const originalHandler = room.onGameStart;
      room.onGameStart = () => {
        metrics.gameCount++;
        this.emit('gameStart', { pid, metrics });

        if (typeof originalHandler === 'function') {
          try {
            originalHandler.call(room);
          } catch (error) {
            metrics.errorCount++;
            log('MONITOR', `Erro em onGameStart (sala ${pid}): ${error}`);
          }
        }
      };
    }

    // Monitorar chat
    if (room.onPlayerChat) {
      const originalHandler = room.onPlayerChat;
      room.onPlayerChat = (player: any, message: string) => {
        metrics.messageCount++;
        this.emit('playerChat', { pid, player, message, metrics });

        if (typeof originalHandler === 'function') {
          try {
            return originalHandler.call(room, player, message);
          } catch (error) {
            metrics.errorCount++;
            log('MONITOR', `Erro em onPlayerChat (sala ${pid}): ${error}`);
            return false;
          }
        }

        return true;
      };
    }

    log('MONITOR', `Sala ${pid} (${botName}) agora sendo monitorada`);
  }

  /**
   * Obtem metricas de uma sala especifica
   * @param {number} pid - ID da sala
   * @returns {RoomMetrics|undefined} Metricas da sala ou undefined se nao encontrada
   * @example
   * const metrics = monitor.getMetrics(1000);
   * console.log(`Jogadores na sala: ${metrics.playerCount}`);
   */
  getMetrics(pid: number): RoomMetrics | undefined {
    const metrics = this.metrics.get(pid);
    if (metrics) {
      metrics.uptime = Date.now() - metrics.startTime;
    }
    return metrics;
  }

  /**
   * Obtem metricas de todas as salas
   * @returns {RoomMetrics[]} Array com metricas de todas as salas
   * @example
   * const allMetrics = monitor.getAllMetrics();
   * allMetrics.forEach(m => console.log(`Sala ${m.pid}: ${m.playerCount} jogadores`));
   */
  getAllMetrics(): RoomMetrics[] {
    return Array.from(this.metrics.values()).map((m) => ({
      ...m,
      uptime: Date.now() - m.startTime,
    }));
  }

  /**
   * Gera relatorio de metricas de uma sala
   * Formato legivel para logging e debugging
   * @param {number} pid - ID da sala
   * @returns {string} Relatorio formatado
   * @example
   * const report = monitor.getReport(1000);
   * console.log(report);
   */
  getReport(pid: number): string {
    const metrics = this.getMetrics(pid);
    if (!metrics) return `Sala ${pid}: nao encontrada`;

    const uptime = Math.round(metrics.uptime / 1000);
    return `
METRICAS DA SALA ${pid} (${metrics.botName})
═══════════════════════════════════════════════════════
Tempo ativo: ${uptime}s
Jogadores atuais: ${metrics.playerCount}
Total entradas: ${metrics.playerJoinCount}
Total saidas: ${metrics.playerLeaveCount}
Jogos iniciados: ${metrics.gameCount}
Mensagens chat: ${metrics.messageCount}
Erros capturados: ${metrics.errorCount}
═══════════════════════════════════════════════════════
    `.trim();
  }

  /**
   * Gera relatorio consolidado de todas as salas
   * @returns {string} Relatorio de todas as salas
   * @example
   * const report = monitor.getFullReport();
   * console.log(report);
   */
  getFullReport(): string {
    const allMetrics = this.getAllMetrics();
    if (allMetrics.length === 0) return 'Nenhuma sala aberta para monitorar';

    let report = `RELATORIO COMPLETO - ${allMetrics.length} SALA(S) ATIVA(S)\n`;
    report += '═'.repeat(60) + '\n';

    allMetrics.forEach((m) => {
      const uptime = Math.round(m.uptime / 1000);
      report += `Sala ${m.pid} (${m.botName}): ${m.playerCount} jogadores | ${uptime}s ativo | ${m.gameCount} jogos\n`;
    });

    report += '═'.repeat(60) + '\n';

    const totalPlayers = allMetrics.reduce((sum, m) => sum + m.playerCount, 0);
    const totalGames = allMetrics.reduce((sum, m) => sum + m.gameCount, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);

    report += `TOTAIS: ${totalPlayers} jogadores | ${totalGames} jogos | ${totalErrors} erros\n`;

    return report;
  }

  /**
   * Remove monitoramento de uma sala
   * @param {number} pid - ID da sala
   * @returns {boolean} true se sala foi removida, false se nao encontrada
   */
  untrackRoom(pid: number): boolean {
    if (this.metrics.has(pid)) {
      const metrics = this.metrics.get(pid)!;
      const uptime = Math.round((Date.now() - metrics.startTime) / 1000);
      log('MONITOR', `Sala ${pid} desmonitorada apos ${uptime}s (${metrics.gameCount} jogos)`);
      this.metrics.delete(pid);
      return true;
    }
    return false;
  }

  /**
   * Inicia relatorios periodicos de metricas
   * @param {number} [intervalMs=60000] - Intervalo em milissegundos (padrao: 60s)
   * @example
   * monitor.startPeriodicReports(30000); // A cada 30 segundos
   */
  startPeriodicReports(intervalMs: number = 60000): void {
    try {
      const { createNamedInterval } = require('../../shared/config/roomTimers.cjs');
      this.reportInterval = createNamedInterval('monitor', 'room_monitor_reports', () => {
        const report = this.getFullReport();
        if (this.metrics.size > 0) {
          log('MONITOR', '\n' + report);
        }
      }, intervalMs) as any;
    } catch (e) {
      this.reportInterval = setInterval(() => {
        const report = this.getFullReport();
        if (this.metrics.size > 0) {
          log('MONITOR', '\n' + report);
        }
      }, intervalMs);
    }

    log('MONITOR', `Relatorios periodicos iniciados (a cada ${intervalMs}ms)`);
  }

  /**
   * Para relatorios periodicos
   */
  stopPeriodicReports(): void {
    if (this.reportInterval) {
      try { const { clearNamedTimer } = require('../../shared/config/roomTimers.cjs'); clearNamedTimer('monitor', 'room_monitor_reports'); } catch (e) { clearInterval(this.reportInterval); }
      this.reportInterval = null;
      log('MONITOR', 'Relatorios periodicos parados');
    }
  }

  /**
   * Limpa todos os dados de monitoramento
   */
  clear(): void {
    this.metrics.clear();
    this.stopPeriodicReports();
    log('MONITOR', 'Dados de monitoramento limpos');
  }
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
