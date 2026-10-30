/**
 * Límites del documento que se puede adjuntar al chat de tareas.
 *
 * **Copia del módulo homónimo del backend** (`src/constants/document.ts`). Los dos
 * repositorios se despliegan por separado y no hay paquete compartido, así que la
 * duplicación es deliberada, igual que con el catálogo de roles. Si cambias un número
 * aquí, cámbialo también allí: el backend rechaza con un 400 lo que el navegador deje
 * pasar de más.
 *
 * El archivo se lee en el navegador y viaja como texto dentro del cuerpo JSON. No se
 * sube a ningún sitio ni se guarda: vive lo que dura la petición.
 */

/** Tope del contenido del archivo adjunto, en caracteres. El límite es inclusivo. */
export const MAX_DOCUMENT_CHARS = 3000;

/** Tope de la instrucción escrita a mano en el chat, en caracteres. */
export const MAX_CHAT_MESSAGE_CHARS = 2000;

/**
 * Extensiones que se aceptan al arrastrar. Sólo texto plano: no hay extracción de PDF
 * ni de DOCX en ninguna parte de este flujo.
 */
export const ACCEPTED_DOCUMENT_EXTENSIONS = ['.md', '.txt'] as const;
export type AcceptedDocumentExtension = (typeof ACCEPTED_DOCUMENT_EXTENSIONS)[number];

/** Valor del atributo `accept` del input de archivos. */
export const DOCUMENT_ACCEPT_ATTRIBUTE = ACCEPTED_DOCUMENT_EXTENSIONS.join(',');

/**
 * Tope del archivo de plantilla que se sube en el panel de importación
 * (`POST /projects/:projectId/import-tasks`).
 *
 * Es mucho más alto que `MAX_DOCUMENT_CHARS` porque este contenido **no entra en ningún
 * prompt**: lo lee un parser del backend, no un modelo. El límite existe sólo para que un
 * archivo absurdo no llegue hasta allí, y el que manda de verdad es `MAX_TEMPLATE_TASKS`.
 */
export const MAX_TEMPLATE_CHARS = 40000;

/** Tope de tareas por archivo de plantilla. El límite es inclusivo. */
export const MAX_TEMPLATE_TASKS = 100;

/**
 * Extensiones del panel "Importar tareas": la plantilla Markdown (sólo crea) y el JSON
 * exportado del propio CRM (sincroniza). Lista aparte de `ACCEPTED_DOCUMENT_EXTENSIONS`
 * para que el chat de tareas, que manda el contenido a OpenAI, no acepte JSON.
 */
export const TASK_IMPORT_EXTENSIONS = ['.md', '.txt', '.json'] as const;
export const TASK_IMPORT_ACCEPT_ATTRIBUTE = TASK_IMPORT_EXTENSIONS.join(',');

/**
 * Tope del JSON de tareas, el mismo que `MAX_SYNC_FILE_CHARS` del backend. Un export
 * lleva descripciones, entregables y comentarios de hasta `MAX_SYNC_TASKS` tareas.
 */
export const MAX_SYNC_FILE_CHARS = 5_000_000;
export const MAX_SYNC_TASKS = 1000;
