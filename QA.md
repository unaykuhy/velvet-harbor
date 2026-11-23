# Phase 1 verification

The functional browser checks passed. The performance target remains unmet in the available software-rendering environment. This is a review build, with no claim of release quality or smooth performance on a physical laptop.

## Environment and method

All game code was authored in this session. The only bundled engine dependency is three.js 0.160.0. Textures, reflection faces, geometry, signage, sky, water, and sound are generated locally. The HTML loads one classic script, `game/bundle.min.js`.

Direct `playwright-core` scripts under `/tmp/velvet-test` opened the game over `file://` in the supplied cached Chromium. The final run used Xvfb, ANGLE's validating command decoder, and Mesa llvmpipe software rendering. The viewport was 1280 × 720. Every page request outside `file://` was blocked and recorded. Console errors and page exceptions were collected. Captures came directly from Chromium's screenshot API and were never edited or composited.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Offline file playback | PASS | Zero non-file requests in the successful journey, feature, guard, and final visual runs |
| Browser runtime | PASS | Zero console errors and zero page errors in those runs |
| Start and controls menus | PASS | New Game entered play; Controls expanded and collapsed |
| Walking | PASS | W, A, S, D exercised with measured position changes |
| Sprint and jump | PASS | Shift increased travel; Space raised Mara above the ground and she landed |
| Mouse and minimap | PASS | Dragging changed camera yaw and the minimap's rendered pixels |
| Car interaction | PASS | E entered the nearby Stiletto; E exited after slowing down |
| Five drivable models | PASS | Each model accelerated and its wheel rotation changed |
| Acceleration and steering | PASS | Forward speed increased; A eased steering and changed heading |
| Braking and reverse | PASS | S reduced speed from 12.43 to 4.12 m/s; holding it reached -11 m/s |
| Handbrake | PASS | Space reduced the vehicle's speed |
| Speed-sensitive field of view | PASS | Final measured drive increased field of view from 59 to 63.55 degrees |
| Impact, damage, smoke, camera shake | PASS | A controlled saved fixture began at 45 damage; impact raised it to 60.83, made seven smoke puffs visible, and displaced camera X by 0.0307 while driving straight |
| Bridge ramp | PASS | Driving raised the car to Y = 3.704 at X = 273.157 without damage |
| Bridge visual regression | PASS | A cargo crane obstructed an earlier capture; moving the cranes north cleared the final bridge view |
| Four districts | PASS | Loaded and rendered positions in each district; HUD labels matched |
| Pause and resume | PASS | Escape paused; time and position stayed fixed; Resume returned to play |
| Focus loss | PASS | A blur event paused play and cleared active input |
| Save and Continue | PASS | Reload restored position, money, active car, owned cars, and initial chapter data |
| Health and armor persistence | PASS | Fixtures restored 88 health and 63 armor; money restored as 7,654 |
| Invalid save | PASS | Malformed stored data disabled Continue without a crash |
| Unavailable storage | PASS | F5 displayed the storage failure message without a crash |
| Audio initialization | PASS | WebAudio initialized after New Game |
| Unavailable audio | PASS | A deliberately failing audio constructor did not interrupt play |
| Day/night state | PASS | A save at 22:00 rendered darkness, lit windows, lamps, and vehicle lights; clock advancement was measured |
| Source syntax | PASS | Node syntax checks passed for every authored game module |
| Screenshot limits | PASS | Three real 1280 × 720 JPEGs, each below 256 KiB |
| Entrypoint | PASS | Node 22.23.4 ran twice with network connections and fetch explicitly blocked; both exits were zero |
| Deterministic output | PASS | Both complete output trees and stdout compared byte for byte |
| Vendored dossier library | PASS | SHA-256 matched the kit before and after implementation |
| Performance in available environment | FAIL | 32 frames in 10,296.3 ms: **3.11 FPS** on software rendering |
| Performance on a physical laptop GPU | NOT VERIFIED | No hardware GPU was available |
| Audible sound quality | NOT VERIFIED | Initialization and failure handling were tested; no listening assessment |
| Full twelve-minute cycle in real time | NOT VERIFIED | Clock progression and loaded day/night states were tested separately |

The final Node 22 entrypoint runs took approximately 237 ms and 214 ms, with empty stdout. The output contained the game folder, the three screenshots, and `dossier.json`. The playable folder contained 13 files totaling 606,003 bytes. Temporary output trees and npm build scaffolding were removed after verification.

The unchanged dossier library has SHA-256 `dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129`.

## Screenshot evidence

| File | Content | Size |
| --- | --- | --- |
| `screenshots/1-start-menu.jpg` | Title, New Game / Continue / Controls, and the real city panorama | 102,462 bytes |
| `screenshots/2-on-foot.jpg` | Mara beside a parked car on Pearlwake Boulevard, with HUD, interaction prompt, and minimap | 126,096 bytes |
| `screenshots/3-driving.jpg` | The Stiletto moving along the boulevard, with speed, condition, HUD, and minimap | 133,634 bytes |

## District HUD verification (v3 names)

| File | Teleport (`__vhTest.setPosition`) | HUD district text | Size |
| --- | --- | --- | --- |
| `screenshots/district-pearlwake.jpg` | (8, 150) | Pearlwake Boulevard | 125,960 bytes |
| `screenshots/district-lanternfish.jpg` | (150, 0) | Lanternfish Marina | 94,493 bytes |
| `screenshots/district-sunwick.jpg` | (−150, 0) | Sunwick Hills | 102,292 bytes |
| `screenshots/district-prism.jpg` | (0, 0) | Prism Heights | 102,252 bytes |

All four captures are 1280×720, taken by `verify-districts-playwright.cjs` (Chromium, `xvfb-run`). No v1 district name (the four old zone labels replaced by the names above) appears in any page text. Gates: 0 console errors, 0 page errors, 0 non-file requests.

## Milestone 3a — signature blue-hour look (2026-11-22)

What changed (look only; no gameplay, police, vehicle, mission, or save logic touched):

- **Blue hour 18:30 default** — New Game and the title scene now start at 18:30 (`game/src/main.js`, `game/index.html`). `updateDay` (`game/src/render.js`) re-tuned: night sky zenith `#0e1738` (navy) and horizon `#232a52` (violet) with a warm ember `#c76a4e` blended near the horizon at dusk; hemisphere light now bluish (`#8fa3e8` sky / `#3b3f66` ground) with a higher night floor (0.95) so the city reads blue-violet, not daylight; the low sun lingers with a warm amber ramp (`max(0, altitude+0.2)·3.1`).
- **Wet streets** — the asphalt puddle-mask edit in `canvasTexture` (`game/src/render.js`, kept from the earlier session) is now actually used: the asphalt material switches from the `noise` texture to the `asphalt` puddle texture, which also drives a `roughnessMap` (puddle spots smooth ≈ 0.28, tarmac ≈ 0.6). `main.js` gives asphalt its own env sheen after dark (`envMapIntensity 0.45+night·1.05`), so the static env map and neon/light-bar emissives read on the tarmac. No ray tracing; two extra canvas textures total.
- **Light rain** — new `game/src/weather.js`: 640 instanced streaks (`InstancedMesh`, one draw call) recycled in a ring around the camera, slight tilt, no per-drop physics.
- **Sky lanterns** — same module: 20 instanced warm-emissive lanterns (`#ffb066`, intensity 3.6) over the bay (z 300–360), one draw call, drifting on slow sine paths.
- **Art Deco trim** — downtown towers (style 0) get a stepped neon crown band, a mid-tower spandrel band, and steel corner fins (`game/src/world.js`), colors picked deterministically from cyan `#37e6ff` / magenta `#ff4fd8` / amber-red `#ff755f` emissive materials (merged into the existing bake batches — no per-building meshes).
- New neon materials `neonCyan`/`neonMagenta` in `makeMaterials`, pulsed by `updateDay`.

Verification (all numbers from this session's runs):

- `node --test tests/run.mjs`: **6/6 pass**.
- `npx -y -p typescript tsc --noEmit`: **0 errors**.
- `node main.ts`: **exit 0**, 0.43 s; dossier regenerated (`/output/dossier.json`, 743,914 bytes). Note: `/output/screenshots/` held 5 stale `district-*` files from an earlier session that tripped the 4-file cap; they were removed (they were never in the repo — repo `screenshots/` still holds exactly 4 files).
- Playwright (`velvet-harbor-launcher/verify-m3a-look-playwright.cjs`, Chromium 1148, `xvfb-run`, file://, 1280×720, DOM `#new` click): **PASS**. Started at **18:30 (minutes ≈ 1111)**; walked 0.54 m (frame-limited, see FPS); entered car `bay-0` and moved (speed 1.76 m/s); rain **640** instances; lanterns **20**; **0 console errors, 0 page errors, 0 non-file requests**.
- Draw calls (`renderer.info.render.calls`, play mode at spawn): **298** (237,439 triangles, 23 shader programs); 479 at the downtown street teleport with more batches in view. Rain + lanterns add exactly 2 draw calls; neon trim merges into ~5 extra batched meshes.
- FPS: **0.33** — SwiftShader/llvmpipe software rendering in this headless VM (Chromium ANGLE → Mesa), consistent with prior sessions on this machine (Bug B run: 0.358 FPS). This is a software measurement, **NOT** a GPU or real-laptop claim.
- Pixel evidence (`velvet-harbor-launcher/m3a-pixel-evidence.cjs`): street shot sky average RGB **(32,35,43)** (dark navy), skyline sky average **(68,45,69)** (violet), 42%/58% blue-violet pixel share respectively; skyline shows lanterns as **11 distinct warm-glow regions**; street shot 808 warm (lamp/window) pixels across 17 regions.
- Screenshots (1280×720, in `~/workspace/makefun/velvet-harbor-preview/`, NOT in `screenshots/`): `m3a-street.jpg` (102,226 bytes, street-level blue hour with rain and wet-asphalt sheen, HUD + clock visible) and `m3a-skyline.jpg` (97,746 bytes, skyline over the bay with sky lanterns).
- **Post-review fix (Medium finding)** — asphalt base roughness corrected from `2.6` (outside the standard `[0,1]` range) to `1.0`; the dark `roughnessMap` already provides 0–1 variation. Removed the redundant `roughnessMap.needsUpdate=true` (texture never changes after creation). Bundle rebuilt; re-verified: tests **6/6**, `tsc --noEmit` **0 errors**, `node main.ts` **exit 0**, Playwright re-run **PASS** (18:30 start, rain 640, lanterns 20, 0 console / 0 page errors, 0 non-file requests); screenshots regenerated.

## Milestone 3b-1 — fixed-step simulation, interpolation, spring camera (2026-11-22)

What changed (`game/src/main.js` only; no police/vehicle/mission/save/vendor changes):

- **Fixed-step core** — the world advances in exact 1/60 s ticks (`FIXED_STEP=1/60`, `MAX_FRAME_DELTA=0.05`, `MAX_STEPS_PER_FRAME=4`) via an accumulator loop; every moving body (player, traffic, police, pedestrians, active car) keeps `_prev/_cur` position+yaw buffers and is interpolated by the renderer at `alpha=accumulator/FIXED_STEP`. Teleports (menu start, car doors, `setPosition`) re-anchor via `snapInterpolation()`.
- **Spring camera** — chase camera driven by a critically damped spring (stiffness 81, damping 18, `2√k = 18`) on both position and yaw (`cameraSpringYaw`), replacing the per-frame lerp; occlusion pull-in and first-frame anchoring preserved.
- **Body roll/pitch** — `updateBodyVisual()` damps `root.rotation.z` (roll, ≤0.055 rad from steer×speed) and `root.rotation.x` (pitch, ≤0.035 rad from acceleration).
- **Test-only hooks** — `window.__vhTest.setManual(bool)` and `__vhTest.step(count)` (0–600 integer steps, throws otherwise) drive the exact same `stepSimulation()`/`updateBodyVisual()`/`updateCamera(FIXED_STEP)` path deterministically; in manual mode the rAF loop skips sim, interpolation, camera, and body updates so wall-time frames cannot contaminate a stepped sequence.
- **Verification harness fix** — the fixed wall-time drive waits in `velvet-harbor-launcher/verify-m3b1-smooth-playwright.cjs` were replaced with condition-based waits (drive >2 m, turn >0.5 rad, 300 s timeouts) because software rendering runs at ~0.4–1.8 FPS; the assertions are unchanged.

Verification (all numbers from this session's runs):

- Bundle rebuilt with esbuild (`--bundle --format=iife --minify`, 572,681 bytes); `setManual` present in the minified bundle.
- `node --test tests/run.mjs`: **6/6 pass** (rerun after the final main.js edit).
- `npx -y -p typescript tsc --noEmit`: **0 errors**.
- `node main.ts`: **exit 0 in 0.27 s**; dossier written (`/output/dossier.json`, 749,651 bytes).
- Playwright (`verify-m3b1-smooth-playwright.cjs`, Chromium 131.0.6778.33 / cached Playwright 1.49.1, `xvfb-run`, file://, 1280×720, DOM `#new` click): **PASS**.
  - Golden path: walked **0.109 m**, entered `bay-0`, drove **16.05 m**, final speed **19.72 m/s**, 284 draw calls; **0 console errors, 0 page errors, 0 non-file requests**. Software FPS **0.39** (SwiftShader/llvmpipe — software measurement, not a GPU claim).
  - Determinism (2 independent runs, 241 fixed steps each): final positions **identical to 0 delta** (`positionDelta 0`, `headingDelta 0`, `speedDelta 0`, `minutesDelta 0`) — end state `[-33.65920694917255, 0.02, 72.88352163083903]`, heading 1.8446650808631742, speed 47.
  - Camera/body: `maxCameraStep` **0.6034** (< 1), `maxCameraYawStep` **0.02014** rad (< 0.35), all 209 camera samples finite; `maxBodyRoll` **0.02517** rad, `maxBodyPitch` **0.00437** rad, both inside the required ranges.
- Screenshot `~/workspace/makefun/velvet-harbor-preview/m3b1-drive.jpg` retaken by the golden path (1280×720, 151,877 bytes) mid-turn while driving at 19.72 m/s, replacing the stale pre-rebuild capture.
- **Issue found and fixed during verification**: in test-manual mode the rAF loop still called `updateCamera(dt)`/`updateBodyVisual(dt)` with wall-clock dt between manual steps, which could inject a 2.84-unit camera jump into a stepped sequence; guarded behind `!testManual` in `animate()`. Gameplay path untouched.

## Milestone 3b-2 — post-processing pipeline (2026-11-22)

What changed (look only; no gameplay, police, vehicle, mission, or save logic touched):

- **New `game/src/postfx.js` (136 lines)** — `EffectComposer` chain: `RenderPass` → `UnrealBloomPass` (threshold 0.85, strength 0.65, radius 0.45; half resolution on software renderers) → `ShaderPass` `GradeShader` (contrast 1.09 around the 0.18 linear pivot, navy shadow tint, warm highlight tint, vignette 0.55) → `OutputPass` (ACESFilmic tone mapping + sRGB). The MSAA render target uses `HalfFloatType` with `samples: 4` on WebGL2. `renderer.info.autoReset` is disabled and reset once per frame so stats accumulate across composer passes.
- **PMREM environment without external HDR files** — `buildEnvironment()` renders two coded gradient scenes (night: navy sky `#0e1738` / violet horizon `#232a52` / ember `#c76a4e` / dark water; day variant) plus 26 faint emissive city-glow blocks through `PMREMGenerator`, giving wet asphalt, car paint and glass living colored reflections; `scene.environment` swaps night/day in `updateDay` (`game/src/render.js`).
- **Look fixes in the same pass** — asphalt base darkened `#31414a` → `#222c34` (pale-road fix), lantern emissive 3.6 → 1.6 (white-disc fix), neon trim raised for readability (`game/src/render.js`, `game/src/weather.js`, `game/src/world.js`). `game/src/main.js` wires the composer; `game/bundle.min.js` rebuilt.

Verification (all numbers from this session's runs):

- `node --test tests/run.mjs`: **6/6 pass, 0 fail**.
- `npx -y -p typescript tsc --noEmit`: **0 errors** (`TSC_OK_0_ERRORS`).
- `node main.ts`: **exit 0**, ~0.3 s; dossier regenerated in a fresh isolated output dir, **756,299 bytes**.
- Playwright (`velvet-harbor-launcher/verify-m3b2-postfx.cjs`, Chromium 1148, file://, 1280×720, DOM `#new` click): **PASS**. Postfx inspect: **msaaSamples 4, passes 4, bloomThreshold 0.85, bloomStrength 0.65, software true**; lanterns 20; golden path walked **0.081 m** and drove **2.25 m** (final speed 7.98 m/s); **0 console errors, 0 page errors, 0 non-file requests**.
- FPS: **0.333** (311 draw calls, 237,780 triangles, 24 shader programs) vs pre-change baseline **0.393** — ~15% cost on SwiftShader/llvmpipe software rendering. **Honest limit: this is a software measurement, NOT a GPU or real-laptop claim.**
- Pixel evidence (canvas sampling of the fresh captures): street road average RGB **(0,1,31)** — dark navy wet asphalt; corner-to-center vignette ratio **0.79** (TL) / **0.54** (skyline); warm glow pixels present (street 603, skyline 230 sampled spots); **clipped white ≥250: street 4, skyline 1** (pre-fix captures measured 392 / 232 — the white lantern discs and blown highlights are gone); sky averages **(52,36,70)** street / **(39,11,69)** skyline (blue-violet, no daylight blowout).
- Screenshots (1280×720, in `~/workspace/makefun/velvet-harbor-preview/`, NOT in `screenshots/`): `m3b2-street.jpg` (119,867 bytes — street-level blue hour post-grade, dark wet road with neon reflections) and `m3b2-skyline.jpg` (136,644 bytes — skyline over the bay with lanterns and teal water reflections), both re-captured fresh by the verification run.

## Milestone 3c — two camera views: chase + first-person (2026-11-22)

What changed (camera + save field only; no police/mission/vendor/name logic touched):

- **Two switchable views** (`game/src/main.js`): the existing damped spring chase camera (unchanged) and a new first-person view. `state.cameraView` is `'chase' | 'first'`; toggled with the **V** key (`input.consume('KeyV')` in the play loop) and a clickable HUD button `#view-toggle` (`game/index.html`, `pointer-events:auto`, label `VIEW · CHASE` / `VIEW · FIRST-PERSON`). Transition is a smooth damped blend (`viewBlend`, damp rate 5, smoothstep applied, snaps at ≥0.995/≤0.005); the chase spring keeps running underneath, so toggling back is equally smooth. First-person FOV target 64 + speed·0.18 vs chase 59 + speed·0.34.
- **First-person on foot** — eye at Mara's head position (y = ground + 1.68, measured 1.6804 in the live run) with a subtle walk bob (`sin(stride·2)·0.028·speed factor`); look direction follows mouse yaw/pitch. The five head/hair meshes are hidden in first person (`mara.headParts`, `game/src/character.js`) so the camera never sits inside Mara's own geometry; her body, collision, and gameplay are untouched.
- **First-person in car** — eye at the driver's seat (`car.driverEye`, `game/src/vehicles.js`), looking over the dashboard through the windshield. `buildCar` now bakes the exterior into a separate `car.shell` group and adds a cockpit `car.interior`: dark dashboard + top pad, two amber **emissive gauges** (readable at blue hour by constant emissive, not day-dependent lights), and a **steering wheel** (`car.steeringWheel`) that turns with steering input (`rotation.z = −steer·3.2` in `drive()` and `animateAICar()`). In first person the car's own `shell` is hidden (wheels/interior/lights stay), so the camera is never inside the car's own geometry; walls cannot clip the eye because the car footprint is collision-checked every substep and Mara's radius on foot keeps the eye inside walkable space. Every car keeps its interior (traffic/parked cars included), merged to 2–3 meshes per car.
- **Save v2** (`game/src/save.js`): `writeSave` now writes `version:2` with `cameraView`; `readSave` accepts **v1 and v2** (v1 migration intact), and `applySave` restores `state.cameraView` with a `'chase'` default when the field is missing or invalid. Autosave (20 s), F5, pagehide, and the pause-menu Save all persist the choice.

Verification (all numbers from this session's runs):

- `node --test tests/run.mjs`: **10/10 pass, 0 fail** (6 prior + 4 new `tests/camera-view.test.mjs` cases: v2 round-trip of `cameraView:'first'`, v1 save without the field migrates to `'chase'`, v2 restore of `'first'`, v2 with missing field falls back to `'chase'`).
- `npx -y -p typescript tsc --noEmit`: **0 errors** (`TSC_OK_0_ERRORS`).
- `node main.ts`: **exit 0**, ~0.4 s; dossier regenerated in an isolated output dir (`/tmp/opencode/m3c-output/dossier.json`, 762,031 bytes). `vendor/makefun-game.ts` sha-256 re-verified **dc671875…** (unchanged). Repo `screenshots/` untouched (still exactly 4 files).
- Playwright (`velvet-harbor-launcher/verify-m3c-cameras.cjs`, Chromium 1148, file://, 1280×720, DOM `#new` click): **PASS**.
  - Default view on New Game: **chase** (blend 0). Walked in chase view (capture `m3c-chase-foot.jpg`).
  - **V key toggle → first-person on foot**: viewBlend reached **>0.99**, eye height measured **1.680**, walked 0.08+ m, capture `m3c-first-foot.jpg`; V toggled back to chase (blend <0.01).
  - Entered `bay-0`, drove **4.64 m** in chase view (capture `m3c-chase-car.jpg`).
  - **V → first-person in car**: steering wheel turned with input (**−0.604 rad** while holding A; verified live via `velvet.inspect().steeringWheelAngle`), drove **3.34 m**, capture `m3c-first-car.jpg`.
  - **HUD button toggle**: click → chase (blend <0.01), click again → first-person (blend >0.99) — both directions verified.
  - **Save/load persistence**: F5 in first person (saved `save.cameraView === 'first'`), page reload, Continue → restored view **first-person** (blend >0.99), active car `bay-0` restored.
  - Gates: **0 console errors, 0 page errors, 0 non-file requests**. Software-rendered **0.25 FPS**, 264 draw calls at the spawn street (SwiftShader/llvmpipe — software measurement, NOT a GPU claim; draw calls comparable to the 3b-2 street baseline with the cockpit meshes merged per car).
- Pixel evidence (`velvet-harbor-launcher/m3c-pixel-evidence.cjs`, all captures 1280×720, tonal variation 252–254 → no uniform-fill / camera-inside-geometry frames): first-car lower-center dashboard region average **(23,32,57)** vs the same region on the road in chase view **(3,4,34)**, warm lit gauge pixels present (**0.089%**, ≈82 px) and steering-wheel chrome pixels (**1.21%** share) — dashboard + wheel visibly present; first-car sky region **(112,83,85)** = warm horizon through the windshield; first-foot sky band **(75,51,77)** vs ground band **(55,68,109)** — clean eye-level horizon, no wall fill.
- Screenshots (1280×720, separate files in `~/workspace/makefun/velvet-harbor-preview/`, NOT in `screenshots/`): `m3c-chase-car.jpg` (122,167 B), `m3c-first-car.jpg` (133,034 B), `m3c-chase-foot.jpg` (118,823 B), `m3c-first-foot.jpg` (134,344 B).

## Milestone 3d — Art Deco harbor bridge upgrade + AI traffic on the deck (2026-11-22)

What changed (bridge dressing + one AI route only; roadway width, grade, `bridgeHeight` collision, police/mission/save/vendor/name logic untouched — per `git status` only `game/src/world.js`, `game/src/traffic.js`, `game/bundle.min.js` are modified):

- **Deco fascia + railing dress** (`game/src/world.js`): trim fascia bands on both outer deck edges (z −90.18/−69.82, outside the 20 m roadway); every railing post gains a ribbon rail, stepped cap plate, finial and neon tip; neon ribbons run the deck edges (cyan north, magenta south); staggered warm pole lamps (steel pole + arm reaching over the kerb from the railing line, so drivable width is unchanged) feed `lampPositions` for the existing dynamic night lights.
- **Art Deco entrance portals** at both ends (x 238.5 / 381.5, OUTSIDE the deck edges): stepped pylons (2.3 → 1.5 → 1.05 → 0.62 m tiers) with steel fins, neon ribs (cyan/magenta by side), a slim 4-tier stepped arch over the road, and `solid()` colliders on the pylons only.
- **AI traffic on the bridge** (`game/src/traffic.js`): new route `[240,380,-80,-80]` (id `traffic-12`, 13th AI car) loops the full span; AI cars now set `y = bridgeHeight(x,z) + .02` every tick so they ride the graded deck instead of clipping through it. `trafficCarCount` measured **13** in the live run.

Verification (all numbers from this session's runs):

- **Bundle rebuilt**: `npx esbuild game/src/main.js --bundle --format=iife --minify --outfile=game/bundle.min.js` → **598,861 B** (was 583.8 kB at 3c). New bridge code confirmed present in the minified output (portal literals 381.5/91.9/−90.18 grep hits; comment strings stripped by minify as expected). The page loads `bundle.min.js` (`game/index.html:30`), so the Playwright run below exercised the NEW bridge.
- `node --test tests/run.mjs`: **10/10 pass, 0 fail, 0 cancelled** (duration 2,713 ms).
- `npx -y -p typescript tsc --noEmit`: **0 errors** (exit 0).
- `node main.ts`: **exit 0**, **0.365 s** wall (<10 s); fresh isolated output dir `/tmp/opencode/m3d-out-fresh/` → dossier.json **764,690 B**. `vendor/` untouched (git status: not modified).
- Playwright (`velvet-harbor-launcher/verify-m3d-bridge-playwright.cjs`, Chromium 1148, file://, 1280×720, DOM `#new` click, deterministic manual stepping via `__vhTest.setManual/step`): **PASS**.
  - **Player drives the bridge end to end**: entered parked `bay-4` (heading π/2, facing west), teleported to the east end and drove west along z = −80. Player trace: x **375 → 240.8** on the deck (z held −80), then coasted past the west portal to x 165.7. Player max y **5.02** = midspan deck height (`bridgeHeight` peak 5 + .02) — the car rode the graded deck, it did not clip through. Note: the world boundary blocks any car center beyond x > 378 (`world.js blocked()`), so x = 375 is the closest legitimate start to the east portal; the deck itself ends at 380.
  - **AI traffic crosses the deck**: `traffic-12` traversed x **243 → 373.5** (span > 120 m asserted) with max y **5.02** at midspan — rides the deck height, does not pass through it. `trafficCarCount` = **13**.
  - Gates: **0 console errors, 0 page errors, 0 non-file requests**. 485 draw calls midspan (SwiftShader software render — not a GPU claim).
- Screenshot: `~/workspace/makefun/velvet-harbor-preview/m3d-bridge.jpg` (1280×720, 122,909 B), captured from the chase camera above the deck at midspan (camera [328.56, 9.68, −80], player x 302–318, y > 4.4) — skyline + lantern vantage per brief, NOT in `screenshots/`. **Visual-content review of this capture: NOT VERIFIED by this agent** (image viewing unavailable in this session — verify tooling confirms capture position, dimensions and non-uniform file only); coordinator should eyeball `m3d-bridge.jpg` before commit.

## Milestone 4 — pedestrian variety FIX: unique shirts, gender-gated pants, limb swing (2026-11-23)

Coordinator's independent verification found 3 real defects in the Nemotron M4 build (all 3 close-ups read "red shirt, dark pants"): (1) shirt-color duplicates — (0,15) both #e84d4d; (5,10) both #e8784d + same dots motif + same black pants + same bun; (2,3) both #4de8c8 stripes; (4,11) both #e8c84d; (2) men in dresses/skirts — ped 0, 1, 12 male with dress/skirt; (3) no limb animation — `limbs = []` never populated, `animate()` a no-op. Fix session (Nemotron, `session-m4-peds-fix-nemotron-prompt.md`): only `game/src/peds.js` changed.

- **Unique shirts**: deterministic Fisher-Yates permutation `SHIRT_COLOR_PERM` (LCG seed 0xC0FFEE), independently re-implemented and verified by the coordinator: `[3,9,1,4,12,13,5,8,10,0,11,15,14,6,7,2]` — a true permutation of 0..15, **16/16 unique shirts** (ped 0 #e8a84d amber, ped 5 #e84d78 pink, ped 10 #784de8 violet).
- **Gender-gated pants**: `MALE_PANTS_INDICES = [0..9]` (jeans/khaki/black/olive/navy/brown/slate/shorts only); skirt (10,11) and dress (12–15) reachable only when `isFemale`; females still pick from all `PANTS_DATA`.
- **Limb swing**: `createBodyParts` now returns `limbs` (`limbs.push({leg, arm, side})` per side) and `buildCitizen` assigns it; `animate()` rotates the populated limbs. Proven in code; two-phase visual swing comparison not captured in stills (stills confirm variety + posture).
- Verification (coordinator, independent): tests **10/10**, `tsc --noEmit` **0 errors**, `node main.ts` **exit 0** (dossier 778,674 B, fresh dir). Playwright `verify-m4-peds-fixed-closeup-playwright.cjs` **PASS** — peds 0/5/10 framed individually via live `velvet.inspect()` positions + camera yaw: **0 console / 0 page errors / 0 non-file requests**. NOTE: the fix session's own screenshots (`m4-peds-fixed-a/b/c.jpg` + phase2) show Mara alone — no pedestrian in frame — so they are NOT evidence; the coordinator's close-ups are the evidence. Screenshots (1280×720, `velvet-harbor-preview/`): `m4-peds-fixed-a2.jpg` (ped 0, amber shirt, crosswalk), `m4-peds-fixed-b2.jpg` (ped 5, pink shirt + bun, Vale Workwear corner — same viewpoint as the user's sidewalk finding at (68,251)), `m4-peds-fixed-c2.jpg` (ped 10, blue-violet shirt, male, dark pants, Prism Heights). Before-shots kept: `m4-peds-a/b/c.jpg`.

## Milestone 3c FIX — interior first-person: dashboard + windshield frame + A-pillars + mirror (2026-11-23)

User finding (08:36 WITA, screenshot `preview/m3c-first-car.jpg`): in the car first-person view there was no readable dashboard, no windshield frame/A-pillars, no mirror — only the steering wheel — and the bottom-right corner was a blown white blob. This fix touches ONLY the car first-person presentation (`game/src/vehicles.js` cockpit build, `game/src/main.js` view visibility + headlight dim level, bundle rebuild); chase view, both walk views, save/`cameraView`, postfx and fixed-step are untouched.

What changed:

- **Full cockpit rebuild** (`game/src/vehicles.js`, `buildCar()` interior group): full-cabin dark dashboard (spans the windshield width) with matte cowl top; two thin dim Art Deco trim lines (emissive `#c9904f` at **0.32** — readable at blue hour, not blinding); hooded instrument cluster behind the wheel with dim amber dials (emissive **0.5**, was 0.95) and two pale needles; small dim passenger-side indicator (the old bright right-hand gauge — a glare source next to the driver's eye — is gone); windshield frame (cowl base + body-coloured A-pillars left/right + header); small dark rearview mirror (dark reflective surface + bezel, not a rendered mirror) hung under the header; barely-there tinted windshield pane (opacity 0.07, `depthWrite:false`); and a hood/fender slab beyond the cowl (the shell is hidden from this view, so the cockpit supplies its own hood line). The old bright passenger gauge (emissive 0.95 close to the camera) was one glare source and is removed.
- **Hide logic** (`game/src/main.js` `refreshViewVisibility()` + `vehicles.js`): the interior group now defaults to **hidden** and is shown only for the active car while the camera view is first-person. Nothing odd clings to the car in chase view, AI traffic cars and police cars never show a cockpit, and the interior can never be caught hidden/stuck by the shell hide. The steering wheel is untouched and still turns (`steeringWheel.rotation.z = −steer·3.2`).
- **Bottom-right white blob — root cause found and fixed**: pixel forensics showed the blob is **screen-fixed** (identical bounding box while teleporting the car across 70 m of road) and converges exactly at the road's vanishing point: it is the car's **own headlight pool saturating the wet road** in first person (car beam `night·15` + scene headlight `night·25`, camera sitting inside the light cone; chase view is unaffected because the visible car body occludes its own pool). Control test with headlights off: near-white pixels in the bottom-right dropped **16,724 → 383** (the remainder is the HUD speed readout). Fix: `vehicles.update()` now takes a `lightLevel` parameter and `main.js` passes **0.38** only while the first-person car view is blended in (chase view keeps level 1; on-foot unaffected). The road ahead stays lit (warm pool visible) without the blown-white wedge.

Verification (all numbers from this session's runs):

- `node --test tests/run.mjs`: **10/10 pass, 0 fail** (2,813 ms).
- `npx -y -p typescript tsc --noEmit`: **0 errors** (exit 0).
- `node main.ts`: **exit 0**, 0.31 s wall (<10 s); fresh isolated output dir → dossier.json **777,157 B**. `vendor/` untouched.
- Playwright (`velvet-harbor-launcher/verify-m3c-interior-playwright.cjs`, Chromium 1148, file://, 1280×720, DOM `#new` click → `e` enters car → `V` to first-person → steer + drive 2.25 m at 7.98 m/s): **PASS**.
  - Steering wheel live: **−0.604 rad** after holding A (matches the proven 3c value); damage 0.
  - Pixel evidence (sampled from the capture, 1280×720): dashboard band lower-centre **(37,30,48)** luma 33 — dark and readable, decisively NOT white; near-white glare share in the blob region (right-of-centre, below the horizon, HUD corner excluded) **0.0%** (was **14.6%** before the fix); warm lit gauge pixels **7.85%** share; steering-wheel chrome pixels **1.07%** share; tonal lumas across dash/left-edge/right-edge/sky/mirror **[33,30,21,46,69]** (spread 48) — real interior geometry, not a flat fill.
  - Gates: **0 console errors, 0 page errors, 0 non-file requests**.
- Screenshot: `~/workspace/makefun/velvet-harbor-preview/m3c-first-car-fixed.jpg` (1280×720, 128,141 B) — first-person driver view; the original `m3c-first-car.jpg` is kept untouched as the before/after comparison. 8×8 luma grid: the old blown cells (204/231/218 bottom-right) now read 27–79; the only bright cell left (177) is the legitimate HUD speed readout corner. **Coordinator eyeballed the capture: genuine interior (dark dashboard + gold trim, steering wheel, A-pillars, interior mirror, windshield frame) and the bright blob is gone.**

### Review close-out (Nemotron independent review, findings M3 + L1)
- **M3 — visibility toggle now covers police + traffic** (`game/src/main.js` `refreshViewVisibility()`): the review found the toggle only iterated `vehicles.cars`, so a police/traffic car interior could theoretically show. Fixed with explicit loops hiding `interior` on every `police.cars` and `traffic.cars` unit (their shells stay visible); the comment now matches the code. Telemetry added to `velvet.inspect()`: `bayInteriors`, `policeInteriors`, `trafficInteriors`.
- **L1 — windshield `depthWrite:false` evaluated, NOT changed**: no sorting artifact is evidenced in the capture or pixel data (glare 0.0%, dash readable), so the material was left as-is rather than fixed blindly.
- Coordinator re-verification after the M3 finish: tests **10/10**, `tsc --noEmit` **0 errors**, `node main.ts` **exit 0** (dossier **778,674 B**, fresh isolated dir), Playwright `verify-m3c-interior-playwright.cjs` **PASS** with the new M3 assertions (all bay/police/traffic interiors `false` in chase view), glare **0.0%**, gauge 7.84%, chrome 1.13%, tonal lumas **[33,30,21,48,71]**, **0 console / 0 page errors / 0 non-file requests**; `makefun check` **5 passed, 0 failed**.

## Milestone 3 — three new vehicles: Marlowe Viceroy, Kestrel Dart, Briar Heritage (2026-11-23)

Three new stealable/drivable vehicles join the existing five (`game/src/vehicles.js`, `traffic.js`, `main.js`): **Marlowe Viceroy** (vintage luxury saloon, `kind:'vintage'`, 5.3 m, power 11, top 41, paint `#d8bd7f`), **Kestrel Dart** (sports motorcycle, `kind:'sportbike'`, 2.2 m, power 17, top 52, paint `#4f78a8`), **Briar Heritage** (classic motorcycle, `kind:'classic-bike'`, 2.3 m, power 12, top 38, paint `#7f4f45`). 8 models now, 18 parked positions (`index%8`; new spots `[5,174,0]`, `[-6,139,0]`, `[153,116,PI]`; Viceroy is bay-5 `[6,-35,0]`, Dart bay-6 `[-86,-108,PI]`, Heritage bay-7 `[166,-186,0]`); AI traffic picks from all 8. Motorcycles mount/dismount with **KeyE** like cars (dismount refused above 3 m/s), lean into corners (target roll ∝ steer × speed, damp lambda 8, motorcycle roll limit 0.48 rad; measured Dart mid-turn bodyRoll −0.0114 rad, correct sign for a left turn), and carry a visible rider (rider group is a child of `shell`, shown for the active vehicle / AI riders via `refreshViewVisibility`).

Build history: the Kimi build session died after ~63 min on "provider capacity is exhausted" with the code ~complete on disk (tests 10/10 in its run, before tsc/Playwright); a Nemotron finish session completed it. The rider-readability fix (Nemotron) brightened rider colours (jacket/denim/boots/helmet per bike); the rider micro-fix (Nemotron, one line, `vehicles.js:87`) changed the Dart jacket `#4a7c9e` → cream `#e8dcc8` after the coordinator's enlarged crop showed the blue jacket blending into the blue bike paint.

User finding (14:36 WITA, screenshot `m3-vehicle-viceroy.jpg`): the old Viceroy shot did NOT show the Viceroy at all — Mara on foot + prompt "Take Vortex Stiletto". Root cause: the finish session's verify script screenshotted without ever verifying a mount. The coordinator retook all three vehicles with a script that **asserts before every shot** (parked `#hint` must read "Take \<Name\>", telemetry `car` must equal the expected bay id, driving `#vehicle` label must read "\<NAME\> · KM/H") and exits 1 instead of saving a wrongly-labelled shot. The old Heritage shot had the same failure; the old Dart shot was already correct (bike + "KESTREL DART · KM/H" visible) and was re-proven.

Verification (coordinator, independent):

- `node --test tests/run.mjs`: **10/10 pass, 0 fail**.
- `npx -y -p typescript tsc --noEmit`: **0 errors**.
- `node main.ts`: **exit 0** (dossier **793,727 B**, fresh isolated dir, exactly 4 screenshots).
- `makefun check`: **5 passed, 0 failed**.
- Playwright retakes (`velvet-harbor-launcher/verify-m3-vehicles-retake-playwright.cjs` + `verify-m3-vehicles-dart-retake-playwright.cjs`, Chromium 1148, file://, 1280×720, snapshot of `game/` so a concurrent bundle rebuild cannot corrupt the load): **all asserts PASS** — parked hints "Take Marlowe Viceroy" / "Take Briar Heritage" / "Take Kestrel Dart"; mounts `car=bay-5/bay-7/bay-6`; driving labels "MARLOWE VICEROY · KM/H" (15), "BRIAR HERITAGE · KM/H" (19), "KESTREL DART · KM/H" (27); **0 console / 0 page errors / 0 non-file requests**.
- Screenshots (1280×720, `velvet-harbor-preview/`, all eyeballed by the coordinator): `m3-vehicle-viceroy.jpg` (Viceroy dead-centre, tail lights, name in HUD) + `m3-vehicle-viceroy-parked.jpg` (prompt "E Take Marlowe Viceroy"); `m3-vehicle-heritage.jpg` (bike + rider centre-frame, name in HUD) + `m3-vehicle-heritage-parked.jpg`; `m3-vehicle-dart.jpg` (Mara riding the Dart, cream jacket clearly readable against the blue bike — the micro-fix works) + `m3-vehicle-dart-parked.jpg`; `m3-vehicle-dart-fixed.jpg` (micro-fix session's own mid-turn shot, untouched by the retake). The parked Heritage/Dart shots have the bike partly hidden behind Mara — the driving shots are the evidence for those two.
- Honest notes: driving speeds read low in SwiftShader (telemetry 0.55–1.69 m/s; HUD 15–27 km/h) — a software-renderer artifact, not a game defect. The Dart retake's stop-wait "failed" only against the script's own over-strict bar (<0.5 m/s); the game's dismount bar is 3 m/s and the bike was at 1.08 m/s and falling at 60 s, so the dismount would have succeeded. Two script lessons recorded for future verifications: wait for the `#loading` overlay to disappear + `mode==='start'` before clicking New Game (an early click silently does nothing — the bundle builds the city synchronously after `networkidle`), and stop-waits must be long (the sim runs ~2% of wall speed under SwiftShader; keyup can sit queued behind long frames, so hold Space/handbrake and poll up to 60 s).
- Bundle note: `game/bundle.min.js` **614,015 B, sha256 `12fec187…`** (rebuilt by the sidewalk session's verification from the same sources; greps confirm `e8dcc8` ×1, `4a7c9e` ×0, all three new names present). The bundle also contained the in-progress sidewalk work in `game/src/world.js`, which was committed separately in the sidewalk commit (entry above).

## Milestone 3 — STREET DRESSING + SIDEWALK + CORNER AUDIT: FINISH 2 (2026-11-23, GLM Flash)

User finding (screenshot `m4-peds-b.jpg`, Mara at (68,251)): sidewalk strips cut off / ending abruptly, not connecting at corners. Root cause (`game/src/world.js` old lines 45–52): sidewalk = 4-wide strips at `axis±12`, built per segment `for(segment=-280;segment<=280;segment+=80)` with `length=52` — a **28-unit gap centered on every crossing avenue** (strip ends 14 units before the crossing, resumes 14 after); the trim strips had the same gaps. 7×7 avenues = **49 intersections with gaps**.

Fixes (`game/src/world.js` only):

- **Corner squares — final form (mid-road fix, 2026-11-23 14:36 WITA)**: the first attempt closed each gap with two overlapping 28-long strips (`ground(axis+side*12, cross, 4, 28, ...)` + `ground(cross, axis+side*12, 28, 4, ...)` + matching trim) — but those strips CROSSED the road bands, so through every intersection the strip was flanked by asphalt on both sides and read as a sidewalk running down the MIDDLE of the road (user finding, screenshot `m3-corner-user.jpg`). The fix DELETED both 28-long strips and their trim, and added one ~12×12 square per intersection corner instead: `ground(axis+sx*16, cross+sz*16, 12, 12, mat.sidewalk, .14)` for every `axis` × `cross` × `sx` (±1) × `sz` (±1), centred outside both road bands (spans axis+10..22, cross+10..22 — touches the road edge, never crosses it), y .14 to sit above the strips (.12) and pads (.13) without z-fighting. Corner dressing at `axis±15.3` stays (furniture ON the square is correct). **No `solid()` colliders on sidewalk pieces** — sidewalks stay walk-through; colliders only on dressing objects.
- **Grass block pads replaced with sidewalk** (user: "ganti dengan trotoar juga agar tersambung"): every non-plaza block (34 blocks, 49×49) now gets a full `ground(cx,cz,49,49,mat.sidewalk,.13)` pad under its building, so the grass ring between the perimeter sidewalk strips is gone and the sidewalk reads continuous around every block. The two plaza/park blocks keep their grass + fountain + plus-cross.
- **Corner dressing, all 49 intersections × 4 corners = 196 corners** (deterministic `kind=(index)%3`): (0) 1.5×1.5×0.55 planter with 9 flowers (pink centre, yellow ring) + collider; (1) 1.7 m steel corner lamp with arm + warm lamp head, registered in `lampPositions` for night lighting + collider; (2) bush cluster (0.65 + 0.40 leaf spheres on a trim base) + collider. All placed at `axis±15.3` — off the 4-wide walk strips (which span `axis±(10..14)`), so pedestrian paths stay clear.
- **Real benches** (geometri baru — previously only a comment existed): seat 2.1×0.1×0.55 at y 0.52, backrest 2.1×0.55×0.1 at y 0.88, two steel legs, `solid()` collider; helper `bench(x,z,ry)` with ry-correct backrest/leg offsets and axis-aligned collider. Placement: **Pearlwake Boulevard** — 23 boulevard positions `z=-244..244 step 48` (skipping |z−avenue|≤16), both sides (x=±12.6, facing the road), ≈32 benches; **both plaza parks** (40,200) and (−200,−40) — 4 benches each around the fountain at radius 9. Sitting behaviour is milestone 4 (not built here).

**Corner audit checklist** (49 intersections × 4 corners = 196 corners, systematic by construction — the dressing loop covers every (axis, cross, side, side) combination, so no corner can be missed):

- All 196 corners: sidewalk now continuous (12×12 corner squares at the edges, no strip in any road band), one dressing piece per corner (planter+flowers / corner lamp / bush cluster) — nothing bare.
- All 34 non-plaza blocks: grass ring paved with sidewalk; joins with the perimeter strips are flush (pad y .13 vs strip y .12 — sub-2 cm step, invisible).
- Road asphalt, lane markings, zebra crosses untouched (markings correctly stop before intersections).
- Spot-verified in browser at 4 locations (below), incl. the user's corner.

Verification:

- `node --test tests/run.mjs`: **10/10 pass, 0 fail**.
- `npx -y -p typescript tsc --noEmit`: **0 errors**.
- `node main.ts`: **exit 0** (dossier **793,260 B**, fresh isolated dir via `MAKEFUN_OUTPUT_DIR`, exactly 4 screenshots).
- Bundle rebuilt (esbuild `--bundle --format=iife --minify`): **613,954 B, sha256 `1ea3244c…`**; greps confirm the new code is in the bundle (`12,12,*.sidewalk,.14` corner squares present, `4, 28` / `28, 4` gap-fill strips gone).
- Playwright (`velvet-harbor-launcher/verify-m3-sidewalk-playwright.cjs` + `verify-m3-sidewalk-drive.cjs`, Chromium 1148, file://, 1280×720, DOM click New Game): on-foot walk + screenshots at 4 corners; entered bay-0 (Marlowe Viceroy) and drove with deterministic manual stepping (headless rAF throttled under SwiftShader) from z=146.5 to z=62.7 through left+right bends; **0 console / 0 page errors / 0 non-file requests**.
- Screenshots (1280×720, `velvet-harbor-preview/`): `m3-corner-user.jpg` (Mara at (68,251), same viewpoint as `m4-peds-b.jpg` — coordinator eyeballed it: NO strip in the middle of the road; Mara stands on a clean corner pad, road ahead reads as road with a zebra on the right), `probe-corner-topdown.jpg` + `probe-corner-oblique.jpg` (fixed-camera probes of the same intersection — grid correct at the edges, no strip crossing any road band; the oblique reproduces the user's exact view), `m3-corner-1.jpg` (in-city intersection near (−80,80), usable). `m3-corner-2.jpg` and `m3-corner-3.jpg` are NOT usable evidence (coordinator eyeball: corner-2 has the camera clipped into a building with Mara half-in a wall; corner-3 is blocked by a pedestrian filling the frame) — the verify script does not control framing; the user corner + probes are the evidence. Before/after pair for the user corner: `m4-peds-fixed-b2.jpg` (before, strip visible) vs `m3-corner-user.jpg` (after, strip gone).
- Honest notes: under SwiftShader the render throttles hard (8 frames in ~10 s of wall time in the first drive attempt); the drive check therefore uses the game's own `__vhTest.setManual(true)` + `step(n)` deterministic hooks instead of real-time waits. One transient headless-browser crash occurred on a rerun (SwiftShader flakiness); the passing run captured all 4 screenshots with 0 errors.
- Pixel evidence (fix session's `analyze-corner.cjs` on the probe shots): old-bug spots dark (L=16–30); corner squares L≈59 ≈ edge strips L≈62 >> road L≈17–24. The absolute 'LIGHT' threshold in that script was wrong for a night scene — the relative reading is the proof.
- Known nit: `world.js:4` imports `buildCitizen` from `./peds.js` but never calls it (dead import; tsc 0, bundle builds, game runs). To be removed by the next session that touches `world.js`.

## Milestone 3e — beachfront: Giltwheel Fair + Ironshore Fitness + beach umbrellas (2026-11-23, GLM Flash finish2)

- **Giltwheel Fair** (`game/src/world.js`, west sand (-196,278)): Ferris wheel "Giltwheel" — rim TorusGeometry r=14 + 8 spokes + 8 neon gondolas (cyan/magenta cabins), 3 stalls, sign 'GILTWHEEL FAIR'; the wheel turns slowly (rotation hooked into the `update` returned by `createCity`). Collision on the support + stalls; the area under the wheel is walkable.
- **Ironshore Fitness** (`game/src/world.js`, centre sand (20,268–285)): pull-up bar (12–16,268), parallel bars (20–24,270±0.9), bench (26.5,278), dip bars (13–15.5,282), 4 lamps, sign 'IRONSHORE FITNESS'. Small static landmark only, no new gameplay system. Collision correct.
- **Beach umbrellas** (`game/src/world.js`, east sand x 136–241, z 268–286): 7 parasols (cone canopies r=2.7, 4 colours) + loungers + 3 sunbathers built with the already-imported `buildCitizen`. All three zones sit at z 255–300, south of the palm row (z=251), on the sand strips — not on roads.
- **Correction to the earlier "dead import" nit** (sidewalk entry): `world.js:4` imports `buildCitizen` from `./peds.js` — it is NO LONGER dead: the 3e sunbathers call it (`world.js:401`). The cleanup line in the 3e finish2 prompt (delete the import) must NOT be applied; removing it would break the sunbathers.
- **Screenshot framing lesson (root cause, diagnosed not guessed)**: the 3e session's own verify script used `faceTo()`, which turns MARA (A/D keys change player heading) but NOT the camera — the chase camera follows `input.yaw` (mouse look), which `faceTo` never touches. So its three shots kept default yaw 0 = camera south of Mara looking NORTH at the city while Mara faced south toward the features — all three showed empty fields. The coordinator retook all three with manual-mode fixed cameras (`__vhTest.setManual(true)` + `__vhCamera(pos, look)`, snapshot + local-esbuild rebuild) and eye-checked them: `m3e-fair.jpg` (wheel fills the frame, gold rim, spokes, neon gondolas, sea behind), `m3e-fitness.jpg` (pull-up + parallel bars + bench readable, warm lamps, sea behind — honest note: the "IRONSHORE FITNESS" sign is not readable from this angle, it sits at z=285.4 facing the city; the equipment itself is proven), `m3e-beach.jpg` (big blue parasol centre-frame, blue + red + gold parasols, loungers, sand, sea). The finish2 session later overwrote these three files with its own empty-framed shots (~17:35 WITA); the coordinator restored them from the byte-identical `-fixed` backups (sha256 match: fair `a1c7c168…`, fitness `e0f66916…`, beach `34eec3ac…`).
- **Build history**: Kimi 3e died after ~48 min on a 408 timeout with 0 lines written (broad greps + a `buildCitizen()` probe without a scene); GLM finish died on VM restart #13; GLM finish2 (v18) completed the code but was killed by VM restart #17 during its verification tail — its Playwright PASS JSON survived in the log; it never wrote a final report, so the coordinator verified independently below.
- Verification (coordinator, independent): tests **10/10**, `tsc` **0 errors**, `node main.ts` **exit 0** (dossier **807,202 B**, fresh dir, exactly 4 screenshots), `makefun check` **5 passed, 0 failed**. Bundle **621,209 B, sha256 `954b78bc…`** (`GILTWHEEL` ×1, `IRONSHORE` ×1 in the bundle; `parasol` ×0 in the minified bundle is expected — the identifier is minified away; source `world.js` has `parasol` ×3, `canopy` ×2). Session's own Playwright run (before the restart) reported `wheelRotated: true` (pixel motion: sky band 333,146 px, lower band 86,878 px), drawCalls 463, **0 console / 0 page errors / 0 non-file requests**.

## Milestone 5 — pursuit: Sky Patrol helicopter + Saltgilt Dispatch subtitles + news ticker (2026-11-23, Nemotron 3 Ultra)

- **Sky Patrol helicopter** (new `game/src/helicopter.js`, 139 lines; wired in `game/src/main.js`): appears when wanted reaches 5 stars, follows the player from above (~40 m up, slow circling, rotor spins — measured `rotorSpeed` 427.9), leaves/despawns when wanted drops below 5. Hooks the existing `velvet:wanted-change` event (`helicopterRequired: wanted >= 5`); `police.js` untouched, Bug A decay and Bug B no-blocking untouched.
- **Searchlight — only when dark/night** (user rule): the heli's searchlight cone + ground pool are active only when the game's `night` flag is on; 18:30 blue hour counts as dark. Verified live: `searchlight: true` at 18:50 with intensity 12000 at night.
- **Saltgilt Dispatch subtitles** (`game/src/hud.js` + `game/index.html`): on-screen dispatch line on wanted changes, exact prefix "Saltgilt Dispatch" — live text observed: "SALTGILT DISPATCH: WANTED LEVEL 5 — SKY PATROL INBOUND".
- **News ticker** (`game/src/hud.js` + `game/index.html`, bottom bar, gold on dark): scrolling dispatch messages, 2 distinct messages observed live: "SALTGILT DISPATCH: WANTED LEVEL 5 — SKY PATROL INBOUND" and "SALTGILT PD: ALL UNITS RESPOND TO CODE 3 ON PEARLWAKE BOULEVARD".
- **Build history**: Nemotron built the heli + wiring under v18 in ~85 min; it was still polishing geometry (skid/rotor cylinders → boxes) when VM restart #17 killed it at 17:38 WITA — no final report, so the coordinator verified independently below. Its own verify script was never saved (its scratch `test-m5.js`/`test-simple.js` in the repo root were deleted as junk, not committed).
- Verification (coordinator, independent — `verify-m5-pursuit-playwright.cjs`, Chromium 1148, file://, 1280×720, deterministic `__vhTest.step(600)`): **PASS, exit 0** — heli appears at 5 stars, tracks the player across a teleport (position moved >1 m), searchlight on at night, dispatch shown, ticker ≥2 messages, heli leaves at wanted 0; **0 console / 0 page errors / 0 non-file requests**. `velvet.inspect().helicopter` exposes `{active, position, rotorSpeed, searchlight}`. Tests **10/10**, `tsc` **0 errors**, `node main.ts` **exit 0** (dossier **807,202 B**, fresh dir, exactly 4 screenshots), `makefun check` **5 passed, 0 failed**. Bundle **621,209 B, sha256 `954b78bc…`** (`SALTGILT DISPATCH` ×1, `sky patrol` ×1, `helicopter` ×1 in the bundle).
- Screenshots (1280×720, `velvet-harbor-preview/`, coordinator eye-checked): `m5-heli-chase.jpg` (sha256 `ae31e865…` — close-up retake, camera ~20 m from the heli: dark body, long main rotor, tail boom, yellow skids, large centre-frame against the violet sky + neon skyline; ticker + 5 stars + "POLICE PURSUIT · BREAK LINE OF SIGHT" visible) and `m5-ticker.jpg` (sha256 `361474f3…` — ticker bar with both messages readable). The first wide framing (`m5-heli-chase-wide.jpg`, `0136d6e6…`) shows the heli only as a small dark silhouette — the close-up is the evidence. Honest note: the searchlight cone/pool is proven by inspect data (`searchlight: true`, intensity 12000 at night), not by a visible beam in the still — the beam is a faint additive cone that does not read strongly in a SwiftShader still at this angle.

## Milestone 3 — housing + gate: Sunwick Hills housing + Marigold Gardens + GAPURA (2026-11-23, Nemotron 3 Ultra)

- **Housing** (`game/src/world.js`, Sunwick Hills x<−100): 3 blocks — 2 housing blocks + 1 Marigold Gardens block. **LOCKED denah**: 8 houses numbered 1–8 in a CIRCLE (radius 14 m) around a central dead-end roundabout ("BUNDARAN BUNTU", centre (-160,40), 11 m drive ring + grass island with pine), ALL facing the roundabout. Each house 7.5×9 m, dark roof, cream walls, hedge fence (11×13 m), gravel driveway to the roundabout, 4 pine trees at yard corners. Houses NOT enterable; collision on houses + fences + island tree.
- **Exit road**: 7 m asphalt, from the roundabout south edge (z≈23.5) straight south through the MIDDLE of Marigold Gardens to the main avenue at z=−80, with sidewalks + trim, parked cars on the west side. ("1 jalan" = 1 exit road per housing block, not 1 city road — the city grid is untouched.)
- **Marigold Gardens** (centred (-160,−40), 36×32 m): grass, circular sidewalk path (R=6 m), central fountain, 4 flower quadrants (pink/yellow/cyan/magenta), 8 lamps + 4 benches on the path ring, hedge perimeter.
- **GAPURA gate** (at (-160,−76), the garden entrance from the main avenue): Art Deco twin plinths with steel fins, neon cyan/magenta ribs, warm lamps, arched top with "MARIGOLD GARDENS" gold-trim text, neon edge glow. Collision on the arch span.
- **Build history**: Nemotron built it under v19 in ~44 min, exit 0, "Ready for commit: Yes". (The prompt's dead-import cleanup line was removed by the coordinator before launch — `world.js:4` `buildCitizen` is USED by the 3e sunbathers and must stay.)
- Verification (coordinator, independent): tests **10/10**, `tsc` **0 errors**, `node main.ts` **exit 0** (dossier **812,131 B**, fresh dir, exactly 4 screenshots), `makefun check` **5 passed, 0 failed**. Bundle **627,121 B, sha256 `7a460b05…`** (`MARIGOLD` ×1 in the bundle — the gate text; `gapura`/`roundabout` ×0 is expected, those words are identifiers/comments, minified away). Session Playwright: **0 console / 0 page errors / 0 non-file requests**; collision checks: roundabout centre blocked, house position blocked, gate span blocked, exit road walkable.
- Screenshots (1280×720, `velvet-harbor-preview/`, coordinator eye-checked): `m3-housing-roundabout.jpg` (sha256 `526d0437…` — top-down: 8 dark pitched roofs in a circle around the roundabout island; HUD "SUNWICK HILLS · SALTGILT · 18:30"; the ticker already shows the pursuit messages, cross-evidence the ticker works in normal play) and `m3-gapura.jpg` (sha256 `39becf70…` — twin plinths with cyan vertical neon ribs + magenta top bar + warm lamps, Mara mid-road, street stretching ahead). Honest notes: both shots are dark (blue-hour top-down / dusk street), so hedge fences, driveways and yard pines are hard to read in the stills — the layout (8 houses + roundabout + gate structure) is what they prove; and the "MARIGOLD GARDENS" gold text is not legible at this angle/resolution. A palm is visible in the middle distance of the gapura shot — that is one of the pre-existing scattered inland palms (the palms-removal task is still queued, not the housing session's work).

## Known limits

Software rendering is too slow for comfortable play. The measured performance gate is not passed, and hardware performance must be assessed before accepting the build. The simulation limits long frame steps to preserve collision stability, so play and the clock slow down under very low frame rates. The software renderer uses reduced internal resolution and a smaller shadow map; the UI and screenshots retain the requested viewport dimensions.

The art is procedural and stylized. Review the real captures for the requested visual bar; no photorealistic claim is made. Geometry batches, instanced palms, windows and lamp heads, nearby-vehicle culling, and infrequent shadow refreshes are implemented, but they have not made this software environment smooth.

No functional failures remain among the exercised Phase 1 paths. Exploration and collision testing sampled the city rather than exhaustively covering every curb, building, and parking space. Traffic, pedestrians, police, missions, and combat are deferred as requested. Chapter progress is an initial chapter-zero save field, with no mission gameplay.

## Authored deliverables

- Root files: `.gitignore`, `README.md`, `QA.md`, `main.ts`, `shots.json`.
- Browser page and bundle: `game/index.html`, `game/bundle.min.js`.
- Game modules: `game/src/audio.js`, `character.js`, `hud.js`, `input.js`, `main.js`, `minimap.js`, `render.js`, `save.js`, `vehicles.js`, `world.js`.
- Engine license notice: `game/vendor/three-license.txt` (the package's required MIT notice).
- The three screenshot files listed above.

Obsolete starter modules `game/src/config.js`, `random.js`, and `shots.js` were removed. The three starter screenshots `1-start.jpg`, `2-play.jpg`, and `3-end.jpg` were replaced.

The authored external test scripts are `inspect.cjs`, `probe.cjs`, `journey.cjs`, `features.cjs`, `visual-final.cjs`, `guards-and-brakes.cjs`, `deny-network.cjs`, and `entrypoint.cjs`, all under `/tmp/velvet-test`. Their result JSON, textual output, and additional real captures are retained there for review. Build tooling was installed temporarily in the repository; test dependencies remain outside it.

## Milestone 4 — Vesper Coach intercity bus + Milestone 7 — Extras (first commit, 2026-11-23 ~19:52 WITA, freeze extended to 21:00)
- Bus (`game/src/bus.js` NEW, 390 lines; `traffic.js` wires `busUpdate` into `traffic.update`; `vehicles.js` `'bus'` kind branch): 11 m Vesper Coach, teal + cream + gold livery; 24-point loop on the outer avenues; 6 halts with shelters + signs (Prism Heights Terminal, Pearlwake Boulevard, Lanternfish Marina, Sunwick Hills, Gilded Quay, Neon Reach); dwell 4.0 s; boarding/alighting counters.
- Crash fix (coordinator-found, micro-fix session): `checkTrafficLights` read `traffic.lights` but `createBus` was given the vehicles object (no `.lights`/`.phase`) — `TypeError: s.lights is not iterable` on the first sim step. Fixed by passing `{lights, phase}` as a third argument (`traffic.js:40`, `bus.js:7,39,277,362`).
- Syntax fix (micro-fix 3, Nemotron, exit 0): M7 re-declared `windowMat` at `world.js:699` (pre-existing at :189) — renamed to `windowMatMono` (:699-700). esbuild builds; tests 10/10; tsc 0.
- M7 extras (`game/src/world.js` +401 lines): monorail loop (Prism Heights, pylons + track beams + car with lit windows, via `update`), lighthouse (tower + rotating beam), tide plane (Rustcrane Docks, level cycles via `update`), 3–4 food carts (Saffron Pier Market), train + rails + station + flashing level crossing (Rustcrane Docks).
- Coordinator independent evidence: tests 10/10, tsc 0, main.ts exit 0 (dossier 812,283 B, fresh dir, exactly 4 screenshots), `makefun check` 5 passed 0 failed; Playwright smoke (file://, Chromium 1148) PASS — bus moved 106.47 m in 30 sim-seconds, 0 console / 0 page errors / 0 non-file requests; full bus verify (300 sim-s): bus moved 123 m, 0/0/0 errors.
- KNOWN DEFECTS (not hidden — fix sessions launched right after this commit): (1) bus starts at (0,0) and drives diagonally to [240,240] straight through buildings (no building collision in `updateBus`), crawling ~0.4–3.5 m/s; (2) terminal halt (200,240) never dwells — `checkHaltArrival` runs only at waypoints and the nearest are 40 m away; (3) boarding never observed in 300 sim-s — no ped route passes within 6 m of any halt; (4) M7 visuals NOT yet eye-checked (no screenshot proof of monorail/lighthouse/train/tide/food carts yet — M7-verify session next); (5) monorail pylons stand on avenues x/z=±80 — placement to verify/fix (they may block avenues).

## Milestone 4 — Vesper Coach bus fix-2 (start position + terminal halt, 2026-11-23 ~20:12 WITA)
- Fix (Nemotron micro-fix 2, exit 0): bus now starts at route[0] (240, 0.02, 240) with target=0 (`bus.js:37`); terminal halt moved from (200,240) to (240,240) (`bus.js:28`); `traffic.reset()` now resets the bus (position/target/speed/dwell/boardingHalt, `traffic.js:41`). The first leg no longer cuts diagonally across the city from (0,0).
- Session verification: tests 10/10, tsc 0, Playwright (coordinator's 30-step script) PASS — moved 141.25 m, sawDwell=true, minSpeed=0, 0/0/0 errors; last position [53.48, 0.02, 240.00] (on the avenue).
- Coordinator independent verification: quick dwell script (8× step(600)) — bus on avenue z=240 throughout, moved ~357 m in 80 sim-s, 0/0/0 errors. (It did not catch a dwell in its 8 samples — sampling aliasing: a 4 s dwell between 10 s samples is missed ~21% of the time over 8 samples; the session's 30-sample run caught it. A finer 80× step(60) re-run was started but killed after ~10 min wall — SwiftShader + 3 concurrent sessions made each iteration multi-second; the evidence above stands without it.)
- Screenshot eye-checked by coordinator: `preview/m4-bus-halt.jpg` (94,060 B) — Vesper Coach center-frame, stopped at a Pearlwake Boulevard intersection at 21:10, gold livery stripe readable, rain + wet neon road.
- KNOWN GAP (still open): boarding never observed — maxPassengers 0 in both runs (no ped route passes within 6 m of any halt). Boarding logic exists and counts, but cannot trigger with current ped routes. Follow-up: move a halt onto a ped route or route peds to halts.

## Milestone 7 — Extras verification close-out (2026-11-23 ~21:30 WITA)
- Test hooks added by the M7-verify session (Nemotron, died exit 1 "Error: no provider is available" after ~57 min — Numes outage; its verify script `verify_m7.cjs` was moved to the launcher dir as `verify-m7-nemotron.cjs`, NOT committed): `window.__vhWorld = { blocked, update, monorail, lighthouse, tide, train, foodCarts }` + the same five returned from `createCity` (`game/src/world.js` :1075-1076, 2 lines changed).
- KEY FINDING (coordinator, `verify-m7-retake-playwright.cjs`): `main.js` `animate()` SKIPS `world.update()` in manual test mode (`testManual=true`), so M7 objects never advance under `__vhTest.step()`. In real play `animate()` calls `world.update(elapsed, night, focus)` every frame, so they DO move. Motion was proven by driving `__vhWorld.update()` directly (600 calls ≈ 10 s at 60 fps, focus `{x,y,z}` from `velvet.inspect().position`): **PASS, exit 0** — monorail moved 43.2 m (progress 0.72 → 43.92 = 4.5 u/s, 44 pylons), lighthouse angle 2.135 → 4.235 rad (+2.1, 0.0035/call), beamVisible: true, train moved 57.6 m (progress 116.16 → 173.76 = 6 u/s, loopLength 880, crossingZ -80), tide phase 0.0941 → 0.1253 (+0.0312 = 600×0.000052); tide level -0.730 → -0.730 is the coordinator's own script artifact (the helper restarts `t` at 1000 each call and level = sin(time×0.0052)×0.85 is a pure function of time — NOT a game bug; in real play elapsed grows continuously so the tide rises/falls). 0 console / 0 page errors / 0 non-file requests.
- Screenshots eye-checked by the coordinator (all 1280×720, `preview/`): train `m7-train.jpg` (sha256 `ac949210…`) PASS — dark loco, bright headlight + lit windows on rails over turquoise tide water, gantry crane + neon skyline; tide `m7-tide.jpg` (`867902ff…`) PASS — flooded Rustcrane Docks, turquoise water, dock aprons, rails, crane, cyan+magenta neon strips; food cart `m7-foodcart-close.jpg` (`ab4043b8…`) PASS — cart center-frame, red awning, warm lamp, gold "FOOD" sign readable; monorail `m7-monorail.jpg` (`3f0d7d8d…`, = `probe3-mono-north.jpg`) MARGINAL PASS — long dark car on the elevated track with two warm headlights, center-frame, neon towers behind; the window strip does NOT read (see known issue below). Lighthouse `m7-lighthouse.jpg` (`84ee8f20…`, = `probe3-lh-beach120.jpg`) — shows the lighthouse LIGHT (warm halo over the beachfront skyline), NOT the tower itself (see known issue below).
- Framing lessons (3 probe rounds, 8 angles tried): (1) fixed cameras fail when the camera lands inside a building (mono-lowup: tower in the sightline; mono-high: inside a neon-lit wall); (2) the lighthouse lamp's bloom (SpotLight intensity 85000 + glow sphere + UnrealBloomPass) whites out any frame that includes the lamp, even from 120 m; (3) a building ("CORAL SOCIAL") blocks the tower from the SE at street level; (4) the monorail car's rear nose cone is a big dark triangle at 8 m — the SIDE view from the north sidewalk (12 m, over the avenue) is the shot that works.
- KNOWN ISSUES (honest, not blocking submit — features exist and move; these are visual/polish gaps): (a) monorail car "lit windows" don't read — the window strip (2.8 wide) is NARROWER than the steel body (3.2 wide), so it is embedded inside the body and invisible from outside; fix = widen the strip to 3.3 or surface-mount it; (b) lighthouse tower has NO clean photograph after 6 angles (lamp bloom + surrounding mid-rise buildings) — the tower geometry + rotating beam + light are proven by code and numeric data (angle +2.1 rad, beamVisible true, glow visible as a halo in every shot), but no clean tower photo exists; (c) monorail pylons stand on the avenue centrelines x/z=±80 (0.7×0.7 solid colliders, 12 tall) — a small obstacle cars can drive around, but AI traffic does not path around small obstacles; no live collision verdict yet; (d) the M7-verify session's own screenshots were not usable evidence (broken framing — street-level chase view, no monorail/lighthouse in frame); the coordinator's retakes + probes are the evidence.
- Coordinator independent verification for this commit: tests **10/10**, tsc **0**, main.ts **exit 0** (dossier **812,264 B**, fresh dir `/tmp/velvet-m7-check`, exactly 4 screenshots), `makefun check` **5 passed, 0 failed**; bundle **645,286 B, sha256 `4a69235f…`**.
