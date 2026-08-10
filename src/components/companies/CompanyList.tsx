import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { companyService } from "@/services/company.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CompanyForm } from "./CompanyForm";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { AlertCircle, ChevronsLeft, ChevronsRight, Pencil, Search, Trash2 } from "lucide-react";
import type { Company } from "@/types/api";

const ITEMS_PER_PAGE = 20;

export const CompanyList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: companiesData, isLoading, error } = useQuery({
    queryKey: ["companies", currentPage, debouncedSearch, currentOrganization?.id],
    queryFn: async () => {
      if (!session) throw new Error("Not authenticated");
      if (!currentOrganization) throw new Error("No organization selected");

      const filters: { search?: string } = {};
      if (debouncedSearch) filters.search = debouncedSearch;

      const response = await companyService.getCompanies(currentPage, ITEMS_PER_PAGE, filters);
      return {
        companies: response.data ?? [],
        total: response.pagination.total,
        totalPages: response.pagination.pages,
      };
    },
    enabled: !!session && !!currentOrganization,
  });

  const totalPages = companiesData?.totalPages ?? 0;

  const handleDelete = async () => {
    if (!deleteCompany?.id || isDeleting) return;
    try {
      setIsDeleting(true);
      await companyService.deleteCompany(deleteCompany.id);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Company deleted", description: `${deleteCompany.name} has been removed.` });
    } catch {
      toast({ title: "Error", description: "Could not delete company.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteCompany(null);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const MAX = 5;
    if (totalPages <= MAX) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("ellipsis");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("ellipsis");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("ellipsis");
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load companies. Please try again."}
        </AlertDescription>
      </Alert>
    );
  }

  const noCompanies = !companiesData?.companies || companiesData.companies.length === 0;

  return (
    <div className="flex flex-col space-y-4">
      {/* Search */}
      <div className="flex items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search companies..."
            className="w-full pl-8 pr-4"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {noCompanies ? (
        <div className="text-center py-8 bg-muted rounded-md">
          <p className="text-muted-foreground">
            {debouncedSearch
              ? "No companies found matching your search criteria."
              : "No companies found for this organization."}
          </p>
          {!debouncedSearch && (
            <p className="text-sm text-muted-foreground mt-1">
              Try adding some companies using the "New Company" button above.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px] hidden md:table-cell">Industry</TableHead>
                <TableHead className="w-[100px] hidden md:table-cell">Size</TableHead>
                <TableHead className="w-[80px] text-center">Contacts</TableHead>
                <TableHead className="w-[80px] text-center hidden sm:table-cell">Leads</TableHead>
                <TableHead className="w-[140px]">Assigned To</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companiesData.companies.map((company) => (
                <TableRow
                  key={company.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  <TableCell>
                    <span className="font-semibold">{company.name}</span>
                    {company.domain && (
                      <p className="text-xs text-muted-foreground">{company.domain}</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{company.industry ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="hidden md:table-cell">{company.size ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-center">{company._count?.contacts ?? 0}</TableCell>
                  <TableCell className="text-center hidden sm:table-cell">{company._count?.leads ?? 0}</TableCell>
                  <TableCell>
                    {company.assignedTo
                      ? company.assignedTo.fullName || company.assignedTo.email
                      : <span className="text-muted-foreground">Unassigned</span>}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditCompany(company)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteCompany(company)}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
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

      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Showing page {currentPage} of {totalPages} ({companiesData?.total ?? 0} total companies)
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {getPageNumbers().map((page, index) =>
                page === "ellipsis" ? (
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
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

      {/* Edit Dialog */}
      <Dialog open={editCompany !== null} onOpenChange={(open) => !open && setEditCompany(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>Update the company details below.</DialogDescription>
          </DialogHeader>
          {editCompany && (
            <CompanyForm
              initialData={editCompany}
              onSuccess={() => setEditCompany(null)}
              onCancel={() => setEditCompany(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteCompany !== null}
        onOpenChange={(open) => !open && setDeleteCompany(null)}
        onConfirm={handleDelete}
        title="Delete Company"
        description={`Are you sure you want to delete ${deleteCompany?.name}? This action cannot be undone.`}
      />
    </div>
  );
};
