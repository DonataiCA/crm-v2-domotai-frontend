import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { contactService } from "@/services/contact.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EntityTaskList } from "@/components/entities/EntityTaskList";
import { EntityFileSection } from "@/components/entities/EntityFileSection";
import { ContactForm } from "@/components/contacts/ContactForm";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  CalendarDays,
  DollarSign,
  StickyNote,
  CheckSquare,
  Paperclip,
  Plus,
  Trash2,
  ExternalLink,
  Pencil,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { ContactNote } from "@/types/api";

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

const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  const { data: contact, isLoading, error } = useQuery({
    queryKey: ["contact", id],
    queryFn: () => contactService.getContact(id!),
    enabled: !!id,
  });

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    try {
      setIsAddingNote(true);
      await contactService.addNote(id, newNote.trim());
      await queryClient.invalidateQueries({ queryKey: ["contact", id] });
      setNewNote("");
      toast({ title: "Note added" });
    } catch {
      toast({ title: "Failed to add note", variant: "destructive" });
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await contactService.deleteNote(noteId);
      await queryClient.invalidateQueries({ queryKey: ["contact", id] });
      toast({ title: "Note deleted" });
    } catch {
      toast({ title: "Failed to delete note", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Contact not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/contacts")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Button>
      </div>
    );
  }

  const notes: ContactNote[] = contact.notes || [];
  const files = contact.fileLinks || [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{contact.name}</h1>
            {contact.email && (
              <p className="text-sm text-muted-foreground">{contact.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contact.category && (
            <Badge
              variant={
                contact.category === "active"
                  ? "default"
                  : contact.category === "prospect"
                  ? "secondary"
                  : "outline"
              }
            >
              {contact.category}
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
              <User className="h-4 w-4" />
              {isEditing ? "Edit Contact" : "Contact Info"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <ContactForm
                initialData={{
                  id: contact.id,
                  name: contact.name || "",
                  email: contact.email || "",
                  phone: contact.phone || "",
                  company: contact.company || "",
                  country: contact.country || "",
                  city: contact.city || "",
                  role: contact.role || "",
                  website: contact.website || "",
                  lead_source: contact.leadSource || "",
                  category: contact.category || "prospect",
                  assigned_to: typeof contact.assignedTo === "object" ? contact.assignedTo?.id || "" : "",
                }}
                onSuccess={() => {
                  setIsEditing(false);
                  queryClient.invalidateQueries({ queryKey: ["contact", id] });
                }}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <div className="space-y-1 divide-y">
            {contact.email && (
              <InfoRow
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                }
              />
            )}
            {contact.phone && (
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={contact.phone}
              />
            )}
            {contact.companyRef ? (
              <InfoRow
                icon={<Building2 className="h-4 w-4" />}
                label="Company"
                value={
                  <Link
                    to={`/companies/${contact.companyRef.id}`}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {contact.companyRef.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                }
              />
            ) : contact.company ? (
              <InfoRow
                icon={<Building2 className="h-4 w-4" />}
                label="Company"
                value={contact.company}
              />
            ) : null}
            {contact.role && (
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Role"
                value={contact.role}
              />
            )}
            {contact.leadSource && (
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Lead Source"
                value={contact.leadSource}
              />
            )}
            {(contact.city || contact.country) && (
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={[contact.city, contact.country].filter(Boolean).join(", ")}
              />
            )}
            {contact.website && (
              <InfoRow
                icon={<Globe className="h-4 w-4" />}
                label="Website"
                value={
                  <a
                    href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {contact.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                }
              />
            )}
            {contact.totalRevenue > 0 && (
              <InfoRow
                icon={<DollarSign className="h-4 w-4" />}
                label="Total Revenue"
                value={
                  <span className="font-semibold text-emerald-600">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                      contact.totalRevenue
                    )}
                  </span>
                }
              />
            )}
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="Assigned To"
              value={
                contact.assignedTo
                  ? contact.assignedTo.fullName || contact.assignedTo.email
                  : <span className="text-muted-foreground">Unassigned</span>
              }
            />
            <InfoRow
              icon={<CalendarDays className="h-4 w-4" />}
              label="Created"
              value={format(new Date(contact.createdAt), "MMM d, yyyy")}
            />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Stats + Tabs */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<CheckSquare className="h-4 w-4" />} label="Notes" value={notes.length} />
            <StatCard icon={<Paperclip className="h-4 w-4" />} label="Files" value={files.length} />
            <StatCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Revenue"
              value={
                contact.totalRevenue > 0
                  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(contact.totalRevenue)
                  : "$0"
              }
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="tasks">
            <TabsList>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="notes">
                Notes
                {notes.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                    {notes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="files">
                Files
                {files.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                    {files.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Tasks tab */}
            <TabsContent value="tasks" className="mt-4">
              <EntityTaskList entityType="contact" entityId={id!} />
            </TabsContent>

            {/* Notes tab */}
            <TabsContent value="notes" className="mt-4 space-y-4">
              {/* Add note */}
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Note
                </p>
                <Textarea
                  placeholder="Write a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleAddNote} disabled={isAddingNote || !newNote.trim()}>
                    {isAddingNote ? "Saving..." : "Add Note"}
                  </Button>
                </div>
              </div>

              {/* Note list */}
              {notes.length === 0 ? (
                <div className="py-8 text-center border rounded-lg bg-muted/30">
                  <StickyNote className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...notes]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((note) => (
                      <div key={note.id} className="border rounded-lg p-4 group relative">
                        <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-muted-foreground">
                            {note.createdBy?.fullName || note.createdBy?.email || "Unknown"}
                            {" · "}
                            {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* Files tab */}
            <TabsContent value="files" className="mt-4">
              <EntityFileSection
                files={files}
                onAddFile={async (fileData) => {
                  await contactService.addFile(id!, fileData);
                  queryClient.invalidateQueries({ queryKey: ["contact", id] });
                }}
                onDeleteFile={async (fileId) => {
                  await contactService.deleteFile(fileId);
                  queryClient.invalidateQueries({ queryKey: ["contact", id] });
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ContactDetail;
