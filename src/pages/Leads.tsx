
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LeadBoard } from "@/components/leads/LeadBoard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeadForm } from "@/components/leads/LeadForm";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Plus, Download, Settings2 } from "lucide-react";
import { exportService } from "@/services/export.service";
import { pipelineService } from "@/services/pipeline.service";
import { PipelineManagerDialog } from "@/components/leads/PipelineManagerDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Leads = () => {
  const { toast } = useToast();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: pipelineService.getAll,
    enabled: !!currentOrganization,
  });

  // Pick the active pipeline — selected or default
  const activePipeline = pipelines.find(p => p.id === selectedPipelineId)
    ?? pipelines.find(p => p.isDefault)
    ?? pipelines[0];

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {/* Header row */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-bold">Lead Pipeline</h1>
          {currentOrganization && (
            <p className="text-muted-foreground mt-1">{currentOrganization.name}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setManagerOpen(true)}
            title="Manage Pipelines"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Manage
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await exportService.exportLeadsCSV();
              } catch {
                toast({ title: "Export failed", description: "Could not export leads.", variant: "destructive" });
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <LeadForm
                defaultPipelineId={activePipeline?.id}
                onSuccess={() => {
                  toast({ title: "Success", description: "Lead created successfully" });
                  setRefreshKey(prev => prev + 1);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pipeline tabs */}
      {pipelines.length > 0 && (
        <Tabs
          value={activePipeline?.id ?? ''}
          onValueChange={setSelectedPipelineId}
          className="mb-4"
        >
          <TabsList className="h-9 overflow-x-auto">
            {pipelines.map(p => (
              <TabsTrigger key={p.id} value={p.id} className="text-sm">
                {p.name}
                {p.isDefault && (
                  <span className="ml-1.5 text-[10px] opacity-60 font-normal">(default)</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {activePipeline ? (
        <LeadBoard key={`${activePipeline.id}-${refreshKey}`} pipeline={activePipeline} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <p>No pipelines found. Create your first pipeline to get started.</p>
          <Button onClick={() => setManagerOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Pipeline
          </Button>
        </div>
      )}

      <PipelineManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
};

export default Leads;
