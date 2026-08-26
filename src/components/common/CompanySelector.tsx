import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { companyService } from "@/services/company.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { SearchableSelect } from "./SearchableSelect";
import { buildCompanyOptions, NO_COMPANY } from "@/lib/company-options";

/**
 * Selector de empresa con búsqueda en el servidor.
 *
 * Antes cada formulario pedía las primeras 100 empresas y pintaba esa lista
 * fija. Como el backend las devuelve ordenadas por nombre, a partir de la
 * empresa 101 alfabética no había forma de elegirlas: el corte se veía como
 * "no me deja vincular empresas desde la T". Aquí se consulta al servidor con
 * lo que el usuario escribe, así que el número de empresas deja de importar.
 */

/** Suficiente para llenar el desplegable sin traer la tabla entera. */
const RESULT_LIMIT = 50;

interface CompanySelectorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function CompanySelector({
    value,
    onChange,
    disabled,
    placeholder = "Select a company (optional)",
}: CompanySelectorProps) {
    const { currentOrganization } = useOrganization();
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Mismo patrón que CompanyList, con menos espera: aquí el usuario está
    // escogiendo de un desplegable abierto y 500 ms se notan.
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: results = [], isFetching } = useQuery({
        queryKey: ["companies-search", currentOrganization?.id, debouncedSearch],
        queryFn: async () => {
            const response = await companyService.getCompanies(
                1,
                RESULT_LIMIT,
                debouncedSearch ? { search: debouncedSearch } : undefined,
            );
            return response.data ?? [];
        },
        enabled: !!currentOrganization,
    });

    const selectedId = value && value !== NO_COMPANY ? value : null;
    const alreadyListed = results.some((company) => company.id === selectedId);

    // La empresa vinculada puede no estar entre los resultados vigentes —al
    // abrir el formulario de edición, o tras teclear una búsqueda que no la
    // incluye—. Sin traerla, el selector no encontraría su etiqueta y pintaría
    // el placeholder, haciendo creer que el lead no tiene empresa.
    const { data: selectedCompany } = useQuery({
        queryKey: ["company", selectedId],
        queryFn: () => companyService.getCompany(selectedId as string),
        enabled: !!selectedId && !alreadyListed,
    });

    const options = buildCompanyOptions(
        results,
        !alreadyListed ? selectedCompany ?? null : null,
    );

    return (
        <SearchableSelect
            options={options}
            value={value || NO_COMPANY}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            searchPlaceholder="Search companies..."
            emptyText="No companies found."
            searchValue={search}
            onSearchChange={setSearch}
            loading={isFetching}
        />
    );
}
