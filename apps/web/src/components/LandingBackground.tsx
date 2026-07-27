/** Ambient landing field — static art + two translate-only motion layers. */
export function LandingBackground() {
  return (
    <div
      aria-hidden
      className="landing-bg pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="landing-bg__base absolute inset-0" />

      {/* Isolated compositor layer: translate3d only, no opacity/scale/filter */}
      <div className="landing-bg__motion absolute inset-0">
        <div className="landing-bg__bloom landing-bg__bloom--mint" />
        <div className="landing-bg__bloom landing-bg__bloom--warm" />
        <div className="landing-bg__disc" />
      </div>

      <div className="landing-bg__hatch absolute -right-[5%] top-[10%] h-[80%] w-[48%]" />
      <div className="landing-bg__ring landing-bg__ring--lg absolute right-[6%] top-[18%] h-[38vmin] w-[38vmin]" />
      <div className="landing-bg__ring landing-bg__ring--sm absolute right-[14%] top-[28%] h-[22vmin] w-[22vmin]" />
      <div className="landing-bg__veil absolute inset-0" />
    </div>
  );
}
