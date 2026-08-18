import type { PipelineStage } from '@/types/api';

/**
 * `Lead.stage` guarda el slug de la etapa, no su nombre ni un valor de catálogo
 * global: las etapas son filas de `pipeline_stages` y cada organización
 * configura las suyas. Para pintar un lead hace falta resolver ese slug contra
 * las etapas de su pipeline, que el backend incluye en el payload.
 */

export function findStageBySlug(
  stages: PipelineStage[] | undefined | null,
  slug: string | null | undefined,
): PipelineStage | undefined {
  if (!slug) return undefined;
  return (stages ?? []).find((s) => s.slug === slug);
}

/**
 * Nombre visible de la etapa. Si el pipeline no está a mano, cae a formatear el
 * propio slug (`primer_contacto` → `Primer Contacto`), que es peor que el nombre
 * real —pierde las tildes— pero mejor que mostrar el slug crudo.
 */
export function stageLabel(
  stages: PipelineStage[] | undefined | null,
  slug: string | null | undefined,
): string {
  if (!slug) return 'Unknown';
  const stage = findStageBySlug(stages, slug);
  if (stage) return stage.name;
  return slug
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Categoría de la etapa (`standard` | `won` | `lost`), o undefined si no se resuelve. */
export function stageCategory(
  stages: PipelineStage[] | undefined | null,
  slug: string | null | undefined,
): string | undefined {
  return findStageBySlug(stages, slug)?.category;
}
