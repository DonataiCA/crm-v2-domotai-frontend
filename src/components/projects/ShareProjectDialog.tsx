import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { portalService, type ShareLink } from "@/services/portal.service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Loader2,
  Trash2,
  Mail,
  CheckCircle2,
  Shield,
} from "lucide-react";

interface ShareProjectDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERMISSION_OPTIONS = [
  { value: "view", label: "View", description: "See project progress" },
  { value: "comment", label: "Comment", description: "Comment on tasks" },
  { value: "create_task", label: "Create Tasks", description: "Add new tasks" },
];

export const ShareProjectDialog = ({ projectId, open, onOpenChange }: ShareProjectDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["view", "comment"]);
  const [invited, setInvited] = useState(false);

  const { data: existingInvites = [] } = useQuery<ShareLink[]>({
    queryKey: ["project-shares", projectId],
    queryFn: () => portalService.getShareLinks(projectId),
    enabled: open && !!projectId,
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      portalService.createShareLink(projectId, {
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        permissions,
      }),
    onSuccess: () => {
      setInvited(true);
      queryClient.invalidateQueries({ queryKey: ["project-shares", projectId] });
      toast({ title: "Invitation sent!", description: `An email has been sent to ${clientEmail}` });
    },
    onError: () => {
      toast({ title: "Failed to send invitation", variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (shareId: string) => portalService.revokeShareLink(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-shares", projectId] });
      toast({ title: "Access revoked" });
    },
  });

  const togglePermission = (perm: string) => {
    if (perm === "view") return; // view is always required
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleInvite = () => {
    if (!clientEmail.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    inviteMutation.mutate();
  };

  const resetForm = () => {
    setClientName("");
    setClientEmail("");
    setPermissions(["view", "comment"]);
    setInvited(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Client
          </DialogTitle>
          <DialogDescription>
            Invite a client to view and collaborate on this project.
            They will receive an email with login credentials.
          </DialogDescription>
        </DialogHeader>

        {/* Invite Form */}
        {!invited ? (
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                placeholder="John Doe"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email <span className="text-destructive">*</span></Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="client@company.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Permissions
              </Label>
              <div className="space-y-2">
                {PERMISSION_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-start gap-3 p-2.5 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={permissions.includes(opt.value)}
                      onCheckedChange={() => togglePermission(opt.value)}
                      disabled={opt.value === "view"}
                    />
                    <div>
                      <p className="text-sm font-medium leading-none">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending || !clientEmail.trim()}
              className="w-full"
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {inviteMutation.isPending ? "Sending invitation..." : "Send Invitation"}
            </Button>
          </div>
        ) : (
          /* Success State */
          <div className="text-center py-6 space-y-4">
            <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-lg">Invitation Sent!</p>
              <p className="text-sm text-muted-foreground mt-1">
                An email with login credentials has been sent to <strong>{clientEmail}</strong>
              </p>
            </div>
            <Button variant="outline" onClick={resetForm}>
              Invite Another Client
            </Button>
          </div>
        )}

        {/* Existing Invites */}
        {existingInvites.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">
              Active Invitations ({existingInvites.length})
            </h4>
            <div className="space-y-2">
              {existingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {invite.clientName || invite.clientEmail || "Anonymous"}
                    </p>
                    {invite.clientEmail && invite.clientName && (
                      <p className="text-xs text-muted-foreground">{invite.clientEmail}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(Array.isArray(invite.permissions)
                        ? invite.permissions
                        : String(invite.permissions || "").split(",")
                      ).map((p) => (
                        <Badge key={p} variant="secondary" className="text-[10px]">
                          {p.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => revokeMutation.mutate(invite.id)}
                    disabled={revokeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
