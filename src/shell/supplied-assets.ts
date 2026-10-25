import { RUNNER } from "../game/runner/config";
import type Phaser from "phaser";
import type { StageId, StageItemId } from "../shared/stages";
import type { PowerupKind } from "../shared/world";

export const SUPPLIED_ART = {
  "story-blast-pickup": "blastpickup.png",
  "story-giant-slow-pickup": "giantslowpickup.png",
  "story-egg": "eggpickup.png",
  "story-log": "log.png",
  "story-log-alice": "alice/log.png",
  "story-log-cinderella": "cinderella/log.png",
  "story-log-kt": "kt/log.png",
  "story-log-redhood": "lrr/log.png",
  "story-barrier": "barrier.png",
  "story-fireball": "fireball.png",
  "story-mud": "mud.png",
  "story-oil": "oilspill.png",
  "story-spikes": "spikes.png",
  "story-shield-pickup": "forcefieldpickup.png",
  "story-slow-pickup": "slowtimepickup.png",
  "story-slow-drain-pickup": "slowdrainpickup.png",
  "story-double-pickup": "x2pickup.png",
  "story-potion": "potion.png",
  "story-slipper": "glassslipper.png",
  "story-trident": "trident.png",
  "story-hood": "redhood.png",
  "story-badge": "nametag.png",
  "story-claude": "claude.png",
  "story-forcefield": "forcefield.png",
  "story-log-humpty": "humpty/log.png",
  "story-fireball-alice": "alice/fireball.png",
  "story-forcefield-alice": "alice/forcefield.png",
  "story-spikes-alice": "alice/spike.png",
  "story-fireball-cinderella": "cinderella/fireball.png",
  "story-forcefield-cinderella": "cinderella/forcefield.png",
  "story-spikes-cinderella": "cinderella/spikes.png",
  "story-mud-alice": "alice/mud.png",
  "story-mud-kt": "kt/mud.png",
  "story-mud-cinderella": "cinderella/mud.png",
  "story-forcefield-humpty": "humpty/forcefield.png",
  "story-spikes-humpty": "humpty/spike.png",
  "story-fireball-kt": "kt/fireball.png",
  "story-forcefield-kt": "kt/forcefield.png",
  "story-spikes-kt": "kt/spike.png",
  "story-barrier-alice": "alice/barrier.png",
  "story-barrier-cinderella": "cinderella/barrier.png",
  "story-barrier-humpty": "humpty/barrier.png",
  "story-barrier-redhood": "lrr/barrier.png",
  "story-fireball-humpty": "humpty/fireball.png",
  "story-barrier-kt": "kt/barrier.png",
  "story-fireball-redhood": "lrr/fireball.png",
  "story-forcefield-redhood": "lrr/forcefield.png",
  "story-spikes-redhood": "lrr/spike.png",
  "story-mud-redhood": "lrr/mud.png",
} as const;

export function preloadSuppliedArt(scene: Phaser.Scene) {
  for (const { key, file } of Object.values(STAGE_FORCEFIELDS)) {
    if (file)
      scene.load.spritesheet(key, `${import.meta.env.BASE_URL}assets/story/${file}`, {
        frameWidth: 192,
        frameHeight: 192,
      });
  }
  for (const [key, file] of Object.entries(SUPPLIED_ART)) {
    scene.load.image(key, `${import.meta.env.BASE_URL}assets/story/${file}`);
  }
}

export function obstacleTexture(kind: string, stage: StageId): string | null {
  const base = (
    {
      hurdle: "story-log",
      barrier: "story-barrier",
      "double-wall": "story-barrier",
      fireball: "story-fireball",
      mud: "story-mud",
      oil: "story-oil",
      "wild-thorns": "story-spikes",
      "moss-rock": "story-barrier",
      "sticky-sap": "story-mud",
    } as Record<string, string>
  )[kind];
  if (!base) return null;
  const theme = (
    {
      humpty: "humpty",
      wonderland: "alice",
      cinderella: "cinderella",
      mermaid: "kt",
      redhood: "redhood",
      xen: "base",
    } satisfies Record<StageId, string>
  )[stage];
  const themed = `${base}-${theme}`;
  return themed in SUPPLIED_ART ? themed : base;
}

/** Taller silhouettes extend upward, keeping their original ground/contact baseline. */
export function obstacleArtLayout(
  kind: string,
  width: number,
  height: number,
  sourceRatio?: number,
) {
  const ratio =
    sourceRatio ?? (kind === "fireball" ? 92 / 248 : kind === "oil" ? 236 / 111 : 87 / 235);
  let displayWidth =
    kind === "wild-thorns"
      ? width * 0.5
      : kind === "barrier" || kind === "double-wall" || kind === "moss-rock"
        ? width * 1.25
        : width;
  let displayHeight = height;
  if (kind === "mud" || kind === "sticky-sap") {
    displayWidth = RUNNER.laneSpacing * 0.9;
    displayHeight = displayWidth / ratio;
  } else if (kind === "fireball") {
    displayHeight = height * 1.875;
    displayWidth = displayHeight * ratio;
  } else if (sourceRatio !== undefined || kind === "oil") {
    displayHeight = displayWidth / ratio;
  } else if (kind === "wild-thorns") {
    displayHeight = Math.max(60, height * 1.8);
  }
  return { width: displayWidth, height: displayHeight, offsetY: (height - displayHeight) / 2 };
}

export const STAGE_FORCEFIELDS = {
  humpty: { key: "shield-humpty", file: "humpty/forcefield-sheet.png" },
  wonderland: { key: "shield-alice", file: "alice/forcefield-sheet.png" },
  cinderella: { key: "shield-cinderella", file: "cinderella/forcefield-sheet.png" },
  mermaid: { key: "shield-kt", file: "kt/forcefield-sheet.png" },
  redhood: { key: "shield-redhood", file: "lrr/forcefield-sheet.png" },
  xen: { key: "runner-forcefield", file: null },
} satisfies Record<StageId, { key: string; file: string | null }>;

export function stageItemTexture(item: StageItemId): string | null {
  return (
    {
      egg: "story-egg",
      potion: "story-potion",
      slipper: "story-slipper",
      trident: "story-trident",
      hood: "story-hood",
      badge: "story-badge",
    } satisfies Record<StageItemId, string | null>
  )[item];
}

export function pickupTexture(kind: PowerupKind): string | null {
  // The half icon matches the existing point-drain reduction.
  return (
    {
      shield: "story-shield-pickup",
      slowmo: "story-slow-pickup",
      double: "story-slow-drain-pickup",
      blast: "story-blast-pickup",
      "giant-slow": "story-giant-slow-pickup",
    } as const
  )[kind];
}

export function sceneArtStage(scene: Phaser.Scene): StageId {
  return (scene.data?.get("story-art-stage") as StageId | undefined) ?? "humpty";
}

/** Fit items without stretching their silhouettes. Obstacle bounds are set by their caller. */
export function fittedArt(scene: Phaser.Scene, key: string, width: number, height: number) {
  const art = scene.add.image(0, 0, key);
  const scale = Math.min(width / art.width, height / art.height);
  return art.setScale(scale);
}
