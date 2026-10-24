/**
 * The stages of an endless run, one fairy tale each, in order. A stage ends only when the
 * runner collects that tale's key item. Xen's badge completes the adventure.
 */
export type StageId = "humpty" | "wonderland" | "cinderella" | "mermaid" | "redhood" | "xen";
export type StageItemId = "egg" | "potion" | "slipper" | "trident" | "hood" | "badge";

export interface StageInfo {
  index: number;
  id: StageId;
  name: string;
  /** The item the runner must collect to move on to the next stage. */
  item: { id: StageItemId; name: string };
}

export const STORY_LETTERS = "HACKTX";
export const STAGES: readonly StageInfo[] = [
  { index: 0, id: "humpty", name: "Humpty Dumpty", item: { id: "egg", name: "Egg" } },
  {
    index: 1,
    id: "wonderland",
    name: "Alice in Wonderland",
    item: { id: "potion", name: "Drink Me Potion" },
  },
  {
    index: 2,
    id: "cinderella",
    name: "Cinderella",
    item: { id: "slipper", name: "Glass Slipper" },
  },
  { index: 3, id: "mermaid", name: "King Triton", item: { id: "trident", name: "Trident" } },
  {
    index: 4,
    id: "redhood",
    name: "Little Red Riding Hood",
    item: { id: "hood", name: "Red Hood" },
  },
  { index: 5, id: "xen", name: "Xen's HackTX Badge", item: { id: "badge", name: "X Badge" } },
];

export const isLastStage = (index: number) => index === STAGES.length - 1;
