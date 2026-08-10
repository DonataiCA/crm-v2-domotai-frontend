
import { format } from "date-fns";
import { Fragment, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Clock,
  CheckSquare,
  Pencil,
  User,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { leadService } from "@/services/lead.service";
import { LeadEvent } from "@/types/api";

interface EventTimelineProps {
  events: LeadEvent[];
  refreshKey?: number;
  leadId?: string;
}

// Define getEventIcon outside components so it can be shared
const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case "call":
      return <Phone className="h-5 w-5 text-blue-500" />;
    case "email":
      return <Mail className="h-5 w-5 text-green-500" />;
    case "meeting":
      return <Calendar className="h-5 w-5 text-purple-500" />;
    case "note":
      return <Pencil className="h-5 w-5 text-yellow-500" />;
    case "task":
      return <CheckSquare className="h-5 w-5 text-red-500" />;
    default:
      return <MessageSquare className="h-5 w-5 text-gray-500" />;
  }
};

export const EventTimeline = ({ events = [], refreshKey, leadId }: EventTimelineProps) => {
  const [sortedEvents, setSortedEvents] = useState<LeadEvent[]>([]);

  // Sort events whenever events or refreshKey changes
  useEffect(() => {
    const sorted = [...events].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setSortedEvents(sorted);
  }, [events, refreshKey]);

  if (sortedEvents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No events recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedEvents.map((event, index) => (
        <EventItem
          key={event.id || index}
          event={event}
        />
      ))}
    </div>
  );
};

const EventItem = ({ event }: { event: LeadEvent }) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatEventTitle = (eventType: string) => {
    return eventType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleDeleteEvent = async () => {
    try {
      setIsDeleting(true);

      await leadService.deleteEvent(event.id);

      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const eventIcon = getEventIcon(event.eventType);

  return (
    <div className="relative pl-6 border-l py-4 group">
      <div className="absolute left-[-8px] top-6 bg-background rounded-full p-1 border">
        {eventIcon}
      </div>

      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Badge variant="outline" className="mb-2">
            {formatEventTitle(event.eventType)}
          </Badge>
          <p className="whitespace-pre-wrap text-sm">{event.description}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setShowDeleteDialog(true)}
          aria-label="Delete event"
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{format(new Date(event.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
        {event.creator && (
          <>
            <span>•</span>
            <User className="h-3 w-3" />
            <span>{event.creator.fullName || event.creator.email}</span>
          </>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteEvent}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
      />
    </div>
  );
};
