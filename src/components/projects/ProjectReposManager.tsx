import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Github, Plus, RefreshCw, Trash2, Pencil, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { githubService } from '@/services/github.service';
import { GitMetricsCard } from './GitMetricsCard';
import { CommitsList } from './CommitsList';
import type { ProjectRepo, GitMetric, GitCommit } from '@/types/api';
import { formatDistanceToNow } from 'date-fns';

interface ProjectReposManagerProps {
  projectId: string;
  metrics: GitMetric[];
  commits: GitCommit[];
  isLoading?: boolean;
  onSyncComplete?: () => void;
}

interface RepoFormState {
  owner: string;
  repo: string;
  label: string;
  defaultBranch: string;
}

const emptyForm: RepoFormState = { owner: '', repo: '', label: '', defaultBranch: 'main' };

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const m = url.trim().match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

export function ProjectReposManager({
  projectId,
  metrics,
  commits,
  isLoading,
  onSyncComplete,
}: ProjectReposManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRepo | null>(null);
  const [form, setForm] = useState<RepoFormState>(emptyForm);
  const [pasteUrl, setPasteUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);
  const [repoToDelete, setRepoToDelete] = useState<ProjectRepo | null>(null);

  const { data: repos = [], refetch: refetchRepos } = useQuery<ProjectRepo[]>({
    queryKey: ['project-repos', projectId],
    queryFn: () => githubService.listRepos(projectId),
    enabled: !!projectId,
  });

  // Group metrics and commits by projectRepoId
  const grouped = useMemo(() => {
    const map = new Map<string, { metrics: GitMetric[]; commits: GitCommit[] }>();
    for (const r of repos) map.set(r.id, { metrics: [], commits: [] });
    for (const m of metrics) {
      if (!m.projectRepoId) continue;
      const g = map.get(m.projectRepoId);
      if (g) g.metrics.push(m);
    }
    for (const c of commits) {
      if (!c.projectRepoId) continue;
      const g = map.get(c.projectRepoId);
      if (g) g.commits.push(c);
    }
    return map;
  }, [repos, metrics, commits]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setPasteUrl('');
    setDialogOpen(true);
  };

  const openEdit = (repo: ProjectRepo) => {
    setEditing(repo);
    setForm({
      owner: repo.githubOwner,
      repo: repo.repositoryName,
      label: repo.label || '',
      defaultBranch: repo.defaultBranch || 'main',
    });
    setPasteUrl('');
    setDialogOpen(true);
  };

  const handlePasteUrl = (url: string) => {
    setPasteUrl(url);
    const parsed = parseGitHubUrl(url);
    if (parsed) {
      setForm(f => ({ ...f, owner: parsed.owner, repo: parsed.repo }));
    }
  };

  const handleSave = async () => {
    if (!form.owner || !form.repo) {
      toast({ title: 'Owner and repo are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await githubService.updateRepo(projectId, editing.id, {
          owner: form.owner,
          repo: form.repo,
          label: form.label || undefined,
          defaultBranch: form.defaultBranch || undefined,
        });
        toast({ title: 'Repo updated' });
      } else {
        const created = await githubService.addRepo(projectId, {
          owner: form.owner,
          repo: form.repo,
          label: form.label || undefined,
          defaultBranch: form.defaultBranch || undefined,
        });
        toast({ title: 'Repo linked' });
        // Auto-sync the freshly-added repo
        try {
          await githubService.syncRepo(projectId, created.id);
        } catch (e: any) {
          toast({
            title: 'Linked, but initial sync failed',
            description: e?.response?.data?.error || 'Check the repo name and token access',
            variant: 'destructive',
          });
        }
      }
      setDialogOpen(false);
      await refetchRepos();
      onSyncComplete?.();
    } catch (e: any) {
      toast({
        title: 'Failed',
        description: e?.response?.data?.error || e?.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (repo: ProjectRepo) => {
    setSyncingRepoId(repo.id);
    try {
      const result = await githubService.syncRepo(projectId, repo.id);
      toast({
        title: 'Synced',
        description: `${result.syncedMetrics} branches, ${result.syncedCommits} commits`,
      });
      await refetchRepos();
      onSyncComplete?.();
    } catch (e: any) {
      toast({
        title: 'Sync failed',
        description: e?.response?.data?.error || e?.message,
        variant: 'destructive',
      });
    } finally {
      setSyncingRepoId(null);
    }
  };

  const handleDelete = async () => {
    if (!repoToDelete) return;
    try {
      await githubService.deleteRepo(projectId, repoToDelete.id);
      toast({ title: 'Repo unlinked' });
      setRepoToDelete(null);
      await refetchRepos();
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onSyncComplete?.();
    } catch (e: any) {
      toast({
        title: 'Failed to unlink',
        description: e?.response?.data?.error || e?.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            Repositories
            <Badge variant="secondary" className="ml-2">{repos.length}</Badge>
          </h2>
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Link Repository
        </Button>
      </div>

      {repos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Github className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No repositories linked yet</p>
            <Button onClick={openAdd} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Link the first repository
            </Button>
          </CardContent>
        </Card>
      ) : (
        repos.map(repo => {
          const { metrics: repoMetrics, commits: repoCommits } = grouped.get(repo.id) || { metrics: [], commits: [] };
          const repoUrl = repo.repositoryUrl || `https://github.com/${repo.githubOwner}/${repo.repositoryName}`;
          const lastSyncText = repo.lastGitSyncAt
            ? `Synced ${formatDistanceToNow(new Date(repo.lastGitSyncAt), { addSuffix: true })}`
            : 'Never synced';

          return (
            <Card key={repo.id} className="overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        {repo.label && (
                          <Badge variant="default" className="text-xs">{repo.label}</Badge>
                        )}
                        <a
                          href={repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1 truncate"
                        >
                          {repo.githubOwner}/{repo.repositoryName}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{lastSyncText}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSync(repo)}
                      disabled={syncingRepoId === repo.id}
                      title="Sync now"
                    >
                      {syncingRepoId === repo.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(repo)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRepoToDelete(repo)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Unlink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <GitMetricsCard
                  metrics={repoMetrics.map(m => ({
                    id: m.id,
                    branch_name: m.branchName,
                    commits_count: m.commitsCount || 0,
                    last_commit_sha: m.lastCommitSha || undefined,
                    last_commit_date: m.lastCommitDate || undefined,
                    last_commit_message: m.lastCommitMessage || undefined,
                    last_commit_author: m.lastCommitAuthor || undefined,
                    pull_requests_count: m.pullRequestsCount || 0,
                    open_issues_count: m.openIssuesCount || 0,
                    closed_issues_count: m.closedIssuesCount || 0,
                  }))}
                  repositoryUrl={repoUrl}
                  className="border-0 shadow-none p-0"
                />
                {repoCommits.length > 0 && (
                  <CommitsList
                    commits={repoCommits.map(c => ({
                      id: c.id,
                      commit_sha: c.commitSha,
                      commit_message: c.commitMessage || '',
                      commit_author: c.commitAuthor || '',
                      commit_date: c.commitDate || '',
                      branch_name: c.branchName || '',
                      files_changed: c.filesChanged || 0,
                      additions: c.additions || 0,
                      deletions: c.deletions || 0,
                    }))}
                    isLoading={isLoading}
                    className="border-0 shadow-none p-0"
                  />
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Repository' : 'Link Repository'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editing && (
              <div className="space-y-2">
                <Label>Paste GitHub URL (optional)</Label>
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={pasteUrl}
                  onChange={e => handlePasteUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Or fill the fields below manually
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input
                  placeholder="DonataiCA"
                  value={form.owner}
                  onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Repository</Label>
                <Input
                  placeholder="my-repo"
                  value={form.repo}
                  onChange={e => setForm(f => ({ ...f, repo: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Label (optional)</Label>
                <Input
                  placeholder="Backend / Frontend / Mobile"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Default branch</Label>
                <Input
                  placeholder="main"
                  value={form.defaultBranch}
                  onChange={e => setForm(f => ({ ...f, defaultBranch: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              {editing ? 'Save' : 'Link & sync'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!repoToDelete}
        onOpenChange={() => setRepoToDelete(null)}
        title="Unlink Repository"
        description={`Are you sure you want to unlink ${repoToDelete?.githubOwner}/${repoToDelete?.repositoryName}? This will delete all stored commits and metrics for this repo.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
