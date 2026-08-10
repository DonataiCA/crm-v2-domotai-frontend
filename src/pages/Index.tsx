import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyMetricsCards } from "@/components/analytics/KeyMetricsCards";
import { SalesOverviewChart } from "@/components/analytics/SalesOverviewChart";
import { FreelancerCommissionsChart } from "@/components/analytics/FreelancerCommissionsChart";
import { LeadConversionChart } from "@/components/analytics/LeadConversionChart";
import { RevenueByClientChart } from "@/components/analytics/RevenueByClientChart";
import { AnalyticsFilters, type AnalyticsFilters as FilterType } from "@/components/analytics/AnalyticsFilters";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { session, userRole } = useAuth();
  const [filters, setFilters] = useState<FilterType>({
    dateRange: {
      from: new Date(new Date().setMonth(new Date().getMonth() - 11)),
      to: new Date(),
    },
    groupBy: "month",
  });

  useEffect(() => {
    if (!session) {
      navigate("/auth");
    }
  }, [session, navigate]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Main Dashboard</h1>
        <p className="text-muted-foreground">
          {userRole === 'freelancer'
            ? 'Track your assigned leads and performance'
            : 'Track your business performance'
          }
        </p>
      </div>

      <AnalyticsFilters onFiltersChange={setFilters} />

      <div className="space-y-6">
        <KeyMetricsCards
          dateRange={filters.dateRange}
          userRole={userRole}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SalesOverviewChart
            dateRange={filters.dateRange}
            groupBy={filters.groupBy}
            userRole={userRole}
          />
          <RevenueByClientChart
            dateRange={filters.dateRange}
          />
          <FreelancerCommissionsChart
            dateRange={filters.dateRange}
            groupBy={filters.groupBy}
            userRole={userRole}
          />
          <LeadConversionChart
            dateRange={filters.dateRange}
            userRole={userRole}
          />
        </div>
      </div>
    </>
  );
};

export default Index;
