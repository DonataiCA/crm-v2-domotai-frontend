
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ContactDetailsView } from "./ContactDetailsView";
import type { Contact } from "@/types/api";

interface ContactDetailsDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContactDetailsDialog = ({ contact, open, onOpenChange }: ContactDetailsDialogProps) => {
  const navigate = useNavigate();

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Contact Details</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                navigate(`/contacts/${contact.id}`);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Details
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <ContactDetailsView contact={contact} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
