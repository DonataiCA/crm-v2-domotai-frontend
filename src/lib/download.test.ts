import { describe, it, expect } from 'vitest';
import { fileNameFromDisposition } from './download';

describe('fileNameFromDisposition', () => {
  it('lee el nombre del Content-Disposition del backend', () => {
    expect(fileNameFromDisposition('attachment; filename="tasks-andina-2026-10-30.json"', 'x.json'))
      .toBe('tasks-andina-2026-10-30.json');
    expect(fileNameFromDisposition('attachment; filename=tasks.json', 'x.json')).toBe('tasks.json');
  });

  it('usa el nombre de reserva si la cabecera falta o no trae nombre', () => {
    expect(fileNameFromDisposition(undefined, 'tasks.json')).toBe('tasks.json');
    expect(fileNameFromDisposition('attachment', 'tasks.json')).toBe('tasks.json');
  });

  it('no deja pasar rutas: solo el nombre del archivo', () => {
    expect(fileNameFromDisposition('attachment; filename="../../etc/passwd"', 'tasks.json')).toBe('passwd');
  });
});
