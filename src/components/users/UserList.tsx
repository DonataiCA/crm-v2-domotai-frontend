
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organization.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { UserCard } from "./UserCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 10;

export function UserList() {
  const { currentOrganization } = useOrganization();
  const [page, setPage] = useState(1);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const members = await organizationService.getMembers(currentOrganization.id);
      return members;
    },
    enabled: !!currentOrganization,
  });

  if (isLoading) {
    return <div className="p-4 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading system users...</p>
    </div>;
  }

  if (!users?.length) {
    return <div className="text-center p-8">
      <p className="text-lg font-medium">No users found</p>
      <p className="text-muted-foreground">There are no users in the system yet.</p>
    </div>;
  }

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const paginatedUsers = users.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      <div className="divide-y">
        {paginatedUsers.map((member: any) => (
          <UserCard
            key={member.userId || member.id}
            user={{
              id: member.userId || member.id,
              email: member.user?.email || member.email,
              fullName: member.user?.fullName || member.fullName,
              role: member.user?.role || member.role,
              phone: member.user?.phone || member.phone,
            }}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, users.length)} of {users.length}
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
    </div>
  );
}
