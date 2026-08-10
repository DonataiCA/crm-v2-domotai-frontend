import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LeadDetailsHeaderProps {
  title: string;
  isEditing?: boolean;
  onEdit?: () => void;
}

export const LeadDetailsHeader = ({
  title,
}: LeadDetailsHeaderProps) => {
  return (
    <DialogHeader className="flex-shrink-0">
      <DialogTitle>{title}</DialogTitle>
    </DialogHeader>
  );
};
