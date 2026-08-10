
import { useState, useEffect } from "react";
import { Search, FileText, Users, CheckSquare, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { projectService } from "@/services/project.service";
import { taskService } from "@/services/task.service";
import { useToast } from "@/hooks/use-toast";
import type { Project, Task } from '@/types/api';

interface SearchResult {
  id: string;
  title: string;
  type: 'project' | 'task' | 'contact' | 'lead';
  description?: string;
  url: string;
}

export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !currentOrganization) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search projects
      const projectsResponse = await projectService.getProjects(1, 100);

      if (projectsResponse?.data) {
        projectsResponse.data
          .filter((p: Project) =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .forEach((project: Project) => {
            searchResults.push({
              id: project.id,
              title: project.name,
              type: 'project',
              description: project.description,
              url: `/projects/${project.id}/tracking`
            });
          });
      }

      // Search tasks
      const tasksResponse = await taskService.getTasks(1, 100);

      if (tasksResponse?.data) {
        tasksResponse.data
          .filter((t: Task) =>
            t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 5)
          .forEach((task: Task) => {
            searchResults.push({
              id: task.id,
              title: task.title,
              type: 'task',
              description: task.description,
              url: '/tasks'
            });
          });
      }

      setResults(searchResults);
    } catch {
      toast({
        title: "Search Error",
        description: "Failed to perform search",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [query, currentOrganization]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'project': return <Briefcase className="h-4 w-4" />;
      case 'task': return <CheckSquare className="h-4 w-4" />;
      case 'contact': return <Users className="h-4 w-4" />;
      case 'lead': return <FileText className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-64 justify-start text-muted-foreground">
          <Search className="h-4 w-4 mr-2" />
          Search projects, tasks...
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false} className="rounded-lg border-none shadow-none">
          <CommandInput
            placeholder="Search projects, tasks, contacts..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isSearching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : results.length === 0 && query ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleResultClick(result)}
                    className="flex items-center gap-2 p-3"
                  >
                    {getIcon(result.type)}
                    <div className="flex-1">
                      <div className="font-medium">{result.title}</div>
                      {result.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {result.description}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {result.type}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
