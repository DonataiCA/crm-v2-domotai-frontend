import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tagService } from '@/services/tag.service';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tag as TagIcon, X, Plus } from 'lucide-react';
import type { Tag } from '@/types/api';

const TAG_COLORS = ['#4A89B9', '#FF5F00', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

interface TagSelectorProps {
  taskId: string;
  selectedTags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
}

export function TagSelector({ taskId, selectedTags: initialSelectedTags, onTagsChange }: TagSelectorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(initialSelectedTags);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when parent passes a different task or refreshes its data
  useEffect(() => {
    setSelectedTags(initialSelectedTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: tagService.getAll,
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedIds = new Set(selectedTags.map(t => t.id));
  const filtered = allTags.filter(
    t => !selectedIds.has(t.id) && t.name.toLowerCase().includes(search.toLowerCase().trim())
  );
  const exactMatch = allTags.some(
    t => t.name.toLowerCase() === search.trim().toLowerCase()
  );
  const showCreate = search.trim().length > 0 && !exactMatch;

  const persistTags = async (newTags: Tag[]) => {
    setSaving(true);
    try {
      await tagService.setTaskTags(taskId, newTags.map(t => t.id));
      setSelectedTags(newTags);
      onTagsChange?.(newTags);
      queryClient.invalidateQueries({ queryKey: ['project-tracking'] });
    } catch {
      toast({ title: 'Failed to update tags', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addTag = async (tag: Tag) => {
    const updated = [...selectedTags, tag];
    await persistTags(updated);
    setSearch('');
  };

  const removeTag = async (tagId: string) => {
    const updated = selectedTags.filter(t => t.id !== tagId);
    await persistTags(updated);
  };

  const createAndAdd = async () => {
    if (!search.trim()) return;
    setSaving(true);
    try {
      const color = TAG_COLORS[allTags.length % TAG_COLORS.length];
      const tag = await tagService.create(search.trim(), color);
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      const updated = [...selectedTags, tag];
      await persistTags(updated);
      setSearch('');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.response?.data?.message || 'Failed to create tag',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-1.5">
        <TagIcon className="h-3.5 w-3.5" />
        Tags
      </label>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors"
              style={{
                backgroundColor: (tag.color || '#64748b') + '18',
                color: tag.color || '#64748b',
                border: `1px solid ${(tag.color || '#64748b') + '35'}`,
              }}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: tag.color || '#64748b' }}
              />
              {tag.name}
              <button
                onClick={() => removeTag(tag.id)}
                className="ml-0.5 hover:opacity-70 transition-opacity"
                disabled={saving}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-sm">
          <TagIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search or create tags..."
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            disabled={saving}
          />
        </div>

        {/* Dropdown */}
        {isOpen && (filtered.length > 0 || showCreate) && (
          <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-md max-h-44 overflow-y-auto">
            {filtered.map(tag => (
              <button
                key={tag.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left"
                onClick={() => addTag(tag)}
                disabled={saving}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color || '#64748b' }}
                />
                {tag.name}
              </button>
            ))}
            {showCreate && (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left text-primary font-medium border-t"
                onClick={createAndAdd}
                disabled={saving}
              >
                <Plus className="h-3.5 w-3.5" />
                Create &ldquo;{search.trim()}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
