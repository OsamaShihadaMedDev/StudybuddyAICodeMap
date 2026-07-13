const GradientBackground = () => (
  <div
    className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-background"
    aria-hidden="true"
  >
    <div className="openmed-grid-bg absolute inset-0" />
  </div>
);

export default GradientBackground;
