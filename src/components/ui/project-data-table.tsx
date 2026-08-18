import * as React from "react";
import { getProjectStatusLabel } from "@/constants";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, ExternalLink, Eye, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Project, ContactRef } from "@/types/api";
import type { ProjectMonitorSummary } from "@/types/monitor";

// --- STATUS BADGE VARIANTS ---
const statusBadgeVariants = cva("capitalize text-white text-xs", {
  variants: {
    variant: {
      active: "bg-emerald-500 hover:bg-emerald-600",
      inProgress: "bg-blue-500 hover:bg-blue-600",
      onHold: "bg-amber-500 hover:bg-amber-600",
      completed: "bg-green-600 hover:bg-green-700",
      notStarted: "bg-slate-400 hover:bg-slate-500",
    },
  },
  defaultVariants: {
    variant: "notStarted",
  },
});

function getStatusVariant(status: string | null): "active" | "inProgress" | "onHold" | "completed" | "notStarted" {
  if (!status) return "notStarted";
  const lower = status.toLowerCase();
  if (lower.includes("completed")) return "completed";
  if (lower.includes("progress") || lower.includes("track")) return "inProgress";
  if (lower.includes("hold")) return "onHold";
  if (lower.includes("active")) return "active";
  return "notStarted";
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// --- COLUMN DEFINITIONS ---
export type ProjectColumnKey = "name" | "status" | "price" | "timeline" | "clients" | "lead" | "repository" | "health";

// --- PROPS ---
interface ProjectDataTableProps {
  projects: Project[];
  visibleColumns: Set<ProjectColumnKey>;
  onProjectClick?: (project: Project) => void;
  onTrackClick?: (project: Project) => void;
  onMonitorClick?: (project: Project) => void;
  monitorData?: Map<string, ProjectMonitorSummary>;
}

// --- MAIN COMPONENT ---
export const ProjectDataTable = ({
  projects,
  visibleColumns,
  onProjectClick,
  onTrackClick,
  onMonitorClick,
  monitorData,
}: ProjectDataTableProps) => {
  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.03, duration: 0.25, ease: "easeOut" },
    }),
  };

  const headers: { key: ProjectColumnKey; label: string }[] = [
    { key: "name", label: "Project" },
    { key: "status", label: "Status" },
    { key: "health", label: "Salud" },
    { key: "price", label: "Value" },
    { key: "timeline", label: "Timeline" },
    { key: "clients", label: "Clients" },
    { key: "lead", label: "Project Lead" },
    { key: "repository", label: "Repository" },
  ];

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {headers
                .filter(h => visibleColumns.has(h.key))
                .map(h => (
                  <TableHead key={h.key}>{h.label}</TableHead>
                ))}
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length > 0 ? (
              projects.map((project, index) => {
                const variant = getStatusVariant(project.status);
                return (
                  <motion.tr
                    key={project.id}
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={rowVariants}
                    className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => onProjectClick?.(project)}
                  >
                    {visibleColumns.has("name") && (
                      <TableCell>
                        <div>
                          <span className="font-medium">{project.name}</span>
                          {project.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-xs">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.has("status") && (
                      <TableCell>
                        <Badge className={cn(statusBadgeVariants({ variant }))}>
                          {getProjectStatusLabel(project.status) || "Not Started"}
                        </Badge>
                      </TableCell>
                    )}

                    {visibleColumns.has("health") && (
                      <TableCell>
                        {(() => {
                          const m = monitorData?.get(project.id);
                          if (!m || !m.hasMonitoring) {
                            return <span className="text-xs text-muted-foreground">—</span>;
                          }
                          const dotColor = m.isUp === true ? "bg-green-500" : m.isUp === false ? "bg-red-500" : "bg-gray-400";
                          const label = m.isUp === true ? "Operativo" : m.isUp === false ? "Caído" : "Sin datos";
                          const textColor = m.isUp === true ? "text-green-600" : m.isUp === false ? "text-red-600" : "text-muted-foreground";
                          return (
                            <button
                              className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); onMonitorClick?.(project); }}
                            >
                              <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor} ${m.isUp === true ? "animate-pulse" : ""}`} />
                              <span className={`text-xs font-medium ${textColor}`}>{label}</span>
                              {m.errorCount24h > 0 && (
                                <span className="text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-medium leading-none">
                                  {m.errorCount24h}
                                </span>
                              )}
                            </button>
                          );
                        })()}
                      </TableCell>
                    )}

                    {visibleColumns.has("price") && (
                      <TableCell>
                        {(project.price ?? 0) > 0 ? (
                          <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                            <DollarSign className="h-3.5 w-3.5" />
                            {project.price!.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.has("timeline") && (
                      <TableCell>
                        {project.startDate ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(project.startDate), "MMM d, yy")}
                            {project.endDate && (
                              <> &rarr; {format(new Date(project.endDate), "MMM d, yy")}</>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.has("clients") && (
                      <TableCell>
                        <div className="flex -space-x-1.5">
                          {(project.contacts || []).slice(0, 4).map((contact: ContactRef) => (
                            <Avatar key={contact.id} className="h-7 w-7 border-2 border-background">
                              <AvatarFallback className="text-[9px] font-medium">
                                {getInitials(contact.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {(project.contacts || []).length > 4 && (
                            <Avatar className="h-7 w-7 border-2 border-background">
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                                +{project.contacts!.length - 4}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {(!project.contacts || project.contacts.length === 0) && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {visibleColumns.has("lead") && (
                      <TableCell>
                        {project.projectLead ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[9px] font-medium">
                                {getInitials(project.projectLead.fullName || project.projectLead.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {project.projectLead.fullName || project.projectLead.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                    )}

                    {visibleColumns.has("repository") && (
                      <TableCell>
                        {project.repositoryUrl ? (
                          <a
                            href={project.repositoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate max-w-[140px]">
                              {project.repositoryUrl.replace("https://github.com/", "")}
                            </span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}

                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={(e) => { e.stopPropagation(); onTrackClick?.(project); }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Track
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); onMonitorClick?.(project); }}
                          title="Monitor de producción"
                        >
                          <Activity className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.size + 1} className="h-24 text-center text-muted-foreground">
                  No projects found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
