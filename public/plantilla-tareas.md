<!-- crm-domotai:tareas v1 -->
# Tareas

<!--
  PLANTILLA DE IMPORTACIÓN DE TAREAS — CRM Domotai
  ================================================

  Cómo se usa
  -----------
  1. Duplica este archivo y rellénalo.
  2. Borra las dos tareas de ejemplo de abajo.
  3. Súbelo en el panel "Importar tareas" de la página de seguimiento del proyecto.

  Reglas
  ------
  · Una tarea por cada bloque que empieza por "## ". El texto del encabezado ES EL TÍTULO.
  · No borres la primera línea de este archivo: identifica la versión de la plantilla.
  · Los campos se escriben "- **Campo:** valor", en cualquier orden.
  · Un campo que dejes vacío toma su valor por defecto. Puedes borrar la línea entera.
  · Si algo no se entiende NO se importa nada: se te dice qué línea falla y por qué.
    Corriges el archivo y lo vuelves a subir. Nunca queda media importación hecha.
  · Máximo 100 tareas por archivo.

  Campos
  ------
  Área          OBLIGATORIO. Nombre exacto de un área de trabajo (fase) del proyecto.
  Responsable   Nombre completo o email de un miembro. Por defecto: sin asignar.
  Estado        TODO | IN_PROGRESS | ON_HOLD | COMPLETED.      Por defecto: TODO.
  Prioridad     LOW | MEDIUM | HIGH | URGENT.                  Por defecto: MEDIUM.
  Inicio        Fecha AAAA-MM-DD.                              Por defecto: sin fecha.
  Vencimiento   Fecha AAAA-MM-DD, no anterior al Inicio.       Por defecto: sin fecha.
  Descripción   Texto libre. Puede ocupar varias líneas si las indentas dos espacios.
  Conclusión    Texto libre. Cómo se resolvió la tarea, para trazabilidad.

  Son exactamente los mismos campos del formulario "Add Task", así que una tarea
  importada queda igual que una creada a mano. Las etiquetas también se aceptan en
  inglés (Phase, Assignee, Status, Priority, Start date, Due date, Description).

  El orden de las tareas dentro del archivo es el orden en que aparecen en su área.

  Borra este comentario y las dos tareas de ejemplo antes de subir el archivo.
-->

## Configurar el pipeline de CI

- **Área:** DevOps & Deploy
- **Responsable:** David Altuve
- **Estado:** TODO
- **Prioridad:** HIGH
- **Inicio:** 2026-09-01
- **Vencimiento:** 2026-09-08
- **Descripción:** Montar GitHub Actions con lint, typecheck y tests en cada push a main.
  Estas líneas indentadas siguen formando parte de la descripción.

  También los saltos de párrafo y las listas:

  - bloquear el merge si falla el typecheck
  - publicar el resultado en el canal del equipo
- **Conclusión:**

## Endpoint de login con JWT

- **Área:** Backend Development
- **Prioridad:** URGENT
- **Descripción:** Emitir el token con el secreto por usuario y persistir la fila en `JWT`.
