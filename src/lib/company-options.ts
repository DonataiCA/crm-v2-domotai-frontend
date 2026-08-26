/**
 * Opciones del selector de empresa.
 *
 * Vive aparte del componente porque encierra la regla que hacía perder el
 * vínculo al editar: la empresa ya asignada tiene que estar en la lista
 * aunque la búsqueda vigente no la devuelva, o el selector no encuentra su
 * etiqueta, pinta el placeholder y el guardado la borra sin avisar.
 */

/** Valor centinela para "sin empresa": un Select de Radix no admite value="". */
export const NO_COMPANY = 'none';

export interface CompanyRef {
    id: string;
    name: string;
    domain?: string | null;
}

export interface CompanyOption {
    value: string;
    label: string;
}

const toOption = (company: CompanyRef): CompanyOption => ({
    value: company.id,
    label: company.domain ? `${company.name} (${company.domain})` : company.name,
});

export function buildCompanyOptions(
    results: CompanyRef[],
    selected?: CompanyRef | null,
): CompanyOption[] {
    const options = [{ value: NO_COMPANY, label: 'No company' }, ...results.map(toOption)];

    // El servidor ya ordena alfabéticamente, así que la seleccionada se añade
    // al final en vez de intercalarse: queda visible sin alterar ese orden.
    if (selected && !results.some((c) => c.id === selected.id)) {
        options.push(toOption(selected));
    }

    return options;
}
