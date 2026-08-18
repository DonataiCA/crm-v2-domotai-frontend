import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_CHARS,
} from '@/constants/document';

/**
 * Lectura y validación del archivo que se arrastra al chat de tareas.
 *
 * Markdown y texto plano son texto: no hay nada que extraer, así que el archivo se lee
 * aquí y su contenido viaja como un campo más del cuerpo JSON. Ni multipart, ni S3, ni
 * dependencias nuevas.
 *
 * La función es pura a propósito —sin React, sin DOM, sin red— porque es la única forma
 * de poder probarla: el repositorio no tiene `jsdom` ni `@testing-library/react`, y
 * `File.text()` sí funciona en Node.
 *
 * Esta validación es comodidad para el usuario, no seguridad. La que cuenta es la del
 * backend (`chatTaskSchema`), que rechaza con un 400 lo que se cuele por aquí.
 */

export interface Attachment {
  fileName: string;
  content: string;
  characters: number;
}

export type ReadResult =
  | { ok: true; attachment: Attachment }
  | { ok: false; error: string };

/**
 * Máximo de bytes que puede ocupar un contenido dentro de un tope de caracteres. UTF-8
 * gasta como mucho 4 bytes por caracter, así que un archivo más grande que esto no cabe
 * en el tope ni en el mejor de los casos y se puede descartar **sin leerlo**. Evita
 * cargar en memoria un archivo de decenas de megas para rechazarlo después.
 */
const maxBytesFor = (maxChars: number) => maxChars * 4;

const BOM = '﻿';

const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
};

const accepted = ACCEPTED_DOCUMENT_EXTENSIONS.join(' o ');

/**
 * `maxChars` es un parámetro y no una constante porque hay dos consumidores con topes muy
 * distintos: el chat de tareas, cuyo contenido acaba dentro de un prompt de OpenAI
 * (`MAX_DOCUMENT_CHARS`), y la importación por plantilla, que sólo lee un parser del
 * backend (`MAX_TEMPLATE_CHARS`). El resto de la validación es idéntica en los dos.
 */
export async function readAttachment(
  file: File,
  maxChars: number = MAX_DOCUMENT_CHARS,
): Promise<ReadResult> {
  const extension = extensionOf(file.name);

  const allowed: readonly string[] = ACCEPTED_DOCUMENT_EXTENSIONS;

  if (!allowed.includes(extension)) {
    return {
      ok: false,
      error: extension
        ? `No se puede adjuntar un archivo ${extension}. Sólo ${accepted}.`
        : `El archivo no tiene extensión. Sólo ${accepted}.`,
    };
  }

  if (file.size > maxBytesFor(maxChars)) {
    return {
      ok: false,
      error: `El archivo es demasiado grande. El máximo son ${maxChars} caracteres.`,
    };
  }

  let raw: string;
  try {
    raw = await file.text();
  } catch {
    return { ok: false, error: 'No se pudo leer el archivo.' };
  }

  const content = raw.startsWith(BOM) ? raw.slice(BOM.length) : raw;

  if (!content.trim()) {
    return { ok: false, error: 'El archivo está vacío.' };
  }

  // El recuento se hace sobre el contenido ya limpio, que es exactamente lo que se
  // manda al backend y lo que él vuelve a medir.
  if (content.length > maxChars) {
    return {
      ok: false,
      error: `El archivo tiene ${content.length} caracteres; el máximo son ${maxChars}.`,
    };
  }

  return {
    ok: true,
    attachment: { fileName: file.name, content, characters: content.length },
  };
}
