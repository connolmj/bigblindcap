import type { Speed, TableTheme } from "../../blackjack/ui/settings";

/** How often you're asked for the running count before a hand. "off" shows the count on the table instead. */
export type CountCheck = "every" | "sometimes" | "off";

export interface Settings {
  theme: TableTheme;
  speed: Speed;
  sound: boolean;
  countCheck: CountCheck;
}

export const DEFAULT_SETTINGS: Settings = { theme: "felt", speed: "normal", sound: true, countCheck: "every" };

/** "sometimes" asks on every this-many-th hand of the shoe. */
export const SOMETIMES_EVERY = 4;
