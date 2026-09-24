/** The BB poker-chip mark from the original header. */
export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="chip-logo" style={{ width: size, height: size }} aria-hidden="true">
      <div className="chip-logo__edge" />
      <div className="chip-logo__ring" />
      <div className="chip-logo__face">
        <span>BB</span>
      </div>
      <span className="chip-logo__suit chip-logo__suit--top">♠</span>
      <span className="chip-logo__suit chip-logo__suit--right">♥</span>
      <span className="chip-logo__suit chip-logo__suit--bottom">♦</span>
      <span className="chip-logo__suit chip-logo__suit--left">♣</span>
    </div>
  );
}
