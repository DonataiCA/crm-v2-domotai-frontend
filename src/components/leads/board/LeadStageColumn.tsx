import { Badge } from "@/components/ui/badge";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { LeadCard } from "../LeadCard";
import type { Lead } from '@/types/api';
import { DollarSign } from "lucide-react";

interface LeadStageColumnProps {
  stage: {
    value: string;
    label: string;
    color?: string;
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

export const LeadStageColumn = ({
  stage,
  leads,
  onUpdate,
  isMobile = false,
}: LeadStageColumnProps) => {
  // Prefer explicit color field, fall back to slug-based lookup
  const colors = COLOR_MAP[stage.color ?? ''] ?? COLOR_MAP[stage.value] ?? COLOR_MAP.blue;
  const totalValue = leads.reduce((sum, lead) => sum + (lead.price || 0), 0);

  return (
    <div className={isMobile ? "w-full" : "w-[300px] shrink-0 flex flex-col min-h-0"}>
      {/* Stage Header */}
      <div className={`rounded-t-xl border-t-[3px] ${colors.border} bg-card p-3 shrink-0`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
            <h3 className="font-semibold text-sm">{stage.label}</h3>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
              {leads.length}
            </Badge>
          </div>
        </div>
        {totalValue > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span className="font-medium">{totalValue.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <Droppable droppableId={stage.value}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-b-xl p-2 space-y-2 overflow-y-auto transition-colors border border-t-0 ${
              snapshot.isDraggingOver
                ? `${colors.bg} border-dashed ${colors.border}`
                : 'bg-muted/20 border-border'
            }`}
          >
            {leads.map((lead, index) => (
              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`transition-transform ${
                      snapshot.isDragging ? 'rotate-[2deg] scale-105 shadow-lg' : ''
                    }`}
                  >
                    <LeadCard lead={lead} refetch={onUpdate} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                Drag leads here
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};
