import { useState } from "react";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import AuthModal from "@/components/AuthModal";
import AccountDashboard from "@/components/AccountDashboard";

const getInitials = (email: string) => {
  const local = email.split("@")[0] ?? "";
  if (!local) return "?";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
};

const AuthButton = () => {
  const { user, loading, isAnonymous, signOut } = useAuth();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  if (loading) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  if (!user || isAnonymous) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="h-9"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
        <AuthModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  const email = user.email ?? "";
  const initials = getInitials(email);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
            {email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!isAnonymous && (
            <DropdownMenuItem onClick={() => setDashboardOpen(true)}>
              <UserIcon className="mr-2 h-4 w-4" />
              Account
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={async () => {
              const { error } = await signOut();
              if (error) {
                toast({ title: "Sign out failed", description: error, variant: "destructive" });
              } else {
                toast({ title: "Signed out" });
              }
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AccountDashboard open={dashboardOpen} onOpenChange={setDashboardOpen} />
    </>
  );
};

export default AuthButton;
