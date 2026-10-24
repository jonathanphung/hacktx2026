import { describe, expect, it } from "vitest";
import { FistTrigger } from "./fire";

const feed = (t: FistTrigger, seq: (string | null)[]) => seq.map((g) => t.push(g));

describe("FistTrigger", () => {
  it("fires once per fist, after it is held", () => {
    const fist = "Closed_Fist";
    expect(feed(new FistTrigger(), ["Open_Palm", fist, fist, fist, fist])).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it("ignores a one-frame flicker", () => {
    expect(feed(new FistTrigger(), ["Closed_Fist", "None", "Closed_Fist", "None"])).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it("re-arms after the hand opens", () => {
    const f = "Closed_Fist";
    expect(feed(new FistTrigger(), [f, f, "Open_Palm", f, f]).filter(Boolean)).toHaveLength(2);
  });
});
