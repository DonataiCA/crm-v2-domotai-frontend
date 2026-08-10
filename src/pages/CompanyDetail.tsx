import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { companyService } from "@/services/company.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntityTaskList } from "@/components/entities/EntityTaskList";
import { EntityFileSection } from "@/components/entities/EntityFileSection";
import { CompanyForm } from "@/components/companies/CompanyForm";
import {
  ArrowLeft,
  Building2,
  Globe,
  Phone,
  MapPin,
  User,
  CalendarDays,
  Users,
  TrendingUp,
  CheckSquare,
  ExternalLink,
  Pencil,
  X,
} from "lucide-react";
import { format } from "date-fns";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
          <div>
            <p className="text-2xl font-semibold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: company, isLoading, error } = useQuery({
    queryKey: ["company", id],
    queryFn: () => companyService.getCompany(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Company not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/companies")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Companies
        </Button>
      </div>
    );
  }

  const contacts = company.contacts || [];
  const leads = company.leads || [];
  const tasks = company.tasks || [];
  const activeTasks = tasks.filter((t) => t.status !== "COMPLETED");
  const fileLinks = company.fileLinks || [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/companies")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            {company.domain && (
              <p className="text-sm text-muted-foreground">{company.domain}</p>
            )}
          </div>
        </div>
        <Button
          variant={isEditing ? "ghost" : "outline"}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? <><X className="h-4 w-4 mr-1" /> Cancel</> : <><Pencil className="h-4 w-4 mr-1" /> Edit</>}
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Left: Info card */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {isEditing ? "Edit Company" : "Company Info"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <CompanyForm
                initialData={{
                  ...company,
                  assignedTo: company.assignedTo as any,
                }}
                onSuccess={() => {
                  setIsEditing(false);
                  queryClient.invalidateQueries({ queryKey: ["company", id] });
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <div className="space-y-1 divide-y">
                {company.industry && (
                  <InfoRow
                    icon={<Building2 className="h-4 w-4" />}
                    label="Industry"
                    value={<Badge variant="secondary">{company.industry}</Badge>}
                  />
                )}
                {company.size && (
                  <InfoRow
                    icon={<Users className="h-4 w-4" />}
                    label="Company Size"
                    value={<Badge variant="outline">{company.size}</Badge>}
                  />
                )}
                {company.website && (
                  <InfoRow
                    icon={<Globe className="h-4 w-4" />}
                    label="Website"
                    value={
                      <a
                        href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {company.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    }
                  />
                )}
                {company.phone && (
                  <InfoRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={company.phone}
                  />
                )}
                {company.address && (
                  <InfoRow
                    icon={<MapPin className="h-4 w-4" />}
                    label="Address"
                    value={company.address}
                  />
                )}
                <InfoRow
                  icon={<User className="h-4 w-4" />}
                  label="Assigned To"
                  value={
                    company.assignedTo
                      ? company.assignedTo.fullName || company.assignedTo.email
                      : <span className="text-muted-foreground">Unassigned</span>
                  }
                />
                <InfoRow
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Created"
                  value={format(new Date(company.createdAt), "MMM d, yyyy")}
                />
                {company.notes && (
                  <div className="pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{company.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Stats + Tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Users className="h-4 w-4" />} label="Contacts" value={company._count?.contacts ?? contacts.length} />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Leads" value={company._count?.leads ?? leads.length} />
            <StatCard icon={<CheckSquare className="h-4 w-4" />} label="Active Tasks" value={activeTasks.length} />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="contacts">
            <TabsList>
              <TabsTrigger value="contacts">
                Contacts
                {contacts.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                    {contacts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="leads">
                Leads
                {leads.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                    {leads.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="files">
                Files
                {fileLinks.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                    {fileLinks.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Contacts tab */}
            <TabsContent value="contacts" className="mt-4">
              {contacts.length === 0 ? (
                <div className="py-10 text-center border rounded-lg bg-muted/30">
                  <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No contacts linked to this company</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow
                          key={contact.id}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <TableCell>
                            <Link
                              to={`/contacts/${contact.id}`}
                              className="font-medium hover:underline text-foreground"
                            >
                              {contact.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {contact.email ?? <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {contact.phone ?? <span className="text-muted-foreground/50">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Leads tab */}
            <TabsContent value="leads" className="mt-4">
              {leads.length === 0 ? (
                <div className="py-10 text-center border rounded-lg bg-muted/30">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No leads linked to this company</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <Link
                              to={`/leads/${lead.id}`}
                              className="font-medium hover:underline text-foreground"
                            >
                              {lead.name ?? "Unnamed Lead"}
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Tasks tab */}
            <TabsContent value="tasks" className="mt-4">
              <EntityTaskList entityType="company" entityId={id!} />
            </TabsContent>

            {/* Files tab */}
            <TabsContent value="files" className="mt-4">
              <EntityFileSection
                files={fileLinks}
                onAddFile={async (fileData) => {
                  await companyService.addFile(id!, fileData);
                  queryClient.invalidateQueries({ queryKey: ["company", id] });
                }}
                onDeleteFile={async (fileId) => {
                  await companyService.deleteFile(fileId);
                  queryClient.invalidateQueries({ queryKey: ["company", id] });
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetail;
