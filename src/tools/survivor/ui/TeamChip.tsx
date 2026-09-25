import { TEAMS } from "../model/teams";

export default function TeamChip({ team, full }: { team: string; full?: boolean }) {
  const t = TEAMS[team];
  return (
    <span className="tchip" title={t ? `${t.name} ${t.nick}` : team}>
      <span className="tchip__swatch" style={{ background: t?.color ?? "#888" }} aria-hidden="true" />
      <span className="tchip__code">{team}</span>
      {full && t && <span className="tchip__nick">{t.nick}</span>}
    </span>
  );
}
