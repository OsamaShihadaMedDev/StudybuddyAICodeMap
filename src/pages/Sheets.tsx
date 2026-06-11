import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SheetGenerator from "@/components/SheetGenerator";

const Sheets = () => (
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
      <SheetGenerator />
    </div>
  </DashboardLayout>
);

export default Sheets;
