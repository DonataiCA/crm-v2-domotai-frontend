import { describe, it, expect } from 'vitest';
import { findStageBySlug, stageLabel, stageCategory } from './lead-stage';
import type { PipelineStage } from '@/types/api';

const stage = (over: Partial<PipelineStage>): PipelineStage => ({
  id: 'id',
  pipelineId: 'p1',
  name: 'Nuevo',
  slug: 'nuevo',
  color: 'blue',
  order: 0,
  category: 'standard',
  weight: 10,
  ...over,
});

const STAGES: PipelineStage[] = [
  stage({ id: '1', name: 'Nuevo', slug: 'nuevo', order: 0 }),
  stage({ id: '2', name: 'Negociación', slug: 'negociacion', order: 1 }),
  stage({ id: '3', name: 'Ganado', slug: 'ganado', order: 2, category: 'won' }),
];

describe('findStageBySlug', () => {
  it('encuentra la etapa por su slug', () => {
    expect(findStageBySlug(STAGES, 'negociacion')?.name).toBe('Negociación');
  });

  it('devuelve undefined para un slug ajeno al pipeline', () => {
    expect(findStageBySlug(STAGES, 'closed_won')).toBeUndefined();
  });

  it('tolera que el pipeline no haya llegado todavía', () => {
    expect(findStageBySlug(undefined, 'nuevo')).toBeUndefined();
    expect(findStageBySlug(STAGES, null)).toBeUndefined();
  });
});

describe('stageLabel', () => {
  it('usa el nombre configurado, con sus tildes', () => {
    expect(stageLabel(STAGES, 'negociacion')).toBe('Negociación');
  });

  it('sin pipeline, formatea el slug en vez de mostrarlo crudo', () => {
    expect(stageLabel(undefined, 'primer_contacto')).toBe('Primer Contacto');
  });

  it('devuelve Unknown si no hay etapa', () => {
    expect(stageLabel(STAGES, null)).toBe('Unknown');
  });
});

describe('stageCategory', () => {
  it('devuelve la categoría, que es lo que decide el color del badge', () => {
    expect(stageCategory(STAGES, 'ganado')).toBe('won');
    expect(stageCategory(STAGES, 'nuevo')).toBe('standard');
  });

  it('devuelve undefined si la etapa no se resuelve', () => {
    expect(stageCategory(STAGES, 'inexistente')).toBeUndefined();
  });
});
