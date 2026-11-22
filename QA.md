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
