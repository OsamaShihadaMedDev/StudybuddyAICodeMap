import { useState, useEffect, useRef } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Stethoscope,
  HelpCircle,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import SheetGenerator from "@/components/SheetGenerator";

interface RowShellProps {
  icon: LucideIcon;
  title: string;
  description: string;
  right: React.ReactNode;
}

const RowShell = ({ icon: Icon, title, description, right }: RowShellProps) => (
  <CardContent className="p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {description}
        </p>
      </div>
      {right}
    </div>
  </CardContent>
);

interface MoreToolsSectionProps {
  autoOpen?: boolean;
}

const MoreToolsSection = ({ autoOpen = false }: MoreToolsSectionProps) => {
  const [openId, setOpenId] = useState<string | null>(autoOpen ? "study-sheet" : null);
  const sheetOpen = openId === "study-sheet";
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoOpen && sheetRef.current) {
      setTimeout(() => {
        sheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [autoOpen]);

  return (
    <div ref={sheetRef} className="space-y-3">
      <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase pl-1">
        More Tools
      </p>

      <div className="space-y-3">
        <Collapsible
          open={sheetOpen}
          onOpenChange={(open) => setOpenId(open ? "study-sheet" : null)}
        >
          <Card className="glass-card">
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full">
                <RowShell
                  icon={FileText}
                  title="Study Sheet"
                  description="Generate comprehensive notes covering everything you need to know about a topic"
                  right={
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                        sheetOpen ? "rotate-180" : ""
                      }`}
                    />
                  }
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 pt-4">
                <SheetGenerator />
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Card className="glass-card opacity-60 cursor-not-allowed">
          <RowShell
            icon={Stethoscope}
            title="Clinical Cases"
            description="Practice diagnostic reasoning with AI-generated patient cases"
            right={
              <Badge variant="secondary" className="text-[10px]">
                Coming soon
              </Badge>
            }
          />
        </Card>

        <Card className="glass-card opacity-60 cursor-not-allowed">
          <RowShell
            icon={HelpCircle}
            title="Practice MCQs"
            description="Sharpen exam skills with focused multiple-choice questions on any topic"
            right={
              <Badge variant="secondary" className="text-[10px]">
                Coming soon
              </Badge>
            }
          />
        </Card>
      </div>
    </div>
  );
};

export default MoreToolsSection;
