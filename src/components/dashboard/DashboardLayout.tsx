import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import GradientBackground from "@/components/GradientBackground";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import AuthModal from "@/components/AuthModal";
import AccountDashboard from "@/components/AccountDashboard";

interface DashboardLayoutProps {
  children: ReactNode;
  wide?: boolean;
}

const DashboardLayout = ({ children, wide = false }: DashboardLayoutProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const handleOpenAuth = () => {
    setAuthModalOpen(true);
    setDrawerOpen(false);
  };

  const handleOpenAccount = () => {
    setAccountModalOpen(true);
    setDrawerOpen(false);
  };

  return (
    <div className="relative min-h-screen">
      <GradientBackground />
      <div className="relative z-10 flex min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-[260px] lg:shrink-0 lg:border-r lg:border-border/40">
          <DashboardSidebar
            onOpenAuth={handleOpenAuth}
            onOpenAccount={handleOpenAccount}
          />
        </div>

        {/* Mobile drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[280px] p-0 border-r border-border/40">
            <DashboardSidebar
              onNavigate={() => setDrawerOpen(false)}
              onOpenAuth={handleOpenAuth}
              onOpenAccount={handleOpenAccount}
            />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col">
          <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <p className="text-sm font-extrabold tracking-tight text-foreground">
              StudyBuddy
            </p>
            <div className="w-9" aria-hidden />
          </header>

          <div className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-10">
            <div className={wide ? "w-full" : "mx-auto max-w-2xl"}>{children}</div>
          </div>
        </main>
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <AccountDashboard open={accountModalOpen} onOpenChange={setAccountModalOpen} />
    </div>
  );
};

export default DashboardLayout;
