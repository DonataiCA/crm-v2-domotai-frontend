import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { pipelineService, STAGE_COLORS, StageColor } from '@/services/pipeline.service';
import type { Pipeline, PipelineStage } from '@/types/api';
import { Plus, Trash2, Edit2, Check, X, ChevronRight, ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PipelineManagerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const COLOR_CLASSES: Record<string, { bg: string; text: string; dot: string }> = {
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
    amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
    green:  { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
    red:    { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
    slate:  { bg: 'bg-slate-100',  text: 'text-slate-700',  dot: 'bg-slate-500' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-500' },
    cyan:   { bg: 'bg-cyan-100',   text: 'text-cyan-700',   dot: 'bg-cyan-500' },
};

function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function PipelineManagerDialog({ open, onOpenChange }: PipelineManagerDialogProps) {
    const { toast } = useToast();
    const qc = useQueryClient();
    const [view, setView] = useState<'list' | 'stages'>('list');
    const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);

    // Pipeline list state
    const [newPipelineName, setNewPipelineName] = useState('');
    const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
    const [editPipelineName, setEditPipelineName] = useState('');

    // Stage state
    const [newStageName, setNewStageName] = useState('');
    const [newStageColor, setNewStageColor] = useState<StageColor>('blue');
    const [editingStageId, setEditingStageId] = useState<string | null>(null);
    const [editStageName, setEditStageName] = useState('');
    const [editStageColor, setEditStageColor] = useState<StageColor>('blue');
    const [newStageCategory, setNewStageCategory] = useState<'standard' | 'won' | 'lost'>('standard');
    const [newStageWeight, setNewStageWeight] = useState(50);
    const [editStageCategory, setEditStageCategory] = useState<'standard' | 'won' | 'lost'>('standard');
    const [editStageWeight, setEditStageWeight] = useState(50);

    const { data: pipelines = [], isLoading } = useQuery({
        queryKey: ['pipelines'],
        queryFn: pipelineService.getAll,
        enabled: open,
    });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['pipelines'] });
        qc.invalidateQueries({ queryKey: ['leads'] });
    };

    // Pipeline mutations
    const createPipeline = useMutation({
        mutationFn: (name: string) => pipelineService.create(name),
        onSuccess: () => { invalidate(); setNewPipelineName(''); toast({ title: 'Pipeline created' }); },
        onError: () => toast({ title: 'Error', description: 'Failed to create pipeline', variant: 'destructive' }),
    });

    const updatePipeline = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => pipelineService.update(id, name),
        onSuccess: () => { invalidate(); setEditingPipelineId(null); },
        onError: () => toast({ title: 'Error', description: 'Failed to update pipeline', variant: 'destructive' }),
    });

    const deletePipeline = useMutation({
        mutationFn: (id: string) => pipelineService.delete(id),
        onSuccess: () => { invalidate(); toast({ title: 'Pipeline deleted' }); },
        onError: (err: Error) => toast({ title: 'Error', description: err.message || 'Failed to delete pipeline', variant: 'destructive' }),
    });

    // Stage mutations
    const addStage = useMutation({
        mutationFn: ({ pipelineId, name, color, order, category, weight }: { pipelineId: string; name: string; color: StageColor; order: number; category: string; weight: number }) =>
            pipelineService.addStage(pipelineId, { name, slug: slugify(name), color, order, category, weight }),
        onSuccess: (stage) => {
            invalidate();
            setNewStageName('');
            setNewStageColor('blue');
            setNewStageCategory('standard');
            setNewStageWeight(50);
            // Update selectedPipeline stages optimistically
            if (selectedPipeline) {
                setSelectedPipeline(prev => prev ? { ...prev, stages: [...prev.stages, stage] } : prev);
            }
        },
        onError: () => toast({ title: 'Error', description: 'Failed to add stage', variant: 'destructive' }),
    });

    const updateStage = useMutation({
        mutationFn: ({ pipelineId, stageId, name, color, category, weight }: { pipelineId: string; stageId: string; name: string; color: StageColor; category: string; weight: number }) =>
            pipelineService.updateStage(pipelineId, stageId, { name, color, category, weight }),
        onSuccess: () => { invalidate(); setEditingStageId(null); refreshSelected(); },
        onError: () => toast({ title: 'Error', description: 'Failed to update stage', variant: 'destructive' }),
    });

    const deleteStage = useMutation({
        mutationFn: ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) =>
            pipelineService.deleteStage(pipelineId, stageId),
        onSuccess: () => { invalidate(); refreshSelected(); toast({ title: 'Stage deleted' }); },
        onError: (err: any) => toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to delete stage', variant: 'destructive' }),
    });

    const reorderStages = useMutation({
        mutationFn: ({ pipelineId, stageIds }: { pipelineId: string; stageIds: string[] }) =>
            pipelineService.reorderStages(pipelineId, stageIds),
        onSuccess: () => { invalidate(); refreshSelected(); },
        onError: () => toast({ title: 'Error', description: 'Failed to reorder stages', variant: 'destructive' }),
    });

    const moveStage = (stage: PipelineStage, direction: 'up' | 'down') => {
        if (!freshSelected) return;
        const sorted = [...freshSelected.stages].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex(s => s.id === stage.id);
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === sorted.length - 1) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        const newOrder = sorted.map(s => s.id);
        [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
        reorderStages.mutate({ pipelineId: freshSelected.id, stageIds: newOrder });
    };

    const refreshSelected = () => {
        if (!selectedPipeline) return;
        pipelineService.getById(selectedPipeline.id).then(p => setSelectedPipeline(p));
    };

    const openStages = (pipeline: Pipeline) => {
        setSelectedPipeline(pipeline);
        setView('stages');
    };

    const goBack = () => {
        setView('list');
        setSelectedPipeline(null);
        setEditingStageId(null);
        invalidate();
    };

    // Sync selectedPipeline from fresh query data
    const freshSelected = selectedPipeline
        ? (pipelines.find(p => p.id === selectedPipeline.id) ?? selectedPipeline)
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {view === 'stages' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={goBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        {view === 'list' ? 'Manage Pipelines' : `Stages — ${freshSelected?.name}`}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {view === 'list' && (
                        <>
                            {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}

                            {/* Pipeline list */}
                            {pipelines.map(pipeline => (
                                <div key={pipeline.id} className="flex items-center gap-2 p-3 border rounded-lg">
                                    {editingPipelineId === pipeline.id ? (
                                        <>
                                            <Input
                                                value={editPipelineName}
                                                onChange={e => setEditPipelineName(e.target.value)}
                                                className="flex-1 h-8"
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') updatePipeline.mutate({ id: pipeline.id, name: editPipelineName });
                                                    if (e.key === 'Escape') setEditingPipelineId(null);
                                                }}
                                            />
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updatePipeline.mutate({ id: pipeline.id, name: editPipelineName })}>
                                                <Check className="h-4 w-4 text-green-600" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingPipelineId(null)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{pipeline.name}</span>
                                                    {pipeline.isDefault && <Badge variant="secondary" className="text-xs h-4 px-1">Default</Badge>}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{pipeline.stages.length} stages</p>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openStages(pipeline)}>
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingPipelineId(pipeline.id); setEditPipelineName(pipeline.name); }}>
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            {!pipeline.isDefault && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deletePipeline.mutate(pipeline.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* Create new pipeline */}
                            <div className="flex gap-2 pt-2 border-t">
                                <Input
                                    placeholder="New pipeline name..."
                                    value={newPipelineName}
                                    onChange={e => setNewPipelineName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && newPipelineName.trim()) createPipeline.mutate(newPipelineName.trim()); }}
                                    className="flex-1"
                                />
                                <Button
                                    onClick={() => { if (newPipelineName.trim()) createPipeline.mutate(newPipelineName.trim()); }}
                                    disabled={!newPipelineName.trim() || createPipeline.isPending}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                </Button>
                            </div>
                        </>
                    )}

                    {view === 'stages' && freshSelected && (
                        <>
                            {/* Stage list — sorted by order */}
                            {[...freshSelected.stages].sort((a, b) => a.order - b.order).map((stage: PipelineStage, idx: number, arr: PipelineStage[]) => {
                                const c = COLOR_CLASSES[stage.color] ?? COLOR_CLASSES.blue;
                                return (
                                    <div key={stage.id} className="flex items-center gap-2 p-3 border rounded-lg">
                                        {editingStageId === stage.id ? (
                                            <div className="flex flex-col gap-2 w-full">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={editStageName}
                                                        onChange={e => setEditStageName(e.target.value)}
                                                        className="flex-1 h-8"
                                                        autoFocus
                                                    />
                                                    <Select value={editStageColor} onValueChange={v => setEditStageColor(v as StageColor)}>
                                                        <SelectTrigger className="w-28 h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {STAGE_COLORS.map(c => (
                                                                <SelectItem key={c} value={c}>
                                                                    <span className="flex items-center gap-2">
                                                                        <span className={`h-2.5 w-2.5 rounded-full ${COLOR_CLASSES[c].dot}`} />
                                                                        {c}
                                                                    </span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateStage.mutate({ pipelineId: freshSelected.id, stageId: stage.id, name: editStageName, color: editStageColor, category: editStageCategory, weight: editStageWeight })}>
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingStageId(null)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex items-center gap-2 pl-0">
                                                    <Select value={editStageCategory} onValueChange={v => { const cat = v as 'standard' | 'won' | 'lost'; setEditStageCategory(cat); if (cat === 'won') setEditStageWeight(100); if (cat === 'lost') setEditStageWeight(0); }}>
                                                        <SelectTrigger className="w-32 h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="standard">Standard</SelectItem>
                                                            <SelectItem value="won">
                                                                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" />Won</span>
                                                            </SelectItem>
                                                            <SelectItem value="lost">
                                                                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" />Lost</span>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={String(editStageWeight)} onValueChange={v => setEditStageWeight(Number(v))}>
                                                        <SelectTrigger className="w-24 h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Array.from({ length: 11 }, (_, i) => i * 10).map(w => (
                                                                <SelectItem key={w} value={String(w)}>{w}%</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Reorder buttons */}
                                                <div className="flex flex-col gap-0.5 shrink-0">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-4 w-5 rounded-sm"
                                                        disabled={idx === 0 || reorderStages.isPending}
                                                        onClick={() => moveStage(stage, 'up')}
                                                    >
                                                        <ChevronUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-4 w-5 rounded-sm"
                                                        disabled={idx === arr.length - 1 || reorderStages.isPending}
                                                        onClick={() => moveStage(stage, 'down')}
                                                    >
                                                        <ChevronDown className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <div className={`h-2.5 w-2.5 rounded-full ${c.dot} shrink-0`} />
                                                <span className={`flex-1 text-sm font-medium px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>{stage.name}</span>
                                                {stage.category === 'won' && <Badge variant="outline" className="text-[10px] h-4 px-1 border-green-300 text-green-600">Won</Badge>}
                                                {stage.category === 'lost' && <Badge variant="outline" className="text-[10px] h-4 px-1 border-red-300 text-red-600">Lost</Badge>}
                                                <span className="text-xs text-muted-foreground">{stage.weight}%</span>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingStageId(stage.id); setEditStageName(stage.name); setEditStageColor(stage.color as StageColor); setEditStageCategory((stage.category || 'standard') as 'standard' | 'won' | 'lost'); setEditStageWeight(stage.weight ?? 50); }}>
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteStage.mutate({ pipelineId: freshSelected.id, stageId: stage.id })}
                                                    disabled={freshSelected.stages.length <= 1}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Add stage */}
                            <div className="pt-2 border-t space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Add Stage</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Stage name..."
                                        value={newStageName}
                                        onChange={e => setNewStageName(e.target.value)}
                                        className="flex-1"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && newStageName.trim()) {
                                                addStage.mutate({ pipelineId: freshSelected.id, name: newStageName.trim(), color: newStageColor, order: freshSelected.stages.length, category: newStageCategory, weight: newStageWeight });
                                            }
                                        }}
                                    />
                                    <Select value={newStageColor} onValueChange={v => setNewStageColor(v as StageColor)}>
                                        <SelectTrigger className="w-28">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STAGE_COLORS.map(c => (
                                                <SelectItem key={c} value={c}>
                                                    <span className="flex items-center gap-2">
                                                        <span className={`h-2.5 w-2.5 rounded-full ${COLOR_CLASSES[c].dot}`} />
                                                        {c}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <Select value={newStageCategory} onValueChange={v => { const cat = v as 'standard' | 'won' | 'lost'; setNewStageCategory(cat); if (cat === 'won') setNewStageWeight(100); if (cat === 'lost') setNewStageWeight(0); }}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">Standard</SelectItem>
                                            <SelectItem value="won">
                                                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" />Won</span>
                                            </SelectItem>
                                            <SelectItem value="lost">
                                                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" />Lost</span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={String(newStageWeight)} onValueChange={v => setNewStageWeight(Number(v))}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 11 }, (_, i) => i * 10).map(w => (
                                                <SelectItem key={w} value={String(w)}>{w}%</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        className="ml-auto"
                                        onClick={() => { if (newStageName.trim()) addStage.mutate({ pipelineId: freshSelected.id, name: newStageName.trim(), color: newStageColor, order: freshSelected.stages.length, category: newStageCategory, weight: newStageWeight }); }}
                                        disabled={!newStageName.trim() || addStage.isPending}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
