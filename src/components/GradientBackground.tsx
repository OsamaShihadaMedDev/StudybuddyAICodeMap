const GradientBackground = () => (
  <div
    className="fixed inset-0 -z-10 overflow-hidden pointer-events-none text-foreground"
    aria-hidden="true"
  >
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--primary) / 0.04) 50%, hsl(var(--accent) / 0.05) 100%)",
      }}
    />
    <svg
      className="absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="sb-grid-pattern"
          x="0"
          y="0"
          width="128"
          height="128"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 0 L 128 0 M 0 32 L 128 32 M 0 64 L 128 64 M 0 96 L 128 96 M 0 0 L 0 128 M 32 0 L 32 128 M 64 0 L 64 128 M 96 0 L 96 128"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.04"
          />
          <g
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.06"
          >
            <line x1="-3" y1="0" x2="3" y2="0" />
            <line x1="0" y1="-3" x2="0" y2="3" />
            <line x1="125" y1="0" x2="131" y2="0" />
            <line x1="128" y1="-3" x2="128" y2="3" />
            <line x1="-3" y1="128" x2="3" y2="128" />
            <line x1="0" y1="125" x2="0" y2="131" />
            <line x1="125" y1="128" x2="131" y2="128" />
            <line x1="128" y1="125" x2="128" y2="131" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sb-grid-pattern)" />
    </svg>
  </div>
);

export default GradientBackground;
