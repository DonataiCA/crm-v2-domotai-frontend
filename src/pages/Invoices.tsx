import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { invoiceService } from "@/services/invoice.service";
import { contactService } from "@/services/contact.service";
import { projectService } from "@/services/project.service";
import { exportService } from "@/services/export.service";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Receipt,
  DollarSign,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Download,
  Trash2,
  Eye,
  Send,
  X,
  FileDown,
  Mail,
} from "lucide-react";
import type { Invoice, Contact, Project } from "@/types/api";

const ITEMS_PER_PAGE = 12;

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

const emptyLineItem: LineItem = { description: "", quantity: 1, unitPrice: 0 };

const Invoices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formContactId, setFormContactId] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formTax, setFormTax] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<LineItem[]>([{ ...emptyLineItem }]);

  // Queries
  const { data: invoicesData, isLoading, error } = useQuery({
    queryKey: ["invoices", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) throw new Error("No organization selected");
      return invoiceService.getInvoices(1, 500);
    },
    enabled: !!currentOrganization,
  });

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

  const invoices = invoicesData?.data || [];
  const contacts: Contact[] = contactsData?.data || [];
  const projects: Project[] = projectsData?.data || [];

  // Derived stats
  const totalRevenue = useMemo(
    () => invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.total, 0),
    [invoices],
  );
  const paidCount = useMemo(() => invoices.filter((i) => i.status === "PAID").length, [invoices]);
  const pendingCount = useMemo(
    () => invoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE").length,
    [invoices],
  );

  // Filtered
  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.contact?.name.toLowerCase().includes(q) ||
        inv.project?.name.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };
  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  // Form helpers
  const resetForm = () => {
    setFormContactId("");
    setFormProjectId("");
    setFormDueDate("");
    setFormTax(0);
    setFormNotes("");
    setFormItems([{ ...emptyLineItem }]);
  };

  const formSubtotal = useMemo(
    () => formItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    [formItems],
  );
  const formTotal = formSubtotal + formTax;

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setFormItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addLineItem = () => setFormItems((prev) => [...prev, { ...emptyLineItem }]);
  const removeLineItem = (index: number) =>
    setFormItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  // Actions
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoices"] });

  const handleCreate = async () => {
    if (formItems.every((i) => !i.description.trim())) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await invoiceService.createInvoice({
        contactId: formContactId || null,
        projectId: formProjectId || null,
        dueDate: formDueDate || null,
        tax: formTax,
        notes: formNotes || null,
        items: formItems
          .filter((i) => i.description.trim())
          .map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
      });
      toast({ title: "Invoice created" });
      setNewInvoiceOpen(false);
      resetForm();
      invalidate();
    } catch (err: any) {
      toast({
        title: "Error creating invoice",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (inv: Invoice) => {
    try {
      await invoiceService.markAsPaid(inv.id);
      toast({ title: `Invoice ${inv.invoiceNumber} marked as paid` });
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleMarkSent = async (inv: Invoice) => {
    try {
      await invoiceService.markAsSent(inv.id);
      toast({ title: `Invoice ${inv.invoiceNumber} marked as sent` });
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await invoiceService.deleteInvoice(deleteTarget.id);
      toast({ title: "Invoice deleted" });
      setDeleteTarget(null);
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleExport = async () => {
    try {
      await exportService.exportInvoicesCSV();
      toast({ title: "CSV downloaded" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    }
  };

  const formatCurrency = (val: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(val);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold mb-4">No Organization Selected</h2>
        <p className="text-muted-foreground">Please select an organization to view invoices.</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">{currentOrganization.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog
            open={newInvoiceOpen}
            onOpenChange={(open) => {
              setNewInvoiceOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Select value={formContactId} onValueChange={setFormContactId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact..." />
                      </SelectTrigger>
                      <SelectContent>
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
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  <Label>Line Items</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[45%]">Description</TableHead>
                          <TableHead className="w-[15%]">Qty</TableHead>
                          <TableHead className="w-[20%]">Unit Price</TableHead>
                          <TableHead className="w-[15%] text-right">Total</TableHead>
                          <TableHead className="w-[5%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Input
                                placeholder="Description"
                                value={item.description}
                                onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateLineItem(idx, "quantity", Number(e.target.value) || 1)
                                }
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unitPrice}
                                onChange={(e) =>
                                  updateLineItem(idx, "unitPrice", Number(e.target.value) || 0)
                                }
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </TableCell>
                            <TableCell>
                              {formItems.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => removeLineItem(idx)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>

                {/* Tax */}
                <div className="space-y-2">
                  <Label>Tax ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formTax}
                    onChange={(e) => setFormTax(Number(e.target.value) || 0)}
                  />
                </div>

                {/* Totals */}
                <div className="flex justify-end gap-6 text-sm pt-2 border-t">
                  <div>
                    <span className="text-muted-foreground">Subtotal: </span>
                    <span className="font-medium">{formatCurrency(formSubtotal)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tax: </span>
                    <span className="font-medium">{formatCurrency(formTax)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-bold">{formatCurrency(formTotal)}</span>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setNewInvoiceOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? "Creating..." : "Create Invoice"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold">{invoices.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold">{paidCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 pb-4">
            <div className="h-10 w-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <ListFilter className="h-4 w-4 mr-2" />
              Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={statusFilter === "all"}
              onCheckedChange={() => handleStatusChange("all")}
            >
              All
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "DRAFT"}
              onCheckedChange={() => handleStatusChange("DRAFT")}
            >
              Draft
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "SENT"}
              onCheckedChange={() => handleStatusChange("SENT")}
            >
              Sent
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "PAID"}
              onCheckedChange={() => handleStatusChange("PAID")}
            >
              Paid
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "OVERDUE"}
              onCheckedChange={() => handleStatusChange("OVERDUE")}
            >
              Overdue
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "CANCELLED"}
              onCheckedChange={() => handleStatusChange("CANCELLED")}
            >
              Cancelled
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {invoices.length === 0
            ? "No invoices yet. Create your first invoice to get started."
            : "No invoices match your filters."}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.contact?.name || "-"}</TableCell>
                  <TableCell>{inv.project?.name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[inv.status]}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(inv.total, inv.currency)}
                  </TableCell>
                  <TableCell>{formatDate(inv.dueDate)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="View"
                        onClick={() => setDetailInvoice(inv)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-600"
                        title="Download PDF"
                        onClick={async () => {
                          try {
                            await invoiceService.downloadPDF(inv.id, inv.invoiceNumber);
                            toast({ title: "PDF downloaded" });
                          } catch {
                            toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
                          }
                        }}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      {inv.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-violet-600"
                          title="Send by Email"
                          onClick={async () => {
                            try {
                              await invoiceService.sendByEmail(inv.id);
                              toast({ title: "Invoice sent", description: "Invoice has been sent by email" });
                              invalidate();
                            } catch {
                              toast({ title: "Error", description: "Failed to send invoice", variant: "destructive" });
                            }
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      {inv.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600"
                          title="Mark Sent"
                          onClick={() => handleMarkSent(inv)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {(inv.status === "SENT" || inv.status === "OVERDUE") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600"
                          title="Mark Paid"
                          onClick={() => handleMarkPaid(inv)}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600"
                        title="Delete"
                        onClick={() => setDeleteTarget(inv)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} invoices
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailInvoice} onOpenChange={(open) => !open && setDetailInvoice(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice {detailInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {detailInvoice && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="secondary" className={statusColors[detailInvoice.status]}>
                    {detailInvoice.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Issue Date</p>
                  <p className="font-medium">{formatDate(detailInvoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Client</p>
                  <p className="font-medium">{detailInvoice.contact?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(detailInvoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Project</p>
                  <p className="font-medium">{detailInvoice.project?.name || "-"}</p>
                </div>
                {detailInvoice.paidAt && (
                  <div>
                    <p className="text-muted-foreground">Paid At</p>
                    <p className="font-medium">{formatDate(detailInvoice.paidAt)}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              {detailInvoice.items && detailInvoice.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailInvoice.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unitPrice, detailInvoice.currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total, detailInvoice.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-col items-end gap-1 text-sm border-t pt-3">
                <div>
                  <span className="text-muted-foreground">Subtotal: </span>
                  <span className="font-medium">
                    {formatCurrency(detailInvoice.subtotal, detailInvoice.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tax: </span>
                  <span className="font-medium">
                    {formatCurrency(detailInvoice.tax, detailInvoice.currency)}
                  </span>
                </div>
                <div className="text-base">
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-bold">
                    {formatCurrency(detailInvoice.total, detailInvoice.currency)}
                  </span>
                </div>
              </div>

              {detailInvoice.notes && (
                <div>
                  <p className="text-muted-foreground mb-1">Notes</p>
                  <p className="whitespace-pre-wrap">{detailInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {deleteTarget?.invoiceNumber}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Invoices;
