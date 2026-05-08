import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AccountDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileRow {
  is_pro: boolean;
  pro_expires_at: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "You must be signed in",
  account_required: "Code redemption requires a registered account",
  invalid_code: "Invalid code",
  already_redeemed: "This code has already been used",
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

const AccountDashboard = ({ open, onOpenChange }: AccountDashboardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const [code, setCode] = useState("");
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId && open,
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_pro, pro_expires_at")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const profile = profileQuery.data ?? null;
  const isPro =
    profile?.is_pro === true &&
    (profile.pro_expires_at === null ||
      new Date(profile.pro_expires_at) > new Date());

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeemError(null);
    setRedeemLoading(true);
    try {
      const { data, error } = await supabase.rpc("redeem_pro_code", {
        code_input: code,
      });
      if (error) {
        setRedeemError(error.message);
        return;
      }
      const result = data as {
        success: boolean;
        error?: string;
        expires_at?: string;
      } | null;
      if (!result || !result.success) {
        setRedeemError(
          ERROR_MESSAGES[result?.error ?? ""] ?? "Failed to redeem code"
        );
        return;
      }
      toast({
        title: result.expires_at
          ? `Pro activated until ${formatDate(result.expires_at)}`
          : "Pro activated",
      });
      setCode("");
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>
            Manage your account and subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Email
            </p>
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email ?? "—"}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Plan
            </p>
            {profileQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : isPro ? (
              <p className="text-sm font-semibold text-primary">
                Pro{" "}
                {profile?.pro_expires_at
                  ? `— expires ${formatDate(profile.pro_expires_at)}`
                  : ""}
              </p>
            ) : (
              <p className="text-sm text-foreground">Free plan</p>
            )}
          </div>

          <form onSubmit={handleRedeem} className="space-y-2 pt-2 border-t border-border/50">
            <Label htmlFor="redeem-code" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Redeem code
            </Label>
            <div className="flex gap-2">
              <Input
                id="redeem-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setRedeemError(null);
                }}
                placeholder="Enter code"
                className="font-mono uppercase"
                disabled={redeemLoading}
              />
              <Button type="submit" disabled={redeemLoading || !code.trim()}>
                {redeemLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redeeming…
                  </>
                ) : (
                  "Redeem"
                )}
              </Button>
            </div>
            {redeemError && (
              <p className="text-sm text-destructive">{redeemError}</p>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountDashboard;
