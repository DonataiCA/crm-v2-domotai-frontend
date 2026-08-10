import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useOrganization } from "@/contexts/OrganizationContext";

interface SalesOverviewChartProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  groupBy: "day" | "week" | "month";
  userRole?: string;
}

export const SalesOverviewChart = ({ dateRange, groupBy, userRole }: SalesOverviewChartProps) => {
  const { currentOrganization } = useOrganization();

  const { data: salesData } = useQuery({
    queryKey: ["sales-overview", dateRange, groupBy, currentOrganization?.id, userRole],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");

      return await analyticsService.getSalesOverview(
        {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        groupBy
      );
    },
    enabled: !!currentOrganization,
  });

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8884d8"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
