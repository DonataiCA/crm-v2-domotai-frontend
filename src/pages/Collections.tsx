import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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
import { invoiceService } from "@/services/invoice.service";
import { availableActions } from "./collections/row-actions";
import { toCsv } from "./collections/export-csv";
import { billingTypeLabel } from "./collections/billing-type";
import { ChangePlanDialog } from "./collections/ChangePlanDialog";
import { serviceStatusStyle } from "./collections/service-status";
import { subscriptionService } from "@/services/subscription.service";
import { NewChargeDialog } from "./collections/NewChargeDialog";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CollectionRow, CollectionStatus } from "@/types/api";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileDown,
  Plus,
  Mail,
  MoreHorizontal,
  Pencil,
  Ban,
  Search,
  User,
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
/**
 * Tope de filas de una exportación. El servidor limita cada página a 100, así que el
 * archivo se arma pidiendo páginas seguidas; sin un tope, un filtro amplio dispararía
 * decenas de consultas y dejaría el navegador colgado sin explicación.
 */
const EXPORT_MAX_ROWS = 5000;
const DEFAULT_PAGE_SIZE = 10;

const formatCurrency = (value: number | null | undefined) =>
  `$${(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "-";

/** Un único sitio donde vive el aspecto de cada estado, para que no se repita en la tabla. */
const STATUS_STYLES: Record<CollectionStatus, { label: string; className: string }> = {
  PAID: { label: "Paid", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  DUE: { label: "Due", className: "bg-amber-100 text-amber-700 border-amber-200" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-700 border-red-200" },
};

/** Días de retraso, sólo para los morosos: es el dato que decide a quién llamar antes. */
function daysLate(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const diff = Date.now() - new Date(dueDate).getTime();
  const days = Math.floor(diff / 86_400_000);
  return days > 0 ? days : null;
}

/**
 * Acciones de una fila. Sólo se pintan las que `availableActions` autoriza: ofrecer
 * "enviar recordatorio" a un cliente sin email es un clic que sólo puede acabar en
 * error, y "cobrar" algo ya cobrado no se puede deshacer limpiamente.
 */
function RowMenu({
  row,
  onCharge,
  onRemind,
  onPdf,
  onOpenInvoice,
  onOpenContact,
  onChangePlan,
  onCancelService,
}: {
  row: CollectionRow;
  onCharge: () => void;
  onRemind: () => void;
  onPdf: () => void;
  onOpenInvoice: () => void;
  onOpenContact: () => void;
  onChangePlan: () => void;
  onCancelService: () => void;
}) {
  const actions = availableActions(row);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions for this charge</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {actions.includes("markPaid") && (
          <DropdownMenuItem onSelect={onCharge}>
            <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
            Mark as paid
          </DropdownMenuItem>
        )}
        {actions.includes("sendReminder") && (
          <DropdownMenuItem onSelect={onRemind}>
            <Mail className="h-4 w-4 mr-2" />
            Send reminder
          </DropdownMenuItem>
        )}
        {(actions.includes("markPaid") || actions.includes("sendReminder")) && (
          <DropdownMenuSeparator />
        )}
        <DropdownMenuItem onSelect={onPdf}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenInvoice}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View invoice
        </DropdownMenuItem>
        {actions.includes("viewContact") && (
          <DropdownMenuItem onSelect={onOpenContact}>
            <User className="h-4 w-4 mr-2" />
            View client
          </DropdownMenuItem>
        )}
        {/* Gestión del servicio, no de esta nota: sólo en cobros que se repiten. */}
        {actions.includes("changePlan") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onChangePlan}>
              <Pencil className="h-4 w-4 mr-2" />
              Change plan
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onCancelService} className="text-destructive">
              <Ban className="h-4 w-4 mr-2" />
              Cancel service
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Collections() {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /** Cobro que espera confirmación. Marcar pagado por error no se deshace limpio. */
  const [toCharge, setToCharge] = useState<CollectionRow | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  /** Cobro cuyo servicio se está editando; su subscriptionId es lo que se toca. */
  const [planRow, setPlanRow] = useState<CollectionRow | null>(null);
  /** Servicio pendiente de baja: cancelar no se deshace desde aquí. */
  const [toCancel, setToCancel] = useState<CollectionRow | null>(null);

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

  /** Tras cobrar cambian la lista y las tarjetas: si no se refrescan, el "40/89" miente. */
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["collections"] });
    queryClient.invalidateQueries({ queryKey: ["collections-summary"] });
  };

  const confirmCharge = async () => {
    if (!toCharge || isCharging) return;
    try {
      setIsCharging(true);
      await invoiceService.markAsPaid(toCharge.id);
      toast({
        title: "Payment recorded",
        description: `${toCharge.contact?.name ?? "Sin cliente"} — ${formatCurrency(toCharge.total)}`,
      });
      refreshAll();
    } catch {
      toast({
        title: "Could not record the payment",
        description: "Please try again in a few seconds.",
        variant: "destructive",
      });
    } finally {
      setIsCharging(false);
      setToCharge(null);
    }
  };

  /**
   * Exporta TODO lo que cumple el filtro, no la página que se ve: quien exporta quiere
   * la lista entera para trabajarla fuera, y un archivo con 10 de 117 morosos engaña.
   */
  const exportCsv = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      const perPage = 100; // el tope que admite el endpoint
      const first = await collectionService.getCollections(1, perPage, filters);
      const total = Math.min(first.pagination.total, EXPORT_MAX_ROWS);
      const rowsToExport = [...first.data];

      for (let p = 2; rowsToExport.length < total; p++) {
        const next = await collectionService.getCollections(p, perPage, filters);
        if (next.data.length === 0) break;
        rowsToExport.push(...next.data);
      }

      const blob = new Blob([toCsv(rowsToExport.slice(0, total))], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `collections-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export ready",
        description:
          first.pagination.total > EXPORT_MAX_ROWS
            ? `${total} of ${first.pagination.total} charges exported (limit reached). Narrow the filter for the rest.`
            : `${total} charges exported.`,
      });
    } catch {
      toast({ title: "Could not export the list", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const confirmCancelService = async () => {
    if (!toCancel?.subscriptionId) return;
    try {
      await subscriptionService.cancelSubscription(toCancel.subscriptionId);
      toast({
        title: "Service cancelled",
        description: "No further charges will be issued. Existing ones stay as they are.",
      });
      refreshAll();
    } catch {
      toast({ title: "Could not cancel the service", variant: "destructive" });
    } finally {
      setToCancel(null);
    }
  };

  const sendReminder = async (row: CollectionRow) => {
    try {
      await invoiceService.sendByEmail(row.id);
      toast({ title: "Reminder sent", description: row.contact?.email ?? "" });
    } catch {
      toast({
        title: "Could not send the reminder",
        description: "Check the server's email configuration.",
        variant: "destructive",
      });
    }
  };

  const downloadPdf = async (row: CollectionRow) => {
    try {
      await invoiceService.downloadPDF(row.id, row.invoiceNumber ?? row.id);
    } catch {
      toast({ title: "Could not download the PDF", variant: "destructive" });
    }
  };

  const paidThisMonth = summary?.paidThisMonth ?? 0;
  const dueThisMonth = summary?.dueThisMonth ?? 0;

  const kpis = [
    {
      label: "Collected this month",
      value: `${paidThisMonth}/${dueThisMonth}`,
      icon: CheckCircle2,
      color: "text-emerald-600",
      accent: "bg-emerald-50",
    },
    {
      label: "Overdue",
      value: String(summary?.overdue ?? 0),
      icon: AlertTriangle,
      color: "text-red-600",
      accent: "bg-red-50",
    },
    {
      label: "Overdue amount",
      value: formatCurrency(summary?.overdueAmount),
      icon: Wallet,
      color: "text-red-600",
      accent: "bg-red-50",
    },
    {
      label: "Total outstanding",
      value: formatCurrency(summary?.pendingAmount),
      icon: Clock,
      color: "text-blue-600",
      accent: "bg-blue-50",
    },
  ];

  if (!currentOrganization) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Select an organization to view collections.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Who owes what, and since when. An invoice counts as overdue 5 grace days after
          its due date.
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
            placeholder="Search by client, email or invoice number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as CollectionStatus | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="DUE">Due</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setIsNewOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New charge
        </Button>

        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={isExporting || !pagination?.total}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>

        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} per page
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
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 w-10"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      Loading collections...
                    </td>
                  </tr>
                )}

                {isError && !isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-destructive">
                      Failed to load collections.
                    </td>
                  </tr>
                )}

                {!isLoading && !isError && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                      No charges match the current filter.
                    </td>
                  </tr>
                )}

                {rows.map((row) => {
                  const style = STATUS_STYLES[row.collectionStatus];
                  const late = row.collectionStatus === "OVERDUE" ? daysLate(row.dueDate) : null;
                  const serviceStyle = serviceStatusStyle(row.serviceStatus);

                  return (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium truncate">{row.contact?.name ?? "No client"}</div>
                        {row.contact?.email && (
                          <div className="text-xs text-muted-foreground truncate">{row.contact.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[260px]">
                        {row.service ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {billingTypeLabel(row.billingType)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(row.dueDate)}
                        {late && (
                          <div className="text-xs text-red-600">{late} days late</div>
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
                      <td className="px-4 py-3">
                        {serviceStyle ? (
                          <Badge variant="outline" className={serviceStyle.className}>
                            {serviceStyle.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowMenu
                          row={row}
                          onCharge={() => setToCharge(row)}
                          onRemind={() => sendReminder(row)}
                          onPdf={() => downloadPdf(row)}
                          onOpenInvoice={() => navigate("/invoices")}
                          onOpenContact={() => navigate(`/contacts/${row.contact?.id}`)}
                          onChangePlan={() => setPlanRow(row)}
                          onCancelService={() => setToCancel(row)}
                        />
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
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} charges
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
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
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <NewChargeDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        onCreated={refreshAll}
      />

      <ChangePlanDialog
        row={planRow}
        onOpenChange={(open) => !open && setPlanRow(null)}
        onSaved={refreshAll}
      />

      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(open) => !open && setToCancel(null)}
        onConfirm={confirmCancelService}
        confirmLabel="Cancel service"
        title="Cancel this service"
        description={
          toCancel
            ? `${toCancel.contact?.name ?? "This client"} will stop being charged for "${toCancel.service ?? "this service"}". Charges already issued stay as they are.`
            : ""
        }
      />

      <ConfirmDialog
        open={!!toCharge}
        onOpenChange={(open) => !open && setToCharge(null)}
        onConfirm={confirmCharge}
        confirmLabel="Confirm"
        destructive={false}
        title="Record payment"
        description={
          toCharge
            ? `This will mark ${toCharge.contact?.name ?? "an unassigned client"}'s invoice for ${formatCurrency(toCharge.total)} as paid. Undoing it is not straightforward, so confirm the money has arrived.`
            : ""
        }
      />
    </div>
  );
}
