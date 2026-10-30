import { describe, it, expect } from 'vitest';
import { projectToFormValues } from './project-to-form-values';
import { ProjectStatus } from '@/constants';
import type { Project } from '@/types/api';

// El API devuelve el proyecto en camelCase y el formulario usa snake_case. Antes
// se le pasaba el `Project` tal cual: el formulario no encontraba `start_date` y
// al guardar mandaba las fechas en null, borrándolas.
const project = {
  id: 'p1',
  name: 'Portal clientes',
  description: 'Descripción',
  status: 'IN_PROGRESS',
  price: 1500,
  pricingType: 'recurring',
  paymentDate: '2026-03-05T00:00:00.000Z',
  recurringStartDate: '2026-03-01T00:00:00.000Z',
  recurringEndDate: '2026-12-31T00:00:00.000Z',
  startDate: '2026-02-15T00:00:00.000Z',
  endDate: '2026-06-30T00:00:00.000Z',
  repositoryUrl: 'https://github.com/acme/app',
  repositoryName: 'app',
  githubOwner: 'acme',
  defaultBranch: 'develop',
  productionUrl: 'https://app.acme.test',
  projectLeadId: 'prof-1',
} as unknown as Project;

describe('projectToFormValues', () => {
  it('conserva las fechas en el formato del input type="date"', () => {
    const values = projectToFormValues(project);
    expect(values.start_date).toBe('2026-02-15');
    expect(values.end_date).toBe('2026-06-30');
    expect(values.payment_date).toBe('2026-03-05');
    expect(values.recurring_start_date).toBe('2026-03-01');
    expect(values.recurring_end_date).toBe('2026-12-31');
  });

  it('mapea precio, tipo de cobro y responsable', () => {
    const values = projectToFormValues(project);
    expect(values.id).toBe('p1');
    expect(values.price).toBe(1500);
    expect(values.pricing_type).toBe('recurring');
    expect(values.project_lead_id).toBe('prof-1');
    expect(values.status).toBe(ProjectStatus.IN_PROGRESS);
  });

  it('mapea los datos de git y la URL de producción', () => {
    const values = projectToFormValues(project);
    expect(values.repository_url).toBe('https://github.com/acme/app');
    expect(values.repository_name).toBe('app');
    expect(values.github_owner).toBe('acme');
    expect(values.default_branch).toBe('develop');
    expect(values.production_url).toBe('https://app.acme.test');
  });

  it('deja vacíos los campos nulos en vez de escribir "null"', () => {
    const values = projectToFormValues({
      ...project, startDate: null, paymentDate: null, repositoryUrl: null, pricingType: null,
    } as unknown as Project);
    expect(values.start_date).toBe('');
    expect(values.payment_date).toBe('');
    expect(values.repository_url).toBe('');
    expect(values.pricing_type).toBe('flat');
  });
});
