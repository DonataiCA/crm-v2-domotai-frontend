import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { OrganizationAuditLog } from "./OrganizationAuditLog";
import { OrganizationMemberList } from "./OrganizationMemberList";
import { NotificationPreferencesPanel } from "../notifications/NotificationPreferencesPanel";

const generalSchema = z.object({
  name: z.string().min(3, {
    message: "Organization name must be at least 3 characters.",
  }),
  slug: z.string().min(3, {
    message: "Slug must be at least 3 characters.",
  }).regex(/^[a-z0-9-]+$/, {
    message: "Slug can only contain lowercase letters, numbers, and hyphens.",
  }),
});

const appearanceSchema = z.object({
  colorScheme: z.enum(["default", "blue", "green", "purple", "dark"]),
});

type GeneralFormValues = z.infer<typeof generalSchema>;
type AppearanceFormValues = z.infer<typeof appearanceSchema>;

export function OrganizationSettings() {
  const { currentOrganization, updateOrganization, uploadLogo } = useOrganization();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    currentOrganization?.logo_url || null
  );
  
  const generalForm = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      name: currentOrganization?.name || "",
      slug: currentOrganization?.slug || "",
    },
  });
  
  const appearanceForm = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      colorScheme: currentOrganization?.color_scheme || "default",
    },
  });
  
  const onGeneralSubmit = async (data: GeneralFormValues) => {
    if (!currentOrganization) return;
    
    await updateOrganization(currentOrganization.id, {
      name: data.name,
      slug: data.slug
    });
    
    // Handle logo upload if a file is selected
    if (logoFile) {
      await uploadLogo(currentOrganization.id, logoFile);
      setLogoFile(null);
    }
  };

  const onAppearanceSubmit = async (data: AppearanceFormValues) => {
    if (!currentOrganization) return;
    
    await updateOrganization(currentOrganization.id, {
      color_scheme: data.colorScheme
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!currentOrganization) {
    return <div>No organization selected</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Organization Settings</h1>
      
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>
                Update your organization's basic information
              </CardDescription>
            </CardHeader>
            <Form {...generalForm}>
              <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)}>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                    <div className="flex-1 space-y-4">
                      <FormField
                        control={generalForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={generalForm.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Organization Slug</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Used in URLs: app.com/org/{field.value}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-center">
                        <FormLabel>Organization Logo</FormLabel>
                        <div className="mt-2 flex justify-center">
                          <div className="h-24 w-24 relative overflow-hidden rounded-md border flex items-center justify-center bg-muted">
                            {logoPreview ? (
                              <img 
                                src={logoPreview} 
                                alt="Logo preview" 
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-2xl font-bold text-muted-foreground">
                                {currentOrganization.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <Input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => document.getElementById('logo')?.click()}
                          >
                            Change Logo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={generalForm.formState.isSubmitting}>
                    {generalForm.formState.isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize your organization's appearance
              </CardDescription>
            </CardHeader>
            <Form {...appearanceForm}>
              <form onSubmit={appearanceForm.handleSubmit(onAppearanceSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={appearanceForm.control}
                    name="colorScheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color Scheme</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a color scheme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="blue">Blue</SelectItem>
                            <SelectItem value="green">Green</SelectItem>
                            <SelectItem value="purple">Purple</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          This will change the colors throughout the application.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Preview</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`h-10 rounded-md bg-primary`}></div>
                      <div className={`h-10 rounded-md bg-secondary`}></div>
                      <div className={`h-10 rounded-md bg-accent`}></div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={appearanceForm.formState.isSubmitting}>
                    {appearanceForm.formState.isSubmitting ? "Saving..." : "Save Appearance"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>
                Manage your organization members and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationMemberList />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Notificaciones</CardTitle>
              <CardDescription>
                Configura como y cuando recibir notificaciones por cada tipo de evento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferencesPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <OrganizationAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
