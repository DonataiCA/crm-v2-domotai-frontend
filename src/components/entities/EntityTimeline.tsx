import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Pencil,
  CheckSquare,
  User,
  Clock,
  Plus,
} from "lucide-react";

export interface TimelineEvent {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
  creator?: { fullName: string | null; email?: string } | null;
}

interface EntityTimelineProps {
  events: TimelineEvent[];
  onAddEvent?: (eventType: string, description: string) => Promise<void>;
}

function getEventIcon(eventType: string) {
  switch (eventType.toLowerCase()) {
    case "call":
      return <Phone className="h-4 w-4 text-blue-500" />;
    case "email":
      return <Mail className="h-4 w-4 text-emerald-500" />;
    case "meeting":
      return <Calendar className="h-4 w-4 text-purple-500" />;
    case "note":
      return <Pencil className="h-4 w-4 text-amber-500" />;
    case "task":
      return <CheckSquare className="h-4 w-4 text-red-500" />;
    default:
      return <MessageSquare className="h-4 w-4 text-slate-400" />;
  }
}

function formatEventType(type: string) {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const EVENT_TYPE_OPTIONS = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
];

export const EntityTimeline = ({ events, onAddEvent }: EntityTimelineProps) => {
  const [showForm, setShowForm] = useState(false);
  const [eventType, setEventType] = useState("note");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleSubmit = async () => {
    if (!description.trim() || !onAddEvent) return;
    try {
      setIsSubmitting(true);
      await onAddEvent(eventType, description.trim());
      setDescription("");
      setEventType("note");
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {onAddEvent && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Note
          </Button>
        </div>
      )}

      {showForm && onAddEvent && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Write your note..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setDescription("");
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !description.trim()}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="py-10 text-center border rounded-lg bg-muted/30">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No events recorded yet</p>
        </div>
      ) : (
        <div className="relative space-y-0 border-l ml-4">
          {sorted.map((event) => (
            <div key={event.id} className="relative pl-6 py-4 group">
              {/* dot */}
              <div className="absolute -left-[17px] top-5 bg-background rounded-full p-1 border">
                {getEventIcon(event.eventType)}
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="mb-1 text-[11px]">
                    {formatEventType(event.eventType)}
                  </Badge>
                  <p className="text-sm whitespace-pre-wrap">{event.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span title={format(new Date(event.createdAt), "PPP p")}>
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </span>
                    {event.creator && (
                      <>
                        <span>·</span>
                        <User className="h-3 w-3" />
                        <span>{event.creator.fullName || event.creator.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
