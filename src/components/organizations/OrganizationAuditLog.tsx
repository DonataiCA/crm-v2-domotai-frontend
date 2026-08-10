
import { useState, useEffect } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type AuditLogEntry = {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
  user?: {
    email: string;
    full_name: string;
  };
};

export function OrganizationAuditLog() {
  const { currentOrganization } = useOrganization();
  const [logEntries, setLogEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAuditLog = async () => {
      if (!currentOrganization) return;

      setIsLoading(true);

      try {
        // For demonstration, we'll simulate audit log entries
        // In a real implementation, this would fetch from an actual audit_logs endpoint
        const mockAuditLog = [
          {
            id: "1",
            organization_id: currentOrganization.id,
            user_id: "user1",
            action: "member_invited",
            details: { email: "newuser@example.com", role: "member" },
            created_at: new Date().toISOString(),
            user: {
              email: "admin@example.com",
              full_name: "Admin User"
            }
          },
          {
            id: "2",
            organization_id: currentOrganization.id,
            user_id: "user1",
            action: "settings_updated",
            details: { field: "color_scheme", from: "default", to: "blue" },
            created_at: new Date(Date.now() - 3600000).toISOString(),
            user: {
              email: "admin@example.com",
              full_name: "Admin User"
            }
          },
          {
            id: "3",
            organization_id: currentOrganization.id,
            user_id: "user2",
            action: "member_role_changed",
            details: { user: "user3@example.com", from: "member", to: "admin" },
            created_at: new Date(Date.now() - 86400000).toISOString(),
            user: {
              email: "manager@example.com",
              full_name: "Manager User"
            }
          }
        ];

        setLogEntries(mockAuditLog);
      } catch {
        // Silently handle errors for mock data
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLog();
  }, [currentOrganization]);

  const getActionDescription = (entry: AuditLogEntry) => {
    switch (entry.action) {
      case "member_invited":
        return `Invited ${entry.details.email} as ${entry.details.role}`;
      case "settings_updated":
        return `Updated ${entry.details.field} from ${entry.details.from} to ${entry.details.to}`;
      case "member_role_changed":
        return `Changed ${entry.details.user}'s role from ${entry.details.from} to ${entry.details.to}`;
      default:
        return entry.action;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "member_invited":
        return <User className="h-4 w-4 text-blue-500" />;
      case "settings_updated":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "member_role_changed":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return <div>Loading audit log...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
        <CardDescription>
          Recent activity in your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No activity recorded yet</p>
          ) : (
            logEntries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                <div className="mt-1">{getActionIcon(entry.action)}</div>
                <div className="flex-1">
                  <p className="font-medium">{getActionDescription(entry)}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>By {entry.user?.full_name || "Unknown user"}</span>
                    <span>•</span>
                    <time dateTime={entry.created_at}>
                      {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </time>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
