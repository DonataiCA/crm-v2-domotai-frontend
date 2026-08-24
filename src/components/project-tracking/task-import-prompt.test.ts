import { describe, it, expect } from 'vitest';
import { buildAiPrompt } from './task-import-prompt';
import type { ProjectPhase, ProjectTeamMember } from '@/types/api';

/**
 * El prompt existe para que la IA no tenga que adivinar lo que es propio del proyecto.
 * Si deja de llevar las áreas y las personas reales, deja de servir para nada: eso es lo
 * que fijan estos tests.
 */

const phase = (name: string): ProjectPhase =>
  ({ id: name, projectId: 'p', name, orderIndex: 0 }) as unknown as ProjectPhase;

const member = (fullName: string | null, email: string | null = null): ProjectTeamMember =>
  ({ id: 'm', userId: 'u', createdAt: '', user: { id: 'u', fullName, email } }) as unknown as ProjectTeamMember;

describe('buildAiPrompt', () => {
  it('incluye las áreas reales del proyecto', () => {
    const prompt = buildAiPrompt([phase('Descubrimiento'), phase('QA y despliegue')], []);

    expect(prompt).toContain('- Descubrimiento');
    expect(prompt).toContain('- QA y despliegue');
  });

  it('incluye a las personas por su nombre completo', () => {
    const prompt = buildAiPrompt([phase('Diseño')], [member('Ana Pérez')]);

    expect(prompt).toContain('- Ana Pérez');
  });

  it('usa el email de quien no tiene nombre, en vez de omitirlo', () => {
    const prompt = buildAiPrompt([phase('Diseño')], [member(null, 'ana@domotai.com')]);

    expect(prompt).toContain('- ana@domotai.com');
  });

  it('dice qué hacer cuando el proyecto no tiene áreas, en vez de dejar un hueco', () => {
    const prompt = buildAiPrompt([], []);

    expect(prompt).toContain('el proyecto aún no tiene áreas');
  });

  it('dice que se omita el responsable cuando no hay miembros', () => {
    const prompt = buildAiPrompt([phase('Diseño')], []);

    expect(prompt).toContain('omite el campo Responsable');
  });

  /** La causa número uno de archivos rechazados. */
  it('pide explícitamente que no se envuelva en un bloque de código', () => {
    expect(buildAiPrompt([phase('A')], [])).toContain('SIN envolverlo en un bloque de código');
  });
});
