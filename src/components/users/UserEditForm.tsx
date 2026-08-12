import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api-client";
import { UserRole, normalizeRole } from "@/constants";

const userEditFormSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
  role: z.string(),
});

type UserEditFormValues = z.infer<typeof userEditFormSchema>;

interface UserEditFormProps {
  user: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    full_name?: string | null;
    role: string;
    phone?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserEditForm({ user, open, onOpenChange }: UserEditFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditFormSchema),
    defaultValues: {
      email: user.email || '',
      fullName: user.fullName || user.full_name || '',
      phone: user.phone || '',
      role: normalizeRole(user.role) || UserRole.FREELANCER,
    },
  });

  const { mutate: updateUser, isPending } = useMutation({
    mutationFn: async (values: UserEditFormValues) => {
      const { data } = await api.put('/users/' + user.id, {
        ...values,
      });
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  function onSubmit(values: UserEditFormValues) {
    updateUser(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Phone Number" type="tel" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="salesman">Salesman</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              Update User
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
