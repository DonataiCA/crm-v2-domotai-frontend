import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { subscriptionService } from "@/services/subscription.service";
import { BILLING_TYPE_LABELS } from "./billing-type";
import type { BillingInterval, CollectionRow } from "@/types/api";

/**
 * Cambio de plan de un servicio, abierto desde uno de sus cobros.
 *
 * Se editan las tres cosas a la vez porque van juntas: pasar de mensual a trimestral sin
 * poder ajustar el importe deja el servicio cobrando el precio de un mes cada tres.
 *
 * Lo ya cobrado no se toca — el cambio rige desde el próximo periodo —, y por eso el
 * diálogo lo dice: es la duda que tiene cualquiera antes de pulsar.
 */

const INTERVALS: BillingInterval[] = ["MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL"];

interface ChangePlanDialogProps {
  /** El cobro desde el que se abrió; su `subscriptionId` es el servicio a editar. */
  row: CollectionRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ChangePlanDialog({ row, onOpenChange, onSaved }: ChangePlanDialogProps) {
  const { toast } = useToast();
  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState(0);
  const [interval, setInterval] = useState<BillingInterval>("MONTHLY");
  const [isSaving, setIsSaving] = useState(false);

  // La fila trae el servicio y el importe que se está cobrando: son el punto de partida.
  useEffect(() => {
    if (!row) return;
    setServiceName(row.service ?? "");
    setAmount(Number(row.total) || 0);
    if (row.billingType !== "ONE_OFF") setInterval(row.billingType);
  }, [row]);

  const save = async () => {
    if (!row?.subscriptionId || isSaving) return;
    try {
      setIsSaving(true);
      await subscriptionService.updateSubscription(row.subscriptionId, {
        serviceName,
        amount: Number(amount),
        interval,
      });
      toast({
        title: "Plan updated",
        description: `From now on: ${BILLING_TYPE_LABELS[interval]}.`,
      });
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: "Could not update the plan", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Service</Label>
            <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount per period</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Repeats</Label>
              <Select value={interval} onValueChange={(v) => setInterval(v as BillingInterval)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVALS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {BILLING_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Charges already issued stay as they are. The new plan applies from the next
            period onwards.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || !serviceName.trim() || amount <= 0}>
            {isSaving ? "Saving..." : "Save plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
