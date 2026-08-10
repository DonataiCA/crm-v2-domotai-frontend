
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LeadDetailsView } from "./details/LeadDetailsView";
import { LeadDetailsHeader } from "./details/LeadDetailsHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { Lead } from "@/types/api";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export const LeadDetailsDialog = ({
  lead,
  open,
  onOpenChange,
}: LeadDetailsDialogProps) => {
  const navigate = useNavigate();

  if (!lead) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <LeadDetailsHeader
            title="No lead selected"
            isEditing={false}
            onEdit={() => {}}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh]">
        <div className="flex items-center justify-between">
          <LeadDetailsHeader
            title={lead.name}
            isEditing={false}
            onEdit={() => {}}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate(`/leads/${lead.id}`);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </div>

        <ScrollArea className="h-[calc(80vh-6rem)] pr-4">
          <LeadDetailsView lead={lead} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
