import { useState } from "react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addMonths, startOfMonth } from "date-fns";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type AnalyticsFilters = {
  dateRange: {
    from: Date;
    to: Date;
  };
  groupBy: "day" | "week" | "month";
};

interface AnalyticsFiltersProps {
  onFiltersChange: (filters: AnalyticsFilters) => void;
}

export const AnalyticsFilters = ({ onFiltersChange }: AnalyticsFiltersProps) => {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: startOfMonth(addMonths(new Date(), -11)),
    to: new Date(),
  });

  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("month");

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      const newDateRange = { from: range.from, to: range.to };
      setDateRange(newDateRange);
      onFiltersChange({ dateRange: newDateRange, groupBy });
    }
  };

  const handleGroupByChange = (value: "day" | "week" | "month") => {
    setGroupBy(value);
    onFiltersChange({ dateRange, groupBy: value });
  };

  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
      <div className="space-y-2">
        <Label>Date Range</Label>
        <DatePickerWithRange 
          date={dateRange}
          onDateChange={handleDateRangeChange}
        />
      </div>
      <div className="space-y-2">
        <Label>Group By</Label>
        <Select
          value={groupBy}
          onValueChange={handleGroupByChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select grouping" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};