# Domotai CRM Infrastructure

## Repos
| Role | Path |
|---|---|
| Backend | c:\Users\David\Documents\GitHub\crmdomotaibackVer2 |
| Frontend | c:\Users\David\Documents\GitHub\domotaicrmVer2 |

## Hosts
| Thing | Value |
|---|---|
| Production host | ubuntu@98.84.179.104 |
| SSH key | c:\Users\David\Documents\GitHub\domotaicrmVer2\rori-image-generator.pem |
| SSH options | -o StrictHostKeyChecking=no -o ControlPath=none |
| Production URL | https://crm.domotaitech.com |
| Backend prod dir | /opt/domotai/backend |
| Frontend prod dir | /opt/domotai/frontend |
| Process manager | pm2 reload domotai-api --update-env  (runs as `ubuntu`, NEVER `sudo pm2`) |
| DB access | docker exec domotai-postgres psql -U domotai -d domotaicrm |
| Frontend prod env | VITE_API_URL=https://crm.domotaitech.com/api  (nginx proxies /api/* to port 3000) |

## Required headers
- Authorization: Bearer $TOKEN
- X-Organization-Id: 815e5a9b-c87a-4cc5-a595-1f80e52d4d7c

## Test auth
| Thing | Value |
|---|---|
| Test user | David Altuve |
| Test user ID (User.id) | 018b13f5-333c-4753-824b-7511c8fb210b |
| Test user email | david.altuve@domotaitech.com |
| Test org ID | 815e5a9b-c87a-4cc5-a595-1f80e52d4d7c |

### Token generation
Don't trust client-side tokens. Mint a fresh one server-side using David's stored secret:
```bash
PEM="/c/Users/David/Documents/GitHub/domotaicrmVer2/rori-image-generator.pem"
HOST="ubuntu@98.84.179.104"

# Step 1 — pull userId + secret from DB
ssh -o StrictHostKeyChecking=no -o ControlPath=none -i "$PEM" "$HOST" '
  docker exec domotai-postgres psql -U domotai -d domotaicrm -t -c "SELECT j.\"userId\", j.secret FROM \"JWT\" j JOIN profiles p ON p.\"userId\" = j.\"userId\" WHERE p.email = '"'"'david.altuve@domotaitech.com'"'"' LIMIT 1;"
'

# Step 2 — sign a token (substitute <userId> and <secret> from step 1)
ssh -o StrictHostKeyChecking=no -o ControlPath=none -i "$PEM" "$HOST" 'cd /opt/domotai/backend && node -e "
const jwt = require(\"jsonwebtoken\");
console.log(jwt.sign({ id: \"<userId>\" }, \"<secret>\", { expiresIn: \"1d\" }));
"'
```

## Commands

### Type check
- Backend: `cd /c/Users/David/Documents/GitHub/crmdomotaibackVer2 && npx tsc --noEmit`
- Frontend: `cd /c/Users/David/Documents/GitHub/domotaicrmVer2 && npx tsc --noEmit`

### Build
- Backend: `cd /c/Users/David/Documents/GitHub/crmdomotaibackVer2 && npm run build 2>&1 | tail -3`
- Frontend: `cd /c/Users/David/Documents/GitHub/domotaicrmVer2 && npx --no vite build 2>&1 | grep -E "error|built"`

### Deploy — Backend
```bash
PEM="/c/Users/David/Documents/GitHub/domotaicrmVer2/rori-image-generator.pem"
HOST="ubuntu@98.84.179.104"
SSH_OPTS="-o StrictHostKeyChecking=no -o ControlPath=none"

cd /c/Users/David/Documents/GitHub/crmdomotaibackVer2
scp $SSH_OPTS -i "$PEM" -r dist/ "$HOST:/home/ubuntu/crmdomotaiback-dist/"
# If schema changed, also upload prisma/
scp $SSH_OPTS -i "$PEM" -r prisma/ "$HOST:/home/ubuntu/crmdomotaiback-dist/"

ssh $SSH_OPTS -i "$PEM" "$HOST" '
  sudo cp -r /home/ubuntu/crmdomotaiback-dist/dist/* /opt/domotai/backend/dist/
  pm2 reload domotai-api --update-env 2>&1 | tail -2
  sleep 2 && curl -s http://localhost:3000/health
'
```

### Deploy — Frontend
```bash
cd /c/Users/David/Documents/GitHub/domotaicrmVer2
scp $SSH_OPTS -i "$PEM" -r dist/ "$HOST:/home/ubuntu/domotaicrm-dist/"
ssh $SSH_OPTS -i "$PEM" "$HOST" 'sudo cp -r /home/ubuntu/domotaicrm-dist/dist/* /opt/domotai/frontend/ && sudo chmod -R o+rX /opt/domotai/frontend/'
```

### Health check
`curl -s https://crm.domotaitech.com/api/health` → expects `{"status":"ok","db":"connected"}`

## Schema migration (Prisma)
Run only if Phase 1 detected schema changes (`prisma/schema.prisma` or new files in `prisma/migrations/`):
```bash
ssh $SSH_OPTS -i "$PEM" "$HOST" '
  sudo cp -r /home/ubuntu/crmdomotaiback-dist/prisma/ /opt/domotai/backend/
  cd /opt/domotai/backend && sudo npx prisma migrate deploy 2>&1 | tail -5 && sudo npx prisma generate 2>&1 | tail -2
'
```

## Frontend bundle hash
- Local: `grep -oE "index-[A-Za-z0-9_-]+\.js" /c/Users/David/Documents/GitHub/domotaicrmVer2/dist/index.html | head -1`
- Remote: `ssh $SSH_OPTS -i "$PEM" "$HOST" 'grep -oE "index-[A-Za-z0-9_-]+\.js" /opt/domotai/frontend/index.html | head -1'`
- Verify served: `curl -s -o /dev/null -w "%{http_code}" "https://crm.domotaitech.com/assets/<hash>"` → 200

## Smoke endpoints
Stable endpoints to confirm no regression:
```bash
TOKEN="<from Phase 5>"
ORG="815e5a9b-c87a-4cc5-a595-1f80e52d4d7c"
for path in "/api/projects?limit=1" "/api/leads?limit=1" "/api/tasks?limit=1" "/api/dashboard/commercial"; do
  curl -s -o /dev/null -w "$path: %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" -H "X-Organization-Id: $ORG" \
    "https://crm.domotaitech.com$path"
done
```
All must be 200 (or 304).

## DB query (for pulling real IDs)
```bash
ssh $SSH_OPTS -i "$PEM" "$HOST" '
  docker exec domotai-postgres psql -U domotai -d domotaicrm -c "SELECT id, name FROM projects LIMIT 3;"
'
```

## Logs
```bash
ssh $SSH_OPTS -i "$PEM" "$HOST" 'tail -200 /var/log/domotai/api-out.log | grep -E "ERROR|Failed|TypeError|Cannot read" | tail -10'
```

## Log noise to ignore
- `[ERROR][401] No token provided` — SSE stream `/notifications/stream` auth probe (browser EventSource can't send Authorization header). Pre-existing, harmless, spams every ~30s.

## Gotchas (project-specific)
1. **Frontend build**: Use `npx --no vite build` — the `--no` flag is REQUIRED. Without it, npx grabs vite v8 from cache and fails with `Cannot resolve entry module index.html`.
2. **PM2 user**: PM2 runs as `ubuntu`. `sudo pm2` spawns a different daemon that doesn't see the running process. Just `pm2 reload domotai-api --update-env`.
3. **PM2 env reload**: After changing `.env`, the `--update-env` flag is required, otherwise PM2 keeps the old env.
4. **Prisma 6 dates**: `PrismaClientValidationError: premature end of input. Expected ISO-8601 DateTime` means the frontend sent `"2026-03-01"`. Coerce in controller: `if (body.startDate) body.startDate = new Date(body.startDate)`.
5. **Parallel scp from wrong cwd**: When running multiple bash commands in parallel, each call has independent cwd. Always use `cd <dir> && scp ...` in the same call.
6. **OrganizationMember.userId FK trap**: References `Profile.id`, NOT `User.id`. For org-membership lookups use `(req as any).user?.profileId`. For User-record operations use `(req as any).userId`.
7. **Org isolation rule (Wave 1)**: Every repo method that acts on a single record (`findById`, `update`, `delete`, `softDelete`, `archive`, `restore`) accepts an OPTIONAL `organizationId` as the LAST argument. Controllers MUST pass `(req as any).orgId`. Verifying repo methods don't return cross-org data is a security baseline.
8. **Validators**: Backend Zod validators MUST use the same field names as the Prisma schema, and use `.strip()` (not `.passthrough()`) to silently drop unknown fields.
9. **Don't change response shape silently**: Frontend services have hardcoded expectations. After any backend data change, verify frontend components that consume it still render. Trace the full data flow.
10. **Multi-repo per project**: Some projects have multiple GitHub repos linked via `ProjectRepo`. Don't assume one repo per project.
