// @domotai/monitor — SDK de monitoreo para Domotai CRM
// Envia heartbeats (CPU, RAM, uptime), captura errores y reporta deploys.
//
// USO:
//   const monitor = require('@domotai/monitor')({
//     apiKey: 'tu-api-key-del-crm',
//     crmUrl: 'https://crm.domotai.online',
//     productionUrl: 'https://tuapp.com',
//   });
//   app.use(monitor.errorMiddleware);  // antes de tu error handler
//   monitor.reportDeploy('1.0.0');     // al iniciar o desde CI/CD

const os = require('os');

/**
 * @param {object} options
 * @param {string} options.apiKey          - API key generada en el CRM (proyecto > monitor)
 * @param {string} [options.crmUrl]        - URL del backend del CRM (default: https://crm.domotai.online)
 * @param {string} [options.productionUrl] - URL publica de tu app (habilita health checks automaticos)
 * @param {number} [options.intervalMs]    - Intervalo de heartbeat en ms (default: 300000 = 5 min)
 * @param {boolean} [options.silent]       - No imprimir mensajes en consola (default: false)
 */
module.exports = function initDomotaiMonitor(options) {
  if (!options || !options.apiKey) {
    throw new Error('[DomotAI Monitor] apiKey es requerido');
  }

  const apiKey = options.apiKey;
  const crmUrl = (options.crmUrl || 'https://crm.domotai.online').replace(/\/+$/, '');
  const productionUrl = options.productionUrl || null;
  const intervalMs = options.intervalMs || 5 * 60 * 1000;
  const silent = options.silent || false;
  const endpoint = crmUrl + '/monitor/' + apiKey + '/ingest';

  let version = 'unknown';
  try { version = require(process.cwd() + '/package.json').version; } catch (_) {}

  // ── Internal: envia evento al CRM ──────────────────────────────────────

  function send(type, payload) {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, payload: payload }),
    }).catch(function () {
      // Silencioso — el monitor nunca debe romper tu app
    });
  }

  // ── Heartbeat: CPU, RAM, uptime, version ───────────────────────────────

  function sendHeartbeat() {
    var cpus = os.cpus();
    var cpuUsage = cpus.reduce(function (acc, cpu) {
      var total = Object.values(cpu.times).reduce(function (a, b) { return a + b; }, 0);
      return acc + ((total - cpu.times.idle) / total) * 100;
    }, 0) / cpus.length;

    send('heartbeat', {
      cpu: Math.round(cpuUsage * 100) / 100,
      memoryUsedMB: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
      memoryTotalMB: Math.round(os.totalmem() / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
      version: version,
      nodeVersion: process.version,
      productionUrl: productionUrl,
    });
  }

  var heartbeatInterval = setInterval(sendHeartbeat, intervalMs);
  var startupTimeout = setTimeout(sendHeartbeat, 5000);

  // ── Captura de errores globales ────────────────────────────────────────

  function onUncaughtException(err) {
    send('error', {
      statusCode: 500,
      message: err.message,
      stack: err.stack ? err.stack.slice(0, 2000) : undefined,
      source: 'uncaughtException',
    });
  }

  function onUnhandledRejection(reason) {
    var msg = reason instanceof Error ? reason.message : String(reason);
    var stack = reason instanceof Error && reason.stack ? reason.stack.slice(0, 2000) : undefined;
    send('error', {
      statusCode: 500,
      message: msg,
      stack: stack,
      source: 'unhandledRejection',
    });
  }

  process.on('uncaughtException', onUncaughtException);
  process.on('unhandledRejection', onUnhandledRejection);

  // ── Middleware Express: captura errores 4xx/5xx ────────────────────────

  function errorMiddleware(err, req, res, next) {
    send('error', {
      statusCode: res.statusCode >= 400 ? res.statusCode : 500,
      message: err.message || 'Internal Server Error',
      endpoint: req.originalUrl || req.url,
      method: req.method,
      stack: err.stack ? err.stack.slice(0, 2000) : undefined,
      source: 'expressMiddleware',
    });
    next(err);
  }

  // ── Reportar deploy ───────────────────────────────────────────────────

  /**
   * Reporta un deploy al CRM. Llamar desde CI/CD o al iniciar el server.
   * @param {string} [deployVersion] - Version deployada (default: package.json version)
   * @param {string} [environment]   - Ambiente: production, staging, etc. (default: production)
   * @param {string} [commitSha]     - SHA del commit deployado
   */
  function reportDeploy(deployVersion, environment, commitSha) {
    send('deploy', {
      version: deployVersion || version,
      environment: environment || 'production',
      commitSha: commitSha || undefined,
    });
  }

  // ── Cleanup: para tests o shutdown ────────────────────────────────────

  function destroy() {
    clearInterval(heartbeatInterval);
    clearTimeout(startupTimeout);
    process.removeListener('uncaughtException', onUncaughtException);
    process.removeListener('unhandledRejection', onUnhandledRejection);
  }

  if (!silent) {
    console.log('[DomotAI Monitor] Iniciado — reportando a ' + crmUrl);
  }

  return {
    errorMiddleware: errorMiddleware,
    reportDeploy: reportDeploy,
    sendHeartbeat: sendHeartbeat,
    destroy: destroy,
  };
};
