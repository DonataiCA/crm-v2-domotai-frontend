import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQuery } from "@tanstack/react-query";
import { financialService } from "@/services/financial.service";
import {
  DollarSign,
  Clock,
  TrendingUp,
  Receipt,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

const FinancialDashboard = () => {
  const { currentOrganization } = useOrganization();

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["financial-dashboard", currentOrganization?.id],
    queryFn: () => financialService.getDashboard(),
    enabled: !!currentOrganization,
  });

  const { data: aging, isLoading: agingLoading } = useQuery({
    queryKey: ["financial-aging", currentOrganization?.id],
    queryFn: () => financialService.getAging(),
    enabled: !!currentOrganization,
  });

  const { data: profitData, isLoading: profitLoading } = useQuery({
    queryKey: ["financial-profit", currentOrganization?.id],
    queryFn: () => financialService.getProfitByProject(),
    enabled: !!currentOrganization,
  });

  const isLoading = dashLoading || agingLoading || profitLoading;

  const totalRevenue = dashboard?.totalRevenue ?? 0;
  const pendingRevenue = dashboard?.pendingRevenue ?? 0;
  const billableHours = dashboard?.billableHours ?? 0;
  const billableValue = dashboard?.billableValue ?? 0;
  const revenueByMonth: { month: string; total: number }[] = dashboard?.revenueByMonth ?? [];
  const topClients = dashboard?.topClients ?? [];
  const agingBuckets = aging?.buckets ?? [];
  const profitByProject = profitData?.projects ?? [];

  // Revenue forecast: trailing 3-month average projected 3 months forward
  const forecastMonths = useMemo(() => {
    const sorted = [...revenueByMonth].sort((a, b) => a.month.localeCompare(b.month));
    const trailing = sorted.slice(-3);
    const avg = trailing.length > 0
      ? trailing.reduce((s, m) => s + m.total, 0) / trailing.length
      : 0;

    const now = new Date();
    return [1, 2, 3].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const label = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      return { label, projected: Math.round(avg) };
    });
  }, [revenueByMonth]);

  const trailingAvg = forecastMonths[0]?.projected ?? 0;
  const lastMonthRevenue = revenueByMonth.length > 0
    ? revenueByMonth[revenueByMonth.length - 1].total
    : 0;
  const forecastTrend = trailingAvg >= lastMonthRevenue ? 'up' : 'down';

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Organization Selected</h2>
        <p className="text-muted-foreground">Please select an organization to view financials.</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground mt-1">{currentOrganization.name}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(pendingRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billable Hours</p>
              <p className="text-2xl font-bold">{billableHours.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billable Value</p>
              <p className="text-2xl font-bold">{formatCurrency(billableValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Revenue by Month Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Revenue by Month</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByMonth.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No revenue data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Two-column layout: Aging + Top Clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Aging Report */}
            <Card>
              <CardHeader>
                <CardTitle>Aging Report</CardTitle>
              </CardHeader>
              <CardContent>
                {agingBuckets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No aging data available.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bucket</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agingBuckets.map((bucket: any) => (
                          <TableRow key={bucket.label}>
                            <TableCell className="font-medium">{bucket.label}</TableCell>
                            <TableCell className="text-right">{bucket.count}</TableCell>
                            <TableCell className="text-right">{formatCurrency(bucket.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top 5 Clients by Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Clients by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {topClients.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No client data available.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Total Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topClients.slice(0, 5).map((client: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(client.revenue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profit by Project */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Profit by Project</CardTitle>
            </CardHeader>
            <CardContent>
              {profitByProject.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No profit data available.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Invoiced</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profitByProject.map((proj: any) => {
                        const marginPct = proj.invoiced > 0
                          ? ((proj.margin / proj.invoiced) * 100).toFixed(1)
                          : "0.0";
                        return (
                          <TableRow key={proj.projectId || proj.name}>
                            <TableCell className="font-medium">{proj.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(proj.invoiced)}</TableCell>
                            <TableCell className="text-right">{proj.hours?.toFixed(1) ?? "-"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(proj.cost)}</TableCell>
                            <TableCell className="text-right">
                              <span className={proj.margin >= 0 ? "text-emerald-600" : "text-red-600"}>
                                {formatCurrency(proj.margin)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="secondary"
                                className={
                                  proj.margin >= 0
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700"
                                }
                              >
                                {marginPct}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        {/* Revenue Forecast */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {forecastTrend === 'up'
                  ? <TrendingUp className="h-4 w-4 text-emerald-600" />
                  : <TrendingDown className="h-4 w-4 text-red-500" />
                }
                Proyeccion de Ingresos (proximos 3 meses)
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Basado en promedio de ultimos 3 meses
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Pipeline confirmed (pending invoices) */}
              <div className="rounded-lg border p-4 bg-amber-50 border-amber-200">
                <p className="text-xs font-medium text-amber-700 mb-1">Pipeline confirmado</p>
                <p className="text-xl font-bold text-amber-900">{formatCurrency(pendingRevenue)}</p>
                <p className="text-xs text-amber-600 mt-1">Facturas SENT + OVERDUE</p>
              </div>
              {/* Next 3 months projected */}
              {forecastMonths.map((m) => (
                <div key={m.label} className="rounded-lg border p-4 bg-slate-50">
                  <p className="text-xs font-medium text-muted-foreground mb-1 capitalize">{m.label}</p>
                  <p className="text-xl font-bold">{formatCurrency(m.projected)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Proyectado</p>
                </div>
              ))}
            </div>
            {revenueByMonth.length < 3 && (
              <p className="text-xs text-muted-foreground mt-3">
                Se necesitan al menos 3 meses de datos para una proyeccion confiable.
              </p>
            )}
          </CardContent>
        </Card>
        </>
      )}
    </>
  );
};

export default FinancialDashboard;
