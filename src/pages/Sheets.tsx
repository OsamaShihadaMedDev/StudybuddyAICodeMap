import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SheetGenerator from "@/components/SheetGenerator";

const Sheets = () => {
  // The Roadmap navigates here with a topic to seed the notes field.
  const location = useLocation();
  const state = location.state as { topic?: string } | null;
  const prefill = state?.topic ? { input: state.topic, output: "" } : undefined;

  return (
    <DashboardLayout wide>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Study Sheet
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate a high-yield study sheet on any medical topic.
          </p>
        </div>
        <SheetGenerator prefill={prefill} />
      </div>
    </DashboardLayout>
  );
};

export default Sheets;
