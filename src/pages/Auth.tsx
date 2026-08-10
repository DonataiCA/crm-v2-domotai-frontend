import { useState } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";
import { Eye, EyeOff } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

// ─── Validation schema ──────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Component ──────────────────────────────────────────────────────────────

/** Validate the redirect target is a relative path (prevent open-redirect). */
const safeRedirect = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    // Must start with a single "/" and not "//" (which is protocol-relative)
    if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
  } catch { /* malformed URI */ }
  return null;
};

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, userRole, refreshSession } = useAuth();
  const [searchParams] = useSearchParams();
  const redirectTarget = safeRedirect(searchParams.get('redirect'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldChangePassword, setShouldChangePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in and no password change needed, redirect
  if (session && !shouldChangePassword) {
    const isClient = userRole?.toLowerCase() === 'client';
    return <Navigate to={redirectTarget || (isClient ? "/project-dashboard" : "/")} replace />;
  }

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsSubmitting(true);
      const response = await authService.login(values.email, values.password);

      // Check if password change is needed BEFORE refreshing session
      // (refreshing session triggers re-render which may redirect)
      if (response.user?.shouldChangePassword) {
        setShouldChangePassword(true);
        // Still refresh session so user data is available for ChangePasswordForm
        await refreshSession();
        return; // Don't navigate - show password change form
      }

      // Refresh the AuthContext so session is populated
      await refreshSession();

      if (redirectTarget) {
        navigate(redirectTarget);
      } else if (response.user?.role === 'client') {
        navigate("/project-dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Login failed. Please check your credentials.";

      // Axios wraps API errors in response.data
      let description = message;
      if (typeof error === "object" && error !== null && "response" in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        description = axiosError.response?.data?.error ?? message;
      }

      toast({
        variant: "destructive",
        title: "Authentication Error",
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Change password flow ───────────────────────────────────────────────

  if (shouldChangePassword) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 max-w-md">
          <h1 className="text-2xl font-bold mb-6">Change Your Password</h1>
          <p className="mb-4 text-muted-foreground">
            Please change your password before continuing.
          </p>
          <ChangePasswordForm
            onSuccess={() => {
              setShouldChangePassword(false);
              navigate(redirectTarget || "/");
            }}
          />
        </div>
      </div>
    );
  }

  // ─── Login form ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex items-center pb-2">
          <img
            src="/lovable-uploads/4eccf673-365a-4879-9e88-1b83b9e95d63.png"
            alt="Logo"
            className="h-12 mx-auto mb-4"
          />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                style={{ backgroundColor: "#FF5F00" }}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
