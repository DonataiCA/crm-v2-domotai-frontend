
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";

interface LeadConversionChartProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  userRole?: string;
}

export const LeadConversionChart = ({ dateRange, userRole }: LeadConversionChartProps) => {
  const { currentOrganization } = useOrganization();

  const { data: conversionData, isLoading } = useQuery({
    queryKey: ["lead-conversion", dateRange, userRole, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");

      return await analyticsService.getLeadConversion({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });
    },
    enabled: !!currentOrganization,
  });

  const COLORS = ["#0088FE", "#00C49F"];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Conversion Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={conversionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {conversionData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
