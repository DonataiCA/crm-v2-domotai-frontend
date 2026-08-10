import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { CompanyList } from "@/components/companies/CompanyList";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";

const Companies = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { currentOrganization } = useOrganization();

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          {currentOrganization && (
            <p className="text-muted-foreground mt-1">{currentOrganization.name}</p>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>New Company</DialogTitle>
              <DialogDescription>
                Add a new company to your organization. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <CompanyForm
              onSuccess={() => {
                setOpen(false);
                toast({
                  title: "Company created",
                  description: "The company has been added successfully.",
                });
              }}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {!currentOrganization ? (
        <Alert className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select an organization to view and manage companies.
          </AlertDescription>
        </Alert>
      ) : (
        <CompanyList />
      )}
    </>
  );
};

export default Companies;
