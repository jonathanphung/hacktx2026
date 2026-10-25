import type { PowerupKind } from "../shared/world";

export const POWERUP_GUIDE: Record<
  PowerupKind,
  { name: string; effect: string; color: number; symbol: string; icon?: string }
> = {
  shield: {
    name: "SHIELD",
    effect: "Blocks one hit",
    color: 0x9abdc5,
    symbol: "⬡",
    icon: "shield",
  },
  slowmo: {
    name: "SLOW TIME",
    effect: "Brief freeze, then slows time",
    color: 0xd6af65,
    symbol: "⌛",
    icon: "slowmo",
  },
  double: {
    name: "SLOW DRAIN",
    effect: "Tale points drain half as fast",
    color: 0x89b987,
    symbol: "½",
    icon: "double",
  },
  blast: {
    name: "BLAST",
    effect: "Clears on-screen obstacles",
    color: 0xd99a73,
    symbol: "✹",
    icon: "blast",
  },
  "giant-slow": {
    name: "GIANT SLOW",
    effect: "Giant cooldown ×1.25",
    color: 0xb69ac6,
    symbol: "1¼",
    icon: "giant-slow",
  },
};

/** Text and shape agree with collision semantics, never the obstacle's artwork or name. */
export function obstacleAdvice(jumpable: boolean) {
  return jumpable
    ? { label: "↑ JUMP", color: "#a4ffe3", ink: 0xa4ffe3 }
    : { label: "↔ DODGE", color: "#ffb5a8", ink: 0xffb5a8 };
}

export function powerupIcon(guide: { icon?: string; symbol: string }): string {
  return guide.icon
    ? `<img src="${import.meta.env.BASE_URL}assets/pickups/${guide.icon}.svg" alt=""/>`
    : guide.symbol;
}
