import type { DealMode } from "../engine/scenario";

export type TableTheme = "felt" | "rounders" | "midnight" | "paper";
export type Speed = "relaxed" | "normal" | "fast";

export interface Settings {
  theme: TableTheme;
  dealMode: DealMode;
  speed: Speed;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = { theme: "felt", dealMode: "focus", speed: "normal", sound: true };

export const THEMES: { id: TableTheme; name: string; blurb: string }[] = [
  { id: "felt", name: "Classic felt", blurb: "Casino green" },
  { id: "rounders", name: "Rounders", blurb: "KGB's red room" },
  { id: "midnight", name: "Midnight", blurb: "Big Blind ink" },
  { id: "paper", name: "Paper", blurb: "Clean & light" },
];

/** Milliseconds between dealer cards. */
export const DEALER_DELAY: Record<Speed, number> = { relaxed: 900, normal: 600, fast: 300 };
