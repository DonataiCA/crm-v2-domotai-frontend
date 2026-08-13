# Tests de normalización — Frontend

Suite que cubre el catálogo canónico de roles (`src/constants/enums.ts`, sección
*User Roles*) y sus funciones auxiliares de etiqueta y color. Es la primera suite
automatizada del proyecto: antes no había ninguna.

Contraparte en el backend: `crm-v2-domotai-backend/.claude/tests-normalizacion.md`.
Contexto y decisiones de diseño: `docs/NORMALIZACION_ROLES.md` en la raíz del repositorio.

---

## Herramienta

**Vitest 4.1.10.**

Es la opción natural en un proyecto Vite: comparte el pipeline de transformación y el
alias `@/`, así que no hay que mantener una segunda configuración de build para los tests.

| Alternativa | Por qué no |
|---|---|
| Playwright (ya instalado en el proyecto) | Es para E2E en navegador. Lo que se prueba aquí son funciones puras: levantar un navegador para comprobar que `'CLIENT'` normaliza a `'client'` sería mil veces más lento y mucho más frágil. Playwright sigue siendo la herramienta correcta para probar que el agente de IA **no aparece** en pantalla para un cliente; eso es otra suite. |
| Jest | Exigiría configurar transformación de TS y JSX en paralelo a la de Vite, y mantener las dos sincronizadas. |

## Cómo ejecutar

```bash
npm test           # una pasada
npm run test:watch # modo interactivo
```

## Configuración

`vitest.config.ts`, separado de `vite.config.ts` a propósito: la configuración de build
queda intacta. Vitest no fusiona ambos archivos cuando existe el suyo, así que el alias
`@/` se declara de nuevo ahí — son tres líneas y evita tocar la config que ya funciona.

Dos detalles:

- **`environment: 'node'`**, sin jsdom. Las funciones bajo test son puras y no tocan el
  DOM; añadir jsdom sería una dependencia y un arranque más lento a cambio de nada. En
  cuanto se prueben componentes habrá que cambiarlo y añadir `@testing-library/react`.
- Los tests viven dentro de `src/`, así que **`npm run typecheck` sí los revisa**
  (a diferencia del backend, donde están excluidos del `tsconfig`). Se comprobó que no
  acaban en el bundle: `npm run build` no los incluye.

---

## Qué se prueba

Archivo: `src/constants/enums.test.ts` — **22 tests**.

| Bloque | Tests | Cubre |
|---|---:|---|
| `normalizeRole` | 5 | Casing, espacios sobrantes, espacios y guiones → guion bajo, nulos y vacíos, idempotencia |
| `catálogo` | 4 | `UserRole` en minúscula, `OrgRole`, `USER_ROLE_OPTIONS` cubriendo todos los roles sin sobrantes, `TEAM_ROLES` excluyendo `client` y `viewer` |
| `predicados` | 8 | `isAdminRole`, `isClientRole`, `isViewerRole`, `isTeamMemberRole` y `canEditProjects`, cada uno con caso positivo, negativo, variantes de casing y nulos |
| `etiquetas y colores` | 5 | `getUserRoleLabel` con casing variado y valor desconocido; `getUserRoleBgColor` tolerante al casing y con color neutro de reserva |

### El test que fija el bug

```ts
it('isClientRole reconoce al cliente venga como venga', () => {
  expect(isClientRole('client')).toBe(true);
  expect(isClientRole('Client')).toBe(true);
  expect(isClientRole('CLIENT')).toBe(true);
  expect(isClientRole(' client ')).toBe(true);
});
```

Es el caso exacto que fallaba en `AppLayout`: `userRole !== 'CLIENT'` daba siempre `true`
porque la base guarda minúscula, y el agente de IA acababa visible para los clientes.

`canEditProjects` se prueba comparándola con `isTeamMemberRole` sobre nueve entradas en
lugar de con valores fijos: la afirmación es que son la misma función, que es justamente
lo que debe seguir siendo cierto si alguien toca una de las dos.

### Paridad con el backend

El catálogo está duplicado en ambos proyectos a propósito (no hay monorepo). El test que
impide que se desincronicen **vive en el backend**, en `src/constants/roles.test.ts`:
importa este módulo por ruta relativa y compara valores, conjuntos y el comportamiento de
`normalizeRole` y de los predicados.

Consecuencia práctica: **al tocar `enums.ts` no basta con que pase `npm test` aquí**. Hay
que ejecutar también la suite del backend, o la divergencia no se detecta.

---

## Última ejecución

```
 Test Files  1 passed (1)
      Tests  22 passed (22)
   Duration  1.37s
```

| Comprobación | Resultado |
|---|---|
| `npm test` | 22 pasan |
| `npm run typecheck` | limpio (incluye los tests) |
| `npm run build` | correcto, y el test no aparece en el bundle |
| `npx eslint` sobre los archivos nuevos | limpio |

## Los tests tienen dientes

Una suite que pasa no demuestra nada si no falla cuando debe. Se verificó introduciendo
una divergencia deliberada en el catálogo (`VIEWER: 'viewer'` → `'VIEWER'`):

| | Antes | Con la divergencia |
|---|---|---|
| Frontend | 22 pasan | **4 fallan** — idempotencia, catálogo en minúscula, `isViewerRole`, `getUserRoleLabel` |
| Backend | 31 pasan | **1 falla** — el test de paridad |

La divergencia se revirtió y ambas suites volvieron a verde.

---

## Qué no cubre

- **Los componentes.** Se prueba el catálogo, no que `AppLayout`, `Sidebar` o los guards
  de `App.tsx` lo usen. Que el agente de IA ya no se le muestre a un cliente está
  verificado por lectura del código, no por test. Cubrirlo requiere o bien
  `@testing-library/react` con jsdom, o bien un caso de Playwright con sesión de cliente.
- **El resto de catálogos** (estados y prioridades de tarea, etapas de lead, estados de
  proyecto). Siguen sin normalizar y sin tests.

## Cómo extender

Cuando le toque a P1 —estados y prioridades de tarea— el molde ya está: los mismos cuatro
bloques sobre `TaskStatus` y `TaskPriority`, más el bloque de paridad correspondiente en
el backend. Dos candidatos concretos en este proyecto:

- `getTaskStatusLabel` y `getTaskPriorityLabel` comparan por igualdad exacta, sin
  normalizar. Son el equivalente directo de lo que `getUserRoleLabel` hacía antes de P0.
- El `normalize()` local de `src/components/leads/LeadBoard.tsx` (líneas 113-121) hace lo
  mismo que `normalizeRole` pero sin exportarse y sólo para el tablero de leads. Cuando se
  extraiga al catálogo de etapas, sus tests van aquí.
