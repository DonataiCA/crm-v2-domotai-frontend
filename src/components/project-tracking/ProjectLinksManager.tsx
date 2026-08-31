import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { projectService } from '@/services/project.service';
import { Link2, Plus, Trash2, Pencil, ArrowUp, ArrowDown, ExternalLink, Loader2, X, Check } from 'lucide-react';
import type { ProjectLink } from '@/types/api';

interface ProjectLinksManagerProps {
  projectId: string;
  canEdit: boolean;
}

interface LinkDraft {
  title: string;
  url: string;
  description: string;
}

const EMPTY_DRAFT: LinkDraft = { title: '', url: '', description: '' };

/** Ensures pasted URLs without a scheme still open outside the SPA. */
function toHref(url: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

export function ProjectLinksManager({ projectId, canEdit }: ProjectLinksManagerProps) {
  const { toast } = useToast();
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<LinkDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<LinkDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deletingLink, setDeletingLink] = useState<ProjectLink | null>(null);

  const loadLinks = useCallback(async () => {
    try {
      const data = await projectService.getLinks(projectId);
      setLinks(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load project links', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleAdd = async () => {
    if (!draft.title.trim() || !draft.url.trim() || saving) return;
    setSaving(true);
    try {
      await projectService.createLink(projectId, {
        title: draft.title.trim(),
        url: draft.url.trim(),
        description: draft.description.trim() || null,
      });
      setDraft(EMPTY_DRAFT);
      await loadLinks();
    } catch {
      toast({ title: 'Error', description: 'Failed to add link', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (link: ProjectLink) => {
    setEditingId(link.id);
    setEditDraft({ title: link.title, url: link.url, description: link.description ?? '' });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editDraft.title.trim() || !editDraft.url.trim() || saving) return;
    setSaving(true);
    try {
      await projectService.updateLink(projectId, editingId, {
        title: editDraft.title.trim(),
        url: editDraft.url.trim(),
        description: editDraft.description.trim() || null,
      });
      setEditingId(null);
      await loadLinks();
    } catch {
      toast({ title: 'Error', description: 'Failed to update link', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLink) return;
    try {
      await projectService.deleteLink(projectId, deletingLink.id);
      setDeletingLink(null);
      await loadLinks();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete link', variant: 'destructive' });
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= links.length || saving) return;
    const reordered = [...links];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setLinks(reordered); // optimistic — the server call persists the new order
    try {
      await projectService.reorderLinks(projectId, reordered.map(l => l.id));
    } catch {
      toast({ title: 'Error', description: 'Failed to reorder links', variant: 'destructive' });
      await loadLinks();
    }
  };

  const editRow = (
    <div className="flex flex-col sm:flex-row gap-2 flex-1">
      <Input
        value={editDraft.title}
        onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
        placeholder="Title"
        className="h-8 sm:w-44"
      />
      <Input
        value={editDraft.url}
        onChange={e => setEditDraft(d => ({ ...d, url: e.target.value }))}
        placeholder="https://…"
        className="h-8 flex-1"
      />
      <Input
        value={editDraft.description}
        onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
        placeholder="Description (optional)"
        className="h-8 flex-1"
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Project Links
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No links yet. Pin the URLs the team keeps coming back to — the staging site, the Figma, the docs.
          </p>
        ) : (
          <div className="space-y-1.5">
            {links.map((link, index) => (
              <div key={link.id} className="flex items-center gap-2 rounded-md border px-3 py-2 group">
                {editingId === link.id ? (
                  <>
                    {editRow}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={saving} onClick={handleSaveEdit}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <a
                        href={toHref(link.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                      >
                        {link.title}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                      <p className="text-xs text-muted-foreground truncate">
                        {link.description || link.url}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          disabled={index === 0}
                          onClick={() => handleMove(index, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          disabled={index === links.length - 1}
                          onClick={() => handleMove(index, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(link)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingLink(link)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Input
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="Title"
              className="h-9 sm:w-44"
            />
            <Input
              value={draft.url}
              onChange={e => setDraft(d => ({ ...d, url: e.target.value }))}
              placeholder="https://…"
              className="h-9 flex-1"
            />
            <Input
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="Description (optional)"
              className="h-9 flex-1"
            />
            <Button
              className="h-9"
              disabled={!draft.title.trim() || !draft.url.trim() || saving}
              onClick={handleAdd}
            >
              {saving && !editingId ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add link
            </Button>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!deletingLink}
        onOpenChange={open => { if (!open) setDeletingLink(null); }}
        title="Delete link"
        description={`Delete "${deletingLink?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
