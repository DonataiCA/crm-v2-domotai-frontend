import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagService } from '@/services/tag.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tag as TagIcon, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import type { Tag } from '@/types/api';

const TAG_COLORS = ['#4A89B9', '#FF5F00', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

function ColorSwatches({ selected, onChange }: { selected: string | null; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {TAG_COLORS.map(c => (
        <button
          key={c}
          type="button"
          className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: c,
            borderColor: selected === c ? '#1e293b' : 'transparent',
            transform: selected === c ? 'scale(1.15)' : undefined,
          }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

const TagAdmin = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: tagService.getAll,
  });

  const createTag = useMutation({
    mutationFn: () => tagService.create(newName.trim(), newColor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      setNewName('');
      setNewColor(TAG_COLORS[(tags.length + 1) % TAG_COLORS.length]);
      toast({ title: 'Tag created' });
    },
    onError: (err: any) =>
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to create tag', variant: 'destructive' }),
  });

  const updateTag = useMutation({
    mutationFn: () => tagService.update(editingId!, { name: editName.trim(), color: editColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      setEditingId(null);
      toast({ title: 'Tag updated' });
    },
    onError: (err: any) =>
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to update tag', variant: 'destructive' }),
  });

  const deleteTag = useMutation({
    mutationFn: (id: string) => tagService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      setDeleteTarget(null);
      toast({ title: 'Tag deleted' });
    },
    onError: () => toast({ title: 'Failed to delete tag', variant: 'destructive' }),
  });

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || TAG_COLORS[0]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <TagIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tag Management</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage tags to categorize cards across projects
          </p>
        </div>
      </div>

      {/* Create new tag */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Create Tag</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                placeholder="e.g. MotoGo, Sprint 12..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newName.trim()) createTag.mutate();
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Color</label>
              <ColorSwatches selected={newColor} onChange={setNewColor} />
            </div>
            <Button
              onClick={() => createTag.mutate()}
              disabled={!newName.trim() || createTag.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Tag
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tag list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            All Tags
            {tags.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{tags.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : tags.length === 0 ? (
            <div className="py-10 text-center">
              <TagIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tags yet. Create one above.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {tags.map(tag => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors group"
                >
                  {editingId === tag.id ? (
                    /* Edit mode */
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                      <Input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-48"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') updateTag.mutate();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <ColorSwatches selected={editColor} onChange={setEditColor} />
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateTag.mutate()}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
                    <>
                      <span
                        className="h-3.5 w-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color || '#64748b' }}
                      />
                      <span className="font-medium text-sm flex-1">{tag.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {tag._count?.taskTags || 0} cards
                      </Badge>
                      {tag.creator && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {tag.creator.fullName || tag.creator.email}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        {format(new Date(tag.createdAt), 'MMM d, yyyy')}
                      </span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(tag)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(tag)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteTarget(null)}>
          <Card className="w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
                <h3 className="font-semibold">Delete Tag</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
                {(deleteTarget._count?.taskTags || 0) > 0 && (
                  <> This tag is used by <strong>{deleteTarget._count?.taskTags}</strong> card(s) which will lose this tag.</>
                )}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteTag.mutate(deleteTarget.id)}
                  disabled={deleteTag.isPending}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TagAdmin;
