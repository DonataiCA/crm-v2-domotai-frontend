
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ContactList } from "@/components/contacts/ContactList";
import { ContactForm } from "@/components/contacts/ContactForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Download } from "lucide-react";
import { exportService } from "@/services/export.service";

const Contacts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { session, isLoading: authLoading } = useAuth();
  const { currentOrganization, isLoading: orgLoading, organizations } = useOrganization();

  useEffect(() => {
    if (!authLoading && !session) {
      navigate("/auth");
    }
  }, [session, authLoading, navigate]);

  const isLoading = authLoading || orgLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in useEffect
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          {currentOrganization && (
            <p className="text-muted-foreground mt-1">
              {currentOrganization.name} (ID: {currentOrganization.id})
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await exportService.exportContactsCSV();
              } catch {
                toast({ title: "Export failed", description: "Could not export contacts.", variant: "destructive" });
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
              <DialogDescription>
                Add a new contact to your organization. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <ContactForm onSuccess={() => {
              setOpen(false);
              toast({
                title: "Contact added successfully",
                description: "The contact has been added to your list."
              });
            }} />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {!currentOrganization ? (
        <Alert className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select an organization to view and manage contacts.
          </AlertDescription>
        </Alert>
      ) : (
        <ContactList />
      )}
    </>
  );
};

export default Contacts;
