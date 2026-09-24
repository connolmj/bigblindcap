/**
 * Loads the three Google Sheet tabs once, when the site opens, and shares them
 * with every page. Until a tab loads (or if it can't be reached), pages show
 * the last known sample data instead.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchText, PICKS_CSV_URL, sheetUrl } from "./csv";
import {
  EQ_SAMPLE,
  parseEquities,
  parseHistory,
  type HistoryPoint,
  type HistoryStart,
  type Position,
} from "./equities";
import { parseSheet, type GradedPick, type PendingPick } from "./picks";
import { SAMPLE_CARD, sampleLedger } from "./samplePicks";

export type FeedState = "loading" | "live" | "error";

export interface BookData {
  graded: GradedPick[];
  pending: PendingPick[];
  /** True once the picks tab has loaded (otherwise graded/pending are samples). */
  picksLive: boolean;
  positions: Position[];
  eqFeed: FeedState;
  history: HistoryPoint[];
  histStart: HistoryStart | null;
}

const BookContext = createContext<BookData | null>(null);

export function BookProvider({ children }: { children: ReactNode }) {
  const [picks, setPicks] = useState<{ graded: GradedPick[]; pending: PendingPick[] } | null>(null);
  const [positions, setPositions] = useState<Position[] | null>(null);
  const [eqFeed, setEqFeed] = useState<FeedState>("loading");
  const [hist, setHist] = useState<{ history: HistoryPoint[]; histStart: HistoryStart | null } | null>(null);

  useEffect(() => {
    let live = true;
    fetchText(PICKS_CSV_URL)
      .then((t) => live && setPicks(parseSheet(t)))
      .catch(() => {});
    fetchText(sheetUrl("Equities"))
      .then((t) => {
        if (!live) return;
        const rows = parseEquities(t);
        setPositions(rows.length ? rows : null);
        setEqFeed(rows.length ? "live" : "error");
      })
      .catch(() => live && setEqFeed("error"));
    // Optional tab — fine if it doesn't exist.
    fetchText(sheetUrl("History"))
      .then((t) => live && setHist(parseHistory(t)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const value: BookData = {
    graded: picks ? picks.graded : sampleLedger(),
    pending: picks ? picks.pending : SAMPLE_CARD,
    picksLive: !!picks,
    positions: positions ?? EQ_SAMPLE,
    eqFeed,
    history: hist?.history ?? [],
    histStart: hist?.histStart ?? null,
  };
  return <BookContext.Provider value={value}>{children}</BookContext.Provider>;
}

export function useBookData(): BookData {
  const ctx = useContext(BookContext);
  if (!ctx) throw new Error("useBookData must be used inside <BookProvider>");
  return ctx;
}
