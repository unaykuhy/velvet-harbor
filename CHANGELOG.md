# Changelog

## 2026-11-22 — Milestone 3b-1: fixed-step simulation + spring camera

- **Fixed-step core** (`game/src/main.js`): simulation advances in exact 1/60 s ticks via an accumulator loop (`MAX_FRAME_DELTA` 0.05, max 4 steps/frame); all moving bodies keep prev/cur position+yaw buffers and are renderer-interpolated, so motion is smooth and deterministic at any frame rate. Teleports re-anchor interpolation via `snapInterpolation()`.
- **Spring chase camera**: critically damped spring (stiffness 81, damping 18) on camera position and yaw (`cameraSpringYaw`) replaces the frame-rate-dependent lerp; occlusion pull-in and first-frame anchor preserved.
- **Vehicle body roll/pitch**: `updateBodyVisual()` damps roll (≤0.055 rad, steer×speed) and pitch (≤0.035 rad, acceleration).
- **Test-only hooks**: `window.__vhTest.setManual()` / `__vhTest.step(count)` run the exact production step path deterministically; the rAF loop skips sim/camera/body updates in manual mode so wall frames cannot contaminate stepped sequences.
- Verification: bundle rebuilt (esbuild iife minified); tests **6/6**, `tsc --noEmit` **0 errors**, `node main.ts` **exit 0** (dossier 749,651 B), Playwright golden path **PASS** (walk + enter car + drive, **0 console / 0 page errors / 0 non-file requests**), determinism **2× identical to 0 delta** (241 fixed steps), `maxCameraStep` **0.603** < 1, `maxCameraYawStep` **0.0201** rad < 0.35, body roll/pitch in range. Software render **0.39 FPS** (SwiftShader, not a GPU claim). Screenshot `m3b1-drive.jpg` retaken. Full numbers in QA.md (Milestone 3b-1 section).

## 2026-11-22 — Milestone 3a: signature blue-hour look

- Default time is now **18:30 blue hour** (New Game, title scene, HUD clock): navy `#0e1738` / violet `#232a52` sky gradient with a warm horizon ember, bluish hemisphere ambient (sky `#8fa3e8`, ground `#3b3f66`), low amber sun ramp (`game/src/render.js` `updateDay`, `game/src/main.js`, `game/index.html`).
- **Wet streets**: the asphalt puddle-mask canvas texture now drives albedo + roughness map (puddles ≈ 0.28, tarmac ≈ 0.6 roughness) and asphalt gets a night env sheen (`envMapIntensity 0.45 + night·1.05`) so neon and light bars read on the tarmac (`game/src/render.js`, `game/src/main.js`).
- **Light rain**: 640 instanced streaks around the camera, one draw call, no per-drop physics (new `game/src/weather.js`).
- **Sky lanterns**: 20 instanced warm-emissive lanterns over the bay, one draw call, slow sine drift (new `game/src/weather.js`).
- **Art Deco trim**: downtown towers gain stepped neon crown + spandrel bands and steel corner fins; neon cyan/magenta/amber trim colors merged into existing bake batches (`game/src/world.js`, new `neonCyan`/`neonMagenta` materials in `game/src/render.js`).
- Bundle rebuilt with esbuild. Verification: tests **6/6**, `tsc --noEmit` **0 errors**, `node main.ts` **exit 0**, Playwright **0 console / 0 page errors / 0 non-file requests**, draw calls **298** in play mode (rain+lanterns = +2), software-rendered **0.33 FPS** (SwiftShader, not a GPU claim), screenshots `m3a-street.jpg` + `m3a-skyline.jpg` in `velvet-harbor-preview/`. Full numbers in QA.md (Milestone 3a section).
- Post-review fix: asphalt base `roughness` 2.6 → 1.0 (2.6 outside standard `[0,1]`; dark `roughnessMap` already gives 0–1 variation) and removed the unnecessary `roughnessMap.needsUpdate=true` (`game/src/render.js`). Bundle rebuilt; full verification re-run, all green (see QA.md).

## 2026-11-22 — District rename: v1 names → v3 names

- Replaced all four v1 district names with v3 names in `districtAt` (`game/src/world.js`): z > 110 → **Pearlwake Boulevard**, x > 100 → **Lanternfish Marina**, x < −100 → **Sunwick Hills**, default → **Prism Heights**. No new zones added.
- Signage and copy updates: docks sign (old TIDE-name) → **RUSTCRANE / FREIGHT**, road sign (old CORAL-name) → **PEARLWAKE BOULEVARD** (`game/src/world.js`), New Game toast → **"Mara Vale · Pearlwake Boulevard. Your afternoon starts here."** (`game/src/main.js`), HUD default district → **Pearlwake Boulevard** (`game/index.html`), README district list, and `shots.json`/`QA.md` 2-on-foot descriptions. Store names (`CORAL SOCIAL`, `BAYLINE COFFEE`, etc.) unchanged. Bundle rebuilt with esbuild.

### Verification

- `grep -ri` for the four v1 district labels (each matched case-insensitively as a two-word phrase or single label) (excluding `node_modules/` and `.git/`): **0 matches**, including the rebuilt bundle.
- `node --test tests/run.mjs`: **6/6 passed**. `npx -y -p typescript tsc --noEmit`: **0 errors**. `node main.ts`: **exit 0**.
- Persistent Playwright launcher (`verify-districts-playwright.cjs`, Chromium via `xvfb-run`, 1280×720, DOM click on `#new`): teleported with `window.__vhTest.setPosition` to (8,150), (150,0), (−150,0), (0,0). HUD read **Pearlwake Boulevard**, **Lanternfish Marina**, **Sunwick Hills**, **Prism Heights** respectively; no v1 district names anywhere in page text. Evidence: `screenshots/district-pearlwake.jpg`, `district-lanternfish.jpg`, `district-sunwick.jpg`, `district-prism.jpg` (all 1280×720). Gates: **0 console errors, 0 page errors, 0 non-file requests**.

## 2026-11-22 — Rename finish: Solmar → Saltgilt

- Completed the text rename across the remaining project files: **PLAN.md, README.md, game/bundle.min.js, game/index.html, game/src/hud.js, game/src/main.js, game/src/world.js, shots.json** (8 files). The rename only replaces strings; game logic is unchanged. `screenshots/bugb-live.jpg` was regenerated as part of the same change (**1280×720, 132,051 bytes**).

### Verification

- `grep -ri "solmar"` (excluding `node_modules/` and `.git/`): **0 matches**.
- `node --test tests/run.mjs`: **6/6 passed** (all Bug A and Bug B regressions).
- `npx -y -p typescript tsc --noEmit`: **0 errors**. `node main.ts`: **exit 0**.
- Playwright (coordinator run, `velvet-harbor-launcher/verify-bugb-playwright.cjs`, post-rename bundle): **5 of 6 criteria passed** — maxBlockFor **0 s**, cruiser pushed laterally **2.24 m**, **0 console errors**, **0 page errors**, **0 non-file requests**, HUD contains **"SALTGILT"** and no **"SOLMAR"**. The one criterion not met in that run was **advance >1 m within 2 s wall-clock**: measured **0.992 m**, because the renderer produced only **2 frames in 5.58 s (0.358 FPS)** on the resource-limited VM. The identical scenario passed pre-rename on logically identical code (commit 61c207c: 1 m in 1.275 s, 13.58 m in 3.58 s, maxBlockFor 0, lateral 2.24 m, 2.79 FPS, 0 errors). Since the rename is string-only, the verified behavior is identical; the wall-clock 1 m/2 s bar is sensitive to VM renderer speed and will be rechecked deterministically in milestone 3 (fixed-step 60 Hz). No unmeasured wall-clock pass is claimed.

## 2026-11-22 — Bug A: wanted-level decay

- Wanted decay now requires a real line-of-sight break. Police cruisers and visible officers use distance-limited visibility checks with building occlusion; elapsed time alone does not reduce wanted level.
- While no police or witnesses can see the player, one star is removed per 20 seconds until zero. Reacquiring sight resets the hidden timer, and large clock deltas preserve the exact drop boundaries.
- The HUD refreshes after every drop. Wanted changes emit `velvet:wanted-change` details including `previous`, `wanted`, `time`, `reason`, and `helicopterRequired`; the 5-to-4 event reports `helicopterRequired: false` for the later helicopter lifecycle.
- Added deterministic police controls and HUD snapshots under `window.__vhTest` for browser verification.

### Verification

- `node --test tests/run.mjs`: **3/3 passed**. Five occluded stars dropped at simulation times **20, 40, 60, 80, and 100 seconds**; visible police prevented decay; regained sight reset the timer; all inspected values stayed finite through **10,000 simulation steps**.
- Direct Playwright script with Chromium revision 1148 (Chromium 131), `file://`, and a **1280×720** viewport: forced five stars with `seen: true`, moved beyond police sight range, and observed the live HUD change **5→4→3→2→1→0**. Wanted events were timestamped **20, 40, 60, 80, and 100 seconds**; one-second polling observed the reductions at approximately **19.46, 39.78, 60.16, 80.38, and 100.66 seconds** of wall time. The first interval included part of the frame in progress when the test teleported the player. No fake-time acceleration was used for this observation.
- Browser gates: **0 console errors, 0 page errors, 0 non-file requests**.
- `npx -y -p typescript tsc --noEmit`: **0 errors**. `node main.ts`: **exit 0 within 10 seconds** (tested with an isolated output directory).
- Software rendering: ANGLE/Vulkan SwiftShader measured **0.43 FPS average** over the live decay observation. This is a headless software-rendering result, not a hardware-GPU performance claim.

## 2026-11-22 — Bug B: police cannot pin the player

- The player's heading is passed into every police update. A nearby cruiser accumulates blocking time only while the player's speed is below **0.5 m/s** and the player is not moving away; after **3 seconds**, that cruiser is despawned and removed from collision participation rather than pushed.
- A police cruiser hit from the front yields with a lateral soft-push, allowing the player's throttle to keep producing forward motion instead of repeatedly reflecting or locking the player.
- Pursuit and passive police spawns enforce the **15 m forward exclusion cone**. Roadblocks use two cruisers at lateral offsets of **−6 m and +6 m**, leaving a measured clear gap of **6.8 m**, above the required **4 m**; both roadblock spawn positions also pass the forward exclusion check.
- Added deterministic `window.__vhTest.spawnPoliceAhead()` browser control and `screenshots/bugb-live.jpg` evidence; the new capture replaces `4-chase.jpg` to keep the dossier within its four-image limit.

### Verification

- `node --test tests/run.mjs`: **6/6 passed**, including **3/3 Bug A regressions**. The new Bug B scenario completed **50/50 deterministic iterations** with slightly different player positions and headings: a stationary cruiser spawned exactly **4 m** ahead, the player held forward for **2 simulation seconds**, the first contact pushed the cruiser sideways without a forward shove, and the player advanced more than **1 m** in every iteration. Separate regressions confirmed that **0.5 m/s** does not accumulate blocking time, a stopped player despawns a blocker just after **3 seconds**, the **15 m** spawn boundary is enforced, and the roadblock gap is **6.8 m**.
- Direct Playwright Core 1.49.1 with cached Chromium 1148, `file://`, and a **1280×720** viewport: clicked **New Game**, entered the car, forced wanted level **5** through `window.__vhTest`, and spawned a cruiser exactly **4 m** ahead. Holding forward moved the player more than **1 m in 1.637 seconds** and **8.986 m over 3.574 seconds**. The original cruiser moved up to **2.240 m laterally**; maximum observed `blockFor` was **0 seconds**, so no unit held the player for more than **3 seconds**.
- Browser gates: **0 console errors, 0 page errors, 0 non-file requests**. The unedited JPEG capture is **1280×720** and **165,094 bytes**.
- `npx -y -p typescript tsc --noEmit`: **0 errors** on Node **v24.22.1**. `node main.ts`: **exit 0 in 0.515 seconds**, with a valid **783,054-byte dossier.json** in a clean isolated output directory after the screenshot replacement.
- ANGLE/Mesa llvmpipe measured **2.238 FPS** over **8 frames / 3.574 seconds** during the live Bug B observation. This is a software-rendering measurement, not a hardware-GPU performance claim.
