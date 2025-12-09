import * as fs from 'fs';
import * as path from 'path';
import { promises as fsPromises } from 'fs';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  roomId?: number;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs: number = 10000;
  private logFile: string;
  private logLevel: LogLevel = LogLevel.INFO;
  private subscribers: ((entry: LogEntry) => void)[] = [];

  private constructor() {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    this.logFile = path.join(logsDir, `haxball-${timestamp}.log`);
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public subscribe(callback: (entry: LogEntry) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  public debug(component: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, component, message, data);
  }

  public info(component: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, component, message, data);
  }

  public warn(component: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, component, message, data);
  }

  public error(component: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, component, message, data);
  }

  private log(level: LogLevel, component: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const entry: LogEntry = {
      timestamp,
      level,
      component,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    this.notifySubscribers(entry);
    this.writeToFile(entry);
    this.printToConsole(entry);
  }

  private printToConsole(entry: LogEntry): void {
    const levelColor = this.getColorCode(entry.level);
    const reset = '\x1b[0m';

    let logMessage = `${levelColor}[${entry.timestamp}] [${entry.level}] [${entry.component}]${reset} ${entry.message}`;

    if (entry.data !== undefined) {
      logMessage += ` ${JSON.stringify(entry.data)}`;
    }

    if (entry.roomId !== undefined) {
      logMessage = `${levelColor}[${entry.timestamp}] [${entry.level}] [Room ${entry.roomId}] [${entry.component}]${reset} ${entry.message}`;
    }

    console.log(logMessage);
  }

  private getColorCode(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      default:
        return '\x1b[0m'; // Reset
    }
  }

  private writeToFile(entry: LogEntry): void {
    const logLine = `${entry.timestamp} | ${entry.level.padEnd(5)} | ${entry.component.padEnd(
      20
    )} | ${entry.message}${entry.data ? ' | ' + JSON.stringify(entry.data) : ''}${
      entry.roomId ? ` | Room: ${entry.roomId}` : ''
    }\n`;

    fs.appendFileSync(this.logFile, logLine, 'utf-8');
  }

  private notifySubscribers(entry: LogEntry): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(entry);
      } catch (error) {
        console.error('Error notifying log subscriber:', error);
      }
    }
  }

  public getLogs(filter?: {
    level?: LogLevel;
    component?: string;
    roomId?: number;
    limit?: number;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter((log) => log.level === filter.level);
    }

    if (filter?.component) {
      filtered = filtered.filter((log) => log.component.includes(filter.component || ''));
    }

    if (filter?.roomId !== undefined) {
      filtered = filtered.filter((log) => log.roomId === filter.roomId);
    }

    if (filter?.limit) {
      return filtered.slice(-filter.limit);
    }

    return filtered;
  }

  public getStats(): {
    totalLogs: number;
    byLevel: Record<string, number>;
    byComponent: Record<string, number>;
  } {
    const stats = {
      totalLogs: this.logs.length,
      byLevel: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
    };

    for (const log of this.logs) {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
    }

    return stats;
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public async exportLogs(filePath: string): Promise<void> {
    const data = JSON.stringify(this.logs, null, 2);
    await fsPromises.writeFile(filePath, data, 'utf-8');
  }

  public getLogFile(): string {
    return this.logFile;
  }
}

export const logger = Logger.getInstance();

// SCS - Sistema de Controle de Servidores Haxball
