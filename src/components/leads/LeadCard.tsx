import { format, formatDistanceToNow } from "date-fns";
import { DollarSign, Trash2, Clock, AlertCircle, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { leadService } from "@/services/lead.service";
import { Lead } from "@/types/api";

interface LeadCardProps {
  lead: Lead;
  refetch?: () => void;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function isFollowUpOverdue(lead: Lead): boolean {
  if (!lead.nextFollowUp) return false;
  return new Date(lead.nextFollowUp) < new Date();
}

export const LeadCard = ({ lead, refetch }: LeadCardProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      // Archive instead of hard delete to preserve history
      await leadService.archiveLead(lead.id);
      toast({ title: "Lead archivado", description: "Puede restaurarlo desde la sección de archivados." });
      refetch?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo archivar el lead",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const overdue = isFollowUpOverdue(lead);
  const contactName = lead.contact?.name || lead.name || 'Unnamed';
  const assigneeName = lead.assignee?.fullName || lead.assignee?.email;
  const timeAgo = formatDistanceToNow(new Date(lead.createdAt), { addSuffix: false });

  return (
    <>
      <div
        className={`group bg-card rounded-lg border shadow-sm p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/30 ${
          overdue ? 'border-l-[3px] border-l-amber-500' : ''
        }`}
        onClick={() => navigate(`/leads/${lead.id}`)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Row 1: Name + Delete */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm leading-tight line-clamp-1 flex items-center gap-1 group-hover:underline">
            {lead.name || 'Unnamed Lead'}
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
          </h4>
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 shrink-0 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            disabled={isDeleting}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>

        {/* Row 2: Contact */}
        {lead.contact && (
          <div className="flex items-center gap-2 mt-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
              {getInitials(lead.contact.name)}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {lead.contact.name}
              {lead.contact.company && <span className="text-muted-foreground/60"> &middot; {lead.contact.company}</span>}
            </span>
          </div>
        )}

        {/* Row 2b: Company (from companyId relation) */}
        {lead.company && (
          <div className="flex items-center gap-1.5 mt-1">
            <Building2 className="h-3 w-3 text-muted-foreground/60 shrink-0" />
            <span className="text-xs text-muted-foreground/80 truncate">{lead.company.name}</span>
          </div>
        )}

        {/* Row 3: Value + Assignee + Time */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          <div className="flex items-center gap-2">
            {(lead.price ?? 0) > 0 && (
              <Badge variant="secondary" className="text-emerald-700 bg-emerald-50 gap-0.5 px-1.5 py-0.5">
                <DollarSign className="h-3 w-3" />
                {lead.price!.toLocaleString()}
              </Badge>
            )}
            {overdue && (
              <Badge variant="secondary" className="text-amber-700 bg-amber-50 gap-0.5 px-1.5 py-0.5" title="Follow-up overdue">
                <AlertCircle className="h-3 w-3" />
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {assigneeName && (
              <div
                className="h-5 w-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-medium shrink-0"
                title={assigneeName}
              >
                {getInitials(assigneeName)}
              </div>
            )}
            <span className="text-xs text-muted-foreground/60 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo}
            </span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={handleDelete}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
      />
    </>
  );
};
