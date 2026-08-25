import { describe, it, expect } from 'vitest';
import { serviceStatusStyle } from './service-status';

describe('serviceStatusStyle', () => {
  it('un servicio activo se lee como Active', () => {
    expect(serviceStatusStyle('ACTIVE')?.label).toBe('Active');
  });

  it('uno dado de baja se lee como Cancelled', () => {
    expect(serviceStatusStyle('CANCELLED')?.label).toBe('Cancelled');
  });

  /** En un pago único no hay servicio: la celda queda vacía, no dice "activo". */
  it('sin servicio no devuelve estilo', () => {
    expect(serviceStatusStyle(null)).toBeNull();
  });

  /**
   * El rojo ya significa "moroso" en la columna de al lado, y son cosas distintas: un
   * cliente puede estar al día y haber cancelado. Dos rojos en la misma fila querrían
   * decir cosas diferentes.
   */
  it('la baja va en gris, no en rojo', () => {
    const style = serviceStatusStyle('CANCELLED');

    expect(style?.className).toContain('slate');
    expect(style?.className).not.toContain('red');
  });

  it('el activo va en verde suave', () => {
    expect(serviceStatusStyle('ACTIVE')?.className).toContain('emerald');
  });
});
