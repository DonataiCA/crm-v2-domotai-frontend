import { describe, it, expect } from 'vitest';
import { describeChange, summaryParts } from './task-sync-preview';

describe('describeChange', () => {
  it('muestra antes → después con etiquetas legibles', () => {
    expect(describeChange({ field: 'status', before: 'TODO', after: 'COMPLETED' }))
      .toEqual({ label: 'Estado', before: 'To Do', after: 'Completed' });
    expect(describeChange({ field: 'assignee', before: null, after: 'ana@domotai.test' }))
      .toEqual({ label: 'Responsable', before: '—', after: 'ana@domotai.test' });
    expect(describeChange({ field: 'progress', before: 40, after: 80 }))
      .toEqual({ label: 'Progreso', before: '40%', after: '80%' });
  });

  it('recorta textos largos para que la vista previa siga siendo legible', () => {
    const long = 'x'.repeat(300);
    expect(describeChange({ field: 'description', before: '', after: long }).after.length).toBeLessThanOrEqual(121);
  });
});

describe('summaryParts', () => {
  it('solo lista lo que cambia, en plural correcto', () => {
    expect(summaryParts({ creates: 1, updates: 3, deletes: 0, moves: 2, conflicts: 0, tagsToCreate: 1 }))
      .toEqual(['1 nueva', '3 modificadas', '2 movidas', '1 etiqueta nueva']);
    expect(summaryParts({ creates: 0, updates: 0, deletes: 0, moves: 0, conflicts: 0, tagsToCreate: 0 })).toEqual([]);
  });
});
