import { useState } from "react";
import { format } from "date-fns";
import { CalendarRange, Check } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  LEAD_DATE_PRESETS,
  resolvePreset,
  type LeadDatePreset,
  type StageDateFilterValue,
} from "@/lib/lead-date-filter";

interface StageDateFilterProps {
  value: StageDateFilterValue;
  onChange: (value: StageDateFilterValue) => void;
  /** Cuántos leads oculta el filtro ahora mismo, para poder decirlo en el botón. */
  hiddenCount: number;
}

/**
 * Filtra por fecha los leads de una etapa. Se monta sólo en las etapas ganadoras,
 * que son las que crecen sin parar y acaban con un scroll inmanejable.
 *
 * Es un único `Popover` con los atajos y, dentro, el calendario para el rango a
 * medida. Anidar un `Popover` dentro de un `DropdownMenu` obliga a coordinar dos
 * portales y el foco entre ambos; con uno solo no hay nada que coordinar.
 */
export const StageDateFilter = ({ value, onChange, hiddenCount }: StageDateFilterProps) => {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(value.preset === 'custom');
  // El calendario lleva su propia selección a medias. El filtro sólo se aplica
  // cuando el rango está completo: aplicarlo al primer click vaciaría la columna
  // durante un instante, entre una fecha y la otra.
  const [draft, setDraft] = useState<DateRange | undefined>(value.range);

  // Se resalta por lo que realmente filtra, no por el atajo elegido: "Custom range"
  // recién abierto todavía no oculta nada.
  const isActive = Boolean(value.range);

  const label = isActive
    ? `Filtering by date, ${hiddenCount} hidden. Change or clear`
    : 'Filter this stage by date';

  const selectPreset = (preset: LeadDatePreset) => {
    onChange({ preset, range: resolvePreset(preset) });
    setDraft(undefined);
    setShowCalendar(false);
    setOpen(false);
  };

  const openCustom = () => {
    if (showCalendar) {
      setShowCalendar(false);
      return;
    }
    // Se empieza de cero. Si no, al venir de un atajo el calendario abriría en el mes
    // de ese rango —enero, con "This year"— y los clicks extenderían aquel rango en
    // lugar de iniciar uno nuevo.
    setDraft(undefined);
    onChange({ preset: 'custom', range: undefined });
    setShowCalendar(true);
  };

  const selectDraft = (range: DateRange | undefined) => {
    setDraft(range);
    if (range?.from && range.to) {
      onChange({ preset: 'custom', range });
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Al reabrir, el panel arranca donde lo dejó el filtro activo.
        if (next) {
          setShowCalendar(value.preset === 'custom');
          setDraft(value.range);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          title={label}
          className={`h-6 w-6 shrink-0 ${isActive ? 'text-primary bg-primary/10 hover:bg-primary/15' : 'text-muted-foreground'}`}
        >
          <CalendarRange className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-auto p-1">
        <div className="flex flex-col">
          {LEAD_DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => selectPreset(preset.value)}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <Check
                className={`h-3.5 w-3.5 shrink-0 ${
                  value.preset === preset.value ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <span className="whitespace-nowrap">{preset.label}</span>
            </button>
          ))}

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            onClick={openCustom}
            aria-expanded={showCalendar}
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <Check
              className={`h-3.5 w-3.5 shrink-0 ${value.preset === 'custom' ? 'opacity-100' : 'opacity-0'}`}
            />
            <span className="whitespace-nowrap">Custom range</span>
          </button>

          {showCalendar && (
            <div className="border-t mt-1 pt-1">
              <Calendar
                mode="range"
                defaultMonth={draft?.from ?? new Date()}
                selected={draft}
                onSelect={selectDraft}
                numberOfMonths={1}
              />
              <p className="px-2 pb-1 text-xs text-muted-foreground">
                {draft?.from
                  ? draft.to
                    ? `${format(draft.from, 'd MMM yyyy')} — ${format(draft.to, 'd MMM yyyy')}`
                    : `${format(draft.from, 'd MMM yyyy')} — pick the end date`
                  : 'Pick a start and end date'}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
