# Project Launch Playbook

Template para lanzar proyectos Node.js/React de escala mediana a producción. Basado en la experiencia de PUAA Platform (SOC Banco Plaza, 2026).

---

## Fase 0: Fundamentos (antes de escribir código)

### Repositorios
```
project-backend/     ← Node.js + Express + Prisma
project-frontend/    ← React + Vite + Tailwind
```

- [ ] Repos separados backend/frontend (deploys independientes)
- [ ] `.gitignore` robusto desde día 1:
  ```
  node_modules/
  dist/
  .env
  .env.*
  !.env.example
  *.pem
  *.log
  ```
- [ ] `.env.example` con TODAS las variables documentadas (sin valores reales)
- [ ] `README.md` con: arquitectura, setup local, scripts, endpoints principales
- [ ] Conventional commits desde el inicio (`feat:`, `fix:`, `refactor:`, `chore:`, `ci:`)

### TypeScript
- [ ] Backend: `"strict": true` en tsconfig.json
- [ ] Frontend: `"strict": true` en tsconfig.app.json
- [ ] Nunca desactivar strict "para después activarlo" — la deuda crece exponencialmente

### Linting & Formatting
- [ ] ESLint + Prettier en ambos repos desde el commit 0
- [ ] Config compartida (`.eslintrc` / `eslint.config.mjs` + `.prettierrc`)
- [ ] Scripts: `npm run lint`, `npm run format`

---

## Fase 1: Arquitectura

### Base de datos
- [ ] ORM tipado (Prisma recomendado para Node.js)
- [ ] Migraciones versionadas — nunca SQL manual en producción
- [ ] Indexes en campos que se filtran/ordenan frecuentemente
- [ ] Separar datos operacionales de datos analíticos si el volumen lo amerita

### Autenticación
- [ ] JWT con secretos únicos por usuario (no un solo JWT_SECRET global)
- [ ] bcrypt con rounds >= 12 para passwords
- [ ] Token expiry corto (24h) + refresh token (opcional)
- [ ] Considerar httpOnly cookies sobre localStorage para tokens (XSS protection)
- [ ] Rate limiting en login (10 req/15min)

### API
- [ ] Validación de input con Zod/Joi en CADA endpoint
- [ ] Rate limiting diferenciado: auth endpoints más estrictos que lectura
- [ ] CORS con allowlist explícito (no `*`)
- [ ] Helmet para security headers
- [ ] Manejo centralizado de errores — nunca exponer stack traces al cliente
- [ ] Health endpoint (`/health`) que verifique DB, Redis, servicios externos

### Colas y Jobs
- [ ] Bull/BullMQ + Redis para procesamiento async
- [ ] Circuit breaker para servicios externos (LLM, APIs third-party)
- [ ] Timeouts explícitos en TODA llamada externa
- [ ] Graceful shutdown: drenar colas antes de cerrar proceso

### Frontend
- [ ] Tipos centralizados en `src/types/` (entities, api responses)
- [ ] API client centralizado con auto-injection de auth headers
- [ ] Error boundary global
- [ ] 401 handling: logout automático + redirect a login

---

## Fase 2: Seguridad (antes del primer deploy)

### Checklist OWASP
- [ ] **Injection:** Queries parametrizadas (Prisma lo hace automáticamente)
- [ ] **Auth:** No credenciales en código, no secrets en git history
- [ ] **XSS:** Escapar output, Content-Security-Policy headers
- [ ] **CSRF:** No aplica para SPA stateless con Bearer tokens
- [ ] **Rate limiting:** En endpoints de autenticación y APIs públicas
- [ ] **IP whitelisting:** En endpoints de ingesta/webhook

### Secrets Management
- [ ] NUNCA commitear `.env` — verificar que está en `.gitignore`
- [ ] Si se commiteó accidentalmente: `git filter-repo` para limpiar historia + rotar TODOS los secrets
- [ ] PEM files en `.gitignore`
- [ ] Variables sensibles en GitHub Secrets para CI/CD

### Sanitización de Output (si hay LLM/AI)
- [ ] Prompt leak detection (fingerprints de system prompt)
- [ ] Redacción de IPs internas, connection strings, env vars
- [ ] No exponer modelo, versión, ni endpoints internos

### Red Teaming (si hay LLM/AI)
- [ ] Ejecutar promptfoo o similar con tests de:
  - Prompt injection / jailbreak
  - System prompt extraction
  - PII/data leakage
  - Tool misuse (si hay function calling)
- [ ] Documentar resultados y fixes

---

## Fase 3: Testing

### Mínimo Viable
- [ ] **Backend:** Tests unitarios para lógica de negocio pura (parsers, transformadores, validadores, sanitizadores)
- [ ] **Frontend:** Tests para utilidades compartidas (API client, auth helpers, formatters)
- [ ] Framework: Vitest (rápido, compatible ESM, TypeScript nativo)

### Qué testear vs qué no
**Sí testear:**
- Parsers de datos (CEF, CSV, JSON extraction)
- Lógica de negocio sin side effects
- Sanitizadores y validadores de seguridad
- Utilidades compartidas (JWT validation, date formatting)

**No testear (poco ROI):**
- Componentes UI puros (shadcn/ui wrappers)
- CRUD endpoints triviales (Prisma ya los testea)
- Mocking excesivo de servicios externos (mejor integration test)

### Estructura
```
src/__tests__/
├── parser.test.ts        ← lógica pura
├── sanitizer.test.ts     ← seguridad
├── transformer.test.ts   ← transformaciones de datos
└── auth.test.ts          ← helpers de autenticación
```

---

## Fase 4: CI/CD

### GitHub Actions Mínimo
```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  deploy:
    needs: lint-and-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: bash ~/deploy.sh
```

### Branch Protection
- [ ] Require PR before merging to main
- [ ] Require CI status checks passing
- [ ] Block force pushes
- [ ] Delete branch on merge

### Secrets de GitHub (Settings → Secrets → Actions)
- [ ] `SERVER_HOST` — IP del servidor
- [ ] `SSH_PRIVATE_KEY` — PEM key completa
- [ ] Cualquier API key necesaria para deploy

### Tags de Release
```bash
git tag -a v1.0.0 -m "v1.0.0 — Initial production release"
git push origin v1.0.0
```

---

## Fase 5: Notificaciones (si aplica)

### Principio: cada canal tiene un propósito
| Canal | Propósito | Cuándo |
|---|---|---|
| **Telegram/Slack** | Acción inmediata | Solo Critical — 5-8 msgs/día máximo |
| **Email** | Registro y análisis | High + Critical — detalle completo |
| **Dashboard** | Contexto completo | Todo — el analista consulta cuando quiera |

### Anti-patrón: notificar todo por todos los canales
> Si Telegram recibe 30+ mensajes/día, los analistas lo silencian y no ven los que importan.

### Checklist
- [ ] Definir qué severidad activa cada canal ANTES de implementar
- [ ] Permitir al admin configurar destinatarios y preferencias
- [ ] Telegram: mensajes breves con link al dashboard, NUNCA adjuntos
- [ ] Email: contenido detallado, adjuntos PDF si aplica
- [ ] Reportes periódicos: solo email (reduce ruido)

---

## Fase 6: Observabilidad

### Logging
- [ ] Logger estructurado (Winston/Pino) — no `console.log`
- [ ] Niveles: error, warn, info (debug solo en desarrollo)
- [ ] Rotación de logs (PM2 logrotate o similar)
- [ ] Nunca loggear passwords, tokens, o PII

### Health Checks
- [ ] Endpoint `/health` que verifica TODOS los servicios
- [ ] Retornar HTTP 200/503 según estado (UptimeRobot lo detecta automáticamente)
- [ ] Incluir: DB, Redis, LLM, servicios externos (Gotenberg, Telegram, etc.)

### Uptime Monitoring (externo — REQUERIDO)
El servidor no puede notificar si está caído. Se necesita un monitor externo.

**UptimeRobot** (gratuito — 50 monitores, alertas cada 5 min):
1. Cuenta en [uptimerobot.com](https://uptimerobot.com)
2. Add Monitor → HTTP(s) → URL: `https://tu-dominio.com/health`
3. Alert contact: email de operaciones
4. El endpoint `/health` con HTTP 200/503 activa/desactiva la alerta automáticamente

### Error Tracking (Sentry)
Captura excepciones no manejadas en tiempo real — backend y frontend.

**Backend** — `npm install @sentry/node`:
```typescript
// src/instrument.ts — importar ANTES de cargar Express
import * as Sentry from '@sentry/node';
const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, environment: process.env.NODE_ENV, tracesSampleRate: 0.05 });
}
export { Sentry };
```

```typescript
// server.ts — orden crítico en CJS: load-env → instrument → app
import './load-env';
import { Sentry } from './instrument'; // must be second import
import app from './app';

process.on('unhandledRejection', (reason) => { Sentry.captureException(reason); });
process.on('uncaughtException', (err) => { Sentry.captureException(err); });
```

```typescript
// app.ts — antes del custom errorHandler
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);
```

**Frontend** — `npm install @sentry/react`:
```typescript
// main.tsx — antes de createRoot
import * as Sentry from "@sentry/react";
const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) { Sentry.init({ dsn, environment: import.meta.env.MODE, tracesSampleRate: 0.05 }); }
```

**Configurar alertas en sentry.io:** Alerts → Create Alert Rule → "Send email to ops@dominio.com"

**Free tier:** 5,000 eventos/mes — suficiente para proyectos de escala media.

### Métricas (si hay LLM/AI)
- [ ] Circuit breaker state + failure count
- [ ] Latencia de inferencia (P50, P95)
- [ ] JSON parse success rate
- [ ] Queue depth y processing time

---

## Fase 7: Deploy a Producción

### Checklist Pre-Deploy
- [ ] Todas las variables de `.env.example` configuradas en servidor
- [ ] SSL certificado válido (Let's Encrypt + certbot timer)
- [ ] Firewall/Security Groups configurados (solo puertos necesarios)
- [ ] PM2 o similar para process management
- [ ] `npm audit` ejecutado y vulns documentadas
- [ ] Backup de DB antes del primer deploy con datos reales
- [ ] Verificar que deploy script hace: git pull → npm ci → build → migrate → restart

### Post-Deploy
- [ ] Verificar `/health` responde OK
- [ ] Verificar que CI/CD pipeline funciona (crear PR de prueba)
- [ ] Verificar que las notificaciones llegan (test email/telegram)
- [ ] Verificar que los logs se escriben correctamente
- [ ] Documentar IP, dominio, paths en memoria/docs

---

## Cosas que se pasan por alto (lecciones aprendidas)

### 1. Git History contaminado
**Problema:** Commitear `.env`, passwords, o PEM files accidentalmente.
**Fix:** `git filter-repo` + force push + rotar TODOS los secrets expuestos.
**Prevención:** `.gitignore` robusto + pre-commit hook que bloquee patrones sensibles.

### 2. Dependencias fantasma
**Problema:** Instalar paquetes "para probar" y olvidar removerlos. Generan vulns npm audit y bloat.
**Prevención:** Revisión periódica de `package.json`. Grep por imports reales vs dependencias listadas.

### 3. TypeScript no-strict
**Problema:** Empezar con `strict: false` "para ir rápido". La deuda de tipos crece y nunca se paga.
**Prevención:** `strict: true` desde el commit 0. Si un tipo es difícil, usar `as` puntualmente — no desactivar strict globalmente.

### 4. Tests después
**Problema:** "Agregamos tests después del MVP". Nunca se agregan, o se agregan para código que ya cambió.
**Prevención:** Tests para lógica pura desde el inicio. No necesitas 100% coverage — necesitas tests donde importa (parsers, auth, security).

### 5. Notificaciones sin throttle
**Problema:** Cada evento genera una notificación → el canal se vuelve ruido → nadie lee nada.
**Prevención:** Definir severidad por canal ANTES de implementar. Medir msgs/día y ajustar.

### 6. LLM JSON truncation
**Problema:** El modelo genera JSON que excede `max_tokens` y se corta, causando parse failures silenciosos.
**Prevención:** `repairTruncatedJSON()` que cierra brackets faltantes. Monitorear parse success rate.

### 7. SSL renewal olvidado
**Problema:** Let's Encrypt expira cada 90 días. Si certbot timer falla, el sitio cae sin aviso.
**Prevención:** Verificar `systemctl list-timers | grep cert` post-deploy. Monitorear fecha de expiración.

### 8. No hay staging
**Problema:** Todo se prueba directo en producción. Un deploy roto afecta al cliente.
**Mitigación sin staging:** PR + CI obligatorio, rollback rápido via `git revert`, feature flags para cambios grandes.

### 9. Logs sin rotación
**Problema:** Logs crecen hasta llenar disco. Servicio cae por falta de espacio.
**Prevención:** PM2 logrotate, cron de limpieza, monitorear disco.

### 10. Un solo usuario admin
**Problema:** Solo una persona puede acceder al sistema. Si está de vacaciones/enfermo, nadie opera.
**Prevención:** Crear al menos 2 usuarios admin desde el inicio. Documentar credenciales en vault seguro.

### 11. Rate limiting sin probar
**Problema:** Se configura rate limiting pero nunca se prueba. En producción, bloquea usuarios legítimos o no bloquea atacantes.
**Prevención:** Test manual: `for i in $(seq 1 15); do curl -s -o /dev/null -w "%{http_code}\n" endpoint; done`

### 12. CORS demasiado permisivo
**Problema:** `CORS: *` en desarrollo que llega a producción.
**Prevención:** Allowlist explícito desde el inicio. Variable de entorno `CORS_ORIGINS`.

### 13. Monitoreo reactivo
**Problema:** Te enteras de que algo falló cuando el cliente llama.
**Prevención mínima:** Health endpoint + UptimeRobot (gratis para 50 monitores). Alerta por email si `/health` falla.

### 14. Documentación en la cabeza del desarrollador
**Problema:** Solo el dev original sabe cómo funciona todo. Bus factor = 1.
**Prevención:** README actualizado, `.env.example`, memory files, architecture docs. Si otro dev no puede hacer setup en 30 min, falta documentación.

---

## Checklist Final: "¿Estamos listos para release?"

```
INFRAESTRUCTURA
[ ] Servidor provisionado con recursos adecuados
[ ] SSL configurado y auto-renewal verificado
[ ] Firewall/SG solo con puertos necesarios
[ ] DNS apuntando al servidor
[ ] Backups de DB configurados

CÓDIGO
[ ] TypeScript strict en ambos repos
[ ] ESLint + Prettier configurados
[ ] Tests pasando (mínimo: parsers, auth, security)
[ ] npm audit: vulns conocidas y documentadas
[ ] No hay secrets en git history

CI/CD
[ ] GitHub Actions: lint + test + build en PR
[ ] Auto-deploy en merge a main
[ ] Branch protection activo
[ ] Secrets configurados en GitHub

SEGURIDAD
[ ] Rate limiting en auth y APIs
[ ] CORS allowlist
[ ] Input validation en cada endpoint
[ ] Output sanitization (si hay LLM)
[ ] Health endpoint verificando todos los servicios

OPERACIONES
[ ] Al menos 2 usuarios admin creados
[ ] Notificaciones configuradas y probadas
[ ] Logs con rotación
[ ] Documentación: README, .env.example, architecture
[ ] Runbook: cómo reiniciar, cómo hacer rollback, contactos

MONITOREO
[ ] Sentry: proyectos creados (backend + frontend), DSNs en .env, alertas a ops email
[ ] UptimeRobot: monitor HTTP en /health cada 5min, alerta a ops email
[ ] Health endpoint retorna 200/503 correctamente
[ ] Verificar: lanzar un error de prueba y confirmar que llega a Sentry
```

---

*Generado a partir de la experiencia del proyecto PUAA Platform — SOC Banco Plaza (2026)*
*Domotai Technologies*
