import { expect, test } from "vitest";
import { seededRng } from "./cards";
import { applyAction, currentRecommendation, finishDealer, startRound } from "./round";
import { prepareShoe } from "./scenario";

test("focus mode deals full 312-card shoes with no duplicate cards", () => {
  const rng = seededRng(1);
  for (let i = 0; i < 200; i++) {
    const shoe = prepareShoe("focus", rng);
    expect(shoe).toHaveLength(312);
    expect(new Set(shoe.map((c) => c.id)).size).toBe(312);
  }
});

test("any round can be played to the end following the recommendation", () => {
  const rng = seededRng(7);
  for (let i = 0; i < 2000; i++) {
    let s = startRound(prepareShoe(i % 2 ? "focus" : "realistic", rng));
    let guard = 0;
    while (s.phase === "player" && guard++ < 30) s = applyAction(s, currentRecommendation(s)!.action);
    s = finishDealer(s);
    expect(s.phase).toBe("settled");
    expect(typeof s.net).toBe("number");
  }
});
