import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ContactFormValues } from "./types";
import { useState } from "react";

const leadSourceOptions = [
  "Personal contacts",
  "Website",
  "Search Engines (SEO)",
  "Paid Ads (PPC)",
  "Social Media",
  "Content Marketing",
  "Referrals",
  "Networking Events",
  "Partnerships",
  "Cold Emailing",
  "Cold Calling",
  "Freelance Platforms",
  "Business Directories",
  "Word of Mouth",
  "Previous Clients",
  "Email Campaigns",
  "Inbound Calls or Messages",
  "Webinars or Workshops",
  "Industry Publications",
  "Job Boards"
];

interface AdditionalFieldsProps {
  form: UseFormReturn<ContactFormValues>;
}

export const AdditionalFields = ({ form }: AdditionalFieldsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleLeadSourceChange = (value: string) => {
    form.setValue("lead_source", value);
    if (value.trim()) {
      const filtered = leadSourceOptions.filter(option =>
        option.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Website</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="lead_source"
        render={({ field }) => (
          <FormItem className="relative">
            <FormLabel>Lead Source</FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={(e) => handleLeadSourceChange(e.target.value)}
                list="lead-sources"
              />
            </FormControl>
            <datalist id="lead-sources">
              {suggestions.map((option, index) => (
                <option key={index} value={option} />
              ))}
            </datalist>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};