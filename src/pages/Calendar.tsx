import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { calendarService } from "@/services/calendar.service";
import { contactService } from "@/services/contact.service";
import { projectService } from "@/services/project.service";
import { taskService } from "@/services/task.service";
import { invoiceService } from "@/services/invoice.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CalendarDays,
  CheckSquare,
  FileText,
  Filter,
  Search,
  FolderKanban,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CalendarEvent,
  CalendarMilestone,
  Contact,
  Project,
} from "@/types/api";

const PRESET_COLORS = [
  { label: "Blue", value: "#3b82f6" },
  { label: "Red", value: "#ef4444" },
  { label: "Green", value: "#22c55e" },
  { label: "Purple", value: "#a855f7" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Teal", value: "#14b8a6" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Fuentes del calendario ─────────────────────────────────────────────────
// Los proyectos y las fases son hitos derivados: el backend los calcula en
// `/calendar/overview` y aquí son de sólo lectura. Las tareas de proyecto
// quedan deliberadamente fuera — saturarían la grilla.

type SourceKey = "event" | "project" | "phase" | "task" | "invoice";

const SOURCES: Array<{ key: SourceKey; label: string }> = [
  { key: "event", label: "Eventos" },
  { key: "project", label: "Proyectos" },
  { key: "phase", label: "Fases" },
  { key: "task", label: "Tareas" },
  { key: "invoice", label: "Facturas" },
];

const ALL_SOURCES = SOURCES.map((s) => s.key);

/**
 * Todo lo que se pinta en un día, venga de donde venga. Unificar las cinco
 * fuentes en una sola forma evita que cada vista (mes, semana y panel lateral)
 * tenga que cruzar estructuras distintas.
 */
type DayItem = {
  source: SourceKey;
  key: string;
  title: string;
  dateKey: string;
  /** Orden dentro del día: menor primero. */
  sortKey: number;
  color?: string | null;
  projectId?: string | null;
  /** Texto de apoyo para el tooltip y el panel lateral. */
  subtitle: string;
  /** Presente sólo cuando `source === 'event'`: el panel permite borrarlo. */
  event?: CalendarEvent;
  milestone?: CalendarMilestone;
};

/** Estilos de las fuentes de sólo lectura. Los eventos usan su color propio. */
const SOURCE_STYLES: Record<
  Exclude<SourceKey, "event">,
  { chip: string; panel: string; text: string }
> = {
  project: {
    chip: "bg-sky-100 text-sky-700",
    panel: "border-sky-200 bg-sky-50",
    text: "text-sky-600",
  },
  phase: {
    chip: "bg-emerald-100 text-emerald-700",
    panel: "border-emerald-200 bg-emerald-50",
    text: "text-emerald-600",
  },
  task: {
    chip: "bg-violet-100 text-violet-700",
    panel: "border-violet-200 bg-violet-50",
    text: "text-violet-600",
  },
  invoice: {
    chip: "bg-amber-100 text-amber-700",
    panel: "border-amber-200 bg-amber-50",
    text: "text-amber-600",
  },
};

function sourceIcon(source: SourceKey, className: string) {
  switch (source) {
    case "project":
      return <FolderKanban className={className} />;
    case "phase":
      return <Layers className={className} />;
    case "task":
      return <CheckSquare className={className} />;
    case "invoice":
      return <FileText className={className} />;
    default:
      return null;
  }
}

/** ▶ arranca, ■ termina. */
function milestoneGlyph(kind: CalendarMilestone["kind"]) {
  return kind.endsWith("-start") ? "▶" : "■";
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const Calendar = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtros
  const [activeSources, setActiveSources] = useState<SourceKey[]>(ALL_SOURCES);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formAllDay, setFormAllDay] = useState(false);
  const [formColor, setFormColor] = useState(PRESET_COLORS[0].value);
  const [formContactId, setFormContactId] = useState("");
  const [formLeadId, setFormLeadId] = useState("");
  const [formProjectId, setFormProjectId] = useState("");

  // ─── Persistencia de los filtros por organización ─────────────────────────
  const filtersKey = currentOrganization ? `calendar-filters:${currentOrganization.id}` : null;

  useEffect(() => {
    if (!filtersKey) return;
    try {
      const raw = localStorage.getItem(filtersKey);
      const saved = raw ? JSON.parse(raw) : null;
      setActiveSources(
        Array.isArray(saved?.sources)
          ? saved.sources.filter((s: string) => ALL_SOURCES.includes(s as SourceKey))
          : ALL_SOURCES,
      );
      setProjectFilter(Array.isArray(saved?.projects) ? saved.projects : []);
    } catch {
      // Un localStorage corrupto no debe dejar la página sin filtros.
      setActiveSources(ALL_SOURCES);
      setProjectFilter([]);
    }
  }, [filtersKey]);

  useEffect(() => {
    if (!filtersKey) return;
    localStorage.setItem(
      filtersKey,
      JSON.stringify({ sources: activeSources, projects: projectFilter }),
    );
  }, [filtersKey, activeSources, projectFilter]);

  const toggleSource = (key: SourceKey) =>
    setActiveSources((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );

  const toggleProject = (id: string) =>
    setProjectFilter((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  // ─── Rango consultado ─────────────────────────────────────────────────────
  // La semana visible puede caer fuera del mes seleccionado, así que el rango
  // sigue a la vista activa y no siempre al mes.
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const monthFrom = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const monthTo = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(getDaysInMonth(viewYear, viewMonth)).padStart(2, "0")}`;
  const dateFrom = viewMode === 'week' ? toDateKey(weekDays[0]) : monthFrom;
  const dateTo = viewMode === 'week' ? toDateKey(weekDays[6]) : monthTo;

  // Se piden siempre todas las fuentes: apagar una es un filtro de cliente, así
  // que marcar y desmarcar no dispara refetch.
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ["calendar-overview", currentOrganization?.id, dateFrom, dateTo],
    queryFn: () => calendarService.getOverview({ dateFrom, dateTo }),
    enabled: !!currentOrganization,
  });

  const events = useMemo(() => overview?.events ?? [], [overview]);

  const { data: contactsData } = useQuery({
    queryKey: ["contacts-list", currentOrganization?.id],
    queryFn: () => contactService.getContacts(1, 500),
    enabled: !!currentOrganization,
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects-list", currentOrganization?.id],
    queryFn: () => projectService.getProjects(1, 500),
    enabled: !!currentOrganization,
  });

  const contacts: Contact[] = contactsData?.data || [];
  const projects: Project[] = projectsData?.data || [];

  // Load non-completed tasks and non-cancelled invoices for due-date overlay
  // (client-side filtered by month — avoids backend schema changes)
  const { data: tasksData } = useQuery({
    queryKey: ["calendar-tasks", currentOrganization?.id],
    queryFn: () => taskService.getTasks(1, 500),
    enabled: !!currentOrganization,
  });

  const { data: invoicesData } = useQuery({
    queryKey: ["calendar-invoices", currentOrganization?.id],
    queryFn: () => invoiceService.getInvoices(1, 500),
    enabled: !!currentOrganization,
  });

  // ─── Las cinco fuentes normalizadas a DayItem ─────────────────────────────
  const allItems = useMemo(() => {
    const items: DayItem[] = [];

    for (const evt of events) {
      const d = new Date(evt.startDate);
      items.push({
        source: "event",
        key: `event-${evt.id}`,
        title: evt.title,
        dateKey: toDateKey(d),
        // Los que tienen hora van primero; los de todo el día, después.
        sortKey: evt.allDay ? 2000 : d.getHours() * 60 + d.getMinutes(),
        color: evt.color,
        projectId: evt.projectId,
        subtitle: evt.title,
        event: evt,
      });
    }

    for (const [source, list] of [
      ["project", overview?.projects ?? []],
      ["phase", overview?.phases ?? []],
    ] as Array<[Extract<SourceKey, "project" | "phase">, CalendarMilestone[]]>) {
      for (const m of list) {
        const starts = m.kind.endsWith("-start");
        const entidad = source === "project" ? "proyecto" : "fase";
        items.push({
          source,
          key: `${m.kind}-${m.refId}`,
          title: m.title,
          dateKey: toDateKey(new Date(m.date)),
          sortKey: 3000,
          projectId: m.projectId,
          subtitle:
            source === "phase"
              ? `${starts ? "Inicia" : "Termina"} la fase ${m.title} de ${m.projectName}`
              : `${starts ? "Inicia" : "Termina"} el ${entidad} ${m.title}`,
          milestone: m,
        });
      }
    }

    for (const task of tasksData?.data || []) {
      if (!task.dueDate || task.status === 'COMPLETED') continue;
      items.push({
        source: "task",
        key: `task-${task.id}`,
        title: task.title,
        dateKey: task.dueDate.slice(0, 10),
        sortKey: 4000,
        projectId: task.projectId,
        subtitle: "Tarea vence hoy",
      });
    }

    for (const inv of invoicesData?.data || []) {
      if (!inv.dueDate || inv.status === 'PAID' || inv.status === 'CANCELLED') continue;
      items.push({
        source: "invoice",
        key: `invoice-${inv.id}`,
        title: inv.invoiceNumber,
        dateKey: inv.dueDate.slice(0, 10),
        sortKey: 4001,
        projectId: inv.projectId,
        subtitle: `Factura ${inv.status} vence hoy`,
      });
    }

    return items;
  }, [events, overview, tasksData, invoicesData]);

  const itemsByDate = useMemo(() => {
    const sources = new Set(activeSources);
    const wantedProjects = new Set(projectFilter);
    const needle = search.trim().toLowerCase();

    const map: Record<string, DayItem[]> = {};
    for (const item of allItems) {
      if (!sources.has(item.source)) continue;
      // Un filtro de proyectos vacío significa "todos".
      if (wantedProjects.size && !(item.projectId && wantedProjects.has(item.projectId))) continue;
      if (needle && !item.title.toLowerCase().includes(needle)) continue;
      (map[item.dateKey] ||= []).push(item);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.sortKey - b.sortKey);
    }
    return map;
  }, [allItems, activeSources, projectFilter, search]);

  // Build calendar grid
  const calendarGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const cells: Array<{ day: number | null; dateKey: string | null }> = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateKey: null });
    }
    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateKey });
    }
    // Fill remaining cells to complete the grid (6 rows)
    while (cells.length < 42) {
      cells.push({ day: null, dateKey: null });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const todayKey = toDateKey(today);
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const weekLabel = `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const goWeekPrev = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const goWeekNext = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goWeekToday = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); setWeekStart(d); };

  const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am-8pm

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormStartDate("");
    setFormStartTime("09:00");
    setFormEndDate("");
    setFormEndTime("10:00");
    setFormAllDay(false);
    setFormColor(PRESET_COLORS[0].value);
    setFormContactId("");
    setFormLeadId("");
    setFormProjectId("");
  };

  const openAddEvent = (dateKey?: string) => {
    resetForm();
    if (dateKey) {
      setFormStartDate(dateKey);
      setFormEndDate(dateKey);
    }
    setAddEventOpen(true);
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await calendarService.createEvent({
        title: formTitle,
        description: formDescription || null,
        startDate: formAllDay ? formStartDate : `${formStartDate}T${formStartTime}:00`,
        endDate: formAllDay
          ? formEndDate || formStartDate
          : `${formEndDate || formStartDate}T${formEndTime}:00`,
        allDay: formAllDay,
        color: formColor,
        contactId: formContactId && formContactId !== '__none__' ? formContactId : null,
        leadId: formLeadId && formLeadId !== '__none__' ? formLeadId : null,
        projectId: formProjectId && formProjectId !== '__none__' ? formProjectId : null,
      });
      toast({ title: "Event created" });
      setAddEventOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["calendar-overview"] });
    } catch (err: any) {
      toast({
        title: "Error creating event",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      await calendarService.deleteEvent(eventId);
      toast({ title: "Event deleted" });
      queryClient.invalidateQueries({ queryKey: ["calendar-overview"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  /**
   * Los hitos son de sólo lectura: se editan en el proyecto, no aquí. `/projects/:id`
   * no existe como ruta (redirige al dashboard); el seguimiento es la vista que
   * muestra fases y fechas.
   */
  const openItem = (item: DayItem) => {
    if ((item.source === "project" || item.source === "phase") && item.projectId) {
      navigate(`/projects/${item.projectId}/tracking`);
    }
  };

  const selectedItems = selectedDate ? itemsByDate[selectedDate] || [] : [];

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Organization Selected</h2>
        <p className="text-muted-foreground">Please select an organization to view the calendar.</p>
      </div>
    );
  }

  /** Chip de un ítem dentro de una celda de la grilla. */
  const ItemChip = ({ item, compact }: { item: DayItem; compact?: boolean }) => {
    const readOnly = item.source === "project" || item.source === "phase";
    const iconSize = compact ? "h-2 w-2" : "h-2.5 w-2.5";

    if (item.source === "event") {
      return (
        <div
          className={cn(
            "truncate rounded px-1 py-0.5 font-medium text-white leading-tight",
            compact ? "text-[10px]" : "text-[11px]",
          )}
          style={{ backgroundColor: item.color || "#3b82f6" }}
          title={item.title}
        >
          {item.title}
        </div>
      );
    }

    return (
      <div
        role={readOnly ? "button" : undefined}
        onClick={(e) => {
          if (!readOnly) return;
          // Sin esto, el clic burbujea a la celda y abre el diálogo de crear.
          e.stopPropagation();
          openItem(item);
        }}
        className={cn(
          "truncate rounded px-1 py-0.5 font-medium leading-tight flex items-center gap-0.5",
          compact ? "text-[10px]" : "text-[11px]",
          SOURCE_STYLES[item.source].chip,
          readOnly && "hover:underline cursor-pointer",
        )}
        title={item.subtitle}
      >
        {item.milestone && <span className="shrink-0">{milestoneGlyph(item.milestone.kind)}</span>}
        {sourceIcon(item.source, `${iconSize} shrink-0`)}
        <span className="truncate">{item.title}</span>
      </div>
    );
  };

  const activeFilterCount = activeSources.length;

  return (
    <>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground mt-1">{currentOrganization.name}</p>
        </div>
        <Button onClick={() => openAddEvent()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Fuentes
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}/{SOURCES.length}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Mostrar en el calendario</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SOURCES.map((s) => (
              <DropdownMenuCheckboxItem
                key={s.key}
                checked={activeSources.includes(s.key)}
                onCheckedChange={() => toggleSource(s.key)}
                onSelect={(e) => e.preventDefault()}
              >
                {s.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setActiveSources(ALL_SOURCES)}>
              Mostrar todo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderKanban className="h-4 w-4 mr-2" />
              Proyectos
              {projectFilter.length > 0 && (
                <Badge variant="secondary" className="ml-2">{projectFilter.length}</Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
            <DropdownMenuLabel>Acotar a proyectos</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {projects.length === 0 && (
              <DropdownMenuItem disabled>No hay proyectos</DropdownMenuItem>
            )}
            {projects.map((p) => (
              <DropdownMenuCheckboxItem
                key={p.id}
                checked={projectFilter.includes(p.id)}
                onCheckedChange={() => toggleProject(p.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {p.name}
              </DropdownMenuCheckboxItem>
            ))}
            {projectFilter.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setProjectFilter([])}>
                  Quitar el filtro
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-56"
          />
        </div>

        {projectFilter.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Acotado a {projectFilter.length} proyecto{projectFilter.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Calendar + Event Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar Grid */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>{viewMode === 'month' ? monthLabel : weekLabel}</CardTitle>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex border rounded-md overflow-hidden">
                  <button
                    className={cn("px-3 py-1.5 text-xs font-medium transition-colors", viewMode === 'month' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                    onClick={() => setViewMode('month')}
                  >
                    Month
                  </button>
                  <button
                    className={cn("px-3 py-1.5 text-xs font-medium transition-colors", viewMode === 'week' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                    onClick={() => setViewMode('week')}
                  >
                    Week
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={viewMode === 'month' ? goToday : goWeekToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={viewMode === 'month' ? goPrev : goWeekPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={viewMode === 'month' ? goNext : goWeekNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-destructive/10">
                <h3 className="text-lg font-medium mb-2">Error Loading Data</h3>
                <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
                <Button onClick={() => queryClient.invalidateQueries()}>Retry</Button>
              </div>
            ) : viewMode === 'week' ? (
              /* ─── Week View ─── */
              <div className="border rounded-lg overflow-hidden">
                {/* Week day headers */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-slate-50 border-b">
                  <div className="p-2 text-xs text-muted-foreground" />
                  {weekDays.map((d, i) => {
                    const key = toDateKey(d);
                    const isToday = key === todayKey;
                    return (
                      <div key={i} className="p-2 text-center border-l">
                        <p className="text-xs text-muted-foreground">{DAY_NAMES[d.getDay()]}</p>
                        <p className={cn("text-sm font-semibold mt-0.5", isToday && "text-blue-600")}>
                          {d.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {/* Fila sin hora: hitos, eventos de todo el día y vencimientos.
                    Nada de esto tiene hora, así que no cabe en un slot. */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-slate-50/50">
                  <div className="p-1 text-[11px] text-muted-foreground text-right pr-2">
                    Todo el día
                  </div>
                  {weekDays.map((d, di) => {
                    const key = toDateKey(d);
                    const untimed = (itemsByDate[key] || []).filter(
                      (i) => i.source !== "event" || i.event?.allDay,
                    );
                    return (
                      <div
                        key={di}
                        className="border-l p-0.5 min-h-[32px] cursor-pointer hover:bg-slate-50 space-y-0.5"
                        onClick={() => { setSelectedDate(key); openAddEvent(key); }}
                      >
                        {untimed.map((item) => (
                          <ItemChip key={item.key} item={item} />
                        ))}
                      </div>
                    );
                  })}
                </div>
                {/* Time slots */}
                <div className="max-h-[500px] overflow-y-auto">
                  {HOURS.map(hour => (
                    <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[48px]">
                      <div className="p-1 text-[11px] text-muted-foreground text-right pr-2 border-t">
                        {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                      </div>
                      {weekDays.map((d, di) => {
                        const key = toDateKey(d);
                        const dayEvts = (itemsByDate[key] || []).filter(item => {
                          if (item.source !== "event" || item.event?.allDay) return false;
                          return new Date(item.event!.startDate).getHours() === hour;
                        });
                        return (
                          <div
                            key={di}
                            className="border-l border-t p-0.5 cursor-pointer hover:bg-slate-50 relative"
                            onClick={() => { setSelectedDate(key); openAddEvent(key); }}
                          >
                            {dayEvts.map((item) => (
                              <ItemChip key={item.key} item={item} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ─── Month View ─── */
              <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {/* Day headers */}
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="bg-slate-50 py-2 text-center text-xs font-semibold text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
                {/* Day cells */}
                {calendarGrid.map((cell, idx) => {
                  const dayItems = cell.dateKey ? itemsByDate[cell.dateKey] || [] : [];
                  const isToday = cell.dateKey === todayKey;
                  const isSelected = cell.dateKey === selectedDate;
                  const hidden = dayItems.length - 3;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "bg-white min-h-[80px] p-1 cursor-pointer transition-colors hover:bg-slate-50",
                        !cell.day && "bg-slate-50/50",
                        isSelected && "ring-2 ring-blue-500 ring-inset",
                      )}
                      onClick={() => {
                        if (cell.dateKey) setSelectedDate(cell.dateKey);
                      }}
                    >
                      {cell.day && (
                        <>
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                              isToday && "bg-blue-600 text-white",
                            )}
                          >
                            {cell.day}
                          </span>
                          <div className="mt-0.5 space-y-0.5">
                            {dayItems.slice(0, 3).map((item) => (
                              <ItemChip key={item.key} item={item} compact />
                            ))}
                            {hidden > 0 && (
                              <p className="text-[10px] text-muted-foreground pl-1">
                                +{hidden} más
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Panel */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedDate
                ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "Select a day"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Click a day on the calendar to see events.</p>
            ) : selectedItems.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No events on this day.</p>
                <Button size="sm" variant="outline" onClick={() => openAddEvent(selectedDate)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Event
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedItems.map((item) => {
                  const evt = item.event;

                  // Hitos y vencimientos: sólo lectura.
                  if (!evt) {
                    const style = SOURCE_STYLES[item.source as Exclude<SourceKey, "event">];
                    const readOnly = item.source === "project" || item.source === "phase";
                    return (
                      <div
                        key={item.key}
                        role={readOnly ? "button" : undefined}
                        onClick={() => openItem(item)}
                        className={cn(
                          "border rounded-lg p-3 space-y-1",
                          style.panel,
                          readOnly && "cursor-pointer hover:brightness-95",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {item.milestone && (
                            <span className={cn("text-xs shrink-0", style.text)}>
                              {milestoneGlyph(item.milestone.kind)}
                            </span>
                          )}
                          {sourceIcon(item.source, cn("h-3.5 w-3.5 shrink-0", style.text))}
                          <span className="font-medium text-sm truncate">{item.title}</span>
                        </div>
                        <p className={cn("text-xs", style.text)}>{item.subtitle}</p>
                      </div>
                    );
                  }

                  return (
                    <div key={item.key} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: evt.color || "#3b82f6" }}
                          />
                          <span className="font-medium text-sm">{evt.title}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500"
                          onClick={() => handleDelete(evt.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {evt.description && (
                        <p className="text-xs text-muted-foreground">{evt.description}</p>
                      )}
                      {!evt.allDay && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(evt.startDate).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {evt.endDate && (
                            <>
                              {" - "}
                              {new Date(evt.endDate).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </>
                          )}
                        </p>
                      )}
                      {evt.allDay && (
                        <Badge variant="secondary" className="text-[10px]">All Day</Badge>
                      )}
                    </div>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => openAddEvent(selectedDate)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Event
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Event Dialog */}
      <Dialog
        open={addEventOpen}
        onOpenChange={(open) => {
          setAddEventOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Event title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formAllDay}
                onCheckedChange={setFormAllDay}
                id="all-day"
              />
              <Label htmlFor="all-day">All day</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                />
              </div>
              {!formAllDay && (
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
              {!formAllDay && (
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      formColor === c.value
                        ? "border-slate-900 scale-110"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setFormColor(c.value)}
                  />
                ))}
              </div>
            </div>

            {/* Link to entities */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact</Label>
                <Select value={formContactId} onValueChange={setFormContactId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEventOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Calendar;
