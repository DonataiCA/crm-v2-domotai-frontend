import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";
import { LeadStageColumn } from "./board/LeadStageColumn";
import { useMemo, useState } from "react";
import { LeadToProjectDialog } from "./conversion/LeadToProjectDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrganization } from "@/contexts/OrganizationContext";
import { leadService } from "@/services/lead.service";
import { Lead, Pipeline } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, TrendingUp, Users, Download } from "lucide-react";

interface LeadBoardProps {
  pipeline: Pipeline;
}

// Tolera las variantes históricas de `Lead.stage` (mayúsculas, espacios, guiones)
// para poder emparejarlas con la etapa del pipeline. No quita acentos, igual que antes.
const normalizeStageKey = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, '_');

export const LeadBoard = ({ pipeline }: LeadBoardProps) => {
  const { toast } = useToast();
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  const leadsQueryKey = useMemo(
    () => ["leads", currentOrganization?.id, pipeline.id] as const,
    [currentOrganization?.id, pipeline.id],
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: leadsQueryKey,
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");
      const response = await leadService.getLeads(1, 500, { pipelineId: pipeline.id });
      return response.data;
    },
    enabled: !!currentOrganization,
  });

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data?.filter(
      (lead) =>
        lead.name?.toLowerCase().includes(q) ||
        lead.contact?.name?.toLowerCase().includes(q) ||
        lead.contact?.email?.toLowerCase().includes(q) ||
        lead.contact?.company?.toLowerCase().includes(q) ||
        lead.assignee?.fullName?.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  const exportToCSV = () => {
    if (!data || data.length === 0) return;
    const headers = ['Lead Name', 'Stage', 'Amount', 'Pricing Type', 'Contact', 'Contact Email', 'Company', 'Assigned To', 'Created'];
    const rows = (filteredData || data).map(lead => [
      lead.name || '',
      lead.stage || '',
      lead.price?.toString() || '0',
      lead.pricingType || '',
      lead.contact?.name || '',
      lead.contact?.email || '',
      lead.company?.name || '',
      lead.assignee?.fullName || '',
      lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-${pipeline.name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Se agrupa una sola vez para TODAS las columnas, en lugar de recorrer los leads
  // una vez por columna. Eso no es sólo eficiencia: filtrando por columna nada
  // impedía que dos etapas cuyo nombre y slug colisionan al normalizar reclamaran
  // el mismo lead, que entonces se pintaba dos veces y generaba dos <Draggable>
  // con el mismo draggableId dentro del mismo DragDropContext — la librería exige
  // ids únicos y con duplicados el arrastre falla de forma errática.
  const leadsByStage = useMemo(() => {
    // Índice `clave normalizada → slug`. Dos pasadas a propósito: primero los
    // slugs de todas las etapas y sólo después los nombres, para que el nombre de
    // una etapa no le quite la clave al slug exacto de otra. El slug es el valor
    // canónico que persiste el backend, así que tiene prioridad.
    const slugByKey = new Map<string, string>();
    for (const stage of pipeline.stages) {
      const key = normalizeStageKey(stage.slug);
      if (!slugByKey.has(key)) slugByKey.set(key, stage.slug);
    }
    for (const stage of pipeline.stages) {
      const key = normalizeStageKey(stage.name);
      if (!slugByKey.has(key)) slugByKey.set(key, stage.slug);
    }

    // Se parte de todas las etapas para que las columnas vacías sigan existiendo.
    const grouped = new Map<string, Lead[]>(pipeline.stages.map((stage) => [stage.slug, []]));
    for (const lead of filteredData ?? []) {
      if (!lead.stage) continue;
      // Primer match gana: cada lead cae en exactamente una columna. Los que no
      // casan con ninguna etapa no se muestran, igual que antes.
      const slug = slugByKey.get(normalizeStageKey(lead.stage));
      if (slug) grouped.get(slug)?.push(lead);
    }
    return grouped;
  }, [filteredData, pipeline.stages]);

  // La etapa se pinta de inmediato y se revierte si el backend falla. Antes esto
  // esperaba a la respuesta HTTP: la librería ya había devuelto la tarjeta a su
  // columna de origen (los datos aún no habían cambiado) y con la red lenta el
  // movimiento se leía como un arrastre fallido aunque hubiera funcionado.
  const moveLead = useMutation({
    mutationFn: ({ leadId, stageSlug }: { leadId: string; stageSlug: string; lead: Lead }) =>
      leadService.updateLead(leadId, { stage: stageSlug }),
    onMutate: async ({ leadId, stageSlug }) => {
      await queryClient.cancelQueries({ queryKey: leadsQueryKey });
      const previous = queryClient.getQueryData<Lead[]>(leadsQueryKey);
      queryClient.setQueryData<Lead[]>(leadsQueryKey, (old) =>
        old?.map((l) => (l.id === leadId ? { ...l, stage: stageSlug } : l)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(leadsQueryKey, context?.previous);
      toast({ title: "Error", description: "Failed to update lead stage", variant: "destructive" });
    },
    onSuccess: (_data, { lead, stageSlug }) => {
      const stage = pipeline.stages.find((s) => s.slug === stageSlug);
      // El diálogo de conversión se abre sólo cuando el backend ha confirmado el
      // movimiento, para no arrancarlo por un cambio que acabe revirtiéndose.
      if (stage?.category === 'won' && !lead.converted) {
        setLeadToConvert(lead);
      }
      toast({ title: "Lead moved", description: `Moved to ${stage?.name ?? stageSlug}` });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: leadsQueryKey });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination ||
        (destination.droppableId === source.droppableId &&
         destination.index === source.index) ||
        !currentOrganization) {
      return;
    }

    const droppedSlug = destination.droppableId;
    const stage = pipeline.stages.find(s => s.slug === droppedSlug);
    // Se persiste el SLUG, nunca el nombre: el backend valida `^[a-z0-9_]+$` y
    // la base lo restringe con `leads_stage_slug_check`, así que "Negociación"
    // se rechazaría con un 400. El droppableId ya es el slug de la columna.
    const newStage = stage?.slug ?? droppedSlug;
    const lead = data?.find(l => l.id === draggableId);

    if (!lead) return;

    moveLead.mutate({ leadId: draggableId, stageSlug: newStage, lead });
  };

  if (!currentOrganization) {
    return <div className="text-center py-8 text-muted-foreground">Please select an organization to view leads.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-destructive/10">
        <h3 className="text-lg font-medium mb-2">Error Loading Leads</h3>
        <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const totalLeads = data?.length || 0;
  const totalValue = data?.reduce((sum, lead) => sum + (lead.price || 0), 0) || 0;
  const activeLeads = data?.filter(l => {
    const closedSlugs = ['closed_won', 'closed_lost'];
    return !closedSlugs.includes(l.stage ?? '');
  }).length || 0;

  const columns = pipeline.stages.map((stage) => (
    <LeadStageColumn
      key={stage.id}
      stage={{ value: stage.slug, label: stage.name, color: stage.color }}
      leads={leadsByStage.get(stage.slug) ?? []}
      onUpdate={() => refetch()}
      isMobile={isMobile}
    />
  ));

  return (
    <>
      {/* Pipeline Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex items-center gap-3 bg-card border rounded-lg p-3">
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="text-lg font-semibold">{totalLeads}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-lg p-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pipeline Value</p>
            <p className="text-lg font-semibold">${totalValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-lg p-3">
          <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Leads</p>
            <p className="text-lg font-semibold">{activeLeads}</p>
          </div>
        </div>
      </div>

      {/* Search & Export */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, contact, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportToCSV} className="shrink-0">
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Pipeline Board.
          Este div es el ÚNICO contenedor de scroll del tablero, y scrollea en los
          dos ejes. Que sea uno solo es lo que permite a @hello-pangea/dnd
          registrarlo como contenedor de todas las columnas y auto-scrollearlo
          durante el arrastre; con las columnas scrolleando por su cuenta, el
          scroll horizontal quedaba fuera de su alcance.
          Aquí hubo un auto-scroll manual (`mousemove` + requestAnimationFrame
          moviendo `scrollLeft`) que movía el tablero a espaldas de la librería y
          dejaba obsoletas las posiciones medidas al empezar el arrastre, que es
          justamente lo que rompía el drop. No volver a añadirlo. */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div
          className={isMobile ? 'flex flex-col gap-3 pb-4' : 'overflow-auto pb-4'}
          style={isMobile ? undefined : { height: 'calc(100vh - 330px)' }}
        >
          {isMobile ? (
            columns
          ) : (
            // El track intermedio toma la altura de la columna más alta (`w-max`
            // lo desliga del ancho del tablero) y con `items-stretch` todas se
            // estiran a esa medida. Sin él, las columnas cortas se quedarían a la
            // altura del tablero y los fondos saldrían desparejos.
            <div className="flex gap-3 items-stretch w-max min-h-full">{columns}</div>
          )}
        </div>
      </DragDropContext>

      <LeadToProjectDialog
        lead={leadToConvert}
        open={!!leadToConvert}
        onOpenChange={(open) => !open && setLeadToConvert(null)}
        onSuccess={() => {
          setLeadToConvert(null);
          refetch();
        }}
      />
    </>
  );
};
