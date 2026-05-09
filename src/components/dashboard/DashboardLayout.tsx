import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import GradientBackground from "@/components/GradientBackground";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardRightRail from "@/components/dashboard/DashboardRightRail";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <GradientBackground />
      <div className="relative z-10 flex min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-[260px] lg:shrink-0 lg:border-r lg:border-border/40">
          <DashboardSidebar />
        </div>

        {/* Mobile drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[280px] p-0 border-r border-border/40">
            <DashboardSidebar onNavigate={() => setDrawerOpen(false)} />
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

          <div className="flex flex-1 min-h-0">
            <div className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-10">
              <div className="mx-auto max-w-2xl">{children}</div>
            </div>
            <div className="hidden xl:block xl:py-10 xl:pr-8">
              <DashboardRightRail />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
