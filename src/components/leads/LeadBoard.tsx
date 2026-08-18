import { useQuery } from "@tanstack/react-query";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useToast } from "@/hooks/use-toast";
import { LeadStageColumn } from "./board/LeadStageColumn";
import { useState, useRef, useCallback, useEffect } from "react";
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

export const LeadBoard = ({ pipeline }: LeadBoardProps) => {
  const { toast } = useToast();
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const { currentOrganization } = useOrganization();
  const boardRef = useRef<HTMLDivElement>(null);
  const scrollRAF = useRef<number | null>(null);
  const isDragging = useRef(false);

  // Auto-scroll during drag
  const handleAutoScroll = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !boardRef.current) return;
    const container = boardRef.current;
    const rect = container.getBoundingClientRect();
    const EDGE = 80;
    const MAX_SPEED = 18;
    const distLeft = e.clientX - rect.left;
    const distRight = rect.right - e.clientX;

    let delta = 0;
    if (distLeft < EDGE) delta = -MAX_SPEED * (1 - distLeft / EDGE);
    else if (distRight < EDGE) delta = MAX_SPEED * (1 - distRight / EDGE);

    if (delta !== 0) {
      if (scrollRAF.current) cancelAnimationFrame(scrollRAF.current);
      const step = () => {
        if (!isDragging.current) return;
        container.scrollLeft += delta;
        scrollRAF.current = requestAnimationFrame(step);
      };
      scrollRAF.current = requestAnimationFrame(step);
    } else if (scrollRAF.current) {
      cancelAnimationFrame(scrollRAF.current);
      scrollRAF.current = null;
    }
  }, []);

  useEffect(() => {
    if (isMobile) return;
    document.addEventListener('mousemove', handleAutoScroll);
    return () => {
      document.removeEventListener('mousemove', handleAutoScroll);
      if (scrollRAF.current) cancelAnimationFrame(scrollRAF.current);
    };
  }, [handleAutoScroll, isMobile]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["leads", currentOrganization?.id, pipeline.id],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");
      const response = await leadService.getLeads(1, 500, { pipelineId: pipeline.id });
      return response.data;
    },
    enabled: !!currentOrganization,
  });

  const filteredData = searchQuery
    ? data?.filter((lead) => {
        const q = searchQuery.toLowerCase();
        return (
          lead.name?.toLowerCase().includes(q) ||
          lead.contact?.name?.toLowerCase().includes(q) ||
          lead.contact?.email?.toLowerCase().includes(q) ||
          lead.contact?.company?.toLowerCase().includes(q) ||
          lead.assignee?.fullName?.toLowerCase().includes(q)
        );
      })
    : data;

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

  const getLeadsByStage = (stageName: string, stageSlug: string) => {
    const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '_');
    const normName = normalize(stageName);
    const normSlug = normalize(stageSlug);
    return filteredData?.filter((lead) => {
      if (!lead.stage) return false;
      const normLead = normalize(lead.stage);
      return lead.stage === stageName || lead.stage === stageSlug || normLead === normName || normLead === normSlug;
    }) || [];
  };

  const handleDragEnd = async (result: DropResult) => {
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

    try {
      await leadService.updateLead(draggableId, { stage: newStage });
      if (stage?.category === 'won' && lead && !lead.converted) {
        setLeadToConvert(lead);
      }

      toast({ title: "Lead moved", description: `Moved to ${stage?.name ?? newStage}` });
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to update lead stage", variant: "destructive" });
    }
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

      {/* Pipeline Board */}
      <DragDropContext
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={(result) => { isDragging.current = false; if (scrollRAF.current) { cancelAnimationFrame(scrollRAF.current); scrollRAF.current = null; } handleDragEnd(result); }}
      >
        <div
          ref={boardRef}
          className={`${isMobile ? 'flex flex-col gap-3' : 'flex gap-3 overflow-x-auto'} pb-4`}
          style={isMobile ? undefined : { height: 'calc(100vh - 330px)' }}
        >
          {pipeline.stages.map((stage) => (
            <LeadStageColumn
              key={stage.id}
              stage={{ value: stage.slug, label: stage.name, color: stage.color }}
              leads={getLeadsByStage(stage.name, stage.slug)}
              onUpdate={() => refetch()}
              isMobile={isMobile}
            />
          ))}
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
