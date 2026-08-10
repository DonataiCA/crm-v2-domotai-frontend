import { useQuery, useQueryClient } from "@tanstack/react-query";
import { contactService } from "@/services/contact.service";
import { Table, TableBody } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { ContactDetailsDialog } from "./ContactDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ContactTableHeader } from "./ContactTableHeader";
import { ContactTableRow } from "./ContactTableRow";
import type { Contact } from '@/types/api';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "../ui/pagination";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { AlertCircle, ChevronsLeft, ChevronsRight, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const ITEMS_PER_PAGE = 10;

export const ContactList = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session } = useAuth();
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: contactsData, isLoading, error } = useQuery({
    queryKey: ["contacts", currentPage, debouncedSearch, session?.user.id, currentOrganization?.id],
    queryFn: async () => {
      if (!session) throw new Error("Not authenticated");
      if (!currentOrganization) throw new Error("No organization selected");

      const filters: Record<string, string> = {};
      if (debouncedSearch) {
        filters.search = debouncedSearch;
      }

      const response = await contactService.getContacts(currentPage, ITEMS_PER_PAGE, filters);

      return {
        contacts: response.data || [],
        total: response.pagination.total,
        page: response.pagination.page,
        pageSize: response.pagination.limit,
        totalPages: response.pagination.pages,
      };
    },
    enabled: !!session && !!currentOrganization,
  });

  const totalPages = contactsData ? contactsData.totalPages : 0;

  const handleDelete = async () => {
    if (!session || !contactToDelete?.id || isDeleting) return;

    try {
      setIsDeleting(true);

      // Archive instead of hard delete to preserve history
      await contactService.archiveContact(contactToDelete.id);

      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      toast({
        title: "Contacto archivado",
        description: "El contacto fue archivado y puede ser restaurado desde la sección de archivados.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo archivar el contacto",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setContactToDelete(null);
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const MAX_VISIBLE_PAGES = 5;
    
    if (totalPages <= MAX_VISIBLE_PAGES) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('ellipsis');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('ellipsis');
        pageNumbers.push(currentPage - 1);
        pageNumbers.push(currentPage);
        pageNumbers.push(currentPage + 1);
        pageNumbers.push('ellipsis');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  const jumpToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (isLoading) {
    return <div className="py-4 text-center">Loading contacts...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load contacts. Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!session) {
    return <div className="py-4 text-center">Please log in to view contacts.</div>;
  }

  if (!currentOrganization) {
    return <div className="py-4 text-center">Please select an organization to view contacts.</div>;
  }

  const noContacts = !contactsData?.contacts || contactsData.contacts.length === 0;

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="w-full pl-8 pr-4"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {noContacts ? (
        <div className="text-center py-8 bg-muted rounded-md">
          <p className="text-muted-foreground">
            {debouncedSearch 
              ? "No contacts found matching your search criteria." 
              : "No contacts found for this organization."}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {!debouncedSearch && "Try adding some contacts using the \"Add Contact\" button above."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <ContactTableHeader />
            <TableBody>
              {contactsData.contacts.map((contact) => (
                <ContactTableRow
                  key={contact.id}
                  contact={contact}
                  onSelect={setSelectedContact}
                  onDelete={setContactToDelete}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Showing page {currentPage} of {totalPages} ({contactsData.total} total contacts)
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => jumpToPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {getPageNumbers().map((page, index) => 
                page === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(Number(page))}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => jumpToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <ContactDetailsDialog
        contact={selectedContact}
        open={selectedContact !== null}
        onOpenChange={(open) => !open && setSelectedContact(null)}
      />

      <ConfirmDialog
        open={contactToDelete !== null}
        onOpenChange={(open) => !open && setContactToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Contact"
        description={`Are you sure you want to delete ${contactToDelete?.name}? This action cannot be undone and will remove all associated data.`}
      />
    </div>
  );
};
