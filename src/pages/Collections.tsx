import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/contexts/OrganizationContext";
import { collectionService } from "@/services/collection.service";
import type { CollectionStatus } from "@/types/api";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  Wallet,
} from "lucide-react";

/**
 * Cobranzas: quién debe, cuánto y desde cuándo.
 *
 * Es una lectura distinta de las mismas facturas que muestra la página de Facturas.
 * Allí importa el documento —su número, su PDF, su estado administrativo— y aquí
 * importa el cobro: si venció, cuánto lleva vencido y a quién hay que llamar.
 *
 * **La lista se pagina en el servidor.** Nunca se traen todas las filas para
 * recortarlas aquí: la cartera crece con el tiempo y esa página acabaría trayendo miles
 * de facturas para pintar diez.
 */

const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const formatCurrency = (value: number | null | undefined) =>
  `$${(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** Un único sitio donde vive el aspecto de cada estado, para que no se repita en la tabla. */
const STATUS_STYLES: Record<CollectionStatus, { label: string; className: string }> = {
  PAID: { label: "Pagado", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  DUE: { label: "Por cobrar", className: "bg-amber-100 text-amber-700 border-amber-200" },
  OVERDUE: { label: "Moroso", className: "bg-red-100 text-red-700 border-red-200" },
};

/** Días de retraso, sólo para los morosos: es el dato que decide a quién llamar antes. */
function daysLate(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const diff = Date.now() - new Date(dueDate).getTime();
  const days = Math.floor(diff / 86_400_000);
  return days > 0 ? days : null;
}

export default function Collections() {
  const { currentOrganization } = useOrganization();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [status, setStatus] = useState<CollectionStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Sin el retraso se lanzaría una consulta por tecla pulsada.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Cambiar de filtro o de tamaño puede dejar la página actual fuera de rango: si
  // estabas en la 7 y ahora sólo hay 2, verías una tabla vacía sin saber por qué.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, pageSize]);

  const filters = useMemo(
    () => ({
      ...(status !== "all" ? { status } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [status, debouncedSearch],
  );

  const { data: summary } = useQuery({
    queryKey: ["collections-summary", currentOrganization?.id],
    queryFn: collectionService.getSummary,
    enabled: !!currentOrganization,
  });

  const { data, isLoading, isError } = useQuery({
    // La página y los filtros forman parte de la clave: cada combinación es una
    // consulta distinta y se cachea por separado.
    queryKey: ["collections", currentOrganization?.id, page, pageSize, filters],
    queryFn: () => collectionService.getCollections(page, pageSize, filters),
    enabled: !!currentOrganization,
    // Mantiene la tabla anterior mientras llega la nueva, para que no parpadee.
    placeholderData: keepPreviousData,
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.pages ?? 0;

  const paidThisMonth = summary?.paidThisMonth ?? 0;
  const dueThisMonth = summary?.dueThisMonth ?? 0;

  const kpis = [
    {
      label: "Cobrados este mes",
      value: `${paidThisMonth}/${dueThisMonth}`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      accent: "bg-emerald-50",
    },
    {
      label: "Morosos",
      value: String(summary?.overdue ?? 0),
      icon: AlertTriangle,
      color: "text-red-600",
      accent: "bg-red-50",
    },
    {
      label: "Deuda vencida",
      value: formatCurrency(summary?.overdueAmount),
      icon: Wallet,
      color: "text-red-600",
      accent: "bg-red-50",
    },
    {
      label: "Pendiente total",
      value: formatCurrency(summary?.pendingAmount),
      icon: Clock,
      color: "text-blue-600",
      accent: "bg-blue-50",
    },
  ];

  if (!currentOrganization) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Selecciona una organización para ver las cobranzas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cobranzas</h1>
        <p className="text-sm text-muted-foreground">
          Quién debe, cuánto y desde cuándo. Se considera moroso a partir de los 5 días de
          gracia tras el vencimiento.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className={`text-2xl font-bold truncate ${kpi.color}`}>{kpi.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${kpi.accent}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, email o número de factura"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as CollectionStatus | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="OVERDUE">Morosos</SelectItem>
            <SelectItem value="DUE">Por cobrar</SelectItem>
            <SelectItem value="PAID">Pagados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} por página
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Servicio</th>
                  <th className="px-4 py-3 font-medium">Vence</th>
                  <th className="px-4 py-3 font-medium text-right">Importe</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      Cargando cobranzas…
                    </td>
                  </tr>
                )}

                {isError && !isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-destructive">
                      No se pudieron cargar las cobranzas.
                    </td>
                  </tr>
                )}

                {!isLoading && !isError && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No hay cobros que coincidan con el filtro.
                    </td>
                  </tr>
                )}

                {rows.map((row) => {
                  const style = STATUS_STYLES[row.collectionStatus];
                  const late = row.collectionStatus === "OVERDUE" ? daysLate(row.dueDate) : null;

                  return (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium truncate">{row.contact?.name ?? "Sin cliente"}</div>
                        {row.contact?.email && (
                          <div className="text-xs text-muted-foreground truncate">{row.contact.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[260px]">
                        {row.service ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(row.dueDate)}
                        {late && (
                          <div className="text-xs text-red-600">{late} días de retraso</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={style.className}>
                          {style.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} cobros
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {pagination.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
