import { ProjectStatus, normalizeProjectStatus } from "@/constants";
import type { Project } from "@/types/api";
import type { ProjectFormValues } from "./types";

/** ISO del API → 'yyyy-MM-dd', que es lo que lee un `<input type="date">`. */
const toDateInput = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");

/**
 * Traduce el `Project` del API (camelCase) a los valores del formulario (snake_case).
 * Pasarle el proyecto sin traducir hacía que el formulario no encontrara sus campos
 * y, al guardar, mandara las fechas en null.
 */
export function projectToFormValues(project: Project): ProjectFormValues {
  return {
    id: project.id,
    name: project.name ?? "",
    description: project.description ?? "",
    status: normalizeProjectStatus(project.status) ?? ProjectStatus.NOT_STARTED,
    start_date: toDateInput(project.startDate),
    end_date: toDateInput(project.endDate),
    contact_ids: project.contacts?.map((c) => c.id) ?? [],
    pricing_type: project.pricingType === "recurring" ? "recurring" : "flat",
    price: project.price ?? 0,
    payment_date: toDateInput(project.paymentDate),
    recurring_start_date: toDateInput(project.recurringStartDate),
    recurring_end_date: toDateInput(project.recurringEndDate),
    repository_url: project.repositoryUrl ?? "",
    production_url: project.productionUrl ?? "",
    github_owner: project.githubOwner ?? "",
    repository_name: project.repositoryName ?? "",
    default_branch: project.defaultBranch ?? "main",
    project_lead_id: project.projectLeadId ?? "",
  };
}
