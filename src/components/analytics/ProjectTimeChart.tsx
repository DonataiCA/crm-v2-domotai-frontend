
import { useQuery } from "@tanstack/react-query";
import { projectService } from "@/services/project.service";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Project } from "@/types/api";

export const ProjectTimeChart = () => {
  const { currentOrganization } = useOrganization();

  const { data: timeData, isLoading } = useQuery({
    queryKey: ["project-time", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");

      const response = await projectService.getProjects(1, 10);
      // Map to chart format, using totalHours
      return (response.data || [])
        .filter((p: Project) => p.totalHours)
        .sort((a: Project, b: Project) => (b.totalHours || 0) - (a.totalHours || 0))
        .slice(0, 10)
        .map((p: Project) => ({
          name: p.name,
          total_hours: p.totalHours || 0
        }));
    },
    enabled: !!currentOrganization,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Project Time Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_hours" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
