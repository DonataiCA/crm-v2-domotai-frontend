import { describe, it, expect } from 'vitest';
import { buildCompanyOptions, NO_COMPANY } from './company-options';

const andina = { id: 'c1', name: 'Constructora Andina', domain: 'andina.test' };
const tempresa = { id: 'c2', name: 'Tempresa', domain: null };

describe('buildCompanyOptions', () => {
    it('abre con la opcion de no vincular ninguna empresa', () => {
        expect(buildCompanyOptions([], null)[0]).toEqual({ value: NO_COMPANY, label: 'No company' });
    });

    it('conserva el orden alfabetico que ya envia el servidor', () => {
        const options = buildCompanyOptions([tempresa, andina], null);
        expect(options.map(o => o.label)).toEqual(['No company', 'Tempresa', 'Constructora Andina (andina.test)']);
    });

    it('anade el dominio a la etiqueta para distinguir homonimas', () => {
        const [, option] = buildCompanyOptions([andina], null);
        expect(option.label).toBe('Constructora Andina (andina.test)');
    });

    it('omite el dominio cuando la empresa no tiene', () => {
        const [, option] = buildCompanyOptions([tempresa], null);
        expect(option.label).toBe('Tempresa');
    });

    // El caso que rompia al editar: la empresa vinculada cae fuera de la
    // busqueda vigente, el selector no encuentra su etiqueta y muestra el
    // placeholder, asi que al guardar se pierde el vinculo sin avisar.
    it('incluye la empresa seleccionada aunque no venga en los resultados', () => {
        const options = buildCompanyOptions([andina], tempresa);
        expect(options.map(o => o.value)).toEqual([NO_COMPANY, 'c1', 'c2']);
    });

    it('no duplica la empresa seleccionada si ya viene en los resultados', () => {
        const options = buildCompanyOptions([andina, tempresa], tempresa);
        expect(options.filter(o => o.value === 'c2')).toHaveLength(1);
    });

    it('sin empresa seleccionada no agrega ninguna opcion extra', () => {
        expect(buildCompanyOptions([andina], null)).toHaveLength(2);
    });
});
