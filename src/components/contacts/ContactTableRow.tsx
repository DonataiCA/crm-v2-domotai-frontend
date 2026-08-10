import { useNavigate } from "react-router-dom";
import type { Contact } from "@/types/api";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ContactTableRowProps {
  contact: Contact;
  onSelect: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export const ContactTableRow = ({ contact, onSelect, onDelete }: ContactTableRowProps) => {
  const assignedUser = contact.assignedTo;
  const navigate = useNavigate();

  return (
    <TableRow>
      <TableCell
        className="font-medium cursor-pointer hover:text-primary"
        onClick={() => navigate(`/contacts/${contact.id}`)}
      >
        {contact.name}
      </TableCell>
      <TableCell
        className="cursor-pointer"
        onClick={() => navigate(`/contacts/${contact.id}`)}
      >
        {contact.company}
      </TableCell>
      <TableCell
        className="cursor-pointer"
        onClick={() => navigate(`/contacts/${contact.id}`)}
      >
        {contact.email}
      </TableCell>
      <TableCell
        className="cursor-pointer"
        onClick={() => navigate(`/contacts/${contact.id}`)}
      >
        {contact.phone}
      </TableCell>
      <TableCell
        className="cursor-pointer"
        onClick={() => navigate(`/contacts/${contact.id}`)}
      >
        {contact.city}, {contact.country}
      </TableCell>
      <TableCell
        className="cursor-pointer"
        onClick={() => navigate(`/contacts/${contact.id}`)}
      >
        <Badge variant={
          contact.category === "active" ? "default" :
          contact.category === "prospect" ? "secondary" : "outline"
        }>
          {contact.category}
        </Badge>
      </TableCell>
      <TableCell
        className="cursor-pointer"
        onClick={() => navigate(`/contacts/${contact.id}`)}
      >
        {assignedUser?.fullName || "Unassigned"}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(contact);
          }}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};