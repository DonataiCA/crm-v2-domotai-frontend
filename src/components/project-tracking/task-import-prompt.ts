import type { ProjectPhase, ProjectTeamMember } from "@/types/api";

/**
 * Texto para pegarle a otra IA (ChatGPT, Gemini, la que sea) y que devuelva un archivo
 * importable a la primera.
 *
 * Existe porque el ciclo real de trabajo es "le pido las tareas a una IA y las subo
 * aquí", y esa IA no puede adivinar dos cosas que son propias de ESTE proyecto: cómo se
 * llaman sus áreas y quiénes son sus miembros. Sin ese dato el archivo sale con nombres
 * inventados y hay que corregirlo a mano, que es justo lo que la importación evita.
 *
 * Se incluyen las reglas que más se incumplen, en particular la valla de código: casi
 * todas las IAs envuelven el markdown en ``` para mostrarlo y, copiado tal cual, el
 * importador no veía ni una tarea.
 */
export function buildAiPrompt(phases: ProjectPhase[], members: ProjectTeamMember[]): string {
  const areas = phases.map((p) => p.name);
  const people = members
    .map((m) => m.user?.fullName || m.user?.email)
    .filter((name): name is string => Boolean(name));

  const lista = (items: string[], vacio: string) =>
    items.length > 0 ? items.map((i) => `  - ${i}`).join("\n") : `  (${vacio})`;

  return `Genera un archivo Markdown de tareas para importarlo en un CRM. Devuélvelo como
archivo descargable o como texto plano, SIN envolverlo en un bloque de código.

FORMATO — una tarea por cada encabezado "## ", y debajo sus campos:

## Título de la tarea

- **Área:** <una de las áreas listadas abajo>
- **Responsable:** <una de las personas listadas abajo, o quita la línea>
- **Estado:** Pendiente | En progreso | En pausa | Completada
- **Prioridad:** Baja | Media | Alta | Urgente
- **Inicio:** AAAA-MM-DD
- **Vencimiento:** AAAA-MM-DD
- **Descripción:** texto libre; si ocupa varias líneas, indenta las siguientes con dos espacios.

ÁREAS de este proyecto (usa exactamente estos nombres):
${lista(areas, "el proyecto aún no tiene áreas: créalas antes de importar")}

PERSONAS de este proyecto (usa el nombre exacto):
${lista(people, "nadie asignado: omite el campo Responsable")}

REGLAS
- Sólo "Área" es obligatorio. Cualquier otro campo se puede omitir.
- No inventes áreas ni personas que no estén en las listas.
- Los títulos no se repiten entre sí.
- No añadas texto fuera de las tareas: ni introducción, ni resumen final.`;
}
