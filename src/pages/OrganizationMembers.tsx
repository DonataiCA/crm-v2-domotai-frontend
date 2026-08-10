
import { OrganizationMemberList } from "@/components/organizations/OrganizationMemberList";
import { UserList } from "@/components/users/UserList";
import { UserForm } from "@/components/users/UserForm";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserCog, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const OrganizationMembers = () => {
  const { session, isLoading, userRole } = useAuth();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [showCreateUser, setShowCreateUser] = useState(false);

  const isTeam = ['admin', 'salesman', 'freelancer'].includes(userRole?.toLowerCase() || '');

  useEffect(() => {
    if (!isLoading && !session) {
      navigate("/auth");
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <UserCog className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage team members and system users
            </p>
          </div>
        </div>
        {isTeam && (
          <Button onClick={() => setShowCreateUser(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add User
          </Button>
        )}
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="all-users">All Users</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="bg-card rounded-lg border">
            <OrganizationMemberList />
          </div>
        </TabsContent>

        <TabsContent value="all-users">
          <div className="bg-card rounded-lg border">
            <UserList />
          </div>
        </TabsContent>
      </Tabs>

      <UserForm open={showCreateUser} onOpenChange={setShowCreateUser} />
    </>
  );
};

export default OrganizationMembers;
