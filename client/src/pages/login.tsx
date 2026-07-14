import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, Lock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { login, isLoggingIn, loginError } = useAuth();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!password.trim()) {
      setLocalError("Please enter a password");
      return;
    }

    try {
      await login(password);
    } catch (err: any) {
      setLocalError(err?.message || "Login failed. Please try again.");
      setPassword("");
      inputRef.current?.focus();
    }
  };

  const errorMessage = localError || (loginError?.message ?? "");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/ug-hub-logo.png"
            alt="Undergraduate Hub"
            className="h-24 w-24 object-contain mb-4"
          />
          <h1 className="text-2xl font-bold tracking-tight text-center">Undergraduate Hub</h1>
          <p className="text-sm font-medium text-muted-foreground mt-0.5">Saga Inventory</p>
          <p className="text-muted-foreground text-xs mt-1">Sign in to continue</p>
        </div>

        {/* Login card */}
        <div className="rounded-xl border bg-card p-6 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLocalError("");
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isLoggingIn}
                  className={`pr-10 ${errorMessage ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div
                className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive"
                role="alert"
                data-testid="login-error"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoggingIn || !password}
              data-testid="button-login"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Undergraduate Hub &mdash; Saga Inventory Management System
        </p>
      </div>
    </div>
  );
}
