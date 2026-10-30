import { describe, it, expect } from 'vitest';
import { columnTasks, moveTask, NO_FILTERS } from './kanban-order';
import type { ProjectTask } from '@/types/api';

const task = (id: string, status: string, orderIndex: number, extra: Partial<ProjectTask> = {}) =>
  ({
    id,
    status,
    orderIndex,
    phaseId: 'ph-1',
    createdAt: `2026-10-0${orderIndex + 1}T00:00:00.000Z`,
    taskTags: [],
    completedAt: null,
    ...extra,
  }) as unknown as ProjectTask;

const ids = (list: ProjectTask[]) => list.map((t) => t.id);

describe('columnTasks', () => {
  it('ordena por orderIndex y desempata por fecha de creación, como el export', () => {
    const tasks = [
      task('b', 'TODO', 0, { createdAt: '2026-10-05T00:00:00.000Z' }),
      task('a', 'TODO', 0, { createdAt: '2026-10-01T00:00:00.000Z' }),
      task('c', 'TODO', 1),
      task('x', 'COMPLETED', 0),
    ];
    expect(ids(columnTasks(tasks, 'TODO', NO_FILTERS))).toEqual(['a', 'b', 'c']);
  });

  it('aplica los filtros de área y etiquetas', () => {
    const tasks = [
      task('a', 'TODO', 0),
      task('b', 'TODO', 1, { phaseId: 'ph-2' }),
      task('c', 'TODO', 2, { taskTags: [{ tagId: 't1', tag: { id: 't1' } }] as any }),
    ];
    expect(ids(columnTasks(tasks, 'TODO', { phaseId: 'ph-1', tagIds: [] }))).toEqual(['a', 'c']);
    expect(ids(columnTasks(tasks, 'TODO', { phaseId: null, tagIds: ['t1'] }))).toEqual(['c']);
  });
});

describe('moveTask', () => {
  const board = () => [task('a', 'TODO', 0), task('b', 'TODO', 1), task('c', 'TODO', 2), task('d', 'IN_PROGRESS', 0)];

  it('reordena dentro de la misma columna y devuelve la columna entera en su nuevo orden', () => {
    const result = moveTask(board(), { taskId: 'c', toStatus: 'TODO', toIndex: 0 }, NO_FILTERS);
    expect(result.orderedIds).toEqual(['c', 'a', 'b']);
    expect(ids(columnTasks(result.tasks, 'TODO', NO_FILTERS))).toEqual(['c', 'a', 'b']);
  });

  it('cambia de columna, la coloca en su posición y ajusta completedAt', () => {
    const result = moveTask(board(), { taskId: 'a', toStatus: 'IN_PROGRESS', toIndex: 1 }, NO_FILTERS);
    expect(result.orderedIds).toEqual(['d', 'a']);
    const moved = result.tasks.find((t) => t.id === 'a')!;
    expect(moved.status).toBe('IN_PROGRESS');

    const done = moveTask(board(), { taskId: 'a', toStatus: 'COMPLETED', toIndex: 0 }, NO_FILTERS);
    expect(done.tasks.find((t) => t.id === 'a')!.completedAt).toBeTruthy();
    const reopened = moveTask(done.tasks, { taskId: 'a', toStatus: 'TODO', toIndex: 0 }, NO_FILTERS);
    expect(reopened.tasks.find((t) => t.id === 'a')!.completedAt).toBeNull();
  });

  it('con filtros activos, el índice es el de la lista visible y las ocultas conservan su sitio', () => {
    // b está oculta por el filtro de área: la columna visible es [a, c].
    const tasks = [task('a', 'TODO', 0), task('b', 'TODO', 1, { phaseId: 'ph-2' }), task('c', 'TODO', 2)];
    const result = moveTask(tasks, { taskId: 'c', toStatus: 'TODO', toIndex: 0 }, { phaseId: 'ph-1', tagIds: [] });
    expect(result.orderedIds).toEqual(['c', 'a', 'b']);
  });

  it('soltar al final de la lista visible la deja tras la última visible, no tras las ocultas', () => {
    const tasks = [task('a', 'TODO', 0), task('c', 'TODO', 1), task('b', 'TODO', 2, { phaseId: 'ph-2' })];
    const result = moveTask(tasks, { taskId: 'a', toStatus: 'TODO', toIndex: 1 }, { phaseId: 'ph-1', tagIds: [] });
    expect(result.orderedIds).toEqual(['c', 'a', 'b']);
  });

  it('no altera la posición del resto de tareas del tablero en el array', () => {
    const before = board();
    const result = moveTask(before, { taskId: 'c', toStatus: 'TODO', toIndex: 0 }, NO_FILTERS);
    expect(ids(result.tasks)).toEqual(ids(before));
    expect(result.tasks.find((t) => t.id === 'd')).toEqual(before[3]);
  });
});
