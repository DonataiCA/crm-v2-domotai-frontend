# @domotai/monitor

SDK de monitoreo para proyectos conectados a **Domotai CRM**. Envia automaticamente heartbeats (CPU, RAM, uptime), captura errores y reporta deploys.

## Instalacion

Copia la carpeta `domotai-monitor` dentro de tu proyecto, o instala desde el path local:

```bash
npm install /ruta/a/domotai-monitor
```

## Uso rapido

```js
// server.js o app.js
const monitor = require('@domotai/monitor')({
  apiKey: 'tu-api-key',                    // Desde el CRM: proyecto > monitor > generar key
  crmUrl: 'https://crm.domotai.online',   // URL del CRM backend
  productionUrl: 'https://tuapp.com',      // Tu app (habilita health checks)
});

// Antes de tu error handler
app.use(monitor.errorMiddleware);

// Reportar deploy (opcional, desde CI/CD o al iniciar)
monitor.reportDeploy('1.0.0', 'production', 'abc123');
```

## Que se envia

| Tipo | Frecuencia | Datos |
|------|-----------|-------|
| **heartbeat** | Cada 5 min | CPU %, RAM usada/total, uptime, version, nodeVersion |
| **error** | En tiempo real | statusCode, message, endpoint, method, stack trace |
| **deploy** | Manual | version, environment, commitSha |

## Opciones

| Opcion | Tipo | Default | Descripcion |
|--------|------|---------|-------------|
| `apiKey` | string | *requerido* | API key del proyecto en el CRM |
| `crmUrl` | string | `https://crm.domotai.online` | URL del backend del CRM |
| `productionUrl` | string | `null` | URL de tu app (para health checks automaticos) |
| `intervalMs` | number | `300000` (5 min) | Intervalo de heartbeat |
| `silent` | boolean | `false` | No imprimir en consola |

## API

```js
const monitor = require('@domotai/monitor')(options);

monitor.errorMiddleware   // Express middleware — captura errores 4xx/5xx
monitor.reportDeploy()    // Reportar deploy manualmente
monitor.sendHeartbeat()   // Enviar heartbeat manualmente
monitor.destroy()         // Limpiar timers y listeners (para tests)
```

## Requisitos

- Node.js >= 18 (usa `fetch` nativo)
- El CRM debe estar corriendo y accesible desde tu servidor

## Seguridad

- La API key se envia como parte de la URL, no en headers
- Tratala como una contrasena — no la expongas en repositorios publicos
- Usa variables de entorno: `process.env.DOMOTAI_MONITOR_KEY`
