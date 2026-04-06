const GradientBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    {/* Base gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />

    {/* Floating blurs */}
    <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-primary/[0.06] blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
    <div className="absolute bottom-[-15%] right-[-5%] h-[500px] w-[500px] rounded-full bg-accent/[0.05] blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
    <div className="absolute top-[40%] left-[50%] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[hsl(190,60%,50%)]/[0.04] blur-[100px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
  </div>
);

export default GradientBackground;
