import { describe as group, expect, it } from "vitest";
import { compare, describe, evaluate, qualifies, shape } from "./hand";
import { parseCards as h } from "./notation";

group("evaluate", () => {
  it("names every category", () => {
    expect(evaluate(h("As", "Ks", "Qs")).category).toBe("straightFlush");
    expect(evaluate(h("7s", "7h", "7d")).category).toBe("trips");
    expect(evaluate(h("9s", "Th", "Jd")).category).toBe("straight");
    expect(evaluate(h("2s", "9s", "Ks")).category).toBe("flush");
    expect(evaluate(h("8s", "8h", "Kd")).category).toBe("pair");
    expect(evaluate(h("Qs", "6h", "4d")).category).toBe("high");
  });

  it("ranks a straight above a flush — it's rarer with three cards", () => {
    expect(evaluate(h("2s", "3h", "4d")).score).toBeGreaterThan(evaluate(h("Ah", "Kh", "9h")).score);
  });

  it("treats A-2-3 as the lowest straight, and K-A-2 as nothing", () => {
    const wheel = evaluate(h("As", "2h", "3d"));
    expect(wheel.category).toBe("straight");
    expect(wheel.score).toBeLessThan(evaluate(h("2s", "3h", "4d")).score);
    expect(shape(wheel)).toBe("3-2-A");
    expect(evaluate(h("Ks", "Ah", "2d")).category).toBe("high");
  });

  it("breaks pair ties on the kicker", () => {
    expect(compare(evaluate(h("8s", "8h", "Kd")), evaluate(h("8d", "8c", "Qs")))).toBe("win");
    expect(compare(evaluate(h("8s", "8h", "2d")), evaluate(h("9d", "9c", "3s")))).toBe("lose");
    expect(compare(evaluate(h("Qs", "6h", "4d")), evaluate(h("Qh", "6d", "4c")))).toBe("tie");
  });

  it("qualifies the dealer at Queen-high", () => {
    expect(qualifies(evaluate(h("Qs", "3h", "2d")))).toBe(true);
    expect(qualifies(evaluate(h("Js", "Th", "8d")))).toBe(false);
    expect(qualifies(evaluate(h("2s", "2h", "3d")))).toBe(true);
  });

  it("describes hands", () => {
    expect(describe(evaluate(h("Qs", "4h", "6d")))).toBe("Queen-high (Q-6-4)");
    expect(describe(evaluate(h("6s", "6h", "Ad")))).toBe("Pair of 6es");
    expect(describe(evaluate(h("Ah", "Kh", "Qh")))).toBe("Mini royal (A-K-Q suited)");
  });
});
