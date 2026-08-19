import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { LeadStageColumn } from "./board/LeadStageColumn";
import { LeadCard } from "./LeadCard";
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
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
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

  // Índice `clave normalizada → slug`. Dos pasadas a propósito: primero los slugs de
  // todas las etapas y sólo después los nombres, para que el nombre de una etapa no le
  // quite la clave al slug exacto de otra. El slug es el valor canónico que persiste el
  // backend, así que tiene prioridad.
  const slugByKey = useMemo(() => {
    const index = new Map<string, string>();
    for (const stage of pipeline.stages) {
      const key = normalizeStageKey(stage.slug);
      if (!index.has(key)) index.set(key, stage.slug);
    }
    for (const stage of pipeline.stages) {
      const key = normalizeStageKey(stage.name);
      if (!index.has(key)) index.set(key, stage.slug);
    }
    return index;
  }, [pipeline.stages]);

  // Se agrupa una sola vez para TODAS las columnas, en lugar de recorrer los leads
  // una vez por columna. Eso no es sólo eficiencia: filtrando por columna nada
  // impedía que dos etapas cuyo nombre y slug colisionan al normalizar reclamaran
  // el mismo lead, que entonces se pintaba dos veces y generaba dos elementos
  // arrastrables con el mismo id — con duplicados el arrastre falla de forma errática.
  const leadsByStage = useMemo(() => {
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
  }, [filteredData, pipeline.stages, slugByKey]);

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
      // Convertir a proyecto se ofrece, no se impone: antes el diálogo se abría solo
      // al soltar en una etapa ganadora e interrumpía el arrastre. Sigue siendo el
      // único acceso a la conversión, así que se propone aquí, que es cuando viene a
      // cuento, y se descarta ignorando el aviso.
      const canConvert = stage?.category === 'won' && !lead.converted;
      toast({
        title: "Lead moved",
        description: `Moved to ${stage?.name ?? stageSlug}`,
        action: canConvert ? (
          <ToastAction
            altText="Convert this lead to a project"
            onClick={() => setLeadToConvert(lead)}
          >
            Convert to project
          </ToastAction>
        ) : undefined,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: leadsQueryKey });
    },
  });

  // El ratón arrastra en cuanto se mueven 5px, para que un click sobre la tarjeta siga
  // abriendo el lead y los botones de dentro sigan respondiendo. En táctil se exige
  // mantener pulsado 200ms, que es lo que deja intacto el scroll con el dedo.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // `pointerWithin` es el más preciso con columnas grandes, pero no devuelve nada si el
  // puntero queda fuera de todas; en ese caso se cae a la intersección de rectángulos.
  const collisionDetection: CollisionDetection = (args) => {
    const byPointer = pointerWithin(args);
    return byPointer.length > 0 ? byPointer : rectIntersection(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLeadId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLeadId(null);

    if (!over || !currentOrganization) return;

    const leadId = String(active.id);
    const lead = data?.find(l => l.id === leadId);
    if (!lead) return;

    // Se persiste el SLUG, nunca el nombre: el backend valida `^[a-z0-9_]+$` y
    // la base lo restringe con `leads_stage_slug_check`, así que "Negociación"
    // se rechazaría con un 400. El id de la zona de drop ya es el slug de la columna.
    const newStage = String(over.id);
    // La etapa guardada puede ser una variante histórica ("Negociación", "NUEVO"), así
    // que se compara por la columna en la que está pintada, no por el texto crudo.
    const currentStage = lead.stage ? slugByKey.get(normalizeStageKey(lead.stage)) : undefined;
    if (currentStage === newStage) return;

    moveLead.mutate({ leadId, stageSlug: newStage, lead });
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
      stage={{ value: stage.slug, label: stage.name, color: stage.color, category: stage.category }}
      leads={leadsByStage.get(stage.slug) ?? []}
      onUpdate={() => refetch()}
      isMobile={isMobile}
    />
  ));

  const activeLead = activeLeadId ? data?.find(l => l.id === activeLeadId) : undefined;

  return (
    <>
      {/* Pipeline Summary. Una sola línea por dato: la etiqueta y la cifra comparten
          fila en vez de apilarse, que es lo que hacía la banda el doble de alta. Las
          pastillas se ajustan a su contenido en vez de repartirse el ancho: a pantalla
          completa, estiradas a un tercio cada una, dejaban un hueco muerto en medio. */}
      <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
          <Users className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-xs text-muted-foreground">Total Leads</span>
          <span className="text-sm font-semibold tabular-nums">{totalLeads}</span>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
          <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-xs text-muted-foreground">Pipeline Value</span>
          <span className="text-sm font-semibold tabular-nums">${totalValue.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
          <TrendingUp className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-xs text-muted-foreground">Active Leads</span>
          <span className="text-sm font-semibold tabular-nums">{activeLeads}</span>
        </div>
      </div>

      {/* Search & Export */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
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
          El tablero scrollea en horizontal y cada columna en vertical. Esa
          combinación es la que @hello-pangea/dnd no soporta —sólo admite un
          contenedor de scroll por zona de drop— y por eso soltar en una columna
          alcanzada con scroll no hacía nada. @dnd-kit sí la soporta: con
          `MeasuringStrategy.Always` vuelve a medir las zonas de drop durante el
          arrastre, así que el scroll deja de invalidar las posiciones, y su
          auto-scroll recorre todos los ancestros scrolleables en ambos ejes.
          Nada de auto-scroll manual: la librería ya lo hace. */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLeadId(null)}
      >
        <div
          className={isMobile ? 'flex flex-col gap-3 pb-4' : 'flex-1 min-h-0 overflow-x-auto overflow-y-hidden'}
        >
          {isMobile ? (
            columns
          ) : (
            // `h-full` da a las columnas una altura definida, que es lo que permite
            // que su cuerpo scrollee por dentro; `w-max` las desliga del ancho del
            // tablero para que el scroll horizontal sea del track, no de la página.
            <div className="flex gap-3 h-full w-max">{columns}</div>
          )}
        </div>

        {/* La tarjeta que sigue al cursor se renderiza fuera del flujo, así que ningún
            `overflow` la recorta — que es lo que hace compatible el scroll por columna
            con el arrastre. El ancho es el de la columna menos su padding. */}
        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <div className="w-[284px] rotate-[2deg] scale-105 shadow-lg cursor-grabbing">
              <LeadCard lead={activeLead} refetch={() => refetch()} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
