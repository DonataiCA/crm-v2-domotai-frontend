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
