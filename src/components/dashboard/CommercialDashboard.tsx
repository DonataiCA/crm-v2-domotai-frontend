import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardService, type CommercialData } from "@/services/dashboard.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useOrganization } from "@/contexts/OrganizationContext";
import { TrendingUp, DollarSign, CheckCircle2, Percent, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const BRAND_BLUE = "#4A89B9";
const BRAND_ORANGE = "#FF5F00";

const FALLBACK_COLORS = [
  BRAND_BLUE,
  BRAND_ORANGE,
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function CommercialDashboard() {
  const { currentOrganization } = useOrganization();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { data, isLoading, error } = useQuery<CommercialData>({
    queryKey: ["dashboard-commercial", selectedPipelineId, currentOrganization?.id, dateFrom, dateTo],
    queryFn: () => dashboardService.getCommercial(selectedPipelineId || undefined, dateFrom || undefined, dateTo || undefined),
    enabled: !!currentOrganization,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-destructive">
        Failed to load commercial data.
      </div>
    );
  }

  const totals = data?.totals ?? {
    totalLeads: 0,
    closedWon: 0,
    totalRevenue: 0,
    closeRate: 0,
    totalAmount: 0,
    closedWonAmount: 0,
    weightedProjection: 0,
  };
  const stageStats = data?.stageStats ?? [];
  const pipelines = data?.pipelines ?? [];

  const chartData = stageStats.map((s, idx) => ({
    name: s.stageName,
    leads: s.leadCount,
    amount: s.totalAmount,
    color: s.stageColor || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
  }));

  const kpiCards = [
    {
      label: "Total Leads",
      value: totals.totalLeads,
      icon: TrendingUp,
      format: (v: number) => v.toString(),
      color: "text-blue-600",
    },
    {
      label: "Total Amount",
      value: totals.totalAmount,
      icon: DollarSign,
      format: formatCurrency,
      color: "text-emerald-600",
    },
    {
      label: "Closed Won",
      value: totals.closedWon,
      icon: CheckCircle2,
      format: (v: number) => v.toString(),
      color: "text-orange-500",
    },
    {
      label: "Close Rate",
      value: totals.closeRate,
      icon: Percent,
      format: (v: number) => `${v}%`,
      color: "text-violet-600",
    },
    {
      label: "Won Revenue",
      value: totals.closedWonAmount,
      icon: Trophy,
      format: formatCurrency,
      color: "text-green-600",
      bgAccent: "bg-green-50",
    },
    {
      label: "Weighted Forecast",
      value: totals.weightedProjection,
      icon: TrendingUp,
      format: formatCurrency,
      color: "text-blue-600",
      bgAccent: "bg-blue-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Pipeline selector */}
        {pipelines.length > 1 && (
          <>
            <span className="text-sm font-medium text-muted-foreground">Pipeline:</span>
            <Select
              value={selectedPipelineId ?? data?.pipeline?.id ?? ""}
              onValueChange={(val) => setSelectedPipelineId(val)}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Clear dates
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <Card key={card.label} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold truncate ${card.color}`}>
                    {card.format(card.value)}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${'bgAccent' in card && card.bgAccent ? card.bgAccent : 'bg-muted/60'}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bar chart: leads per stage */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leads by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "leads") return [value, "Leads"];
                      return [formatCurrency(value), "Amount"];
                    }}
                  />
                  <Bar dataKey="leads" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage detail table */}
      {stageStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-3 font-semibold text-muted-foreground">Stage</th>
                    <th className="text-right pb-3 font-semibold text-muted-foreground">Leads</th>
                    <th className="text-right pb-3 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-left pb-3 font-semibold text-muted-foreground pl-6">Companies</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stageStats.map((stage, idx) => (
                    <tr key={stage.stageId} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-4">
                        <span
                          className="inline-flex items-center gap-2 font-medium"
                        >
                          <span
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                stage.stageColor ||
                                FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
                            }}
                          />
                          {stage.stageName}
                        </span>
                      </td>
                      <td className="py-3 text-right tabular-nums">{stage.leadCount}</td>
                      <td className="py-3 text-right tabular-nums font-medium">
                        {formatCurrency(stage.totalAmount)}
                      </td>
                      <td className="py-3 pl-6 text-muted-foreground">
                        {stage.companies.length > 0
                          ? stage.companies.map((c) => c.name).join(", ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {stageStats.length === 0 && !isLoading && (
        <div className="py-12 text-center text-muted-foreground">
          No pipeline data available for this organization.
        </div>
      )}
    </div>
  );
}
