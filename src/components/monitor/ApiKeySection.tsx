import { useState } from 'react';
import { Copy, Key, RefreshCw, Check, ChevronDown, ChevronUp, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { monitorService } from '@/services/monitor.service';

interface ApiKeySectionProps {
    projectId: string;
    apiKey: string | null;
    onKeyGenerated: (key: string) => void;
}

const SDK_SCRIPT = `// domotai-monitor.js — Copia este archivo en tu proyecto Express/Node
// Instalacion: const monitor = require('./domotai-monitor')({ apiKey: 'TU_API_KEY' });
// Luego: app.use(monitor.errorMiddleware);

const os = require('os');

module.exports = function initDomotaiMonitor({ apiKey, crmUrl = 'http://localhost:3000', productionUrl }) {
  const endpoint = \`\${crmUrl}/monitor/\${apiKey}/ingest\`;
  let version = 'unknown';
  try { version = require(process.cwd() + '/package.json').version; } catch {}

  function send(type, payload) {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    }).catch(() => {}); // Nunca debe romper tu app
  }

  // Heartbeat cada 5 minutos — envia CPU, RAM, uptime, version
  function sendHeartbeat() {
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return acc + ((total - cpu.times.idle) / total) * 100;
    }, 0) / cpus.length;

    send('heartbeat', {
      cpu: Math.round(cpuUsage * 100) / 100,
      memoryUsedMB: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
      memoryTotalMB: Math.round(os.totalmem() / 1024 / 1024),
      uptimeSeconds: Math.round(process.uptime()),
      version,
      nodeVersion: process.version,
      productionUrl: productionUrl || undefined,
    });
  }

  setInterval(sendHeartbeat, 5 * 60 * 1000);
  setTimeout(sendHeartbeat, 5000); // Primer heartbeat 5s despues de iniciar

  // Captura errores no manejados
  process.on('uncaughtException', (err) => {
    send('error', { statusCode: 500, message: err.message, stack: err.stack?.slice(0, 2000) });
  });
  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack?.slice(0, 2000) : undefined;
    send('error', { statusCode: 500, message: msg, stack });
  });

  // Middleware Express para capturar errores 5xx
  function errorMiddleware(err, req, res, next) {
    send('error', {
      statusCode: res.statusCode >= 400 ? res.statusCode : 500,
      message: err.message || 'Internal Server Error',
      endpoint: req.originalUrl || req.url,
      method: req.method,
      stack: err.stack?.slice(0, 2000),
    });
    next(err);
  }

  // Reportar deploy (llamar desde CI/CD o al iniciar)
  function reportDeploy(deployVersion, environment = 'production', commitSha) {
    send('deploy', { version: deployVersion || version, environment, commitSha });
  }

  console.log('[DomotAI Monitor] Iniciado — reportando a ' + crmUrl);
  return { errorMiddleware, reportDeploy };
};`;

export function ApiKeySection({ projectId, apiKey, onKeyGenerated }: ApiKeySectionProps) {
    const { toast } = useToast();
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const { apiKey: newKey } = await monitorService.generateApiKey(projectId);
            onKeyGenerated(newKey);
            toast({ title: 'API Key generada', description: 'Copia la key e instalala en tu proyecto' });
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar la API key' });
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(null), 2000);
    };

    const sdkWithKey = apiKey ? SDK_SCRIPT.replace('TU_API_KEY', apiKey) : SDK_SCRIPT;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Configuracion del Monitor
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="gap-1"
                    >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {expanded ? 'Ocultar' : 'Mostrar'} SDK
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* API Key */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">API Key</label>
                    {apiKey ? (
                        <ApiKeyReveal
                            apiKey={apiKey}
                            onCopy={() => copyToClipboard(apiKey, 'key')}
                            copied={copied === 'key'}
                            onRegenerate={handleGenerate}
                            generating={generating}
                        />
                    ) : (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">No hay API key generada</span>
                            <Button variant="default" size="sm" onClick={handleGenerate} disabled={generating} className="gap-1">
                                <Key className="h-3 w-3" />
                                Generar Key
                            </Button>
                        </div>
                    )}
                </div>

                {/* SDK Instructions */}
                {expanded && apiKey && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                Copia este archivo en tu proyecto Express y requiérelo en tu server.ts/js
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => copyToClipboard(sdkWithKey, 'sdk')}
                            >
                                {copied === 'sdk' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                {copied === 'sdk' ? 'Copiado!' : 'Copiar SDK'}
                            </Button>
                        </div>
                        <pre className="text-xs bg-slate-950 text-slate-200 p-4 rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                            <code>{sdkWithKey}</code>
                        </pre>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs space-y-1">
                            <p className="font-semibold text-blue-800">Uso rapido:</p>
                            <pre className="bg-white/50 p-2 rounded text-blue-900 font-mono">
{`// server.ts
const monitor = require('./domotai-monitor')({
  apiKey: '${apiKey}',
  crmUrl: 'http://localhost:3000',      // URL de tu CRM
  productionUrl: 'https://tuapp.com',   // URL de tu app (para health checks)
});

// Antes del error handler
app.use(monitor.errorMiddleware);

// Al iniciar (opcional)
monitor.reportDeploy('1.0.0', 'production');`}
                            </pre>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ── Internal sub-component: masked API key with reveal toggle ──────────────
function ApiKeyReveal({
    apiKey,
    onCopy,
    copied,
    onRegenerate,
    generating,
}: {
    apiKey: string;
    onCopy: () => void;
    copied: boolean;
    onRegenerate: () => void;
    generating: boolean;
}) {
    const [revealed, setRevealed] = useState(false);
    const masked = apiKey.slice(0, 8) + '••••••••••••••••••••' + apiKey.slice(-4);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono flex-1 truncate">
                    {revealed ? apiKey : masked}
                </code>
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setRevealed(v => !v)} title={revealed ? 'Hide key' : 'Reveal key'}>
                    {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={onCopy}>
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
                <Button variant="outline" size="sm" onClick={onRegenerate} disabled={generating} className="gap-1 shrink-0">
                    <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
                    Regenerar
                </Button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Trátala como una contraseña. No la expongas en el frontend de tu proyecto ni en repositorios públicos.
            </p>
        </div>
    );
}
