
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganization } from "@/contexts/OrganizationContext";

interface RevenueByClientChartProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export const RevenueByClientChart = ({ dateRange }: RevenueByClientChartProps) => {
  const { currentOrganization } = useOrganization();

  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["revenue-by-client", dateRange, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");

      return await analyticsService.getRevenueByClient({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });
    },
    enabled: !!currentOrganization,
  });

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Top 10 Clients by Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_revenue" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
