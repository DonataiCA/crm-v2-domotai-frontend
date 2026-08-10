
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { leadService } from "@/services/lead.service";
import { Lead } from "@/types/api";

interface LeadToProjectDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const LeadToProjectDialog = ({
  lead,
  open,
  onOpenChange,
  onSuccess
}: LeadToProjectDialogProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();

  // Called by ProjectForm after the project is created — receives the new project's ID
  const handleProjectCreated = async (projectId?: string) => {
    if (!currentOrganization?.id || !lead || !projectId) {
      toast({
        title: "Error",
        description: "Missing data for conversion",
        variant: "destructive",
      });
      return;
    }

    try {
      // Single atomic endpoint: marks lead as converted + links project + logs event
      await leadService.convertLead(lead.id, projectId);

      toast({
        title: "Success",
        description: "Lead converted to project successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Project was created but failed to mark lead as converted. Please update the lead manually.",
        variant: "destructive",
      });
    }
  };

  const initialData = {
    name: lead?.name,
    contact_ids: lead?.contactId ? [lead.contactId] : [],
    pricing_type: (lead?.pricingType === 'recurring' ? 'recurring' : 'flat') as const,
    price: lead?.price || 0,
    payment_date: lead?.paymentDate || '',
    recurring_start_date: lead?.recurringStartDate || '',
    recurring_end_date: lead?.recurringEndDate || '',
    status: "Not Started" as const,
    organization_id: lead?.organizationId || currentOrganization?.id
  };

  if (!currentOrganization) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Lead to Project</DialogTitle>
        </DialogHeader>
        <ProjectForm
          initialData={initialData}
          onSuccess={handleProjectCreated}
        />
      </DialogContent>
    </Dialog>
  );
};
