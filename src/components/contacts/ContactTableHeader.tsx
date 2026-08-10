import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const ContactTableHeader = () => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Company</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Phone</TableHead>
        <TableHead>Location</TableHead>
        <TableHead>Category</TableHead>
        <TableHead>Assigned To</TableHead>
        <TableHead className="w-[50px]"></TableHead>
      </TableRow>
    </TableHeader>
  );
};