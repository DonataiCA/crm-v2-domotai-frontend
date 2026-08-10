
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { contactService } from "@/services/contact.service";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { BasicInfoFields } from "./form/BasicInfoFields";
import { CompanyFields } from "./form/CompanyFields";
import { LocationFields } from "./form/LocationFields";
import { AdditionalFields } from "./form/AdditionalFields";
import { CategoryField } from "./form/CategoryField";
import { UserSelector } from "@/components/common/UserSelector";
import { contactFormSchema, type ContactFormValues } from "./form/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";

interface ContactFormProps {
  onSuccess?: () => void;
  initialData?: ContactFormValues;
  onCancel?: () => void;
}

export const ContactForm = ({ onSuccess, initialData, onCancel }: ContactFormProps) => {
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; fileName: string; size?: number; mimeType?: string }[]>([]);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: initialData || {
      name: "",
      email: "",
      phone: "",
      company: "",
      country: "",
      city: "",
      role: "",
      website: "",
      lead_source: "",
      category: "prospect",
      assigned_to: "",
    },
  });

  const handleSubmit = async (values: ContactFormValues, createAnother: boolean = false) => {
    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to perform this action",
        variant: "destructive",
      });
      return;
    }

    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    if (!values.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Map form field names (snake_case) to API field names (camelCase)
      const contactPayload = {
        name: values.name.trim(),
        email: values.email || null,
        phone: values.phone || null,
        company: values.company || null,
        country: values.country || null,
        city: values.city || null,
        role: values.role || null,
        website: values.website || null,
        leadSource: values.lead_source || null,
        category: values.category,
        assignedTo: values.assigned_to || null,
      };

      if (initialData?.id) {
        await contactService.updateContact(initialData.id, contactPayload);
      } else {
        await contactService.createContact(contactPayload);
      }

      // Invalidate queries to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });

      form.reset();

      if (!createAnother) {
        onSuccess?.();
      }

      toast({
        title: "Success",
        description: `Contact ${initialData ? 'updated' : 'added'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to save contact",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If no session, show a message
  if (!session) {
    return <div>Please log in to manage contacts.</div>;
  }

  // If no organization, show a message
  if (!currentOrganization) {
    return <div>Please select an organization to manage contacts.</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => handleSubmit(values, false))} className="space-y-4">
        <BasicInfoFields form={form} />
        <CompanyFields form={form} />
        <LocationFields form={form} />
        <AdditionalFields form={form} />
        <CategoryField form={form} />
        <UserSelector form={form} />
        <FileUpload
          value={attachments}
          onChange={setAttachments}
          maxFiles={5}
          label="Attachments"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        />
        <div className="flex gap-2 justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Contact' : 'Create Contact'}
            </Button>
            {!initialData && (
              <Button 
                type="button" 
                disabled={isSubmitting}
                onClick={() => form.handleSubmit((values) => handleSubmit(values, true))()}
              >
                {isSubmitting ? 'Saving...' : 'Save & Create Another'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
};
