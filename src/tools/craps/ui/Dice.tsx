import type { Dice as DiceT, Die as DieT } from "../engine/dice";

/** Pip positions on a 3×3 grid, numbered 0–8 left to right, top to bottom. */
const PIPS: Record<DieT, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function Die({ value, delay = 0, idle }: { value: DieT; delay?: number; idle?: boolean }) {
  return (
    <span
      className={idle ? "crp-die is-idle" : "crp-die"}
      style={{ animationDelay: `${delay}ms` }}
      role="img"
      aria-label={String(value)}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={PIPS[value].includes(i) ? "crp-die__pip" : "crp-die__pip is-blank"} />
      ))}
    </span>
  );
}

/** The pair on the felt. Re-mount it (new key) to replay the throw. */
export default function DicePair({ dice }: { dice: DiceT | null }) {
  const [a, b] = dice ?? [6, 6];
  return (
    <div className="crp-dice" aria-live="polite" aria-label={dice ? `Rolled ${a} and ${b}` : "Dice"}>
      <Die value={a} idle={!dice} />
      <Die value={b} idle={!dice} delay={60} />
    </div>
  );
}
