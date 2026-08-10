
import { useState } from 'react';
import { Check, ChevronsUpDown, PlusCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { OrganizationForm } from './OrganizationForm';

export function OrganizationSelector() {
  const { organizations, currentOrganization, switchOrganization } = useOrganization();
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const navigate = useNavigate();

  // Always show the selector, even if no organization is selected

  return (
    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select organization"
            className="w-[200px] justify-between"
          >
            <div className="flex items-center gap-2 truncate">
              {currentOrganization ? (
                <>
                  {currentOrganization.logo_url ? (
                    <img
                      src={currentOrganization.logo_url}
                      alt={currentOrganization.name}
                      className="h-4 w-4 rounded-sm"
                    />
                  ) : (
                    <div className="h-4 w-4 rounded-sm bg-primary/10 flex items-center justify-center text-[10px] font-semibold">
                      {currentOrganization.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate">{currentOrganization.name}</span>
                </>
              ) : (
                <>
                  <div className="h-4 w-4 rounded-sm bg-muted flex items-center justify-center text-[10px] font-semibold">
                    ?
                  </div>
                  <span className="truncate text-muted-foreground">Select Organization</span>
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Search organization..." />
              <CommandEmpty>No organization found.</CommandEmpty>
              <CommandGroup heading="Organizations">
                {organizations.map((org) => (
                  <CommandItem
                    key={org.id}
                    onSelect={() => {
                      switchOrganization(org.id);
                      setOpen(false);
                    }}
                    className="text-sm"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="h-4 w-4 rounded-sm"
                        />
                      ) : (
                        <div className="h-4 w-4 rounded-sm bg-primary/10 flex items-center justify-center text-[10px] font-semibold">
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{org.name}</span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        currentOrganization?.id === org.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      setShowAddDialog(true);
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Organization
                  </CommandItem>
                </DialogTrigger>
                <CommandItem
                  onSelect={() => {
                    navigate('/organization/settings');
                    setOpen(false);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Organization Settings
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <OrganizationForm onSuccess={() => setShowAddDialog(false)} />
    </Dialog>
  );
}
