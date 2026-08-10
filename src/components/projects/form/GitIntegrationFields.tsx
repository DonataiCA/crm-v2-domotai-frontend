import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GitBranch, Github, Globe } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ProjectFormValues } from "./types";

interface GitIntegrationFieldsProps {
  form: UseFormReturn<ProjectFormValues>;
}

export const GitIntegrationFields = ({ form }: GitIntegrationFieldsProps) => {
  const handleRepositoryUrlChange = (url: string) => {
    // Extract owner and repository name from GitHub URL
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      const [, owner, repo] = match;
      form.setValue("github_owner", owner);
      form.setValue("repository_name", repo.replace('.git', ''));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Git Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="repository_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repository URL</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="https://github.com/username/repository"
                  onChange={(e) => {
                    field.onChange(e);
                    handleRepositoryUrlChange(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                GitHub repository URL for tracking project progress
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="github_owner"
            render={({ field }) => (
              <FormItem>
                <FormLabel>GitHub Owner</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="username or organization" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="repository_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repository Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="repository-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="default_branch"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Default Branch
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="main" />
              </FormControl>
              <FormDescription>
                Main branch for tracking overall project progress
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Production URL */}
        <FormField
          control={form.control}
          name="production_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Production URL
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://myproject.com" />
              </FormControl>
              <FormDescription>
                URL del proyecto en produccion (para monitoreo de salud)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};