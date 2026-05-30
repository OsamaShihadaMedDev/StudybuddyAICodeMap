import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Library as LibraryIcon,
  FileText,
  Layers,
  FlaskConical,
  Settings,
  LogOut,
  LogIn,
  Sparkles,
  Stethoscope,
  PanelLeftClose,
  PanelLeftOpen,
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const DashboardSidebar = ({
  onNavigate,
  onOpenAuth,
  onOpenAccount,
  collapsed = false,
  onToggleCollapse,
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
    { to: "/sheets", label: "Study Sheet", icon: FileText },
    { to: "/flashcards", label: "Flashcards", icon: Layers },
    { to: "/qbank", label: "QBank", icon: FlaskConical },
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
      <aside className={`flex h-full w-full flex-col gap-4 bg-background/80 py-5 transition-all duration-300 ${collapsed ? "px-2 items-center" : "px-4"}`}>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex self-end items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Brand */}
        <Link
          to="/dashboard"
          onClick={handleNavClick}
          className={`flex items-center gap-3 rounded-lg hover:bg-secondary/40 transition-colors ${collapsed ? "px-0 py-1.5 justify-center" : "px-2 py-1.5"}`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30 shrink-0">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-tight space-y-0.5">
              <p className="text-base font-extrabold tracking-tight text-foreground">
                StudyBuddy
              </p>
              <p
                className="text-[11px] font-semibold tracking-wide text-primary"
                style={{ textShadow: "0 0 12px hsl(var(--primary) / 0.6)" }}
              >
                High-yield exam prep in seconds
              </p>
            </div>
          )}
        </Link>

        {/* Workspace block */}
        {!collapsed && (
          isAnonymous || !user ? (
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
          )
        )}

        {/* Main nav */}
        <nav className="flex flex-col gap-0.5 w-full">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                title={collapsed ? item.label : undefined}
                className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-0 py-2 w-10 h-10 mx-auto" : "gap-2.5 px-3 py-2"
                } ${
                  active
                    ? collapsed
                      ? "bg-primary/10 text-primary"
                      : "bg-primary/10 text-primary border-l-2 border-primary pl-[10px]"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
          {!collapsed && !isAnonymous && user && (
            <button
              onClick={handleSettingsClick}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors text-left"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          )}
          {collapsed && !isAnonymous && user && (
            <button
              onClick={handleSettingsClick}
              title="Settings"
              className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
        </nav>

        <div className="flex-1" />

        {/* Bottom actions */}
        {!isPro && !isAnonymous && user && !collapsed && (
          <Button
            variant="outline"
            className="w-full h-10 rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-semibold"
            onClick={() => setGoProOpen(true)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Go Pro
          </Button>
        )}
        {!isPro && !isAnonymous && user && collapsed && (
          <button
            onClick={() => setGoProOpen(true)}
            title="Go Pro"
            className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-primary hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        )}
        <GoProModal open={goProOpen} onOpenChange={setGoProOpen} />

        {!collapsed && (
          <p className="text-[10px] text-muted-foreground/40 leading-snug text-center px-1 pb-1">
            For educational use only · Not for clinical practice
          </p>
        )}

        <div className={`flex items-center gap-2 pt-2 border-t border-border/40 ${collapsed ? "flex-col justify-center w-full" : "justify-between"}`}>
          <ThemeToggle />
          {!isAnonymous && user && !collapsed && (
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
          {!isAnonymous && user && collapsed && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
