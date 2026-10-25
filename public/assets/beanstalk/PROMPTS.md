# Muse prompts for the pixel-art sprite set

The beanstalk (`stem-tile.png`, from `stem-source.webp`) sets the style: chunky 16-bit pixels,
a dark teal-green outline one pixel thick, 4–6 colors per object, a lit left edge and a darker
right edge, no anti-aliasing. Paste the STYLE block first (or on its own line) in every prompt so
the set matches. Generate on a plain white background; make it transparent afterwards.

## STYLE (prefix for every prompt)

```
Pixel art game sprite, chunky visible pixels, 16-bit retro style, hard pixel edges, no anti-aliasing, no blur, no gradients. One-pixel very dark teal-green outline with small stair-step notches. Limited palette of 5 or 6 colors per object. Light comes from the top left: a pale highlight on the left edges and a darker shadow on the right edges. Cute fairy-tale mood. Side or top-down view as stated. Centered on a plain solid white background, nothing else, no text, no shadow on the ground.
```

## Obstacles (in-game size about 140 wide, shown top-down on a green beanstalk lane)

**Barrier / Double wall** (stone wall, dodge only)
```
[STYLE] Top-down view of a wide low wall of purple-grey stone blocks, 3 columns of bricks, mossy green patches on the bottom edge, a glowing lilac rune symbol carved in the middle. 140 by 70 pixel proportions, 2:1 wide.
```

**Hurdle** (wooden log, jumpable)
```
[STYLE] Top-down view of a thick horizontal wooden log lying across the path, warm brown bark with a darker underside, pale tan cut-ends visible with ring patterns on both ends, a small tuft of grass at the bottom. 2:1 wide.
```

**Oil slick** (slows or jumpable)
```
[STYLE] Top-down view of a glossy dark amber sap puddle with an irregular blobby edge, bright yellow highlight streaks and two tiny bubbles, a sticky drip shape on one side. 2:1 wide.
```

**Mud patch** (slows, dodge)
```
[STYLE] Top-down view of a patch of thick brown mud with a lumpy edge, darker brown wet spots, three small bubbles and a few tiny pebbles, a footprint pressed into it. 2:1 wide.
```

**Fireball** (falls toward the runner)
```
[STYLE] A round fireball seen from the side, orange and yellow flames with a white-hot core, flame tail streaming upward, dark red outline, a few tiny ember pixels around it. About 64 by 96 pixel proportions.
```

## The giant (saboteur) and drops

**Giant hand** (reaches down and drops things; shown from above)
```
[STYLE] A huge cartoon giant hand reaching downward from the top of the image, palm open with fingers curled slightly, warm tan skin, darker tan shading on the right, one-pixel dark brown outline, short sleeve cuff of a purple robe at the top edge. Tall image, 1:1.5.
```

**Giant hand, fist closed** (second frame for a grab animation)
```
[STYLE] Same giant hand as before, but in a closed fist holding something small and round, same colors, same size and outline.
```

## Pickups (about 56 pixels, with a soft glow ring)

**Shield**
```
[STYLE] A small round bubble shield in cyan and white with a hexagon pattern, a bright sparkle on the top left, floating. Square.
```

**Slow time** (hourglass)
```
[STYLE] A small golden hourglass with pale blue sand, wooden-looking gold frame, little sparkles. Square.
```

**Double score**
```
[STYLE] A shiny green gem or coin with a bold "2x" carved into it, bright lime highlight, tiny sparkles. Square.
```

## Stage key items (collect one to finish each fairy tale, about 64 pixels)

```
[STYLE] A single large cracked cream-colored egg with a golden crown painted on it, tiny sparkles. Square.        <- Humpty Dumpty: Egg
[STYLE] A small glass potion bottle with a cork and a paper tag that says "DRINK ME", purple liquid, sparkles.    <- Alice: Potion
[STYLE] A single glass slipper, translucent pale blue with white highlights and a tiny bow, sparkles.             <- Cinderella: Slipper
[STYLE] A golden trident with three points and a wavy handle, teal glow, a few bubbles.                            <- King Triton: Trident
[STYLE] A folded bright red hooded cape, soft cloth folds, a gold clasp.                                           <- Red Riding Hood: Hood
[STYLE] A round metal keeper's badge with a bold X, bronze with a gold rim, polished shine.                        <- Xen's Tower: Badge
```

## Characters

**Jon the wizard** (side view, running; a sheet of 8 frames works best)
```
[STYLE] A sprite sheet of 8 frames in one row of a young wizard running to the right: dark messy hair, purple robe with gold stars, brown boots, a glowing cyan staff. Each frame the same size, the same outline, legs and robe swinging through a run cycle. Evenly spaced, nothing overlapping.
```

**Claude, the companion** (small animal friend)
```
[STYLE] A tiny cute fox-like companion creature, orange body, cream belly, big dark eyes, tail curled, sitting, facing the viewer. Square.
```

**The Giant** (portrait for the story)
```
[STYLE] Bust portrait of a friendly but imposing cartoon giant, purple robe and a gold crown, big brown beard, small crown-shaped scepter, looking down. Square.
```

## Backgrounds and scenery (tile or wide strips, 1280 by 720 target)

**Sky and clouds** (one per stage; swap the color words)
```
[STYLE] A wide pixel-art sky background, soft banded pastel sky from lilac at the top to peach at the bottom, a few fluffy pixel clouds with white tops and lilac undersides, tiny twinkling stars. 16:9.
```

**Story tower**
```
[STYLE] A tall purple stone tower with crenellations at the top, one lit arched window, mossy base, a beanstalk vine climbing up its left side. Tall image.
```

**Stage backdrops** (one prompt each; replace the setting)
```
[STYLE] Wide pixel-art backdrop for a fairy-tale stage: <SETTING>, soft parallax layers in the distance, calm colors that won't distract from a green beanstalk in the middle. 16:9.
```
Settings: `a stone wall and meadow with a cracked egg lying below` (Humpty), `giant mushrooms, playing cards and a teapot` (Wonderland), `a moonlit ballroom stair and a clock tower` (Cinderella), `an underwater coral palace with bubbles` (Triton), `a dark forest path with a small cottage` (Red Hood), `Xen's glowing tower top above the clouds` (Xen).

## UI

**Favicon / app icon**
```
[STYLE] A tiny 32 by 32 pixel icon of a wizard's face with a pointed purple hat with a gold star, dark hair. Square, very readable at small size.
```

## Tips

- Keep each object's silhouette bold and readable at about 100 pixels; the game scales sprites down.
- Ask for "no text" except where the prompt names it (the "DRINK ME" tag and the badge letter).
- If the pixel size comes out too fine, add "very large chunky pixels, about 48 by 48 pixel grid".
- For a seamless tile (like the beanstalk), also add "must tile vertically, with the top and bottom edges lining up".
- Colors: keep the dark teal-green outline color the same everywhere so everything looks like one set.
