import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { leadService } from "@/services/lead.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityTaskList } from "@/components/entities/EntityTaskList";
import { EntityTimeline } from "@/components/entities/EntityTimeline";
import { EntityFileSection } from "@/components/entities/EntityFileSection";
import { LeadForm } from "@/components/leads/LeadForm";
import { useToast } from "@/hooks/use-toast";
import { getLeadStageBadgeVariant } from "@/constants";
import {
  ArrowLeft,
  DollarSign,
  CalendarDays,
  User,
  Building2,
  FileText,
  TrendingUp,
  Clock,
  ExternalLink,
  History,
  Pencil,
  X,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import type { LeadEvent } from "@/types/api";

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
            <p className="text-lg font-semibold leading-none truncate">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatStage(stage: string | null) {
  if (!stage) return "Unknown";
  return stage
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => leadService.getLead(id!),
    enabled: !!id,
  });

  const handleAddEvent = async (eventType: string, description: string) => {
    if (!id) return;
    try {
      await leadService.addEvent(id, { eventType, description });
      await queryClient.invalidateQueries({ queryKey: ["lead", id] });
      toast({ title: "Event added" });
    } catch {
      toast({ title: "Failed to add event", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/leads")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    );
  }

  const events: LeadEvent[] = lead.events || [];
  const stageHistory = lead.stageHistory || [];
  const fileLinks = lead.fileLinks || [];
  const daysInPipeline = differenceInDays(new Date(), new Date(lead.createdAt));

  const formattedAmount = lead.price != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(lead.price)
    : "$0";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{lead.name || "Unnamed Lead"}</h1>
            {lead.contact && (
              <p className="text-sm text-muted-foreground">
                {lead.contact.name}
                {lead.contact.company && ` · ${lead.contact.company}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.stage && (
            <Badge variant={getLeadStageBadgeVariant(lead.stage) as any} className="text-sm px-3 py-1">
              {formatStage(lead.stage)}
            </Badge>
          )}
          <Button
            variant={isEditing ? "ghost" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <><X className="h-4 w-4 mr-1" /> Cancel</> : <><Pencil className="h-4 w-4 mr-1" /> Edit</>}
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Left: Info card */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {isEditing ? "Edit Lead" : "Lead Info"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <LeadForm
                initialData={{ ...lead, id: lead.id }}
                onSuccess={() => {
                  setIsEditing(false);
                  queryClient.invalidateQueries({ queryKey: ["lead", id] });
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <div className="space-y-1 divide-y">
            {lead.price != null && (
              <InfoRow
                icon={<DollarSign className="h-4 w-4" />}
                label="Amount"
                value={
                  <span className="font-semibold text-emerald-600">
                    {formattedAmount}
                    {lead.pricingType === "recurring" && (
                      <span className="text-muted-foreground font-normal"> /month</span>
                    )}
                  </span>
                }
              />
            )}
            {lead.pricingType && (
              <InfoRow
                icon={<FileText className="h-4 w-4" />}
                label="Pricing Type"
                value={<Badge variant="outline" className="capitalize">{lead.pricingType}</Badge>}
              />
            )}
            {lead.company && (
              <InfoRow
                icon={<Building2 className="h-4 w-4" />}
                label="Company"
                value={
                  <Link
                    to={`/companies/${lead.company.id}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {lead.company.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                }
              />
            )}
            {lead.contact && (
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Contact"
                value={
                  <Link
                    to={`/contacts/${lead.contact.id}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {lead.contact.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                }
              />
            )}
            {lead.nextFollowUp && (
              <InfoRow
                icon={<CalendarDays className="h-4 w-4" />}
                label="Next Follow-up"
                value={format(new Date(lead.nextFollowUp), "MMM d, yyyy")}
              />
            )}
            {lead.paymentDate && lead.pricingType === "flat" && (
              <InfoRow
                icon={<CalendarDays className="h-4 w-4" />}
                label="Payment Date"
                value={format(new Date(lead.paymentDate), "MMM d, yyyy")}
              />
            )}
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Assigned To"
              value={
                lead.assignee
                  ? lead.assignee.fullName || lead.assignee.email
                  : <span className="text-muted-foreground">Unassigned</span>
              }
            />
            <InfoRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Created"
              value={format(new Date(lead.createdAt), "MMM d, yyyy")}
            />
            {lead.details && (
              <div className="pt-3">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{lead.details}</p>
              </div>
            )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Stats + Tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Amount"
              value={formattedAmount}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Stage"
              value={formatStage(lead.stage)}
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="Days in Pipeline"
              value={daysInPipeline}
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="tasks">
            <TabsList>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="events">
                Events
                {events.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                    {events.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="files">
                Files
                {fileLinks.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                    {fileLinks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">Stage History</TabsTrigger>
            </TabsList>

            {/* Tasks tab */}
            <TabsContent value="tasks" className="mt-4">
              <EntityTaskList entityType="lead" entityId={id!} />
            </TabsContent>

            {/* Events tab */}
            <TabsContent value="events" className="mt-4">
              <EntityTimeline
                events={events.map((e) => ({
                  id: e.id,
                  eventType: e.eventType,
                  description: e.description,
                  createdAt: e.createdAt,
                  creator: e.creator,
                }))}
                onAddEvent={handleAddEvent}
              />
            </TabsContent>

            {/* Files tab */}
            <TabsContent value="files" className="mt-4">
              <EntityFileSection
                files={fileLinks}
                onAddFile={async (fileData) => {
                  await leadService.addFile(id!, fileData);
                  queryClient.invalidateQueries({ queryKey: ["lead", id] });
                }}
                onDeleteFile={async (fileId) => {
                  await leadService.deleteFile(fileId);
                  queryClient.invalidateQueries({ queryKey: ["lead", id] });
                }}
              />
            </TabsContent>

            {/* Stage history tab */}
            <TabsContent value="history" className="mt-4">
              {stageHistory.length === 0 ? (
                <div className="py-10 text-center border rounded-lg bg-muted/30">
                  <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No stage history recorded</p>
                </div>
              ) : (
                <div className="relative space-y-0 border-l ml-4">
                  {[...stageHistory]
                    .sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime())
                    .map((entry) => {
                      const duration = entry.durationSeconds
                        ? entry.durationSeconds < 3600
                          ? `${Math.round(entry.durationSeconds / 60)} min`
                          : entry.durationSeconds < 86400
                          ? `${Math.round(entry.durationSeconds / 3600)} hrs`
                          : `${Math.round(entry.durationSeconds / 86400)} days`
                        : entry.exitedAt
                        ? null
                        : "Current";

                      return (
                        <div key={entry.id} className="relative pl-6 py-4">
                          <div className="absolute -left-[9px] top-5 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge
                                variant={getLeadStageBadgeVariant(entry.stage) as any}
                                className="mb-1"
                              >
                                {formatStage(entry.stage)}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(entry.enteredAt), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                            {duration && (
                              <Badge variant="outline" className="text-[11px]">
                                {duration}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
