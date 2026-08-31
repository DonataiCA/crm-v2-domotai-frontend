import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { projectService } from '@/services/project.service';
import { ListChecks, Plus, Trash2, Loader2 } from 'lucide-react';
import type { TaskDeliverable } from '@/types/api';

interface TaskDeliverableSectionProps {
  taskId: string;
  deliverables: TaskDeliverable[];
  canEdit: boolean;
  onChange: () => void;
}

export function TaskDeliverableSection({ taskId, deliverables, canEdit, onChange }: TaskDeliverableSectionProps) {
  const { toast } = useToast();
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const doneCount = deliverables.filter(d => d.done).length;

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      await projectService.createDeliverable(taskId, title);
      setNewTitle('');
      onChange();
    } catch {
      toast({ title: 'Error', description: 'Error adding deliverable', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (deliverable: TaskDeliverable, done: boolean) => {
    if (busyId) return;
    setBusyId(deliverable.id);
    try {
      await projectService.updateDeliverable(deliverable.id, { done });
      onChange();
    } catch {
      toast({ title: 'Error', description: 'Error updating deliverable', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (deliverable: TaskDeliverable) => {
    if (busyId) return;
    setBusyId(deliverable.id);
    try {
      await projectService.deleteDeliverable(deliverable.id);
      onChange();
    } catch {
      toast({ title: 'Error', description: 'Error deleting deliverable', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  if (!canEdit && deliverables.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
        <ListChecks className="h-3.5 w-3.5" />
        Deliverables
        {deliverables.length > 0 && (
          <span className="normal-case tracking-normal font-normal">
            ({doneCount}/{deliverables.length})
          </span>
        )}
      </p>
      <div className="space-y-1.5">
        {deliverables.map(deliverable => (
          <div key={deliverable.id} className="flex items-center gap-2 group">
            <Checkbox
              checked={deliverable.done}
              disabled={!canEdit || busyId === deliverable.id}
              onCheckedChange={checked => handleToggle(deliverable, checked === true)}
            />
            <span className={`text-sm flex-1 ${deliverable.done ? 'line-through text-muted-foreground' : ''}`}>
              {deliverable.title}
            </span>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                disabled={busyId === deliverable.id}
                onClick={() => handleDelete(deliverable)}
              >
                {busyId === deliverable.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            )}
          </div>
        ))}
        {canEdit && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              placeholder="Add a deliverable…"
              className="h-8 text-sm"
            />
            <Button size="sm" className="h-8" disabled={!newTitle.trim() || adding} onClick={handleAdd}>
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
