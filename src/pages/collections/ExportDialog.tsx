import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/contexts/OrganizationContext";
import { collectionService, type CollectionFilters } from "@/services/collection.service";
import { RANGE_PRESETS, rangeFor, type RangePreset } from "./export-range";
import type { CollectionStatus } from "@/types/api";
import { FileDown, Loader2 } from "lucide-react";

/**
 * Opciones de exportación.
 *
 * Lo que hace útil este diálogo no son los filtros —esos ya están en la página— sino
 * **decir cuántas filas se van a exportar antes de descargar**. Exportar a ciegas es lo
 * que produce el "esperaba doce y salieron cuatrocientas". El recuento se pide con una
 * página de tamaño 1 y se lee su total: no trae ni una fila de más.
 *
 * Arranca con lo que haya filtrado en pantalla, para que no haya dos sitios decidiendo
 * lo mismo: si estabas mirando morosos, el diálogo abre en morosos.
 */

const CONTENT_OPTIONS: Array<{
  value: CollectionStatus | "ALL";
  label: string;
  hint: string;
}> = [
  { value: "ALL", label: "Everything", hint: "Charged and still to charge" },
  { value: "PAID", label: "Collected only", hint: "What the client already paid" },
  { value: "UNPAID", label: "Outstanding", hint: "Everything still to collect" },
  { value: "OVERDUE", label: "Overdue only", hint: "Past the 5 grace days" },
];

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Estado que se está viendo en la página; el diálogo arranca con él. */
  currentStatus: CollectionStatus | "all";
  /** Búsqueda activa: se respeta en la exportación y se avisa de que se aplica. */
  currentSearch: string;
  onExport: (filters: CollectionFilters) => Promise<void>;
}

export function ExportDialog({
  open,
  onOpenChange,
  currentStatus,
  currentSearch,
  onExport,
}: ExportDialogProps) {
  const { currentOrganization } = useOrganization();
  const [preset, setPreset] = useState<RangePreset>("MONTH");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [content, setContent] = useState<CollectionStatus | "ALL">("ALL");
  const [isExporting, setIsExporting] = useState(false);

  // Al abrir, hereda lo que se está viendo: dos sitios decidiendo lo mismo acaban
  // contradiciéndose.
  useEffect(() => {
    if (!open) return;
    setContent(currentStatus === "all" ? "ALL" : currentStatus);
    setPreset("MONTH");
    const initial = rangeFor("MONTH", new Date());
    if (initial) {
      setFrom(initial.from);
      setTo(initial.to);
    }
  }, [open, currentStatus]);

  const choosePreset = (value: RangePreset) => {
    setPreset(value);
    const range = rangeFor(value, new Date());
    if (range) {
      setFrom(range.from);
      setTo(range.to);
    } else if (value === "ALL") {
      // Sin fechas no hay rango que aplicar, que es justo lo que hace que el archivo
      // cuadre con las tarjetas de morosos y pendiente del panel.
      setFrom("");
      setTo("");
    }
  };

  // Tocar una fecha a mano deja de ser un periodo con nombre: pasa a ser a medida.
  const editFrom = (value: string) => {
    setFrom(value);
    setPreset("CUSTOM");
  };
  const editTo = (value: string) => {
    setTo(value);
    setPreset("CUSTOM");
  };

  const filters: CollectionFilters = useMemo(
    () => ({
      ...(content !== "ALL" ? { status: content } : {}),
      ...(currentSearch ? { search: currentSearch } : {}),
      ...(from ? { dueFrom: from } : {}),
      ...(to ? { dueTo: to } : {}),
      // Cada fila entra por la fecha que le corresponde: la cobrada por su fecha de
      // pago, la pendiente por su vencimiento. Un cobro de julio que entró en agosto
      // es dinero de agosto, y con el criterio de vencimiento se caía del informe.
      ...(from || to ? { dateBasis: "EVENT" as const } : {}),
    }),
    [content, currentSearch, from, to],
  );

  // Una página de tamaño 1 basta para saber el total: no se trae ni una fila de más.
  const { data: count, isFetching } = useQuery({
    queryKey: ["collections-export-count", currentOrganization?.id, filters],
    queryFn: async () => (await collectionService.getCollections(1, 1, filters)).pagination.total,
    enabled: open && !!currentOrganization,
  });

  const run = async () => {
    if (isExporting || !count) return;
    try {
      setIsExporting(true);
      await onExport(filters);
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export charges</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Period</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {RANGE_PRESETS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => choosePreset(option.value)}
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                    preset === option.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground hover:border-muted-foreground/40"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Las fechas se ven siempre, también con un periodo elegido: "this quarter"
                no significa lo mismo para todos, y aquí queda a la vista qué se aplica. */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={from}
                  disabled={preset === "ALL"}
                  onChange={(e) => editFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={to}
                  disabled={preset === "ALL"}
                  onChange={(e) => editTo(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {preset === "ALL"
                ? "No date limit: matches the Overdue and Total outstanding cards."
                : "Paid charges count on the day they were collected; the rest, on their due date."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Include</Label>
            <div className="space-y-1.5">
              {CONTENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setContent(option.value)}
                  className={`w-full rounded-md border p-2.5 text-left transition-colors ${
                    content === option.value
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Lo que convierte esto en una decisión informada. */}
          <div className="rounded-md bg-muted/40 px-3 py-2.5 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">
              {currentSearch ? `Matching "${currentSearch}"` : "In this selection"}
            </span>
            <span className="font-semibold tabular-nums">
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${count ?? 0} ${count === 1 ? "charge" : "charges"}`
              )}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {/* El botón dice exactamente qué va a hacer, no "Download". */}
          <Button onClick={run} disabled={isExporting || isFetching || !count} className="gap-2">
            <FileDown className="h-4 w-4" />
            {isExporting
              ? "Exporting..."
              : count
                ? `Export ${count} ${count === 1 ? "charge" : "charges"}`
                : "Nothing to export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
