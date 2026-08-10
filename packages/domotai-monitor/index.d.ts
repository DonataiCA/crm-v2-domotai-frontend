import type { ErrorRequestHandler } from 'express';

interface MonitorOptions {
  /** API key generada en el CRM (proyecto > monitor) */
  apiKey: string;
  /** URL del backend del CRM (default: https://crm.domotai.online) */
  crmUrl?: string;
  /** URL publica de tu app — habilita health checks automaticos */
  productionUrl?: string;
  /** Intervalo de heartbeat en ms (default: 300000 = 5 min) */
  intervalMs?: number;
  /** No imprimir mensajes en consola (default: false) */
  silent?: boolean;
}

interface MonitorInstance {
  /** Middleware Express para capturar errores. Usar antes de tu error handler. */
  errorMiddleware: ErrorRequestHandler;
  /** Reportar un deploy. Llamar desde CI/CD o al iniciar. */
  reportDeploy(version?: string, environment?: string, commitSha?: string): void;
  /** Enviar heartbeat manualmente (se envia automaticamente cada 5 min). */
  sendHeartbeat(): void;
  /** Limpiar timers y listeners. Usar en tests o shutdown. */
  destroy(): void;
}

declare function initDomotaiMonitor(options: MonitorOptions): MonitorInstance;

export = initDomotaiMonitor;
