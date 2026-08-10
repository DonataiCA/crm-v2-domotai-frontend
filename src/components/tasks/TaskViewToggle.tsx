
import { KanbanSquare, List, Table, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TaskViewToggleProps {
  view: 'cards' | 'table' | 'kanban';
  onViewChange: (view: 'cards' | 'table' | 'kanban') => void;
  completedCount?: number;
  onOpenArchive?: () => void;
}

export const TaskViewToggle = ({
  view,
  onViewChange,
  completedCount = 0,
  onOpenArchive,
}: TaskViewToggleProps) => {
  const views = [
    { key: 'cards' as const, icon: List, label: 'Cards' },
    { key: 'table' as const, icon: Table, label: 'Table' },
    { key: 'kanban' as const, icon: KanbanSquare, label: 'Kanban' },
  ];

  return (
    <div className="flex items-center">
      <div className="flex border rounded-md overflow-hidden">
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => onViewChange(v.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
              view === v.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted text-muted-foreground'
            } ${v.key !== 'cards' ? 'border-l' : ''}`}
          >
            <v.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        ))}
      </div>

      {onOpenArchive && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenArchive}
          className="flex items-center gap-1 ml-2"
        >
          <Archive className="h-4 w-4" />
          <span className="hidden sm:inline">Archive</span>
          {completedCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {completedCount}
            </Badge>
          )}
        </Button>
      )}
    </div>
  );
};
