import { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { projectService } from '@/services/project.service';

interface TaskProgressSectionProps {
  taskId: string;
  progress: number;
  canEdit: boolean;
  onChange: () => void;
}

export function TaskProgressSection({ taskId, progress, canEdit, onChange }: TaskProgressSectionProps) {
  const { toast } = useToast();
  // Local value so the slider tracks the drag; the API call happens on release.
  const [value, setValue] = useState(progress ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(progress ?? 0);
  }, [progress, taskId]);

  const handleCommit = async (committed: number) => {
    if (committed === progress || saving) return;
    setSaving(true);
    try {
      await projectService.updateProjectTask(taskId, { progress: committed });
      onChange();
    } catch {
      setValue(progress ?? 0);
      toast({ title: 'Error', description: 'Failed to update task progress', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Progress</p>
        <span className="text-sm font-semibold tabular-nums">{value}%</span>
      </div>
      {canEdit ? (
        <Slider
          min={0}
          max={100}
          step={5}
          value={[value]}
          disabled={saving}
          onValueChange={([v]) => setValue(v)}
          onValueCommit={([v]) => handleCommit(v)}
          className="py-2"
        />
      ) : (
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full" style={{ width: `${value}%` }} />
        </div>
      )}
    </div>
  );
}
