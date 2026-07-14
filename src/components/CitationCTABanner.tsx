import { BookOpen } from "lucide-react";

interface CitationCTABannerProps {
  onSignInClick: () => void;
}

const CitationCTABanner = ({ onSignInClick }: CitationCTABannerProps) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
        background: "var(--bg)",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          flexShrink: 0,
        }}
      >
        <BookOpen style={{ width: 14, height: 14, color: "var(--accent)" }} />
      </div>
      <p
        style={{
          flex: 1,
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          color: "var(--fg-muted)",
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        Try it free — get 1 cited generation today, no account needed
      </p>
      <button
        type="button"
        onClick={onSignInClick}
        style={{
          padding: "6px 12px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-strong)",
          background: "var(--bg-elevated)",
          color: "var(--fg)",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          flexShrink: 0,
          transition: "border-color var(--dur-micro) var(--ease-out)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--fg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-strong)";
        }}
      >
        Sign In
      </button>
    </div>
  );
};

export default CitationCTABanner;
