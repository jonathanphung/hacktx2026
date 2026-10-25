import type { PowerupKind } from "../shared/world";

export const POWERUP_GUIDE: Record<
  PowerupKind,
  { name: string; effect: string; color: number; symbol: string }
> = {
  shield: { name: "SHIELD", effect: "Blocks one hit", color: 0x6ae6ff, symbol: "⬡" },
  slowmo: { name: "SLOW TIME", effect: "Slows the track", color: 0xffdf6a, symbol: "⌛" },
  double: {
    name: "SLOW DRAIN",
    effect: "Tale points drain half as fast",
    color: 0x9cffb1,
    symbol: "½",
  },
  blast: { name: "BLAST", effect: "Clears on-screen obstacles", color: 0xffb8ed, symbol: "✹" },
  "giant-slow": {
    name: "GIANT SLOW",
    effect: "Giant cooldown ×1.25",
    color: 0xc6abff,
    symbol: "1¼",
  },
};

/** Text and shape agree with collision semantics, never the obstacle's artwork or name. */
export function obstacleAdvice(jumpable: boolean) {
  return jumpable
    ? { label: "↑ JUMP", color: "#a4ffe3", ink: 0xa4ffe3 }
    : { label: "↔ DODGE", color: "#ffb5a8", ink: 0xffb5a8 };
}
