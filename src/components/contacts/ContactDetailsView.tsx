import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import type { Contact } from "@/types/api";

interface ContactDetailsViewProps {
  contact: Contact;
}

export const ContactDetailsView = ({ contact }: ContactDetailsViewProps) => {
  const { session } = useAuth();

  if (!session) return null;

  const assignedUser = contact.assignedTo;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Name</label>
          <p className="mt-1">{contact.name}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <p className="mt-1">{contact.email}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Phone</label>
          <p className="mt-1">{contact.phone}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Company</label>
          <p className="mt-1">{contact.company}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Role</label>
          <p className="mt-1">{contact.role}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Location</label>
          <p className="mt-1">{contact.city}, {contact.country}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Website</label>
          <p className="mt-1">{contact.website}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Lead Source</label>
          <p className="mt-1">{contact.leadSource}</p>
        </div>
        <div>
          <label className="text-sm font-medium">Category</label>
          <p className="mt-1">
            <Badge variant={
              contact.category === "active" ? "default" :
              contact.category === "prospect" ? "secondary" : "outline"
            }>
              {contact.category}
            </Badge>
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Assigned To</label>
          <p className="mt-1">
            {assignedUser ? (assignedUser.fullName || assignedUser.email) : 'Unassigned'}
          </p>
        </div>
      </div>
    </div>
  );
};