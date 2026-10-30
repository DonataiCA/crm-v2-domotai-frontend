/** Descarga un blob con el nombre dado, sin salir de la página. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Nombre de archivo de un `Content-Disposition`. El backend decide el nombre (por
 * ejemplo `tasks-<proyecto>-<fecha>.json`); si la cabecera no llega —CORS no la expone,
 * o un proxy la quita— se usa `fallback`. Nunca devuelve una ruta, sólo el nombre.
 */
export function fileNameFromDisposition(header: string | null | undefined, fallback: string): string {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!match) return fallback;
  const name = decodeURIComponent(match[1]).split(/[\\/]/).pop()?.trim();
  return name || fallback;
}
