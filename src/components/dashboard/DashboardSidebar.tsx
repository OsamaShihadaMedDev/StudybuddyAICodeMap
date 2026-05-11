import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Library as LibraryIcon,
  Settings,
  LogOut,
  LogIn,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import GoProModal from "@/components/GoProModal";

interface ProfileRow {
  is_pro: boolean;
  pro_expires_at: string | null;
}

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

interface DashboardSidebarProps {
  onNavigate?: () => void;
  onOpenAuth: () => void;
  onOpenAccount: () => void;
}

const DashboardSidebar = ({
  onNavigate,
  onOpenAuth,
  onOpenAccount,
}: DashboardSidebarProps) => {
  const { user, isAnonymous, signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [goProOpen, setGoProOpen] = useState(false);

  const userId = user?.id ?? null;
  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId && !isAnonymous,
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

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/library", label: "Library", icon: LibraryIcon },
  ];

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  const handleSettingsClick = () => {
    onOpenAccount();
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: "Sign out failed", description: error, variant: "destructive" });
    } else {
      toast({ title: "Signed out" });
      navigate("/dashboard");
    }
  };

  const handleSignIn = () => {
    onOpenAuth();
  };

  return (
    <>
      <aside className="flex h-full w-full flex-col gap-4 bg-background/80 px-4 py-5">
        {/* Brand */}
        <Link
          to="/dashboard"
          onClick={handleNavClick}
          className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-secondary/40 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Stethoscope className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-tight text-foreground">
              StudyBuddy
            </p>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground">
              Smart medical revision
            </p>
          </div>
        </Link>

        {/* Workspace block */}
        {isAnonymous || !user ? (
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-2.5">
            <p className="text-sm font-semibold text-foreground leading-snug">
              Sign In to save your progress
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sync decks and study history across devices.
            </p>
            <Button
              size="sm"
              onClick={handleSignIn}
              className="w-full h-8 btn-gradient text-xs font-semibold"
            >
              <LogIn className="h-3.5 w-3.5 mr-1.5" />
              Sign In
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Workspace
            </p>
            <p className="text-sm font-medium text-foreground truncate">
              {user.email ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPro
                ? `Pro${
                    profile?.pro_expires_at
                      ? ` — expires ${formatDate(profile.pro_expires_at)}`
                      : ""
                  }`
                : "Free plan"}
            </p>
          </div>
        )}

        {/* Main nav */}
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary border-l-2 border-primary pl-[10px]"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {!isAnonymous && user && (
            <button
              onClick={handleSettingsClick}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors text-left"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          )}
        </nav>

        <div className="flex-1" />

        {/* Bottom actions */}
        {!isPro && !isAnonymous && user && (
          <Button
            variant="outline"
            className="w-full h-10 rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-semibold"
            onClick={() => setGoProOpen(true)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Go Pro
          </Button>
        )}
        <GoProModal open={goProOpen} onOpenChange={setGoProOpen} />

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <ThemeToggle />
          {!isAnonymous && user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sign out
            </Button>
          )}
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
