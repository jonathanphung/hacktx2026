# Jon Costume Sprite Workflow and Image Prompts

Use **Jon as the character base**, then change his costume. Build each costume as a separate animation set with the same proportions, alignment, and timing.

### 1. Generate the costume reference

Attach `jon.png`. Generate **one image per prompt**.

> Create one pixel-art costume variant of the attached Jon character.
>
> Costume theme: **[CHARACTER / COSTUME DESCRIPTION]**.
>
> Show Jon directly from behind, facing away from the viewer toward the top of the image. Preserve his recognizable black hair where the costume allows, head size, body proportions, and compact silhouette. No visible face or sideways turn.
>
> Use crisp square pixels, clear outlines, a limited palette, and simple shading matching the reference. Make the costume readable at a small gameplay size. Keep accessories compact.
>
> **[ACCESSORY INSTRUCTION]**
>
> Neutral standing pose, both feet visible. Full body centered with generous padding. Transparent background. Exactly one character, no scenery, text, shadow, blur, or gradients.

Suggested costume directions:

| Costume                | Main visual features                          | Moving fabric / accessory           |
| ---------------------- | --------------------------------------------- | ----------------------------------- |
| Humpty Dumpty          | Egg-shaped padded suit, short trousers, boots | Small coat tails; optional cane     |
| Little Red Riding Hood | Red hood and cape, simple dress, boots        | Red cape; basket on viewer’s right  |
| King Triton            | Crown, sea-green robes, gold details          | Robe hem; trident on viewer’s right |
| Cinderella             | Blue dress, gloves, small hair ornament       | Skirt and ribbons; no handheld item |
| Alice in Wonderland    | Blue dress, white apron, black bow            | Skirt, apron, and hair bow          |

For Triton, **keep legs and boots beneath the costume** so the existing running movement still fits.

### 2. Generate fabric poses

Attach the approved costume reference to every request.

Generate these separately:

| Image                              | Purpose                                   |
| ---------------------------------- | ----------------------------------------- |
| Resting fabric                     | Normal silhouette and alignment reference |
| Medium sweep toward viewer’s left  | Main running movement                     |
| High sweep toward viewer’s left    | Strong running movement                   |
| Medium sweep toward viewer’s right | Opposite movement                         |
| High sweep toward viewer’s right   | Opposite strong movement                  |

For dresses, animate the **skirt hem**. For Humpty, animate **coat tails or a small costume detail**. Large fabric motion is optional for costumes without loose cloth.

**Medium-left prompt**

> Edit the attached costume reference into one animation pose. Change only the **[cape / skirt / robe hem / coat tails]**.
>
> Sweep its lower portion moderately toward the viewer’s left, with natural folds and a little underside visible. Keep its attachment points fixed.
>
> Preserve the exact head, torso, arms, legs, accessory placement, character scale, and alignment. Rear-facing throughout. Do not mirror the character. Transparent background, matching pixel style, one sprite.

**High-left prompt**

> Using the attached costume reference and medium-left pose, create one stronger fabric-motion pose. Lift the **[fabric]** higher toward the viewer’s left, showing more underside while keeping it naturally attached. Avoid a wing-like shape.
>
> Change only the fabric. Preserve the character’s head, body, limbs, accessories, scale, alignment, and rear-facing direction. Transparent background, matching pixel style, one sprite.

For the two rightward images, replace **“viewer’s left”** with **“viewer’s right.”** Explicitly repeat:

> Do not mirror the entire character or swap accessory hands.

**Inspect every output:** generated images often change the legs, clothing details, or proportions despite these instructions. Use inconsistent outputs as fabric references, rather than swapping whole characters into the animation.

### 3. Generate the jump pose

> Create one jumping pose of the exact attached costume character. Direct rear view, facing away toward the top of the image.
>
> Tuck both knees upward, lift the boots, and let loose fabric flare naturally. Preserve the costume, head size, body proportions, colors, accessory hand, and pixel style.
>
> Keep the same horizontal alignment and character scale as the standing reference. Full character visible with padding. Transparent background, one sprite. No face, scenery, text, or motion lines.

Hit and defeat poses are optional additions after the run and jump look right.

### 4. Prepare the artwork in Aseprite

1. **Preserve the originals.** Work on copies.
2. Remove backgrounds and inspect edges against light and dark backgrounds.
3. Normalize the artwork to a consistent pixel grid using **nearest-neighbor scaling**.
4. Use a **128×128 canvas** for every player frame.
5. Match Jon’s head size and position across costumes. Never resize each pose independently to fill the canvas.
6. Keep the character centered on the same body anchor, with room for fabric and accessories.
7. Separate into editable layers:

   - Legs and boots
   - Torso and arms
   - Cape, skirt, or other loose fabric
   - Hair or headwear
   - Handheld accessory

Keep the head and torso from the approved reference. Adapt the generated fabric onto that stable body.

### 5. Build the leg cycle first

Start with four readable poses:

1. Left foot trails toward the viewer; right foot reaches forward into the scene.
2. Legs pass beneath the body, with one knee bent.
3. Right foot trails toward the viewer; left foot reaches forward.
4. Opposite passing pose.

Then add intermediates to make **eight frames**.

Important details:

- Both legs must alternate clearly.
- A lifted foot should look slightly smaller or more tucked.
- Keep the hips steady.
- Add only **1–2 pixels of body bounce**.
- Avoid inserting the neutral standing pose between strides.
- Check playback before adding fabric movement.

### 6. Animate fabric at a separate pace

Use **16 total frames at 60 ms each** as the starting point:

- Legs: repeat the eight-frame cycle twice.
- Fabric: complete one cycle over all 16 frames.
- Result: **two leg cycles per fabric cycle**.

Fabric sequence:

> Rest → medium left → high left → medium left → rest → medium right → high right → medium right → repeat

Add transition drawings where the silhouette jumps. Repeating frames changes timing, but does not create smoother motion.

Keep movement strongest at the hem and weakest at the shoulders or waist. Let fabric lag slightly behind the body.

### 7. Add secondary movement

- **Hair / bows:** subtle one-pixel movement with a slight delay.
- **Staff / trident / basket:** small swing around the gripping hand.
- **Headwear:** slight bounce, with its attachment kept stable.

Avoid moving everything in sync. Check for gaps where separately animated parts meet.

### 8. Create the gameplay variants

| Set                 | Fabric behavior                     |
| ------------------- | ----------------------------------- |
| Normal run          | Resting, medium, and high poses     |
| Moving left         | Fabric trails toward viewer’s right |
| Moving right        | Fabric trails toward viewer’s left  |
| Slowed run          | Resting and medium poses only       |
| Slowed moving left  | Medium rightward trail              |
| Slowed moving right | Medium leftward trail               |

**Preserve the leg frame when changing sets.** Switching direction or entering a slowdown should not restart the stride.

### 9. Export and test

Export:

- `.aseprite` project with layers
- Animated GIF for review
- Horizontal PNG sprite sheet with transparency
- JSON metadata with frame sizes and timing
- Separate jump PNG

For 16 frames at 128×128, the horizontal sheet is **2048×128**.

Check at actual gameplay size:

- Character always faces away.
- Feet alternate without sliding or hopping.
- Head and torso do not jump between frames.
- Fabric stays attached and loops cleanly.
- Accessories remain in the same hand.
- No clipping, white background, or edge halos.
- Lane changes, slowdowns, jumping, and landing transition correctly.

**Generate the costume reference first. Approve its silhouette before generating the other poses.**

---

# Copy-and-Paste Costume Prompts

Below are **50 prompts: 10 assets for each costume**, matching your attached set.

Generate each costume’s **base image first**, attaching `jon.png`. For its other nine images, attach:

1. The approved costume base for identity and clothing.
2. The corresponding original Jon image for pose only.

**Left/right always means the viewer’s left/right.** Fabric poses keep the body fixed so we can animate clothing separately. Running-left/right poses are for lane changes.

## Humpty Dumpty

**Corrected coat construction:** the tails are the two lower panels of one jacket, attached side by side at the lower back. They are not separate ribbons emerging from the arm or side. For fabric edits, use only a correct standing base. Repair the standing base first if its coat is already malformed.

### 1. `humpty-base.png`

```text
Create one pixel-art costume variant of the attached Jon. Show him directly from behind, facing away toward the top of the image. Preserve his black hair, head size, human proportions, and compact silhouette.

Humpty Dumpty-inspired storybook gentleman: burgundy tailcoat with gold piping, cream waistcoat, mustard knee breeches, cream stockings, brown buckled shoes, and a small cracked-egg emblem on the coat’s back. Jon is human, not egg-shaped. Two broad coat-tail panels hang side by side below the waist and end above the knees, with one short vertical center vent between them. No hat or handheld item.

Neutral standing pose. Match Jon’s chunky pixels, dark outlines, and simple shading. Square canvas, full body, generous padding, transparent background. One sprite, no text, scenery, shadow, blur, or gradients.

Coat construction: one intact fitted jacket covering the entire back from shoulders to waist, with two complete sleeves, two cuffs, and two visible hands. Below the waist, the jacket continues into exactly two broad fabric panels, separated by one short center-back vent. One panel starts at the left lower back and one at the right lower back, side by side at the same waist height. Each panel has a broad, continuously attached root and one rounded free end. The center vent stops at the waist; it never cuts into the upper jacket. The cracked-egg emblem stays on the solid upper back above the waist. No extra strips, detached pieces, ribbon tails, exposed cut edges, or missing sleeve sections.
```

### 2. `humpty-run-left.png`

Pose reference: `jonrunleft.png`.

```text
Create one leftward lane-change pose of the approved Humpty-costumed Jon. Use the original wizard image only for pose, never its clothing or staff.

Rear-facing, looking away toward the top of the image. Lean slightly toward the viewer’s left while keeping the back of the head visible. Left foot reaches toward the left lane; right leg pushes off behind. Arms counterbalance. Burgundy coat tails trail toward the viewer’s right.

Preserve black hair, human proportions, burgundy-and-gold coat, mustard breeches, cream stockings, and buckled shoes. Hands empty. Same scale and pixel style as the costume base. Full body, square canvas, padding, transparent background. One sprite, no effects or scenery.

Coat construction: one intact fitted jacket covering the entire back from shoulders to waist, with two complete sleeves, two cuffs, and two visible hands. Below the waist, the jacket continues into exactly two broad fabric panels, separated by one short center-back vent. One panel starts at the left lower back and one at the right lower back, side by side at the same waist height. Each panel has a broad, continuously attached root and one rounded free end. The center vent stops at the waist; it never cuts into the upper jacket. The cracked-egg emblem stays on the solid upper back above the waist. No extra strips, detached pieces, ribbon tails, exposed cut edges, or missing sleeve sections.
```

### 3. `humpty-run-right.png`

Pose reference: `jonrunright.png`.

```text
Create one rightward lane-change pose of the approved Humpty-costumed Jon. Use the original wizard image only for pose, never its clothing or staff.

Rear-facing, looking away toward the top of the image. Lean slightly toward the viewer’s right while keeping the back of the head visible. Right foot reaches toward the right lane; left leg pushes off behind. Arms counterbalance. Burgundy coat tails trail toward the viewer’s left.

Preserve black hair, human proportions, burgundy-and-gold coat, mustard breeches, cream stockings, and buckled shoes. Hands empty. Do not mirror costume details. Same scale and pixel style as the base. Full body, square canvas, padding, transparent background. One sprite, no effects or scenery.

Coat construction: one intact fitted jacket covering the entire back from shoulders to waist, with two complete sleeves, two cuffs, and two visible hands. Below the waist, the jacket continues into exactly two broad fabric panels, separated by one short center-back vent. One panel starts at the left lower back and one at the right lower back, side by side at the same waist height. Each panel has a broad, continuously attached root and one rounded free end. The center vent stops at the waist; it never cuts into the upper jacket. The cracked-egg emblem stays on the solid upper back above the waist. No extra strips, detached pieces, ribbon tails, exposed cut edges, or missing sleeve sections.
```

### 4. `humpty-fabric-medium-left.png`

Attach only the approved Humpty standing base. Do not attach the wizard cape pose or either malformed output. Keep the exact same square canvas, body position, and character scale.

```text
Edit the approved rear-facing Humpty-costumed Jon. Change only the two broad burgundy lower-back panels below the waist. Preserve the entire jacket above the waist and both sleeves pixel-for-pixel.

Bend both panels gently toward the viewer’s left in the same airflow, lifting their free ends to mid-thigh height. Keep their left and right roots side by side at the original waist positions. The two tips may overlap slightly in depth, but must not become two horizontal strips stacked vertically or attach to the sleeve. Show a little darker-burgundy lining. Keep the coat’s waist attachment fixed, the two lower-back panels recognizable, and the cracked-egg emblem unchanged.

Keep the head, torso, arms, hands, legs, shoes, scale, and alignment exactly as the costume base. No cape, staff, or egg-shaped body. Preserve the palette and crisp pixel style. Full body on the same square canvas, generous padding, transparent background. Exactly one sprite, no text or scenery.

Coat construction: one intact fitted jacket covering the entire back from shoulders to waist, with two complete sleeves, two cuffs, and two visible hands. Below the waist, the jacket continues into exactly two broad fabric panels, separated by one short center-back vent. One panel starts at the left lower back and one at the right lower back, side by side at the same waist height. Each panel has a broad, continuously attached root and one rounded free end. The center vent stops at the waist; it never cuts into the upper jacket. The cracked-egg emblem stays on the solid upper back above the waist. No extra strips, detached pieces, ribbon tails, exposed cut edges, or missing sleeve sections.
```

### 5. `humpty-fabric-high-left.png`

Attach only the approved Humpty standing base. Do not attach the wizard cape pose or either malformed output. Keep the exact same square canvas, body position, and character scale.

```text
Edit the approved rear-facing Humpty-costumed Jon. Change only the two broad burgundy lower-back panels below the waist. Preserve the entire jacket above the waist and both sleeves pixel-for-pixel.

Curl both panels upward and toward the viewer’s left, raising their free ends approximately to hip height. Keep each panel broadly connected to its own original lower-back attachment at the waist. Use a curved fabric fold: the tip rises while the root stays fixed. Do not relocate either panel to the arm, sleeve, ribs, or upper back. Do not create two horizontal strips stacked vertically. Show more darker-burgundy lining and curved fabric folds. Both tails remain attached at the waist with continuous fabric connections. Keep the cracked-egg emblem unchanged. Do not turn the coat tails into wings or a cape.

Keep the head, torso, arms, legs, shoes, scale, and alignment identical to the costume base. Preserve the palette and crisp pixel style. Full body, same square canvas, padding, transparent background. One sprite, no text or scenery.

Coat construction: one intact fitted jacket covering the entire back from shoulders to waist, with two complete sleeves, two cuffs, and two visible hands. Below the waist, the jacket continues into exactly two broad fabric panels, separated by one short center-back vent. One panel starts at the left lower back and one at the right lower back, side by side at the same waist height. Each panel has a broad, continuously attached root and one rounded free end. The center vent stops at the waist; it never cuts into the upper jacket. The cracked-egg emblem stays on the solid upper back above the waist. No extra strips, detached pieces, ribbon tails, exposed cut edges, or missing sleeve sections.
```

### 6. `humpty-fabric-medium-right.png`

Attach only the approved Humpty standing base. Do not attach the wizard cape pose or either malformed output. Keep the exact same square canvas, body position, and character scale.

```text
Edit the approved rear-facing Humpty-costumed Jon. Change only the two broad burgundy lower-back panels below the waist. Preserve the entire jacket above the waist and both sleeves pixel-for-pixel.

Bend both panels gently toward the viewer’s right in the same airflow, lifting their free ends to mid-thigh height. Keep their left and right roots side by side at the original waist positions. The two tips may overlap slightly in depth, but must not become two horizontal strips stacked vertically or attach to the sleeve. Show a little darker-burgundy lining. Keep the waist attachment fixed, the two lower-back panels recognizable, and the cracked-egg emblem unchanged.

Keep the head, torso, arms, hands, legs, shoes, scale, and alignment identical to the costume base. Do not mirror the character. No cape, staff, or egg-shaped body. Preserve the palette and crisp pixel style. Full body, same square canvas, padding, transparent background. One sprite, no text or scenery.

Coat construction: one intact fitted jacket covering the entire back from shoulders to waist, with two complete sleeves, two cuffs, and two visible hands. Below the waist, the jacket continues into exactly two broad fabric panels, separated by one short center-back vent. One panel starts at the left lower back and one at the right lower back, side by side at the same waist height. Each panel has a broad, continuously attached root and one rounded free end. The center vent stops at the waist; it never cuts into the upper jacket. The cracked-egg emblem stays on the solid upper back above the waist. No extra strips, detached pieces, ribbon tails, exposed cut edges, or missing sleeve sections.
```

### 7. `humpty-fabric-high-right.png`

Attach only the approved Humpty standing base. Do not attach the wizard cape pose or either malformed output. Keep the exact same square canvas, body position, and character scale.

```text
Edit the approved rear-facing Humpty-costumed Jon. Change only the two broad burgundy lower-back panels below the waist. Preserve the entire jacket above the waist and both sleeves pixel-for-pixel.

Curl both panels upward and toward the viewer’s right, raising their free ends approximately to hip height. Keep each panel broadly connected to its own original lower-back attachment at the waist. Use a curved fabric fold: the tip rises while the root stays fixed. Do not relocate either panel to the arm, sleeve, ribs, or upper back. Do not create two horizontal strips stacked vertically. Show more darker-burgundy lining and curved folds. Both tails remain attached at the waist with continuous fabric connections. Keep the cracked-egg emblem unchanged. No wing-like shapes.

Keep the head, torso, arms, hands, legs, shoes, scale, and alignment identical to the costume base. Do not mirror the character. Preserve the palette and crisp pixel style. Full body, same square canvas, padding, transparent background. Exactly one sprite, no text or scenery.

Coat construction: one intact fitted jacket covering the entire back from shoulders to waist, with two complete sleeves, two cuffs, and two visible hands. Below the waist, the jacket continues into exactly two broad fabric panels, separated by one short center-back vent. One panel starts at the left lower back and one at the right lower back, side by side at the same waist height. Each panel has a broad, continuously attached root and one rounded free end. The center vent stops at the waist; it never cuts into the upper jacket. The cracked-egg emblem stays on the solid upper back above the waist. No extra strips, detached pieces, ribbon tails, exposed cut edges, or missing sleeve sections.
```

### 8. `humpty-jump.png`

Pose reference: `jonjump.png`.

```text
Create one jumping pose of the approved Humpty-costumed Jon, using the wizard reference only for the jump pose.

Direct rear view, facing away toward the top of the image. Tuck both knees upward, lift both buckled shoes, and raise the empty hands for balance. Let the short burgundy coat tails flare naturally, revealing their dark lining.

Preserve black hair, human proportions, burgundy-and-gold coat, cream waistcoat, mustard breeches, cream stockings, and costume details. No egg-shaped body or staff. Same character scale and horizontal alignment as the base. Full body, square canvas, padding, transparent background. One sprite, no face, text, scenery, or effects.

Coat construction: one intact fitted jacket covering the entire back from shoulders to waist, with two complete sleeves, two cuffs, and two visible hands. Below the waist, the jacket continues into exactly two broad fabric panels, separated by one short center-back vent. One panel starts at the left lower back and one at the right lower back, side by side at the same waist height. Each panel has a broad, continuously attached root and one rounded free end. The center vent stops at the waist; it never cuts into the upper jacket. The cracked-egg emblem stays on the solid upper back above the waist. No extra strips, detached pieces, ribbon tails, exposed cut edges, or missing sleeve sections.
```

### 9. `humpty-hit.png`

Pose reference: `jonhit.png`.

```text
Create one impact-stumble pose of the approved Humpty-costumed Jon, using the wizard reference only for body posture.

Rear view, facing away toward the top of the image. Pitch the torso forward, bend both knees unevenly, and extend the empty hands outward to regain balance. Keep him on his feet. Coat tails kick upward briefly.

Preserve black hair, human proportions, burgundy-and-gold tailcoat, cracked-egg emblem, cream waistcoat, mustard breeches, cream stockings, and buckled shoes. No egg body, staff, injury, or costume damage. Same scale and pixel style as the base. Full body, square canvas, padding, transparent background. One sprite, no scenery or impact effects.

Coat construction: one intact fitted jacket covering the entire back from shoulders to waist, with two complete sleeves, two cuffs, and two visible hands. Below the waist, the jacket continues into exactly two broad fabric panels, separated by one short center-back vent. One panel starts at the left lower back and one at the right lower back, side by side at the same waist height. Each panel has a broad, continuously attached root and one rounded free end. The center vent stops at the waist; it never cuts into the upper jacket. The cracked-egg emblem stays on the solid upper back above the waist. No extra strips, detached pieces, ribbon tails, exposed cut edges, or missing sleeve sections.
```

### 10. `humpty-defeat.png`

Pose reference: `jondefeat.png`.

```text
Create one defeated pose of the approved Humpty-costumed Jon, using the wizard reference only for posture.

Rear view, facing away toward the top of the image. Kneel on both knees, lower the head, slump the shoulders, and rest the empty hands near the thighs. Burgundy coat tails settle naturally behind him.

Preserve black hair, human proportions, burgundy-and-gold tailcoat, cracked-egg emblem, cream waistcoat, mustard breeches, cream stockings, and buckled shoes. Jon remains human and intact: no cracked body, broken shell, or injury. Same character scale and pixel style as the base. Full body, square canvas, padding, transparent background. One sprite, no text or scenery.

Coat construction: one intact fitted jacket covering the entire back from shoulders to waist, with two complete sleeves, two cuffs, and two visible hands. Below the waist, the jacket continues into exactly two broad fabric panels, separated by one short center-back vent. One panel starts at the left lower back and one at the right lower back, side by side at the same waist height. Each panel has a broad, continuously attached root and one rounded free end. The center vent stops at the waist; it never cuts into the upper jacket. The cracked-egg emblem stays on the solid upper back above the waist. No extra strips, detached pieces, ribbon tails, exposed cut edges, or missing sleeve sections.
```

## Little Red Riding Hood

### 1. `red-base.png`

```text
Create one pixel-art Little Red Riding Hood costume for the attached Jon. Direct rear view, facing away toward the top of the image. Preserve his head size, human proportions, and compact silhouette.

Deep-red hood with a little black hair visible at the nape, red shoulder cape ending above the knees, cream shirt, brown belt, dark-brown knee breeches, and brown boots. The cape has a darker-red lining and clearly defined lower hem. Both legs remain visible. Hands empty, no basket, staff, or weapon.

Neutral standing pose. Match Jon’s chunky pixels, dark outlines, and simple shading. Full body, square canvas, generous padding, transparent background. One sprite, no face, text, scenery, shadow, or blur.
```

### 2. `red-run-left.png`

Pose reference: `jonrunleft.png`.

```text
Create one leftward lane-change pose of the approved Red Riding Hood-costumed Jon. Use the wizard reference only for posture.

Rear-facing, looking away toward the top of the image. Lean slightly toward the viewer’s left. Left foot reaches toward the left lane; right leg pushes off behind. Empty hands counterbalance. The red cape trails toward the viewer’s right, exposing a little darker-red lining.

Preserve the hood, black hair at the nape, cream shirt, belt, dark-brown breeches, brown boots, proportions, and costume details. No basket or staff. Same scale and pixel style as the base. Full body, square canvas, padding, transparent background. One sprite, no face, scenery, or effects.
```

### 3. `red-run-right.png`

Pose reference: `jonrunright.png`.

```text
Create one rightward lane-change pose of the approved Red Riding Hood-costumed Jon. Use the wizard reference only for posture.

Rear-facing, looking away toward the top of the image. Lean slightly toward the viewer’s right. Right foot reaches toward the right lane; left leg pushes off behind. Empty hands counterbalance. The red cape trails toward the viewer’s left, exposing a little darker-red lining.

Preserve the hood, black hair at the nape, cream shirt, belt, dark-brown breeches, brown boots, proportions, and costume details. Do not mirror the character. No basket or staff. Same scale and pixel style as the base. Full body, square canvas, padding, transparent background. One sprite, no scenery or effects.
```

### 4. `red-cape-medium-left.png`

Pose reference: `jonruncapemide.png`.

```text
Edit the approved rear-facing Red Riding Hood-costumed Jon. Change only the cape below its shoulder attachment.

Sweep the lower cape moderately toward the viewer’s left, lifting its hem from above the knees to mid-thigh height. Use a rounded fabric curve, gentle folds, and a small visible strip of darker-red lining. Keep the hood completely unchanged.

Preserve the exact head, torso, arms, hands, legs, boots, palette, character scale, and alignment of the costume base. Hands remain empty. Full body on the same square canvas, generous padding, transparent background. Crisp matching pixel art. Exactly one sprite, no text, scenery, blur, or motion lines.
```

### 5. `red-cape-high-left.png`

Pose reference: `jonruncapehigh.png`.

```text
Edit the approved rear-facing Red Riding Hood-costumed Jon. Change only the cape below its shoulder attachment.

Lift and sweep the lower cape strongly toward the viewer’s left, bringing the free hem approximately to waist height. Show a broad curved section of darker-red lining. Keep the fabric naturally attached at both shoulders, with no wing-like spreading. The hood stays unchanged.

Preserve the exact head, torso, arms, hands, legs, boots, character scale, and alignment of the costume base. Hands empty. Full body, same square canvas, generous padding, transparent background. Matching crisp pixel art. One sprite, no face, text, scenery, or effects.
```

### 6. `red-cape-medium-right.png`

Pose reference: `joncaprunmidright.png`.

```text
Edit the approved rear-facing Red Riding Hood-costumed Jon. Change only the cape below its shoulder attachment.

Sweep the lower cape moderately toward the viewer’s right, lifting its hem from above the knees to mid-thigh height. Use a rounded fabric curve, gentle folds, and a small visible strip of darker-red lining. Keep the hood unchanged.

Preserve the exact head, torso, arms, hands, legs, boots, palette, scale, and alignment of the costume base. Do not mirror the character. Hands empty. Full body, same square canvas, generous padding, transparent background. Matching crisp pixel art. One sprite, no text, scenery, blur, or motion lines.
```

### 7. `red-cape-high-right.png`

Pose reference: `jonruncapehighright.png`.

```text
Edit the approved rear-facing Red Riding Hood-costumed Jon. Change only the cape below its shoulder attachment.

Lift and sweep the lower cape strongly toward the viewer’s right, bringing the free hem approximately to waist height. Show a broad curved section of darker-red lining. Keep the fabric naturally attached at both shoulders, with no wing-like spreading. The hood stays unchanged.

Preserve the exact head, torso, arms, hands, legs, boots, scale, and alignment of the costume base. Do not mirror the character. Hands empty. Full body, same square canvas, padding, transparent background. Matching crisp pixel art. One sprite, no text, scenery, or effects.
```

### 8. `red-jump.png`

Pose reference: `jonjump.png`.

```text
Create one jumping pose of the approved Red Riding Hood-costumed Jon. Use the wizard reference only for the jump posture.

Direct rear view, facing away toward the top of the image. Tuck both knees upward, lift both boots, and raise the empty hands for balance. The red cape flares upward naturally, showing its darker-red lining while remaining attached at the shoulders. Keep the hood on the head.

Preserve black hair at the nape, cream shirt, belt, dark-brown breeches, brown boots, proportions, and costume details. Same character scale and horizontal alignment as the base. Full body, square canvas, padding, transparent background. One sprite, no staff, face, scenery, or effects.
```

### 9. `red-hit.png`

Pose reference: `jonhit.png`.

```text
Create one impact-stumble pose of the approved Red Riding Hood-costumed Jon. Use the wizard reference only for posture.

Rear-facing, looking away toward the top of the image. Pitch the torso forward, bend the knees unevenly, and extend the empty hands outward to recover balance. Keep both feet near the ground. The red cape swings upward briefly; the hood remains on.

Preserve black hair at the nape, cream shirt, belt, dark-brown breeches, brown boots, head size, human proportions, and costume details. No basket, staff, injury, or torn clothing. Same scale and pixel style as the base. Full body, square canvas, padding, transparent background. One sprite, no scenery or effects.
```

### 10. `red-defeat.png`

Pose reference: `jondefeat.png`.

```text
Create one defeated pose of the approved Red Riding Hood-costumed Jon. Use the wizard reference only for posture.

Rear view, facing away toward the top of the image. Kneel on both knees with head lowered, shoulders slumped, and empty hands resting near the thighs. The red cape settles over the back and folds gently near the ground. Keep the hood on.

Preserve black hair at the nape, cream shirt, belt, dark-brown breeches, brown boots, character proportions, palette, and costume details. No injury or damaged clothing. Same scale and pixel style as the base. Full body, square canvas, padding, transparent background. One sprite, no face, text, scenery, or effects.
```

## King Triton

### 1. `triton-base.png`

```text
Create one pixel-art King Triton-inspired costume for the attached Jon. Direct rear view, facing away toward the top of the image. Preserve his black hair, head size, human proportions, and compact silhouette.

Small gold three-point crown, sea-green tunic with gold shell trim, short teal shoulder cape ending above the knees, dark-teal trousers, and gold-trimmed brown boots. Two human legs, no fish tail. Cape lining is deep blue-green.

Hold a compact gold trident upright on the viewer’s right, all three prongs visible. Neutral standing pose.

Match Jon’s chunky pixels, dark outlines, and simple shading. Full body and complete trident, square canvas, generous padding, transparent background. One sprite, no face, text, scenery, shadow, or blur.
```

### 2. `triton-run-left.png`

Pose reference: `jonrunleft.png`.

```text
Create one leftward lane-change pose of the approved Triton-costumed Jon. Use the wizard reference only for posture.

Rear-facing, looking away toward the top of the image. Lean slightly toward the viewer’s left. Left foot reaches toward the left lane; right leg pushes off behind. Free hand counterbalances. Teal cape trails toward the viewer’s right.

Keep the gold trident in the hand on the viewer’s right, with its complete three-pronged head visible. Preserve black hair, crown, sea-green-and-gold tunic, dark-teal trousers, boots, human proportions, and costume details. No fish tail. Same scale and pixel style as the base. Full body, square canvas, padding, transparent background. One sprite, no scenery or effects.
```

### 3. `triton-run-right.png`

Pose reference: `jonrunright.png`.

```text
Create one rightward lane-change pose of the approved Triton-costumed Jon. Use the wizard reference only for posture.

Rear-facing, looking away toward the top of the image. Lean slightly toward the viewer’s right. Right foot reaches toward the right lane; left leg pushes off behind. Free hand counterbalances. Teal cape trails toward the viewer’s left.

Keep the gold trident in the hand on the viewer’s right, all three prongs visible. Never swap hands or mirror the character. Preserve black hair, crown, tunic, trousers, boots, human proportions, and costume details. No fish tail. Same scale and pixel style as the base. Full body, square canvas, padding, transparent background. One sprite, no effects.
```

### 4. `triton-cape-medium-left.png`

Pose reference: `jonruncapemide.png`.

```text
Edit the approved rear-facing Triton-costumed Jon. Change only the teal cape below its shoulder attachment.

Sweep the lower cape moderately toward the viewer’s left, lifting its hem from above-knee height to mid-thigh height. Show a little deep blue-green lining. Keep the gold border continuous and the shoulder attachments fixed.

Keep the crown, black hair, head, torso, arms, hands, legs, boots, and gold trident exactly unchanged. Trident remains on the viewer’s right, with all three prongs visible. Preserve scale, alignment, palette, and crisp pixel style. Full body and complete trident, same square canvas, padding, transparent background. One sprite, no text or scenery.
```

### 5. `triton-cape-high-left.png`

Pose reference: `jonruncapehigh.png`.

```text
Edit the approved rear-facing Triton-costumed Jon. Change only the teal cape below its shoulder attachment.

Lift and sweep the lower cape strongly toward the viewer’s left, raising the free hem approximately to waist height. Show more deep blue-green lining and curved folds. Preserve the continuous gold border. Keep both shoulder attachments fixed; no wing-like shapes.

Keep the crown, hair, head, torso, arms, hands, legs, boots, and trident unchanged. Trident stays on the viewer’s right. Preserve character scale, alignment, palette, and pixel style. Full body and complete trident, same square canvas, generous padding, transparent background. One sprite, no scenery or effects.
```

### 6. `triton-cape-medium-right.png`

Pose reference: `joncaprunmidright.png`.

```text
Edit the approved rear-facing Triton-costumed Jon. Change only the teal cape below its shoulder attachment.

Sweep the lower cape moderately toward the viewer’s right, lifting its hem from above-knee height to mid-thigh height. Show a little deep blue-green lining and preserve the continuous gold border. Keep the shoulder attachments fixed. The cape may naturally overlap the trident shaft.

Keep the crown, hair, head, torso, arms, hands, legs, boots, and trident unchanged. Trident remains on the viewer’s right. Do not mirror the character. Same scale, alignment, and pixel style. Full body and complete trident, square canvas, padding, transparent background. One sprite, no scenery.
```

### 7. `triton-cape-high-right.png`

Pose reference: `jonruncapehighright.png`.

```text
Edit the approved rear-facing Triton-costumed Jon. Change only the teal cape below its shoulder attachment.

Lift and sweep the lower cape strongly toward the viewer’s right, raising the free hem approximately to waist height. Show more deep blue-green lining and curved folds. Preserve the gold border and both shoulder attachments. Natural overlap with the trident shaft is allowed, but keep its three-pronged head visible.

Keep the crown, hair, head, torso, arms, hands, legs, boots, and trident placement unchanged. Do not mirror the character. Same scale, alignment, palette, and pixel style. Full body, complete trident, square canvas, padding, transparent background. One sprite, no scenery.
```

### 8. `triton-jump.png`

Pose reference: `jonjump.png`.

```text
Create one jumping pose of the approved Triton-costumed Jon. Use the wizard reference only for the jump posture.

Direct rear view, facing away toward the top of the image. Tuck both human knees upward, lift the boots, and raise the free hand for balance. Keep the gold trident upright in the hand on the viewer’s right, all three prongs visible. Let the teal cape flare naturally and keep the crown seated on the head.

Preserve black hair, sea-green-and-gold tunic, dark-teal trousers, boots, proportions, and pixel style. No fish tail. Same character scale as the base. Full body and trident, square canvas, padding, transparent background. One sprite, no effects.
```

### 9. `triton-hit.png`

Pose reference: `jonhit.png`.

```text
Create one impact-stumble pose of the approved Triton-costumed Jon. Use the wizard reference only for posture.

Rear view, facing away toward the top of the image. Pitch the torso forward, bend the knees unevenly, and extend the free arm to regain balance. Keep hold of the trident on the viewer’s right, angled slightly but completely visible. Teal cape kicks upward; crown stays on.

Preserve black hair, sea-green-and-gold tunic, trousers, boots, human proportions, costume details, and pixel style. No fish tail, broken trident, injury, or damaged clothing. Same scale as the base. Full body, square canvas, padding, transparent background. One sprite, no scenery or effects.
```

### 10. `triton-defeat.png`

Pose reference: `jondefeat.png`.

```text
Create one defeated pose of the approved Triton-costumed Jon. Use the wizard reference only for posture.

Rear view, facing away toward the top of the image. Kneel on both human knees, lower the head, and slump the shoulders. Keep the gold trident in the hand on the viewer’s right, its lower tip resting on the ground for support. Keep all three prongs visible. Teal cape settles behind him; crown stays on.

Preserve black hair, tunic, trousers, boots, proportions, costume details, and pixel style. No fish tail, injury, or broken items. Same character scale as the base. Full body and trident, square canvas, padding, transparent background. One sprite, no scenery.
```

## Cinderella

These prompts use an adult character in a fully covered, ankle-length costume. The four fabric variants change horizontal ripple strength, not garment height. Existing filenames containing `high` mean stronger sideways motion. Generate the new standing base first, then use it consistently.

### 1. `cinderella-base.png`

Attach jon.png as the character reference.

```text
Create one pixel-art sprite of adult Jon wearing a Cinderella-inspired costume. A Cinderella-inspired storybook costume: a powder-blue high-neck dress with long sleeves, a loose comfortable fit, an opaque ankle-length skirt, pale-blue decorative waist panels, white gloves, blue shoes, and a small blue hair ribbon. Hands empty. The complete outfit stays securely in place in every pose. Neutral standing pose with arms relaxed and feet slightly apart. Leave both shoes visible beneath the ankle-length hem. Direct rear view, facing away toward the top of the image. Preserve the same black hair, head size, adult human proportions, costume details, and character scale as the reference. Crisp chunky pixel art, dark outlines, limited palette, simple shading. Full body on a square canvas with generous padding. Transparent background. Exactly one sprite, no text, scenery, shadow, blur, or motion lines.
```

### 2. `cinderella-run-left.png`

Attach the approved Cinderella costume base and jonrunleft.png for posture only.

```text
Create one leftward lane-change pose of the approved adult Cinderella-costumed Jon. Lean slightly toward the viewer’s left. The left foot reaches toward that lane while the opposite foot pushes off. Gloved hands counterbalance. The long blue skirt bends gently toward the viewer’s right; its hem stays near the ankles. Suggest running through the shoe positions and fabric folds. A Cinderella-inspired storybook costume: a powder-blue high-neck dress with long sleeves, a loose comfortable fit, an opaque ankle-length skirt, pale-blue decorative waist panels, white gloves, blue shoes, and a small blue hair ribbon. Hands empty. The complete outfit stays securely in place in every pose. Use the wizard reference only for posture; keep the Cinderella clothing. Direct rear view, facing away toward the top of the image. Preserve the same black hair, head size, adult human proportions, costume details, and character scale as the reference. Crisp chunky pixel art, dark outlines, limited palette, simple shading. Full body on a square canvas with generous padding. Transparent background. Exactly one sprite, no text, scenery, shadow, blur, or motion lines.
```

### 3. `cinderella-run-right.png`

Attach the approved Cinderella costume base and jonrunright.png for posture only.

```text
Create one rightward lane-change pose of the approved adult Cinderella-costumed Jon. Lean slightly toward the viewer’s right. The right foot reaches toward that lane while the opposite foot pushes off. Gloved hands counterbalance. The long blue skirt bends gently toward the viewer’s left; its hem stays near the ankles. Suggest running through the shoe positions and fabric folds. A Cinderella-inspired storybook costume: a powder-blue high-neck dress with long sleeves, a loose comfortable fit, an opaque ankle-length skirt, pale-blue decorative waist panels, white gloves, blue shoes, and a small blue hair ribbon. Hands empty. The complete outfit stays securely in place in every pose. Use the wizard reference only for posture; keep the Cinderella clothing. Direct rear view, facing away toward the top of the image. Preserve the same black hair, head size, adult human proportions, costume details, and character scale as the reference. Crisp chunky pixel art, dark outlines, limited palette, simple shading. Full body on a square canvas with generous padding. Transparent background. Exactly one sprite, no text, scenery, shadow, blur, or motion lines.
```

### 4. `cinderella-skirt-medium-left.png`

Attach only the approved Cinderella standing base. Do not use the wizard cape pose for this garment edit.

```text
Create one fabric-animation variant of the approved adult Cinderella-costumed Jon. Change only folds in the blue skirt, creating a gentle sideways ripple toward the viewer’s left. This is medium horizontal fabric movement, with no upward lifting. Keep the hem at its original ankle height, the waist attachment fixed, and the skirt’s continuous silhouette intact. Keep the head, torso, arms, gloves, legs, shoes, canvas, and alignment exactly unchanged. Do not mirror the character. A Cinderella-inspired storybook costume: a powder-blue high-neck dress with long sleeves, a loose comfortable fit, an opaque ankle-length skirt, pale-blue decorative waist panels, white gloves, blue shoes, and a small blue hair ribbon. Hands empty. The complete outfit stays securely in place in every pose. Direct rear view, facing away toward the top of the image. Preserve the same black hair, head size, adult human proportions, costume details, and character scale as the reference. Crisp chunky pixel art, dark outlines, limited palette, simple shading. Full body on a square canvas with generous padding. Transparent background. Exactly one sprite, no text, scenery, shadow, blur, or motion lines.
```

### 5. `cinderella-skirt-high-left.png`

Attach only the approved Cinderella standing base. Do not use the wizard cape pose for this garment edit.

```text
Create one fabric-animation variant of the approved adult Cinderella-costumed Jon. Change only folds in the blue skirt, creating a broader sideways billow toward the viewer’s left. This is strong horizontal fabric movement, with no upward lifting. Keep the hem at its original ankle height, the waist attachment fixed, and the skirt’s continuous silhouette intact. Keep the head, torso, arms, gloves, legs, shoes, canvas, and alignment exactly unchanged. Do not mirror the character. A Cinderella-inspired storybook costume: a powder-blue high-neck dress with long sleeves, a loose comfortable fit, an opaque ankle-length skirt, pale-blue decorative waist panels, white gloves, blue shoes, and a small blue hair ribbon. Hands empty. The complete outfit stays securely in place in every pose. Direct rear view, facing away toward the top of the image. Preserve the same black hair, head size, adult human proportions, costume details, and character scale as the reference. Crisp chunky pixel art, dark outlines, limited palette, simple shading. Full body on a square canvas with generous padding. Transparent background. Exactly one sprite, no text, scenery, shadow, blur, or motion lines.
```

### 6. `cinderella-skirt-medium-right.png`

Attach only the approved Cinderella standing base. Do not use the wizard cape pose for this garment edit.

```text
Create one fabric-animation variant of the approved adult Cinderella-costumed Jon. Change only folds in the blue skirt, creating a gentle sideways ripple toward the viewer’s right. This is medium horizontal fabric movement, with no upward lifting. Keep the hem at its original ankle height, the waist attachment fixed, and the skirt’s continuous silhouette intact. Keep the head, torso, arms, gloves, legs, shoes, canvas, and alignment exactly unchanged. Do not mirror the character. A Cinderella-inspired storybook costume: a powder-blue high-neck dress with long sleeves, a loose comfortable fit, an opaque ankle-length skirt, pale-blue decorative waist panels, white gloves, blue shoes, and a small blue hair ribbon. Hands empty. The complete outfit stays securely in place in every pose. Direct rear view, facing away toward the top of the image. Preserve the same black hair, head size, adult human proportions, costume details, and character scale as the reference. Crisp chunky pixel art, dark outlines, limited palette, simple shading. Full body on a square canvas with generous padding. Transparent background. Exactly one sprite, no text, scenery, shadow, blur, or motion lines.
```

### 7. `cinderella-skirt-high-right.png`

Attach only the approved Cinderella standing base. Do not use the wizard cape pose for this garment edit.

```text
Create one fabric-animation variant of the approved adult Cinderella-costumed Jon. Change only folds in the blue skirt, creating a broader sideways billow toward the viewer’s right. This is strong horizontal fabric movement, with no upward lifting. Keep the hem at its original ankle height, the waist attachment fixed, and the skirt’s continuous silhouette intact. Keep the head, torso, arms, gloves, legs, shoes, canvas, and alignment exactly unchanged. Do not mirror the character. A Cinderella-inspired storybook costume: a powder-blue high-neck dress with long sleeves, a loose comfortable fit, an opaque ankle-length skirt, pale-blue decorative waist panels, white gloves, blue shoes, and a small blue hair ribbon. Hands empty. The complete outfit stays securely in place in every pose. Direct rear view, facing away toward the top of the image. Preserve the same black hair, head size, adult human proportions, costume details, and character scale as the reference. Crisp chunky pixel art, dark outlines, limited palette, simple shading. Full body on a square canvas with generous padding. Transparent background. Exactly one sprite, no text, scenery, shadow, blur, or motion lines.
```

### 8. `cinderella-jump.png`

Attach the approved Cinderella base and jonjump.png for posture only.

```text
Create one small hopping pose of the approved adult Cinderella-costumed Jon. Both shoes leave the ground slightly, with gloved arms extended for balance. The long dress follows the body as one securely worn garment. Show motion through a small curved ripple in the skirt, keeping its ankle-length coverage relative to the body. Preserve the standing reference’s garment length and character scale. A Cinderella-inspired storybook costume: a powder-blue high-neck dress with long sleeves, a loose comfortable fit, an opaque ankle-length skirt, pale-blue decorative waist panels, white gloves, blue shoes, and a small blue hair ribbon. Hands empty. The complete outfit stays securely in place in every pose. Direct rear view, facing away toward the top of the image. Preserve the same black hair, head size, adult human proportions, costume details, and character scale as the reference. Crisp chunky pixel art, dark outlines, limited palette, simple shading. Full body on a square canvas with generous padding. Transparent background. Exactly one sprite, no text, scenery, shadow, blur, or motion lines.
```

### 9. `cinderella-hit.png`

Attach the approved Cinderella base and jonhit.png for posture only.

```text
Create one harmless cartoon stumble pose of the approved adult Cinderella-costumed Jon. Lean the torso slightly forward, place one shoe ahead of the other, and extend the gloved arms for balance. Remain standing. The long skirt bends naturally with the pose and stays ankle length. Keep the outfit intact and securely worn. A Cinderella-inspired storybook costume: a powder-blue high-neck dress with long sleeves, a loose comfortable fit, an opaque ankle-length skirt, pale-blue decorative waist panels, white gloves, blue shoes, and a small blue hair ribbon. Hands empty. The complete outfit stays securely in place in every pose. Direct rear view, facing away toward the top of the image. Preserve the same black hair, head size, adult human proportions, costume details, and character scale as the reference. Crisp chunky pixel art, dark outlines, limited palette, simple shading. Full body on a square canvas with generous padding. Transparent background. Exactly one sprite, no text, scenery, shadow, blur, or motion lines.
```

### 10. `cinderella-defeat.png`

Attach only the approved Cinderella costume base.

```text
Create one game-over rest pose of the approved adult Cinderella-costumed Jon. Sit back on the heels with shoulders slightly slumped, head lowered, and gloved hands resting together in front. The opaque long skirt settles around the seated pose as continuous fabric. Keep the costume intact and all clothing securely worn. This is a calm, unharmed cartoon character taking a rest. A Cinderella-inspired storybook costume: a powder-blue high-neck dress with long sleeves, a loose comfortable fit, an opaque ankle-length skirt, pale-blue decorative waist panels, white gloves, blue shoes, and a small blue hair ribbon. Hands empty. The complete outfit stays securely in place in every pose. Direct rear view, facing away toward the top of the image. Preserve the same black hair, head size, adult human proportions, costume details, and character scale as the reference. Crisp chunky pixel art, dark outlines, limited palette, simple shading. Full body on a square canvas with generous padding. Transparent background. Exactly one sprite, no text, scenery, shadow, blur, or motion lines.
```

## Alice in Wonderland

For these fabric poses, animate the **outer skirt and apron ties**, while keeping the crossed straps and tied center of the back bow fixed.

### 1. `alice-base.png`

```text
Create one pixel-art Alice in Wonderland-inspired costume for the attached Jon. Direct rear view, facing away toward the top of the image. Preserve his black hair, head size, human proportions, and compact silhouette.

Medium-blue dress with short puff sleeves and an outer skirt ending above the knees. White pinafore with crossed back straps and a clearly visible tied white bow at the waist. A fitted white underskirt covers the upper legs. White stockings, black buckled shoes, and a small black hair bow. Hands empty, no cape or staff.

Neutral standing pose. Match Jon’s chunky pixels, dark outlines, and simple shading. Full body, square canvas, padding, transparent background. One sprite, no face, scenery, text, shadow, or blur.
```

### 2. `alice-run-left.png`

Pose reference: `jonrunleft.png`.

```text
Create one leftward lane-change pose of the approved Alice-costumed Jon. Use the wizard reference only for posture.

Rear-facing, looking away toward the top of the image. Lean slightly toward the viewer’s left. Left foot reaches toward the left lane; right leg pushes off behind. Empty hands counterbalance. Blue skirt and loose white apron ties trail toward the viewer’s right.

Preserve black hair, black hair bow, blue puff-sleeved dress, crossed white apron straps, tied back bow, fitted white underskirt, stockings, buckled shoes, proportions, and costume details. No cape or staff. Same scale and pixel style as the base. Legs readable. Full body, square canvas, padding, transparent background. One sprite, no effects.
```

### 3. `alice-run-right.png`

Pose reference: `jonrunright.png`.

```text
Create one rightward lane-change pose of the approved Alice-costumed Jon. Use the wizard reference only for posture.

Rear-facing, looking away toward the top of the image. Lean slightly toward the viewer’s right. Right foot reaches toward the right lane; left leg pushes off behind. Empty hands counterbalance. Blue skirt and loose white apron ties trail toward the viewer’s left.

Preserve black hair, black hair bow, blue puff-sleeved dress, crossed white apron straps, tied back bow, fitted white underskirt, stockings, buckled shoes, proportions, and costume details. Do not mirror the character. No cape or staff. Same scale and pixel style as the base. Full body, square canvas, padding, transparent background. One sprite, no effects.
```

### 4. `alice-skirt-medium-left.png`

Pose reference: `jonruncapemide.png`.

```text
Edit the approved rear-facing Alice-costumed Jon. Change only the outer blue skirt and the loose ends of the white apron bow.

Sweep them moderately toward the viewer’s left. Lift the skirt’s free hem from above-knee height to mid-thigh height, showing a little pale-blue lining. Keep the white crossed straps, bow knot, and waist attachment fixed. The fitted white underskirt continues covering the upper legs.

Keep the head, hair bow, torso, arms, hands, legs, stockings, shoes, scale, and alignment unchanged. Preserve the palette and crisp pixel style. No cape. Full body, same square canvas, padding, transparent background. One sprite, no text, scenery, or effects.
```

### 5. `alice-skirt-high-left.png`

Pose reference: `jonruncapehigh.png`.

```text
Edit the approved rear-facing Alice-costumed Jon. Change only the outer blue skirt and the loose ends of the white apron bow.

Lift and sweep the outer skirt strongly toward the viewer’s left, bringing its free hem approximately to hip height on that side. Show curved folds and more pale-blue lining. Apron ties follow the fabric sweep. Keep crossed straps, bow knot, and waist attachment fixed. The fitted white underskirt remains unchanged and covers the upper legs.

Keep the head, torso, arms, hands, legs, stockings, shoes, scale, and alignment unchanged. Matching crisp pixel art, no cape. Full body, same square canvas, padding, transparent background. One sprite, no scenery.
```

### 6. `alice-skirt-medium-right.png`

Pose reference: `joncaprunmidright.png`.

```text
Edit the approved rear-facing Alice-costumed Jon. Change only the outer blue skirt and the loose ends of the white apron bow.

Sweep them moderately toward the viewer’s right. Lift the skirt’s free hem from above-knee height to mid-thigh height, showing a little pale-blue lining. Keep crossed straps, bow knot, and waist attachment fixed. The fitted white underskirt continues covering the upper legs.

Keep the head, hair bow, torso, arms, hands, legs, stockings, shoes, scale, and alignment unchanged. Do not mirror the character. Preserve the palette and crisp pixel style. No cape. Full body, same square canvas, padding, transparent background. One sprite, no scenery or effects.
```

### 7. `alice-skirt-high-right.png`

Pose reference: `jonruncapehighright.png`.

```text
Edit the approved rear-facing Alice-costumed Jon. Change only the outer blue skirt and the loose ends of the white apron bow.

Lift and sweep the outer skirt strongly toward the viewer’s right, bringing its free hem approximately to hip height on that side. Show curved folds and more pale-blue lining. Apron ties follow the sweep. Keep crossed straps, bow knot, and waist attachment fixed. The fitted white underskirt stays unchanged and covers the upper legs.

Keep the head, torso, arms, hands, legs, stockings, shoes, scale, and alignment unchanged. Do not mirror the character. Matching pixel art, no cape. Full body, square canvas, padding, transparent background. One sprite, no scenery.
```

### 8. `alice-jump.png`

Pose reference: `jonjump.png`.

```text
Create one jumping pose of the approved Alice-costumed Jon. Use the wizard reference only for the jump posture.

Direct rear view, facing away toward the top of the image. Tuck both knees upward, lift both black shoes, and raise the empty hands for balance. Let the outer blue skirt flare gently and the loose apron ties lift. Keep the crossed straps and back bow tied in place. The fitted white underskirt covers the upper legs.

Preserve black hair, black hair bow, puff sleeves, white stockings, buckled shoes, proportions, palette, and pixel style. Same character scale and horizontal alignment as the base. Full body, square canvas, padding, transparent background. One sprite, no scenery or effects.
```

### 9. `alice-hit.png`

Pose reference: `jonhit.png`.

```text
Create one impact-stumble pose of the approved Alice-costumed Jon. Use the wizard reference only for posture.

Rear view, facing away toward the top of the image. Pitch the torso forward, bend the knees unevenly, and extend the empty hands outward to regain balance. Keep him on his feet. The blue skirt and loose apron ties swing briefly; the crossed straps and bow knot remain secured.

Preserve black hair, hair bow, blue dress, white pinafore, fitted underskirt, white stockings, buckled shoes, human proportions, palette, and pixel style. No injury or torn clothing. Same character scale as the base. Full body, square canvas, padding, transparent background. One sprite, no scenery or impact effects.
```

### 10. `alice-defeat.png`

Pose reference: `jondefeat.png`.

```text
Create one defeated pose of the approved Alice-costumed Jon. Use the wizard reference only for posture.

Rear view, facing away toward the top of the image. Kneel on both knees, lower the head, slump the shoulders, and rest the empty hands near the thighs. The blue skirt settles over the knees; the white apron bow and its ties hang naturally. Keep both shoes on.

Preserve black hair, black hair bow, blue puff-sleeved dress, crossed white apron straps, tied back bow, fitted underskirt, white stockings, black buckled shoes, proportions, and pixel style. No injury or damaged clothing. Same character scale as the base. Full body, square canvas, padding, transparent background. One sprite, no scenery or effects.
```

These ten images per costume provide the **base, two lane-change poses, four fabric poses, jump, hit, and defeat**. The alternating leg cycle and passing frames can then be drawn in Aseprite, with fabric animated independently.
