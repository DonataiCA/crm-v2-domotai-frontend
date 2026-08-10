
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Mail, Phone, Building2, Calendar, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventTimeline } from "../events/EventTimeline";
import { EventForm } from "../events/EventForm";
import { useState } from "react";
import { Lead } from "@/types/api";
import { getLeadStageBadgeVariant } from '@/constants';

interface LeadDetailsViewProps {
  lead: Lead;
}

export const LeadDetailsView = ({ lead }: LeadDetailsViewProps) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
          <TabsTrigger value="events" className="flex-1">
            Events
            {lead.events && lead.events.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {lead.events.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Stage</h4>
              <Badge variant={getLeadStageBadgeVariant(lead.stage) as any}>
                {lead.stage?.split("_").map((word: string) =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(" ")}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Assigned To</h4>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span>{lead.assignee ? lead.assignee.fullName || lead.assignee.email : "Unassigned"}</span>
              </div>
            </div>
          </div>

          {lead.details && (
            <div className="border rounded-lg p-4 space-y-2 mt-4">
              <h4 className="text-sm font-medium">Details</h4>
              <p className="text-sm whitespace-pre-wrap">{lead.details}</p>
            </div>
          )}

          <div className="border rounded-lg p-4 space-y-4 mt-4">
            <h4 className="text-sm font-medium">Contact Information</h4>
            {lead.contact && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm text-muted-foreground">Company</h5>
                  <p className="text-sm flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {lead.contact.name || "N/A"}
                  </p>
                </div>
                {lead.contact.email && (
                  <div>
                    <h5 className="text-sm text-muted-foreground">Email</h5>
                    <p className="text-sm flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {lead.contact.email}
                    </p>
                  </div>
                )}
                {lead.contact.phone && (
                  <div>
                    <h5 className="text-sm text-muted-foreground">Phone</h5>
                    <p className="text-sm flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {lead.contact.phone}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-4 mt-4">
            <h4 className="text-sm font-medium">Pricing Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm text-muted-foreground">Amount</h5>
                <p className="text-sm flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatPrice(lead.price ?? 0)}
                  {lead.pricingType === 'recurring' && ' /month'}
                </p>
              </div>
              <div>
                <h5 className="text-sm text-muted-foreground">Type</h5>
                <p className="text-sm capitalize">{lead.pricingType}</p>
              </div>
              {lead.pricingType === 'flat' && lead.paymentDate && (
                <div>
                  <h5 className="text-sm text-muted-foreground">Payment Date</h5>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(lead.paymentDate), "PPP")}
                  </p>
                </div>
              )}
              {lead.pricingType === 'recurring' && (
                <>
                  {lead.recurringStartDate && (
                    <div>
                      <h5 className="text-sm text-muted-foreground">Start Date</h5>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(lead.recurringStartDate), "PPP")}
                      </p>
                    </div>
                  )}
                  {lead.recurringEndDate && (
                    <div>
                      <h5 className="text-sm text-muted-foreground">End Date</h5>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(lead.recurringEndDate), "PPP")}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-4 mt-4">
            <h4 className="text-sm font-medium">Follow-up & Timeline</h4>
            <div className="grid grid-cols-2 gap-4">
              {lead.nextFollowUp && (
                <div>
                  <h5 className="text-sm text-muted-foreground">Next Follow-up</h5>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(lead.nextFollowUp), "PPP")}
                  </p>
                </div>
              )}
              <div>
                <h5 className="text-sm text-muted-foreground">Created</h5>
                <p className="text-sm flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(lead.createdAt), "PPP")}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-4">Add New Event</h3>
              <EventForm
                leadId={lead.id}
                onSuccess={() => setRefreshKey(prev => prev + 1)}
              />
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-4">Event History</h3>
              <EventTimeline
                events={lead.events || []}
                refreshKey={refreshKey}
                leadId={lead.id}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
