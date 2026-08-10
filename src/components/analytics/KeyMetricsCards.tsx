
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Target, BarChart } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

interface KeyMetricsCardsProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  userRole?: string;
}

export const KeyMetricsCards = ({ dateRange, userRole }: KeyMetricsCardsProps) => {
  const { currentOrganization } = useOrganization();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics", dateRange, userRole, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");

      return await analyticsService.getKeyMetrics({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });
    },
    enabled: !!currentOrganization,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}><CardContent className="pt-6"><div className="h-8 animate-pulse bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.customersCount ?? 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${(metrics?.totalRevenue ?? 0).toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.activeDealsCount ?? 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(metrics?.winRate ?? 0).toFixed(1)}%</div>
        </CardContent>
      </Card>
    </div>
  );
};
