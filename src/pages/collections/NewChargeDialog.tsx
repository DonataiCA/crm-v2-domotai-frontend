import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { contactService } from "@/services/contact.service";
import { projectService } from "@/services/project.service";
import { invoiceService } from "@/services/invoice.service";
import { subscriptionService } from "@/services/subscription.service";
import {
  validateCharge,
  previewTotals,
  buildInvoicePayload,
  type ChargeForm,
  type ChargeItem,
} from "./charge-form";
import type { BillingInterval } from "@/types/api";
import { Plus, Repeat, Trash2, Wallet } from "lucide-react";

/**
 * Alta de un cobro desde Cobranzas.
 *
 * El tipo va primero porque cambia el resto del formulario: un pago único crea una nota
 * suelta (`POST /invoices`), y un servicio recurrente crea el compromiso y su primera
 * nota (`POST /subscriptions`), de modo que el día elegido pasa a ser el día de cobro de
 * todos los periodos siguientes.
 *
 * Los importes se muestran mientras se rellena, pero **el que se guarda es el que
 * calcula el servidor**: aquí es una comodidad, no la fuente de verdad.
 */

const INTERVAL_LABELS: Array<{ value: BillingInterval; label: string }> = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "BIANNUAL", label: "Every 6 months" },
  { value: "ANNUAL", label: "Yearly" },
];

const emptyItem: ChargeItem = { description: "", quantity: 1, unitPrice: 0 };

const initialForm = (): ChargeForm => ({
  type: "ONE_OFF",
  contactId: "",
  projectId: "",
  dueDate: "",
  interval: "MONTHLY",
  tax: 0,
  notes: "",
  items: [{ ...emptyItem }],
});

interface NewChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama tras crear, para refrescar la lista y el resumen. */
  onCreated: () => void;
}

export function NewChargeDialog({ open, onOpenChange, onCreated }: NewChargeDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<ChargeForm>(initialForm);
  const [errors, setErrors] = useState<ReturnType<typeof validateCharge>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: contactsData } = useQuery({
    queryKey: ["contacts-for-charge"],
    queryFn: () => contactService.getContacts(1, 500),
    enabled: open,
  });
  const { data: projectsData } = useQuery({
    queryKey: ["projects-for-charge"],
    queryFn: () => projectService.getProjects(1, 500),
    enabled: open,
  });

  const contacts = contactsData?.data ?? [];
  const projects = projectsData?.data ?? [];

  const totals = useMemo(() => previewTotals(form.items, form.tax), [form.items, form.tax]);
  const isRecurring = form.type === "RECURRING";

  const set = <K extends keyof ChargeForm>(key: K, value: ChargeForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setItem = (index: number, patch: Partial<ChargeItem>) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));

  const close = () => {
    setForm(initialForm());
    setErrors({});
    onOpenChange(false);
  };

  const submit = async () => {
    const found = validateCharge(form);
    setErrors(found);
    if (Object.keys(found).length > 0 || isSaving) return;

    const items = form.items.filter((i) => i.description.trim());

    try {
      setIsSaving(true);

      if (isRecurring) {
        // Un servicio se cobra siempre por lo mismo, así que va en una sola línea: su
        // descripción es el nombre del servicio y su importe, el del periodo.
        const [line] = items;
        await subscriptionService.createSubscription({
          contactId: form.contactId,
          projectId: form.projectId || null,
          serviceName: line.description,
          amount: Number(line.quantity) * Number(line.unitPrice),
          interval: form.interval,
          startDate: form.dueDate,
          notes: form.notes || null,
        });
      } else {
        await invoiceService.createInvoice(buildInvoicePayload(form));
      }

      toast({
        title: isRecurring ? "Service created" : "Charge created",
        description: isRecurring
          ? "Its first charge is already in the list."
          : "It is already in the list.",
      });
      onCreated();
      close();
    } catch {
      toast({
        title: isRecurring ? "Could not create the service" : "Could not create the charge",
        description: "Check the fields and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New charge</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* El tipo va primero: cambia lo que se pide debajo. */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "ONE_OFF", label: "One-off payment", hint: "A product or a one-time service", icon: Wallet },
              { value: "RECURRING", label: "Recurring service", hint: "Charged every period until cancelled", icon: Repeat },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => set("type", option.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  form.type === option.value
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground/40"
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{option.hint}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={form.contactId} onValueChange={(v) => set("contactId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.contactId && <p className="text-xs text-destructive">{errors.contactId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Project (optional)</Label>
              <Select value={form.projectId} onValueChange={(v) => set("projectId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{isRecurring ? "First charge date" : "Charge date"}</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
              {isRecurring && (
                <p className="text-xs text-muted-foreground">
                  Its day becomes the billing day of every following period.
                </p>
              )}
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate}</p>}
            </div>

            {isRecurring && (
              <div className="space-y-1.5">
                <Label>Repeats</Label>
                <Select
                  value={form.interval}
                  onValueChange={(v) => set("interval", v as BillingInterval)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_LABELS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.interval && <p className="text-xs text-destructive">{errors.interval}</p>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{isRecurring ? "Service" : "Line items"}</Label>
            {form.items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Input
                  placeholder={isRecurring ? "Service name" : "Description"}
                  value={item.description}
                  onChange={(e) => setItem(index, { description: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={0}
                  value={item.quantity}
                  onChange={(e) => setItem(index, { quantity: Number(e.target.value) })}
                  className="w-20"
                  aria-label="Quantity"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => setItem(index, { unitPrice: Number(e.target.value) })}
                  className="w-28"
                  aria-label="Unit price"
                />
                {form.items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}

            {/* Un servicio recurrente se cobra siempre por lo mismo: una sola línea. */}
            {!isRecurring && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }))
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add line
              </Button>
            )}
            {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!isRecurring && (
              <div className="space-y-1.5">
                <Label>Tax</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.tax}
                  onChange={(e) => set("tax", Number(e.target.value))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>

          {/* Vista previa: el importe definitivo lo calcula el servidor. */}
          <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">${totals.subtotal.toLocaleString("en-US")}</span>
            </div>
            {!isRecurring && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">${totals.tax.toLocaleString("en-US")}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>{isRecurring ? "Per period" : "Total"}</span>
              <span className="tabular-nums">
                ${(isRecurring ? totals.subtotal : totals.total).toLocaleString("en-US")}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isSaving}>
            {isSaving ? "Saving..." : isRecurring ? "Create service" : "Create charge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
