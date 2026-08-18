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
 * Máximo de bytes que puede ocupar un contenido dentro del tope de caracteres. UTF-8
 * gasta como mucho 4 bytes por caracter, así que un archivo más grande que esto no cabe
 * en el tope ni en el mejor de los casos y se puede descartar **sin leerlo**. Evita
 * cargar en memoria un archivo de decenas de megas para rechazarlo después.
 */
const MAX_DOCUMENT_BYTES = MAX_DOCUMENT_CHARS * 4;

const BOM = '﻿';

const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
};

const accepted = ACCEPTED_DOCUMENT_EXTENSIONS.join(' o ');

export async function readAttachment(file: File): Promise<ReadResult> {
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

  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      ok: false,
      error: `El archivo es demasiado grande. El máximo son ${MAX_DOCUMENT_CHARS} caracteres.`,
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
  if (content.length > MAX_DOCUMENT_CHARS) {
    return {
      ok: false,
      error: `El archivo tiene ${content.length} caracteres; el máximo son ${MAX_DOCUMENT_CHARS}.`,
    };
  }

  return {
    ok: true,
    attachment: { fileName: file.name, content, characters: content.length },
  };
}
