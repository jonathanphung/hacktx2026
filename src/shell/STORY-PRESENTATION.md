# Pixel story and hands-free transitions

The opening and ending now use a fixed pixel stage, the shipped Jon sprite sheets,
the game's vine/sleeve/panel palette, a pixel companion and the same giant-hand
silhouette as gameplay. Actor positions are snapped to the pixel grid. Running
frames play only while walking; climbing uses the existing jump sprite. The
opening lasts four 3.3-second beats and the ending three. No large camera zooms
or smooth vector actors remain in these sequences. The rescue/victory tower uses
matching pixel scenery and layered cell bars.

Scenes play automatically. Waving either hand advances a beat after a 900 ms
entry grace period, using a fresh movement baseline each time. Continue and Skip
buttons remain; keyboard shortcuts are optional. Reduced-motion mode uses static
storyboard poses with the same captions and timing.

At the tower, the six earned letters form the spell. Either player can hold an
open palm for one second to charge and cast it, with progress and letter feedback.
The old mandatory text-entry gate is replaced by this cast. A button supplies the
same camera-free fallback. The hold uses per-player timers and hand-size ratios;
missing/fist frames and long tracking gaps reset it. Two partial holds cannot be
combined. Wave-to-resume is also available in the existing pause overlay.

All of this lives in the shell. Vision/model code, the gameplay input bus, runner
movement and all giant attacks/rotation are unchanged. The existing VisionHandle
frame subscription supplies menu-only gestures; no extra model or inference pass
is needed.

## Local review

With the development server running:

- `/?novision&story-preview=opening`: opening, then return to title.
- `/?novision&story-preview=ending`: ending, then return to title.
- `/?novision&story-preview=rescue`: spell gate, then ending.

Remove `novision` to test real hands. Review routes are development-only and do
not bypass progression in the production game.

## Validation

Formatting, typecheck, 226 tests across 44 files, and production build pass.
New tests cover grid-aligned bounded actor motion, final story positions,
open-palm holds at different scales, tracking loss, per-player isolation,
one-shot casts and gesture listener/timer cleanup. Browser checks cover the
opening/ending framing, the optional Continue button, the no-typing rescue cast
and its automatic ending/title handoff. Live human webcam playtesting remains
necessary for wave/hold usability. Gameplay/vision/shared files were compared to
main and are unchanged.
