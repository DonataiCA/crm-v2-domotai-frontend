import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommercialDashboard } from "@/components/dashboard/CommercialDashboard";
import { OperationalDashboard } from "@/components/dashboard/OperationalDashboard";

const Dashboard = () => {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of commercial and operational performance</p>
      </div>

      <Tabs defaultValue="comercial" className="space-y-6">
        <TabsList className="w-full">
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="operativo">Operativo</TabsTrigger>
        </TabsList>

        <TabsContent value="comercial">
          <CommercialDashboard />
        </TabsContent>

        <TabsContent value="operativo">
          <OperationalDashboard />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Dashboard;
