import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, GitCommit, GitPullRequest, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { githubService } from "@/services/github.service";
import { useToast } from "@/hooks/use-toast";

interface GitMetrics {
  id: string;
  branch_name: string;
  commits_count: number;
  last_commit_sha?: string;
  last_commit_date?: string;
  last_commit_message?: string;
  last_commit_author?: string;
  pull_requests_count: number;
  open_issues_count: number;
  closed_issues_count: number;
}

interface GitMetricsCardProps {
  metrics: GitMetrics[];
  repositoryUrl?: string;
  className?: string;
  projectId?: string;
  organizationId?: string;
  githubOwner?: string;
  repositoryName?: string;
  onRefresh?: () => void;
}

export const GitMetricsCard = ({
  metrics,
  repositoryUrl,
  className,
  projectId,
  organizationId,
  githubOwner,
  repositoryName,
  onRefresh
}: GitMetricsCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const totalCommits = metrics.reduce((sum, metric) => sum + metric.commits_count, 0);
  const totalPRs = metrics.reduce((sum, metric) => sum + metric.pull_requests_count, 0);
  const totalOpenIssues = metrics.reduce((sum, metric) => sum + metric.open_issues_count, 0);

  const latestCommit = metrics
    .filter(m => m.last_commit_date)
    .sort((a, b) => new Date(b.last_commit_date!).getTime() - new Date(a.last_commit_date!).getTime())[0];

  const handleFetchGitData = async () => {
    if (!projectId || !organizationId || !githubOwner || !repositoryName) {
      toast({
        title: "Error",
        description: "Missing required project or repository information",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const data = await githubService.fetchMetrics(projectId, {
        owner: githubOwner,
        repo: repositoryName
      });

      if (data && data.success) {
        toast({
          title: "Success",
          description: "Git data fetched successfully",
        });
        onRefresh?.();
      } else {
        toast({
          title: "Warning",
          description: "Git data fetch completed but no data was returned",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch Git data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Git Activity
          </CardTitle>
          {projectId && organizationId && githubOwner && repositoryName && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchGitData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Fetching...' : 'Fetch Git Data'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <GitCommit className="h-4 w-4" />
              Commits
            </div>
            <div className="text-2xl font-bold">{totalCommits}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <GitPullRequest className="h-4 w-4" />
              PRs
            </div>
            <div className="text-2xl font-bold">{totalPRs}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Open Issues</div>
            <div className="text-2xl font-bold">{totalOpenIssues}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Branches</div>
            <div className="text-2xl font-bold">{metrics.length}</div>
          </div>
        </div>

        {/* Latest Commit */}
        {latestCommit && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              Latest Activity
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{latestCommit.branch_name}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(latestCommit.last_commit_date!), { addSuffix: true })}
                </span>
              </div>
              <div className="text-sm">{latestCommit.last_commit_message}</div>
              <div className="text-xs text-muted-foreground">
                by {latestCommit.last_commit_author}
              </div>
            </div>
          </div>
        )}

        {/* Branch List */}
        {metrics.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-sm text-muted-foreground mb-2">Active Branches</div>
            <div className="flex flex-wrap gap-2">
              {metrics.map((metric) => (
                <Badge key={metric.id} variant="secondary" className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {metric.branch_name}
                  <span className="text-xs">({metric.commits_count})</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Repository Link */}
        {repositoryUrl && (
          <div className="border-t pt-4">
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View on GitHub →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
