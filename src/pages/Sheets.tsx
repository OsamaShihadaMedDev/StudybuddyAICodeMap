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
        <div>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 8,
            }}
          >
            Study Sheet · AI-Powered
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: "-0.012em",
              color: "var(--fg)",
              margin: 0,
            }}
          >
            Generate your{" "}
            <span style={{ fontStyle: "italic", color: "var(--accent)" }}>
              study sheet.
            </span>
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              color: "var(--fg-muted)",
              marginTop: 10,
              lineHeight: 1.5,
            }}
          >
            Enter any medical topic — your structured clinical sheet builds section
            by section.
          </p>
        </div>
        <SheetGenerator prefill={prefill} />
      </div>
    </DashboardLayout>
  );
};

export default Sheets;
