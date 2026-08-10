import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitCommit, GitBranch, Plus, Minus, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface GitCommit {
  id: string;
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  commit_date: string;
  branch_name: string;
  files_changed: number;
  additions: number;
  deletions: number;
}

interface CommitsListProps {
  commits: GitCommit[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export const CommitsList = ({ commits, isLoading, onRefresh, className }: CommitsListProps) => {
  const formatCommitMessage = (message: string) => {
    if (!message) return "No message";
    // Take first line only and truncate if too long
    const firstLine = message.split('\n')[0];
    return firstLine.length > 60 ? firstLine.substring(0, 60) + "..." : firstLine;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Recent Commits ({commits.length})
          </CardTitle>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {commits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitCommit className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No commits found</p>
            <p className="text-sm">Commits will appear here once Git data is fetched</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {commits.map((commit) => (
              <div key={commit.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight">
                      {formatCommitMessage(commit.commit_message)}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{commit.commit_author}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(commit.commit_date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {commit.branch_name}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted-foreground">
                    {commit.commit_sha.substring(0, 7)}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">Files:</span>
                      <span>{commit.files_changed}</span>
                    </span>
                    {commit.additions > 0 && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Plus className="h-3 w-3" />
                        {commit.additions}
                      </span>
                    )}
                    {commit.deletions > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <Minus className="h-3 w-3" />
                        {commit.deletions}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};