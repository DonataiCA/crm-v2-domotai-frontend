import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { User2, Mail, Phone, Trash2 } from "lucide-react";
import { useState } from "react";
import { UserEditForm } from "./UserEditForm";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { getUserRoleBgColor, getUserRoleLabel } from '@/constants';

interface UserCardProps {
  user: {
    id: string;
    email?: string | null;
    full_name?: string | null;
    fullName?: string | null;
    role: string;
    created_at?: string | null;
    createdAt?: string | null;
    phone?: string | null;
  };
}

export function UserCard({ user }: UserCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: deleteUser } = useMutation({
    mutationFn: async () => {
      await api.delete('/users/' + user.id);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  return (
    <>
      <div
        className="p-4 hover:bg-accent/50 flex items-center justify-between"
      >
        <div
          className="space-y-1 cursor-pointer flex-grow"
          onClick={() => setIsEditing(true)}
        >
          <div className="flex items-center gap-2">
            <User2 className="h-4 w-4" />
            <div className="font-medium">{user.fullName || user.full_name || 'Unnamed User'}</div>
            <Badge
              variant="secondary"
              className={`text-xs ${getUserRoleBgColor(user.role)} text-white`}
            >
              {getUserRoleLabel(user.role)}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {user.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {user.phone}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <UserEditForm
        user={user}
        open={isEditing}
        onOpenChange={setIsEditing}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={() => deleteUser()}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
      />
    </>
  );
}
