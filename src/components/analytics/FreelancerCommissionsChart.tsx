
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useOrganization } from "@/contexts/OrganizationContext";

interface FreelancerCommissionsChartProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  groupBy: "day" | "week" | "month";
  userRole?: string;
}

export const FreelancerCommissionsChart = ({ dateRange, groupBy, userRole }: FreelancerCommissionsChartProps) => {
  const { currentOrganization } = useOrganization();

  const { data: commissionsData } = useQuery({
    queryKey: ["freelancer-commissions", dateRange, groupBy, userRole, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");

      return await analyticsService.getFreelancerCommissions(
        {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        groupBy
      );
    },
    enabled: !!currentOrganization,
  });

  const totalUnpaidCommissions = commissionsData?.reduce(
    (sum, data) => sum + data.commissions,
    0
  ) || 0;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Freelancer Commissions Overview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total Unpaid Commissions: ${totalUnpaidCommissions.toLocaleString()}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={commissionsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Commissions"]}
              />
              <Area
                type="monotone"
                dataKey="commissions"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
