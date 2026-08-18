import { useState } from "react";
import { isProjectInProgress, getProjectStatusLabel } from "@/constants";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, FolderOpen, Calendar, Loader2, ArrowLeft } from "lucide-react";
import axios from "axios";
import { format } from "date-fns";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface ClientProject {
  shareToken: string;
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  projectStatus: string | null;
  startDate: string | null;
  endDate: string | null;
  organization: { name: string; logoUrl: string | null; colorScheme: string | null };
  permissions: string[];
  sharedAt: string;
}

interface ClientData {
  clientEmail: string;
  clientName: string | null;
  projects: ClientProject[];
}

const ClientLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [clientData, setClientData] = useState<ClientData | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const { data } = await axios.post(`${API}/portal/client-login`, { email: email.trim() });
      setClientData(data);
    } catch (error: any) {
      const message = error.response?.data?.error || "No projects found for this email.";
      toast({
        title: "Access denied",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectClick = (shareToken: string) => {
    navigate(`/portal/${shareToken}`);
  };

  // Step 1: Email input
  if (!clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Client Portal</h1>
            <p className="text-muted-foreground mt-2">
              Enter your email to access your projects
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || !email.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? "Searching..." : "Access My Projects"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Button variant="link" onClick={() => navigate("/auth")} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Team member? Login here
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Project list
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 mt-8">
          <div>
            <h1 className="text-2xl font-bold">
              {clientData.clientName
                ? `Welcome, ${clientData.clientName}`
                : "Your Projects"}
            </h1>
            <p className="text-muted-foreground">{clientData.clientEmail}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setClientData(null);
              setEmail("");
            }}
          >
            Switch Account
          </Button>
        </div>

        {/* Projects */}
        <div className="space-y-4">
          {clientData.projects.map((project) => (
            <Card
              key={project.shareToken}
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
              onClick={() => handleProjectClick(project.shareToken)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-medium">
                        {project.organization.name}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{project.projectName}</CardTitle>
                    {project.projectDescription && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {project.projectDescription}
                      </CardDescription>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant={isProjectInProgress(project.projectStatus) ? "default" : "secondary"}>
                    {getProjectStatusLabel(project.projectStatus) || "Active"}
                  </Badge>
                  {project.startDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(project.startDate), "MMM d, yyyy")}
                      {project.endDate && ` - ${format(new Date(project.endDate), "MMM d, yyyy")}`}
                    </span>
                  )}
                  <div className="flex gap-1 ml-auto">
                    {project.permissions.includes("comment") && (
                      <Badge variant="outline" className="text-xs">Can Comment</Badge>
                    )}
                    {project.permissions.includes("create_task") && (
                      <Badge variant="outline" className="text-xs">Can Create Tasks</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
