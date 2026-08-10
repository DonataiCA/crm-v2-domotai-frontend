
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organization.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Mail, MoreHorizontal, Pencil, User, ChevronLeft, ChevronRight } from "lucide-react";
import { getUserRoleBgColor, getUserRoleLabel } from '@/constants';
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserEditForm } from "@/components/users/UserEditForm";
import { useState } from "react";

type Member = {
  id: string;
  user_id: string;
  auth_user_id: string | null;
  organization_id: string;
  role: string;
  created_at: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
};

const ITEMS_PER_PAGE = 10;

export function OrganizationMemberList() {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [page, setPage] = useState(1);

  const { data: members, isLoading, refetch } = useQuery({
    queryKey: ["organization-members", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];

      const data = await organizationService.getMembers(currentOrganization.id);
      return data.map((m: any) => ({
        id: m.id,
        user_id: m.userId || m.user_id,
        auth_user_id: m.user?.userId || null,
        organization_id: m.organizationId || m.organization_id,
        role: m.user?.role || m.role,
        created_at: m.createdAt || m.created_at,
        email: m.user?.email || m.email || null,
        full_name: m.user?.fullName || m.full_name || null,
        phone: m.user?.phone || m.phone || null,
      })) as Member[];
    },
    enabled: !!currentOrganization,
  });

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!currentOrganization) return;
    try {
      const member = members?.find((m) => m.id === memberId);
      if (!member) throw new Error("Member not found");
      await organizationService.updateMemberRole(currentOrganization.id, member.user_id, newRole);
      await refetch();
      toast({ title: "Role Updated", description: "Member role has been updated successfully" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to update role", description: error instanceof Error ? error.message : "An error occurred" });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !currentOrganization) return;
    try {
      await organizationService.removeMember(currentOrganization.id, memberToRemove.user_id);
      await refetch();
      setMemberToRemove(null);
      toast({ title: "Member Removed", description: "The member has been removed from the organization" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to remove member", description: error instanceof Error ? error.message : "An error occurred" });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading members...</p>
    </div>;
  }

  if (!members?.length) {
    return <div className="text-center p-8">
      <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
      <p className="text-lg font-medium">No members found</p>
      <p className="text-muted-foreground">Your organization doesn't have any members yet.</p>
    </div>;
  }

  const totalPages = Math.ceil(members.length / ITEMS_PER_PAGE);
  const paginatedMembers = members.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  {member.full_name || "Unnamed User"}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center text-muted-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  {member.email || "-"}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getUserRoleBgColor(member.role)} text-white`}
                >
                  {getUserRoleLabel(member.role)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setMemberToEdit(member)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit User
                    </DropdownMenuItem>
                    {member.role !== 'admin' && (
                      <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'admin')}>
                        Make Admin
                      </DropdownMenuItem>
                    )}
                    {member.role === 'admin' && (
                      <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'member')}>
                        Remove Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setMemberToRemove(member)}
                    >
                      Remove Member
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, members.length)} of {members.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i + 1}
                variant={page === i + 1 ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}
        title="Remove Member"
        description={`Are you sure you want to remove ${memberToRemove?.email || 'this member'} from the organization?`}
        onConfirm={handleRemoveMember}
      />

      {memberToEdit && (
        <UserEditForm
          user={{
            id: memberToEdit.auth_user_id || memberToEdit.user_id,
            email: memberToEdit.email,
            fullName: memberToEdit.full_name,
            role: memberToEdit.role,
            phone: memberToEdit.phone,
          }}
          open={!!memberToEdit}
          onOpenChange={(open) => { if (!open) { setMemberToEdit(null); refetch(); } }}
        />
      )}
    </>
  );
}
