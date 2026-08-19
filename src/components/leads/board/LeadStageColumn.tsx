import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { LeadCard } from "../LeadCard";
import { StageDateFilter } from "./StageDateFilter";
import { NO_DATE_FILTER, filterLeadsByCreatedAt, type StageDateFilterValue } from "@/lib/lead-date-filter";
import type { Lead, PipelineStage } from '@/types/api';
import { DollarSign } from "lucide-react";

interface LeadStageColumnProps {
  stage: {
    value: string;
    label: string;
    color?: string;
    /** `won` es lo que decide que la etapa lleve filtro de fecha, nunca su nombre. */
    category?: PipelineStage['category'];
  };
  leads: Lead[];
  isCollapsed?: boolean;
  onToggleCollapse?: (stage: string) => void;
  onUpdate: () => void;
  isMobile?: boolean;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-400',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-700', dot: 'bg-violet-500' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-400',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  green:  { bg: 'bg-green-50',  border: 'border-green-400',  text: 'text-green-700',  dot: 'bg-green-500' },
  red:    { bg: 'bg-red-50',    border: 'border-red-400',    text: 'text-red-700',    dot: 'bg-red-500' },
  slate:  { bg: 'bg-slate-50',  border: 'border-slate-400',  text: 'text-slate-600',  dot: 'bg-slate-400' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-700', dot: 'bg-orange-500' },
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-400',   text: 'text-pink-700',   dot: 'bg-pink-500' },
  cyan:   { bg: 'bg-cyan-50',   border: 'border-cyan-400',   text: 'text-cyan-700',   dot: 'bg-cyan-500' },
  // Legacy slug-based keys for backwards compat
  new:                  { bg: 'bg-blue-50',   border: 'border-blue-400',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  contact_established:  { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  first_meeting:        { bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-700', dot: 'bg-violet-500' },
  negotiating:          { bg: 'bg-amber-50',  border: 'border-amber-400',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  closed_won:           { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed_lost:          { bg: 'bg-red-50',    border: 'border-red-400',    text: 'text-red-700',    dot: 'bg-red-500' },
  on_hold:              { bg: 'bg-slate-50',  border: 'border-slate-400',  text: 'text-slate-600',  dot: 'bg-slate-400' },
};

/**
 * La tarjeta de origen no se mueve: se atenúa y quien sigue al cursor es el
 * `DragOverlay` del tablero. Así la tarjeta arrastrada nunca queda recortada por
 * el `overflow` de la columna, que es justo lo que permite que cada columna
 * conserve su propio scroll vertical.
 */
const DraggableLeadCard = ({ lead, onUpdate }: { lead: Lead; onUpdate: () => void }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-40' : undefined}
    >
      <LeadCard lead={lead} refetch={onUpdate} />
    </div>
  );
};

export const LeadStageColumn = ({
  stage,
  leads,
  onUpdate,
  isMobile = false,
}: LeadStageColumnProps) => {
  // Prefer explicit color field, fall back to slug-based lookup
  const colors = COLOR_MAP[stage.color ?? ''] ?? COLOR_MAP[stage.value] ?? COLOR_MAP.blue;
  const { setNodeRef, isOver } = useDroppable({ id: stage.value });

  // El filtro vive aquí y no en el tablero a propósito: así el resumen de arriba
  // (Total Leads, Pipeline Value) sigue contándolo todo y no miente al ocultar.
  // Tampoco se persiste: un filtro que se guarda y se olvida acaba haciendo creer
  // que se han perdido leads.
  const [dateFilter, setDateFilter] = useState<StageDateFilterValue>(NO_DATE_FILTER);
  const isWonStage = stage.category === 'won';

  const visibleLeads = isWonStage ? filterLeadsByCreatedAt(leads, dateFilter.range) : leads;
  const hiddenCount = leads.length - visibleLeads.length;
  // El importe es el de lo visible, para que cuadre con las tarjetas que hay en pantalla.
  const totalValue = visibleLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);

  return (
    <div className={isMobile ? "w-full" : "w-[300px] shrink-0 flex flex-col h-full"}>
      {/* Stage Header */}
      <div className={`rounded-t-xl border-t-[3px] ${colors.border} bg-card p-3 shrink-0`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`h-2 w-2 rounded-full ${colors.dot} shrink-0`} />
            <h3 className="font-semibold text-sm truncate">{stage.label}</h3>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium shrink-0">
              {hiddenCount > 0 ? `${visibleLeads.length} of ${leads.length}` : leads.length}
            </Badge>
          </div>
          {isWonStage && (
            <StageDateFilter value={dateFilter} onChange={setDateFilter} hiddenCount={hiddenCount} />
          )}
        </div>
        {totalValue > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span className="font-medium">{totalValue.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Drop Zone. Cada columna scrollea por su cuenta: @dnd-kit vuelve a medir las
          zonas de drop durante el arrastre y su auto-scroll recorre todos los
          ancestros scrolleables, así que este `overflow-y-auto` conviviendo con el
          scroll horizontal del tablero ya no rompe nada. */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-0 rounded-b-xl p-2 space-y-2 overflow-y-auto transition-colors border border-t-0 ${
          isOver
            ? `${colors.bg} border-dashed ${colors.border}`
            : 'bg-muted/20 border-border'
        }`}
      >
        {visibleLeads.map((lead) => (
          <DraggableLeadCard key={lead.id} lead={lead} onUpdate={onUpdate} />
        ))}

        {visibleLeads.length === 0 && (
          // Una columna vacía por culpa del filtro parece una columna rota, así que
          // se dice que hay leads ocultos y se ofrece deshacerlo aquí mismo.
          hiddenCount > 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 h-24 text-xs text-muted-foreground text-center px-2">
              <span>No leads in this date range. {hiddenCount} hidden.</span>
              <Button variant="outline" size="sm" className="h-7" onClick={() => setDateFilter(NO_DATE_FILTER)}>
                Clear filter
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
              Drag leads here
            </div>
          )
        )}

        {visibleLeads.length > 0 && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setDateFilter(NO_DATE_FILTER)}
            className="w-full rounded-md border border-dashed py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {hiddenCount} hidden by date · Clear
          </button>
        )}
      </div>
    </div>
  );
};
