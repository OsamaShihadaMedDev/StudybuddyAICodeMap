import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Status = "parsing" | "invalid" | "ready" | "submitting";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updatePassword } = useAuth();

  const [status, setStatus] = useState<Status>("parsing");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (type !== "recovery" || !accessToken || !refreshToken) {
      setStatus("invalid");
      return;
    }

    (async () => {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        setStatus("invalid");
        return;
      }
      setStatus("ready");
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setStatus("submitting");
    const { error: updateError } = await updatePassword(newPassword);
    if (updateError) {
      setError(updateError);
      setStatus("ready");
      return;
    }

    toast({ title: "Password updated — you're signed in" });
    setTimeout(() => navigate("/dashboard"), 1000);
  };

  if (status === "parsing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageLoader context="session" fullPage={false} />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-background px-4">
        <div className="max-w-sm mx-auto mt-24 p-6 rounded-xl bg-card border border-border shadow-sm space-y-4">
          <h1 className="text-lg font-semibold tracking-tight">Link invalid or expired</h1>
          <p className="text-sm text-muted-foreground">
            Password reset links expire after 1 hour. Request a new one from the sign in page.
          </p>
          <Button className="w-full h-10 rounded-lg font-medium" onClick={() => navigate("/")}>
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  const passwordsMatch =
    confirmPassword.length === 0 || newPassword === confirmPassword;
  const submitting = status === "submitting";

  return (
    <div className="min-h-screen bg-background px-4">
      <div className="max-w-sm mx-auto mt-24 p-6 rounded-xl bg-card border border-border shadow-sm space-y-4">
        <h1 className="text-lg font-semibold tracking-tight">Set a new password</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {!passwordsMatch && (
              <p className="text-sm text-destructive">Passwords don't match</p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full h-10 rounded-lg font-medium"
            disabled={submitting || !passwordsMatch || newPassword.length < 6}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
